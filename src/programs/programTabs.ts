import type { ProgramCapabilities } from './data/types';

export const PROGRAM_TABS = [
  'details',
  'courses',
  'instructors',
  'enrollment',
  'feedback',
  'trainee-results',
  'certificates',
  'calendar',
  'requests',
  'attendance',
  'locations',
  'holidays',
] as const;

export type ProgramTabKey = typeof PROGRAM_TABS[number];

export const DEFAULT_PROGRAM_TAB: ProgramTabKey = 'details';

const isProgramTab = (value: string): value is ProgramTabKey => (
  (PROGRAM_TABS as readonly string[]).includes(value)
);

/** The tab named by the first segment of the route splat (`requests/leaves` → `requests`). */
export const getActiveProgramTab = (splat: string | undefined): ProgramTabKey => {
  const segment = splat?.split('/')[0] ?? '';
  return isProgramTab(segment) ? segment : DEFAULT_PROGRAM_TAB;
};

/** Whether the user's capabilities show this tab; hidden tabs fall back to the default tab. */
export const isProgramTabVisible = (tab: ProgramTabKey, capabilities: ProgramCapabilities): boolean => {
  if (tab === 'certificates') {
    return capabilities.canManageCertificates;
  }
  return true;
};
