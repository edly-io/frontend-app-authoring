import { useLocation } from 'react-router-dom';

import type {
  DiffNodeData,
  DiffResult,
  FieldChangeData,
  PublishVersion,
} from './types';

export const COURSE_ID = 'course-v1:Uber+101+2026';
export const V1 = '1'.repeat(24);
export const V2 = '2'.repeat(24);
export const V3 = '3'.repeat(24);
export const DRAFT_ID = 'd'.repeat(24);

export const version = (id: string, overrides: Partial<PublishVersion> = {}): PublishVersion => ({
  id,
  publishedAt: '2026-01-03T12:00:00Z',
  publishedBy: { id: 7, username: 'writer' },
  previousId: null,
  isCurrent: false,
  ...overrides,
});

export const field = (overrides: Partial<FieldChangeData> = {}): FieldChangeData => ({
  name: 'display_name',
  scope: 'settings',
  old: 'Old name',
  new: 'New name',
  textDiff: null,
  jsonDiff: null,
  tooLarge: false,
  tooLargeReason: null,
  ...overrides,
});

export const node = (overrides: Partial<DiffNodeData> = {}): DiffNodeData => ({
  usageKey: 'block-v1:Uber+101+2026+type@html+block@h1',
  blockType: 'html',
  displayName: 'Intro text',
  change: 'CHANGED',
  editor: { id: 7, username: 'writer' },
  editorApproximate: false,
  move: null,
  fields: [],
  children: [],
  ...overrides,
});

export const diffResult = (overrides: Partial<DiffResult> = {}): DiffResult => ({
  from: { id: V2, kind: 'version', at: '2026-01-02T12:00:00Z', by: { id: 7, username: 'writer' } },
  to: { id: V3, kind: 'version', at: '2026-01-03T12:00:00Z', by: { id: 8, username: 'editor' } },
  identical: false,
  totalChanges: 1,
  truncated: false,
  budgetExhausted: false,
  tree: [node()],
  ...overrides,
});

/** The error an axios request fails with. */
export const httpError = (status: number, data: object = {}) => ({ response: { status, data } });

/** Shows the router's current path and query, so a test can read what the page wrote to the URL. */
export const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
};
