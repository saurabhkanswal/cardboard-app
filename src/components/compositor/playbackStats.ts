/** Dev measurements collected on the UI thread (shown in the editor's dev HUD). */
export interface PlaybackStats {
  /** UI frames observed while playing. */
  frames: number;
  /** Frames that took longer than ~1.5× a 60 Hz frame (dropped at least one). */
  slowFrames: number;
  /** Worst frame interval in ms. */
  worstFrameMs: number;
  /** Play pressed → playhead first moved, in ms (player start-up). */
  startLatencyMs: number;
  /** Re-alignment seeks issued while playing (should stay ~0 with the media clock). */
  playingSeeks: number;
}

export const EMPTY_STATS: PlaybackStats = {
  frames: 0,
  slowFrames: 0,
  worstFrameMs: 0,
  startLatencyMs: 0,
  playingSeeks: 0,
};
