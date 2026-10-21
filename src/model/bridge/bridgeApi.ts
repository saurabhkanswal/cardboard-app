import {baseApi} from '../api/baseApi';
import {deleteFiles, writeTempPngs} from '../export/exportFiles';
import {selectPairing, type PairingState} from './pairingSlice';
import type {
  CreateProjectResponse,
  ExportManifest,
  ExportResponse,
  HealthResponse,
  PairingPayload,
  ProjectResponse,
  SendMessageRequest,
} from './protocol';

/** Plain requests fail fast when the laptop is off the network; uploads get longer. */
const REQUEST_TIMEOUT_MS = 5000;
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export type BridgeError = {status: number | 'NETWORK' | 'UNPAIRED'; message: string};

/** A device file to upload, in React Native's multipart shape. */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

export interface CreateProjectArgs {
  kitId: string;
  /** Clips in order; each is sent as a repeated `video` part. */
  videos: UploadFile[];
  prompt?: string;
  names?: string;
  /** The kit's text inputs by id, e.g. `{topic, brief}`; written to the project's `inputs.json`. */
  inputs?: Record<string, string>;
}

export interface CompiledTemplatesArgs {
  projectId: string;
  /** Workspace paths, e.g. `recipe/templates/captions.jsx`. */
  templates: string[];
}

export interface ProjectMessageArgs extends SendMessageRequest {
  projectId: string;
}

export interface StartExportArgs {
  projectId: string;
  manifest: ExportManifest;
  /** One PNG per manifest frame, in manifest order. */
  pngs: Uint8Array[];
}

type Result<T> = {data: T} | {error: BridgeError};

/**
 * fetch → body (JSON unless `read` says otherwise) with bearer auth, a timeout, and errors
 * mapped to `BridgeError`.
 */
async function bridgeFetch<T>(
  pairing: PairingPayload | null,
  path: string,
  init: RequestInit = {},
  read: (res: Response) => Promise<unknown> = res => res.json(),
): Promise<Result<T>> {
  if (!pairing) {
    return {error: {status: 'UNPAIRED', message: 'Not paired with a bridge'}};
  }
  // `AbortSignal.timeout` isn't guaranteed on Hermes; use a controller.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${pairing.url}${path}`, {
      ...init,
      headers: {...init.headers, Authorization: `Bearer ${pairing.token}`},
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        res.status === 401
          ? 'Token rejected'
          : (body as {error?: string} | null)?.error ?? res.statusText;
      return {error: {status: res.status, message}};
    }
    return {data: (await read(res)) as T};
  } catch (e) {
    return {
      error: {status: 'NETWORK', message: e instanceof Error ? e.message : 'Network error'},
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Multipart upload via XMLHttpRequest, not fetch: Expo SDK 58 replaces global fetch with
 * `expo/fetch`, whose FormData path needs a `ReadableStream` global (absent here) and
 * would read the whole video into JS memory. RN's XHR streams `{uri}` parts from disk.
 */
function bridgeUpload<T>(
  pairing: PairingPayload | null,
  path: string,
  form: FormData,
): Promise<Result<T>> {
  if (!pairing) {
    return Promise.resolve({error: {status: 'UNPAIRED', message: 'Not paired with a bridge'}});
  }
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${pairing.url}${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${pairing.token}`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON error page; fall through with the status text.
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({data: body as T});
      } else {
        const message =
          xhr.status === 401
            ? 'Token rejected'
            : (body as {error?: string} | null)?.error ?? `HTTP ${xhr.status}`;
        resolve({error: {status: xhr.status, message}});
      }
    };
    xhr.onerror = () => resolve({error: {status: 'NETWORK', message: 'Upload failed'}});
    xhr.ontimeout = () => resolve({error: {status: 'NETWORK', message: 'Upload timed out'}});
    xhr.send(form);
  });
}

const pairingOf = (getState: () => unknown) =>
  selectPairing(getState() as {pairing: PairingState}).pairing;

export const bridgeApi = baseApi.injectEndpoints({
  endpoints: build => ({
    /** Verifies a pairing candidate (reachable + token accepted) before it is stored. */
    checkBridgeHealth: build.mutation<HealthResponse, PairingPayload>({
      queryFn: pairing => bridgeFetch<HealthResponse>(pairing, '/health'),
    }),

    /** Uploads the footage and starts a project (transcribe → first agent turn). */
    createProject: build.mutation<CreateProjectResponse, CreateProjectArgs>({
      queryFn: ({kitId, videos, prompt, names, inputs}, {getState}) => {
        const form = new FormData();
        form.append('kitId', kitId);
        if (prompt) {
          form.append('prompt', prompt);
        }
        if (names) {
          form.append('names', names);
        }
        if (inputs) {
          form.append('inputs', JSON.stringify(inputs));
        }
        // React Native's FormData accepts a {uri, name, type} file descriptor.
        for (const video of videos) {
          form.append('video', video as unknown as Blob);
        }
        return bridgeUpload<CreateProjectResponse>(pairingOf(getState), '/projects', form);
      },
    }),

    /** A project's `<code>` templates compiled for the phone: workspace path → script source. */
    getCompiledTemplates: build.query<Record<string, string>, CompiledTemplatesArgs>({
      queryFn: async ({projectId, templates}, {getState}) => {
        const pairing = pairingOf(getState);
        const results = await Promise.all(
          templates.map(template =>
            bridgeFetch<string>(
              pairing,
              `/projects/${projectId}/compiled/${template.split('/').map(encodeURIComponent).join('/')}`,
              {},
              res => res.text(),
            ),
          ),
        );
        const sources: Record<string, string> = {};
        for (const [i, result] of results.entries()) {
          if ('error' in result) {
            return result;
          }
          sources[templates[i]] = result.data;
        }
        return {data: sources};
      },
    }),

    /** Starts a director turn with the user's instruction (409 while a turn is running). */
    sendProjectMessage: build.mutation<{ok: true}, ProjectMessageArgs>({
      queryFn: ({projectId, text}, {getState}) =>
        bridgeFetch<{ok: true}>(pairingOf(getState), `/projects/${projectId}/messages`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({text} satisfies SendMessageRequest),
        }),
    }),

    /** Aborts the running turn; its partial edits are still committed as one rev. */
    cancelProjectTurn: build.mutation<{ok: boolean}, {projectId: string}>({
      queryFn: ({projectId}, {getState}) =>
        bridgeFetch<{ok: boolean}>(pairingOf(getState), `/projects/${projectId}/cancel`, {method: 'POST'}),
    }),

    /** Reverts the last committed turn (409 at rev 0 or while running). */
    undoProjectTurn: build.mutation<Pick<ProjectResponse, 'project'>, {projectId: string}>({
      queryFn: ({projectId}, {getState}) =>
        bridgeFetch<Pick<ProjectResponse, 'project'>>(
          pairingOf(getState),
          `/projects/${projectId}/undo`, {method: 'POST'}),
    }),

    /**
     * Uploads the caption overlays and starts the bridge's MP4 render (202). Progress and
     * the result arrive as `job` events with `name: 'export'`.
     */
    startExport: build.mutation<ExportResponse, StartExportArgs>({
      queryFn: async ({projectId, manifest, pngs}, {getState}) => {
        const uris = await writeTempPngs(pngs);
        try {
          const form = new FormData();
          form.append('manifest', JSON.stringify(manifest));
          uris.forEach((uri, i) => {
            const part: UploadFile = {uri, name: `overlay-${i}.png`, type: 'image/png'};
            form.append('overlay', part as unknown as Blob);
          });
          return await bridgeUpload<ExportResponse>(
            pairingOf(getState),
            `/projects/${projectId}/export`,
            form,
          );
        } finally {
          deleteFiles(uris);
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useCheckBridgeHealthMutation,
  useCreateProjectMutation,
  useGetCompiledTemplatesQuery,
  useSendProjectMessageMutation,
  useCancelProjectTurnMutation,
  useUndoProjectTurnMutation,
  useStartExportMutation,
} = bridgeApi;
