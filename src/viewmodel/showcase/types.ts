/**
 * Showcase domain model — the shape the app reasons about, independent of any
 * backend DTO or screen. Produced by `showcaseMappers`.
 */

export interface Video {
  id: string;
  url: string;
}

export interface Section {
  id: string;
  title: string;
  videos: Video[];
}
