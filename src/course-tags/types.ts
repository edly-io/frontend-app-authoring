/** What the current user may do with course tags (`status/`). */
export interface CourseTagsStatus {
  /** The `uber_course_tags.enabled` flag is on for the user. */
  enabled: boolean;
  /** The user may change this course's tags, creating new ones (Studio write access). */
  canAssign: boolean;
}

/** A tag. The id is its stable identifier; the name is unique ignoring case and may be any text. */
export interface Tag {
  id: number;
  name: string;
}
