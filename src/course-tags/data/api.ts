import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import type { CourseTagsStatus, Tag } from '@src/course-tags/types';

const makeUrl = (path: string, searchParams?: Record<string, string>): string => {
  const url = new URL(`api/uber/course_tags/v1/${path}`, getConfig().STUDIO_BASE_URL);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => url.searchParams.append(key, value));
  }
  return url.href;
};

const coursePath = (courseId: string) => `courses/${encodeURIComponent(courseId)}`;

export const apiUrls = {
  status: (courseId: string) => makeUrl('status/', { course_id: courseId }),
  courseTags: (courseId: string) => makeUrl(`${coursePath(courseId)}/tags/`),
  courseTag: (courseId: string, tagId: number) => makeUrl(`${coursePath(courseId)}/tags/${tagId}/`),
  suggestions: (courseId: string, search: string) => (
    makeUrl(`${coursePath(courseId)}/tag-suggestions/`, { search })
  ),
};

export async function getStatus(courseId: string): Promise<CourseTagsStatus> {
  const { data } = await getAuthenticatedHttpClient().get<{ enabled?: boolean; can_assign?: boolean; }>(
    apiUrls.status(courseId),
  );
  return { enabled: !!data.enabled, canAssign: !!data.can_assign };
}

export async function getCourseTags(courseId: string): Promise<Tag[]> {
  const { data } = await getAuthenticatedHttpClient().get<Tag[]>(apiUrls.courseTags(courseId));
  return data;
}

/** Existing tags whose name contains `search`, without the course's own tags (at most 20, best match first). */
export async function getTagSuggestions(courseId: string, search: string): Promise<Tag[]> {
  const { data } = await getAuthenticatedHttpClient().get<Tag[]>(apiUrls.suggestions(courseId, search));
  return data;
}

/** Assign the tag named `name` (ignoring case) to the course; the server creates it when no tag has that name. */
export async function assignTag(courseId: string, name: string): Promise<Tag> {
  const { data } = await getAuthenticatedHttpClient().post<Tag>(apiUrls.courseTags(courseId), { name });
  return data;
}

export async function unassignTag(courseId: string, tagId: number): Promise<void> {
  await getAuthenticatedHttpClient().delete(apiUrls.courseTag(courseId, tagId));
}
