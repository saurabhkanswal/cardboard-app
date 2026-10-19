import {baseApi} from '../api/baseApi';
import {selectPairing, type PairingState} from './pairingSlice';
import type {
  CreateProjectResponse,
  HealthResponse,
  PairingPayload,
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
  video: UploadFile;
  prompt?: string;
  names?: string;
}

export interface CompiledTemplatesArgs {
  projectId: string;
  /** Workspace paths, e.g. `recipe/templates/captions.jsx`. */
  templates: string[];
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
      queryFn: ({kitId, video, prompt, names}, {getState}) => {
        const form = new FormData();
        form.append('kitId', kitId);
        if (prompt) {
          form.append('prompt', prompt);
        }
        if (names) {
          form.append('names', names);
        }
        // React Native's FormData accepts a {uri, name, type} file descriptor.
        form.append('video', video as unknown as Blob);
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
  }),
  overrideExisting: false,
});

export const {
  useCheckBridgeHealthMutation,
  useCreateProjectMutation,
  useGetCompiledTemplatesQuery,
} = bridgeApi;
