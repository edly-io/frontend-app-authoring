import type MockAdapter from 'axios-mock-adapter';

import { apiUrls } from './data/api';

export const COURSE_ID = 'course-v1:Uber+101+2026';

export const ROAD = { id: 1, name: 'Road safety' };
export const NIGHT = { id: 2, name: 'Night driving' };
export const AIRPORT = { id: 3, name: 'Airport' };

/** Answer the course's assigned tags. */
export const mockCourseTags = (axiosMock: MockAdapter, assigned: { id: number; name: string; }[] = []) => {
  axiosMock.onGet(apiUrls.courseTags(COURSE_ID)).reply(200, assigned);
};

/** Answer the suggestions request for one search term. */
export const mockSuggestions = (axiosMock: MockAdapter, term: string, tags: { id: number; name: string; }[]) => {
  axiosMock.onGet(apiUrls.suggestions(COURSE_ID, term)).reply(200, tags);
};

/** The requests of one method the mock has seen, as `[url, parsed body]`. */
export const requestsOf = (axiosMock: MockAdapter, method: 'post' | 'delete') => (
  axiosMock.history[method].map(({ url, data }) => [url, data ? JSON.parse(data) : undefined])
);

/** `n` tags named `tag 000`... for the limit tests. */
export const manyTags = (n: number) => (
  Array.from({ length: n }, (_, i) => ({ id: 1000 + i, name: `tag ${String(i).padStart(3, '0')}` }))
);
