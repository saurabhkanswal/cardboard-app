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
  accent: '#5B8CFF',
  success: '#3DDC84',
  warning: '#F5B942',
  danger: '#FF5C5C',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Fixed tile size — enables `getItemLayout` on the rails. */
export const TILE_WIDTH = 200;
export const TILE_HEIGHT = 300;

export const radius = {
  tile: 12,
} as const;
