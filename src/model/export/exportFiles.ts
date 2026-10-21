import {Directory, File, Paths} from 'expo-file-system';
import {Asset, requestPermissionsAsync} from 'expo-media-library';

/**
 * Device file I/O for exports: caption PNGs are written to the cache before upload, and
 * the rendered MP4 is kept in the documents folder and also saved to the photo library.
 */

let batch = 0;

/** Writes each PNG to a fresh cache file; returns their `file://` URIs, in order. */
export async function writeTempPngs(pngs: Uint8Array[]): Promise<string[]> {
  const prefix = `export-${Date.now()}-${++batch}`;
  return Promise.all(
    pngs.map(async (bytes, i) => {
      const file = new File(Paths.cache, `${prefix}-${i}.png`);
      await file.write(bytes);
      return file.uri;
    }),
  );
}

/** Best effort: a temp file left behind is only cache. */
export function deleteFiles(uris: string[]): void {
  for (const uri of uris) {
    try {
      new File(uri).delete();
    } catch {
      // Already gone.
    }
  }
}

/**
 * Adds a local video to the photo library. Asks for add-only access (iOS "Add Photos
 * Only"), so the app never needs to read the library to save into it.
 */
export async function saveVideoToPhotos(uri: string): Promise<'saved' | 'denied'> {
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) {
    return 'denied';
  }
  await Asset.create(uri);
  return 'saved';
}

/** Kept exports live here, so "Your projects" survives restarts. */
const EXPORTS_DIR = 'exports';

/**
 * Downloads a finished export into the documents folder; returns its file name.
 * Callers store the name, not the URI: the iOS container path can change between launches.
 */
export async function downloadExport(url: string, name: string): Promise<string> {
  const dir = new Directory(Paths.document, EXPORTS_DIR);
  dir.create({intermediates: true, idempotent: true});
  const file = await File.downloadFileAsync(url, new File(dir, name), {idempotent: true});
  return file.name;
}

/** `file://` URI of a kept export, or null once the file is gone. */
export function exportUri(name: string): string | null {
  const file = new File(Paths.document, EXPORTS_DIR, name);
  return file.exists ? file.uri : null;
}

/** Best effort, like `deleteFiles`. */
export function deleteExport(name: string): void {
  deleteFiles([new File(Paths.document, EXPORTS_DIR, name).uri]);
}
