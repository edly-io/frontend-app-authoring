import MockAdapter from 'axios-mock-adapter';
import { initializeMocks } from '@src/testUtils';

import {
  apiUrls,
  assignCategory,
  CATEGORIES_PAGE_SIZE,
  createCategory,
  deleteCategory,
  getAllCategories,
  getCourseCategories,
  getStatus,
  renameCategory,
  unassignCategory,
} from './api';

const COURSE_ID = 'course-v1:Uber+101+2026';
const BASE = 'http://localhost:18010/api/uber/course_categories/v1';

let axiosMock: MockAdapter;

const page = (count: number, names: string[]) => ({
  count,
  next: null,
  previous: null,
  results: names.map((name) => ({ name, slug: name.toLowerCase(), course_count: 3 })),
});

describe('course categories api', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  describe('apiUrls', () => {
    it('builds the status URL with the course id as an encoded query parameter', () => {
      expect(apiUrls.status(COURSE_ID)).toBe(`${BASE}/status/?course_id=course-v1%3AUber%2B101%2B2026`);
    });

    it('encodes the course id in the path so a plus survives', () => {
      expect(apiUrls.courseCategories(COURSE_ID)).toBe(`${BASE}/courses/course-v1%3AUber%2B101%2B2026/categories/`);
      expect(apiUrls.courseCategory(COURSE_ID, 'road-safety')).toBe(
        `${BASE}/courses/course-v1%3AUber%2B101%2B2026/categories/road-safety/`,
      );
    });

    it('encodes the slug so it cannot change the path', () => {
      expect(apiUrls.category('a/b?c')).toBe(`${BASE}/categories/a%2Fb%3Fc/`);
    });

    it('asks for pages of the largest size', () => {
      expect(apiUrls.categoriesPage(2)).toBe(`${BASE}/categories/?page=2&page_size=${CATEGORIES_PAGE_SIZE}`);
    });
  });

  it('maps the status response to camelCase booleans', async () => {
    axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, { enabled: true, can_assign: false, can_manage: true });
    expect(await getStatus(COURSE_ID)).toEqual({ enabled: true, canAssign: false, canManage: true });
  });

  it('treats missing status fields as false', async () => {
    axiosMock.onGet(apiUrls.status(COURSE_ID)).reply(200, {});
    expect(await getStatus(COURSE_ID)).toEqual({ enabled: false, canAssign: false, canManage: false });
  });

  describe('getAllCategories', () => {
    it('camel-cases a single page and makes one request', async () => {
      axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, page(1, ['Road']));
      expect(await getAllCategories()).toEqual([{ name: 'Road', slug: 'road', courseCount: 3 }]);
      expect(axiosMock.history.get).toHaveLength(1);
    });

    it('returns an empty list without further requests when there are none', async () => {
      axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, page(0, []));
      expect(await getAllCategories()).toEqual([]);
      expect(axiosMock.history.get).toHaveLength(1);
    });

    it('fetches every page in order', async () => {
      axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, page(201, ['a']));
      axiosMock.onGet(apiUrls.categoriesPage(2)).reply(200, page(201, ['b']));
      axiosMock.onGet(apiUrls.categoriesPage(3)).reply(200, page(201, ['c']));
      expect((await getAllCategories()).map(({ name }) => name)).toEqual(['a', 'b', 'c']);
      expect(axiosMock.history.get).toHaveLength(3);
    });

    it('does not fetch a second page for exactly one full page', async () => {
      axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, page(100, ['a']));
      await getAllCategories();
      expect(axiosMock.history.get).toHaveLength(1);
    });

    it('rejects when a later page fails', async () => {
      axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, page(101, ['a']));
      axiosMock.onGet(apiUrls.categoriesPage(2)).reply(500);
      await expect(getAllCategories()).rejects.toThrow();
    });
  });

  it('returns the course categories', async () => {
    axiosMock.onGet(apiUrls.courseCategories(COURSE_ID)).reply(200, [{ name: 'Road', slug: 'road' }]);
    expect(await getCourseCategories(COURSE_ID)).toEqual([{ name: 'Road', slug: 'road' }]);
  });

  it('posts the name to create and camel-cases the result', async () => {
    axiosMock.onPost(apiUrls.categories()).reply(201, { name: 'Road', slug: 'road', course_count: 0 });
    expect(await createCategory('Road')).toEqual({ name: 'Road', slug: 'road', courseCount: 0 });
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({ name: 'Road' });
  });

  it('patches the name to rename', async () => {
    axiosMock.onPatch(apiUrls.category('road')).reply(200, { name: 'Roads', slug: 'road', course_count: 1 });
    expect(await renameCategory('road', 'Roads')).toEqual({ name: 'Roads', slug: 'road', courseCount: 1 });
    expect(JSON.parse(axiosMock.history.patch[0].data)).toEqual({ name: 'Roads' });
  });

  it('deletes a category', async () => {
    axiosMock.onDelete(apiUrls.category('road')).reply(204);
    await deleteCategory('road');
    expect(axiosMock.history.delete.map(({ url }) => url)).toEqual([apiUrls.category('road')]);
  });

  it('posts the slug as `category` to assign', async () => {
    axiosMock.onPost(apiUrls.courseCategories(COURSE_ID)).reply(201, { name: 'Road', slug: 'road' });
    expect(await assignCategory(COURSE_ID, 'road')).toEqual({ name: 'Road', slug: 'road' });
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({ category: 'road' });
  });

  it('deletes the course category to unassign', async () => {
    axiosMock.onDelete(apiUrls.courseCategory(COURSE_ID, 'road')).reply(204);
    await unassignCategory(COURSE_ID, 'road');
    expect(axiosMock.history.delete.map(({ url }) => url)).toEqual([apiUrls.courseCategory(COURSE_ID, 'road')]);
  });

  it('lets errors reach the caller', async () => {
    axiosMock.onPost(apiUrls.categories()).reply(400, { name: ['Enter a category name.'] });
    await expect(createCategory('')).rejects.toMatchObject({ response: { status: 400 } });
  });
});
