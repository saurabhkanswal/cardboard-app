import type {ExportedProjectRecord} from '../../model/export/exportedProjectsSlice';
import type {ExportedProject} from './types';

/** Record → domain mappers. Pure functions, no React and no Redux. */

/** `m:ss`. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatExportDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

/**
 * Newest first. Records whose file is gone (`resolveUri` → null) are left out, so a
 * missing file never shows as a broken tile.
 */
export function mapExportedProjects(
  records: ExportedProjectRecord[],
  resolveUri: (fileName: string) => string | null,
): ExportedProject[] {
  const projects: ExportedProject[] = [];
  for (const record of [...records].sort((a, b) => b.createdAt - a.createdAt)) {
    const uri = resolveUri(record.fileName);
    if (uri) {
      projects.push({
        id: record.id,
        uri,
        dateLabel: formatExportDate(record.createdAt),
        durationLabel: formatDuration(record.duration),
      });
    }
  }
  return projects;
}
