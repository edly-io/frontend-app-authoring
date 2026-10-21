import type MockAdapter from 'axios-mock-adapter';

import { apiUrls } from './data/api';

export const COURSE_ID = 'course-v1:Uber+101+2026';

export const ROAD = { name: 'Road Safety', slug: 'road-safety', course_count: 2 };
export const FIRE = { name: 'Fire Safety', slug: 'fire-safety', course_count: 1 };
export const DRIVING = { name: 'Driving', slug: 'driving', course_count: 0 };

/** Answer the category list (one page) and the course's assigned categories. */
export const mockLoaded = (
  axiosMock: MockAdapter,
  { categories = [DRIVING, FIRE, ROAD], assigned = [] as { name: string; slug: string; }[] } = {},
) => {
  axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, {
    count: categories.length,
    next: null,
    previous: null,
    results: categories,
  });
  axiosMock.onGet(apiUrls.courseCategories(COURSE_ID)).reply(200, assigned);
};

/** The requests of one method the mock has seen, as `[url, parsed body]`. */
export const requestsOf = (axiosMock: MockAdapter, method: 'post' | 'patch' | 'delete') => (
  axiosMock.history[method].map(({ url, data }) => [url, data ? JSON.parse(data) : undefined])
);
