import type { BadgeKind, SlotKey } from './types';

export const SLOT_KEYS: readonly SlotKey[] = ['halfway', 'complete', 'retained'];
export const BADGE_KINDS: readonly BadgeKind[] = ['curriculum', 'course'];
/** Must match the backend's list page size (spec §6.4). */
export const PAGE_SIZE = 50;
export const COURSE_SEARCH_DEBOUNCE_MS = 400;
export const CURRICULUM_TITLE_MAX = 255;
export const BADGE_TITLE_MAX = 100;
export const BADGE_DESCRIPTION_MAX = 500;
/** Must match UBER_BADGE_IMAGE_MAX_BYTES on the backend. */
export const BADGE_IMAGE_MAX_BYTES = 1048576;
export const BADGE_IMAGE_ACCEPT = { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] };
export const DELAY_OPTIONS = ['15', '30'] as const;
export const CURRICULUM_MANAGEMENT_PATH = '/curriculum-management';
export const BADGES_PATH = '/curriculum-management/badges';
