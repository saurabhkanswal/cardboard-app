/**
 * Showcase data-transfer objects — the raw shape as it would arrive from a backend.
 * Domain shaping happens in the ViewModel layer, never here.
 */

export interface VideoDTO {
  id: string;
  url: string;
  /** The bridge kit this video's recipe remixes with, when the app supports it. */
  recipeId?: string;
}

export interface SectionDTO {
  id: string;
  title: string;
  videos: VideoDTO[];
}

export type ShowcaseDTO = SectionDTO[];
