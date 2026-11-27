import MockAdapter from 'axios-mock-adapter';
import { initializeMocks } from '@src/testUtils';

import {
  apiUrls,
  assignTag,
  getCourseTags,
  getStatus,
  getTagSuggestions,
  unassignTag,
} from './api';

const COURSE_ID = 'course-v1:Uber+101+2026';
const BASE = 'http://localhost:18010/api/uber/course_tags/v1';

let axiosMock: MockAdapter;

describe('course tags api', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  describe('apiUrls', () => {
    it('builds the status URL with the course id as an encoded query parameter', () => {
      expect(apiUrls.status(COURSE_ID)).toBe(`${BASE}/status/?course_id=course-v1%3AUber%2B101%2B2026`);
    });

    it('encodes the course id in the path so a plus survives', () => {
      expect(apiUrls.courseTags(COURSE_ID)).toBe(`${BASE}/courses/course-v1%3AUber%2B101%2B2026/tags/`);
      expect(apiUrls.courseTag(COURSE_ID, 7)).toBe(`${BASE}/courses/course-v1%3AUber%2B101%2B2026/tags/7/`);
    });

    it('builds the suggestions URL with the search as an encoded query parameter', () => {
      expect(apiUrls.suggestions(COURSE_ID, 'road & safety?')).toBe(
        `${BASE}/courses/course-v1%3AUber%2B101%2B2026/tag-suggestions/?search=road+%26+safety%3F`,
      );
    });
  });

  it('maps the status response to camelCase booleans', async () => {
    axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_assign: false });
    expect(await getStatus(COURSE_ID)).toEqual({ enabled: true, canAssign: false });
  });

  it('treats missing status fields as false', async () => {
    axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, {});
    expect(await getStatus(COURSE_ID)).toEqual({ enabled: false, canAssign: false });
  });

  it('gets the course tags', async () => {
    axiosMock.onGet(apiUrls.courseTags(COURSE_ID)).reply(200, [{ id: 1, name: 'Road safety' }]);
    expect(await getCourseTags(COURSE_ID)).toEqual([{ id: 1, name: 'Road safety' }]);
  });

  it('gets the suggestions for a search term', async () => {
    axiosMock.onGet(apiUrls.suggestions(COURSE_ID, 'road')).reply(200, [{ id: 1, name: 'Road safety' }]);
    expect(await getTagSuggestions(COURSE_ID, 'road')).toEqual([{ id: 1, name: 'Road safety' }]);
  });

  it('assigns a tag by posting its name', async () => {
    axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(201, { id: 5, name: 'New' });
    expect(await assignTag(COURSE_ID, 'New')).toEqual({ id: 5, name: 'New' });
    expect(axiosMock.history.post).toHaveLength(1);
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({ name: 'New' });
  });

  it('unassigns a tag by deleting its id', async () => {
    axiosMock.onDelete(apiUrls.courseTag(COURSE_ID, 5)).reply(204);
    await unassignTag(COURSE_ID, 5);
    expect(axiosMock.history.delete.map(({ url }) => url)).toEqual([apiUrls.courseTag(COURSE_ID, 5)]);
  });

  it('rejects when the server refuses', async () => {
    axiosMock.onPost(apiUrls.courseTags(COURSE_ID)).reply(400, { name_code: 'name_blank' });
    await expect(assignTag(COURSE_ID, '')).rejects.toMatchObject({ response: { status: 400 } });
  });
});
