import type { BadgeKind, SlotKey } from './types';

export const SLOT_KEYS: readonly SlotKey[] = ['complete', 'retained'];
export const BADGE_KINDS: readonly BadgeKind[] = ['curriculum', 'course'];
/** Must match the backend's list page size (spec §6.4). */
export const PAGE_SIZE = 50;
export const COURSE_SEARCH_DEBOUNCE_MS = 400;
export const CURRICULUM_TITLE_MAX = 255;
/** A learning path ID: the same rule as a course group's ID (the launch scheme's slug rule). */
export const PATH_SLUG_MAX = 64;
export const BADGE_TITLE_MAX = 100;
export const BADGE_DESCRIPTION_MAX = 500;
/** Must match UBER_BADGE_IMAGE_MAX_BYTES on the backend. */
export const BADGE_IMAGE_MAX_BYTES = 1048576;
export const BADGE_IMAGE_ACCEPT = { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] };
/** Same limit as badge images — both must match UBER_BADGE_IMAGE_MAX_BYTES on the backend. */
export const CURRICULUM_IMAGE_MAX_BYTES = BADGE_IMAGE_MAX_BYTES;
export const CURRICULUM_IMAGE_ACCEPT = BADGE_IMAGE_ACCEPT;
export const DELAY_OPTIONS = ['15', '30'] as const;
export const CURRICULUM_MANAGEMENT_PATH = '/curriculum-management';
export const BADGES_PATH = '/curriculum-management/badges';
export const COURSE_GROUPS_PATH = '/curriculum-management/course-groups';
export const DEEP_LINKS_PATH = '/curriculum-management/deep-links';
export const GROUP_TITLE_MAX = 255;
/** A group ID as Uber signs it into a launch link (the launch scheme's `groups` rule). */
export const GROUP_SLUG_MAX = 64;
export const GROUP_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
/** A driver's External ID as the launch scheme allows it: never an email. */
export const EXTERNAL_ID_MAX = 128;
export const EXTERNAL_ID_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/;
export const LAUNCH_TARGETS = ['home', 'course', 'optional'] as const;
