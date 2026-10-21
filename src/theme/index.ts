/**
 * Design tokens. Presentation-only.
 *
 * Boundary note: `components/` and `screens/` may import this. Nothing here may
 * import from any other app layer.
 */

export const colors = {
  background: '#000000',
  surface: '#15151C',
  /** Neutral fill shown behind a video tile until its first frame renders. */
  placeholder: '#23232D',
  text: '#F5F5F7',
  textMuted: '#9A9AA5',
  /** Softer off-white, so large headings don't compete with the white logo. */
  textSoft: '#CFCFD6',
  accent: '#5B8CFF',
  success: '#3DDC84',
  warning: '#F5B942',
  danger: '#FF5C5C',
  /** Dark red for Cancel actions in headers. */
  cancel: '#C8373B',
  /** Hairline borders on dark surfaces (e.g. the segmented tab track). */
  border: '#2A2A33',
  /** Light separator line between page sections. */
  divider: '#3A3A45',
  /** Light fill for a selected segment, and the dark text that sits on it. */
  segmentActive: '#EBEBED',
  textOnLight: '#111114',
  /** Chat: the user's message bubble, and the composer's rounded field. */
  bubbleUser: '#26262F',
  composer: '#1A1A21',
  /** Rotating hero terms — one colour each. */
  heroCreators: '#A78BFA',
  heroYoutube: '#FF0000',
  heroClaude: '#D97757',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Fixed tile size — enables `getItemLayout` on the rails. */
export const TILE_WIDTH = 140;
export const TILE_HEIGHT = 210;

export const radius = {
  tile: 12,
  /** Top corners of modal bottom sheets. */
  sheet: 20,
  /** Chat bubbles and pill chips. */
  bubble: 18,
  /** The chat composer's rounded field. */
  composer: 26,
} as const;
