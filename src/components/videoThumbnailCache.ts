import type {VideoThumbnail} from 'expo-video';

/**
 * First-frame thumbnails keyed by video source (a remote uri, or a bundled clip's
 * asset id). Module-level so they outlive the players and views that made them —
 * a remounted video shows its frame at once while its player loads.
 */
export const thumbnailCache = new Map<string | number, VideoThumbnail>();
