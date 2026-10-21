/** "Your projects" domain model: a finished export the user can watch again. */
export interface ExportedProject {
  id: string;
  /** Local `file://` URI of the MP4. */
  uri: string;
  /** e.g. "Oct 20". */
  dateLabel: string;
  /** e.g. "0:12". */
  durationLabel: string;
}
