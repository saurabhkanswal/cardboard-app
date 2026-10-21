/**
 * Showcase domain model — the shape the app reasons about, independent of any
 * backend DTO or screen. Produced by `showcaseMappers`.
 */

export interface Video {
  id: string;
  url: string;
  /** Recipe (bridge kit) to remix this video with; absent → the default recipe. */
  recipeId?: string;
}

export interface Section {
  id: string;
  title: string;
  videos: Video[];
}
