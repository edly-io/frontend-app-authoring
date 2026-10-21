import type MockAdapter from 'axios-mock-adapter';
import { initializeMocks } from '@src/testUtils';

import {
  apiUrls,
  getDiff,
  getStatus,
  getVersions,
  VERSIONS_PAGE_SIZE,
} from './api';

const COURSE_ID = 'course-v1:Uber+101+2026';
const BASE = 'http://localhost:18010/api/uber/publish_history/v1';
const V3 = '3'.repeat(24);
const V2 = '2'.repeat(24);

let axiosMock: MockAdapter;

describe('publish history api', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  describe('apiUrls', () => {
    it('builds the status URL with the course id as an encoded query parameter', () => {
      expect(apiUrls.status(COURSE_ID)).toBe(`${BASE}/status/?course_id=course-v1%3AUber%2B101%2B2026`);
    });

    it('encodes the course id in the path so a plus survives', () => {
      expect(apiUrls.versions(COURSE_ID)).toBe(
        `${BASE}/courses/course-v1%3AUber%2B101%2B2026/versions/?page_size=${VERSIONS_PAGE_SIZE}`,
      );
    });

    it('adds the after cursor', () => {
      expect(apiUrls.versions(COURSE_ID, V3)).toContain(`after=${V3}`);
    });

    it('builds the diff URL with version and against', () => {
      expect(apiUrls.diff(COURSE_ID, V3, 'published')).toBe(
        `${BASE}/courses/course-v1%3AUber%2B101%2B2026/diff/?version=${V3}&against=published`,
      );
    });

    it('leaves out against for "previous" so the API picks the version before', () => {
      const url = apiUrls.diff(COURSE_ID, V3, 'previous');
      expect(url).toBe(`${BASE}/courses/course-v1%3AUber%2B101%2B2026/diff/?version=${V3}`);
      expect(url).not.toContain('against');
    });

    it('passes a version id and draft as against', () => {
      expect(apiUrls.diff(COURSE_ID, V3, V2)).toContain(`against=${V2}`);
      expect(apiUrls.diff(COURSE_ID, V3, 'draft')).toContain('against=draft');
    });
  });

  describe('getStatus', () => {
    it('maps the response to camelCase booleans', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_view: false });
      expect(await getStatus(COURSE_ID)).toEqual({ enabled: true, canView: false });
    });

    it('treats missing fields as false', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, {});
      expect(await getStatus(COURSE_ID)).toEqual({ enabled: false, canView: false });
    });

    it('rejects on an error status', async () => {
      axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(403);
      await expect(getStatus(COURSE_ID)).rejects.toMatchObject({ response: { status: 403 } });
    });
  });

  describe('getVersions', () => {
    const row = {
      id: V3,
      published_at: '2026-01-03T12:00:00Z',
      published_by: { id: 7, username: 'writer' },
      previous_id: V2,
      is_current: true,
    };

    it('maps rows to camelCase and takes the cursor from the next URL', async () => {
      axiosMock.onGet(apiUrls.versions(COURSE_ID)).reply(200, {
        next: `${BASE}/courses/x/versions/?after=${V3}&page_size=20`,
        results: [row],
        history_ends: null,
      });
      expect(await getVersions(COURSE_ID)).toEqual({
        nextAfter: V3,
        historyEnds: null,
        results: [{
          id: V3,
          publishedAt: '2026-01-03T12:00:00Z',
          publishedBy: { id: 7, username: 'writer' },
          previousId: V2,
          isCurrent: true,
        }],
      });
    });

    it('has no cursor on the last page and passes the end reason on', async () => {
      axiosMock.onGet(apiUrls.versions(COURSE_ID, V3)).reply(200, { next: null, results: [], history_ends: 'pruned' });
      expect(await getVersions(COURSE_ID, V3)).toEqual({ nextAfter: null, results: [], historyEnds: 'pruned' });
    });

    it('rejects with the status of a failed request', async () => {
      axiosMock.onGet(apiUrls.versions(COURSE_ID)).reply(404, { code: 'version_not_found' });
      await expect(getVersions(COURSE_ID)).rejects.toMatchObject({ response: { status: 404 } });
    });
  });

  describe('getDiff', () => {
    const side = (id: string) => ({ id, kind: 'version', at: '2026-01-03T12:00:00Z', by: { id: 7, username: 'w' } });
    const body = {
      from: side(V2),
      to: side(V3),
      identical: false,
      total_changes: 1,
      truncated: true,
      tree: [{
        usage_key: 'block-v1:Uber+101+2026+type@html+block@h1',
        block_type: 'html',
        display_name: 'Intro',
        change: 'CHANGED',
        editor: { id: 7, username: 'w' },
        editor_approximate: true,
        move: { from_parent: 'a', to_parent: 'b', from_index: 1, to_index: 2 },
        fields: [{
          name: 'data',
          scope: 'content',
          old: null,
          new: null,
          text_diff: { kind: 'words', segments: [{ op: 'insert', text: 'x' }] },
          too_large: false,
        }],
        children: [{
          usage_key: 'child',
          block_type: 'html',
          display_name: null,
          change: null,
          editor: null,
          editor_approximate: false,
          move: null,
          fields: [],
          children: [],
        }],
      }],
    };

    it('maps the response to camelCase, nested children included', async () => {
      axiosMock.onGet(apiUrls.diff(COURSE_ID, V3, 'previous')).reply(200, body);
      const result = await getDiff(COURSE_ID, V3, 'previous');
      expect(result).toMatchObject({
        from: { id: V2, kind: 'version', at: '2026-01-03T12:00:00Z' },
        to: { id: V3 },
        identical: false,
        totalChanges: 1,
        truncated: true,
      });
      const [node] = result.tree;
      expect(node).toMatchObject({
        usageKey: 'block-v1:Uber+101+2026+type@html+block@h1',
        blockType: 'html',
        displayName: 'Intro',
        editorApproximate: true,
        move: { fromParent: 'a', toParent: 'b', fromIndex: 1, toIndex: 2 },
      });
      expect(node.fields[0]).toMatchObject({
        name: 'data',
        scope: 'content',
        tooLarge: false,
        textDiff: { kind: 'words', segments: [{ op: 'insert', text: 'x' }] },
      });
      expect(node.children[0].usageKey).toBe('child');
    });

    it('keeps old and new values and their keys as they are (never camelCased)', async () => {
      const raw = { snake_key: { nested_key: 1 } };
      axiosMock.onGet(apiUrls.diff(COURSE_ID, V3, 'previous')).reply(200, {
        ...body,
        tree: [{
          ...body.tree[0],
          fields: [{
            name: 'metadata',
            scope: 'settings',
            old: raw,
            new: { other_key: 2 },
            text_diff: null,
            too_large: false,
          }],
        }],
      });
      const { tree } = await getDiff(COURSE_ID, V3, 'previous');
      expect(tree[0].fields[0].old).toEqual(raw);
      expect(tree[0].fields[0].new).toEqual({ other_key: 2 });
      expect(tree[0].fields[0].textDiff).toBeNull();
    });

    it('does not send against for previous', async () => {
      axiosMock.onGet().reply(200, { ...body, tree: [] });
      await getDiff(COURSE_ID, V3, 'previous');
      expect(axiosMock.history.get[0].url).not.toContain('against');
    });

    it.each([404, 410, 400])('rejects with status %s', async (status) => {
      axiosMock.onGet().reply(status, {});
      await expect(getDiff(COURSE_ID, V3, 'draft')).rejects.toMatchObject({ response: { status } });
    });
  });
});
