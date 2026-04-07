import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { camelCaseObject } from '@edx/frontend-platform/utils';

import type { BlockReviewComment, BlockReviewState, CourseAggregateState } from './types';

const getLifecycleBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/lifecycle`;

export async function getBlockState(usageKey: string): Promise<BlockReviewState> {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getLifecycleBaseUrl()}/v1/blocks/${encodeURIComponent(usageKey)}/state`,
  );
  return camelCaseObject(data) as BlockReviewState;
}

export async function getCourseAggregateState(courseId: string): Promise<CourseAggregateState> {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getLifecycleBaseUrl()}/v1/courses/${encodeURIComponent(courseId)}/state`,
  );
  return camelCaseObject(data) as CourseAggregateState;
}

export async function getBulkCourseAggregateStates(courseIds: string[]): Promise<Record<string, string>> {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getLifecycleBaseUrl()}/v1/courses/states`,
    { params: { course_ids: courseIds.join(',') } },
  );
  return data as Record<string, string>;
}

export async function submitForReview(usageKey: string): Promise<BlockReviewState> {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getLifecycleBaseUrl()}/v1/blocks/${encodeURIComponent(usageKey)}/submit`,
  );
  return camelCaseObject(data) as BlockReviewState;
}

export async function approveBlock(usageKey: string): Promise<BlockReviewState> {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getLifecycleBaseUrl()}/v1/blocks/${encodeURIComponent(usageKey)}/approve`,
  );
  return camelCaseObject(data) as BlockReviewState;
}

export async function requestChanges(usageKey: string): Promise<BlockReviewState> {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getLifecycleBaseUrl()}/v1/blocks/${encodeURIComponent(usageKey)}/request-changes`,
  );
  return camelCaseObject(data) as BlockReviewState;
}

export async function publishBlock(usageKey: string): Promise<BlockReviewState> {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getLifecycleBaseUrl()}/v1/blocks/${encodeURIComponent(usageKey)}/publish`,
  );
  return camelCaseObject(data) as BlockReviewState;
}

export async function submitCourseForReview(courseId: string): Promise<{ transitioned: number }> {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getLifecycleBaseUrl()}/v1/courses/${encodeURIComponent(courseId)}/submit`,
  );
  return data;
}

export async function approveCourse(courseId: string): Promise<{ transitioned: number }> {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getLifecycleBaseUrl()}/v1/courses/${encodeURIComponent(courseId)}/approve`,
  );
  return data;
}

export async function requestCourseChanges(courseId: string): Promise<{ transitioned: number }> {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getLifecycleBaseUrl()}/v1/courses/${encodeURIComponent(courseId)}/request-changes`,
  );
  return data;
}

export async function publishCourse(courseId: string): Promise<{ status: string }> {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getLifecycleBaseUrl()}/v1/courses/${encodeURIComponent(courseId)}/publish`,
  );
  return data;
}

export async function getCourseComments(courseId: string): Promise<BlockReviewComment[]> {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getLifecycleBaseUrl()}/v1/courses/${encodeURIComponent(courseId)}/comments`,
  );
  return camelCaseObject(data) as BlockReviewComment[];
}

export async function createCourseComment(courseId: string, comment: string): Promise<BlockReviewComment> {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getLifecycleBaseUrl()}/v1/courses/${encodeURIComponent(courseId)}/comments`,
    { comment },
  );
  return camelCaseObject(data) as BlockReviewComment;
}

export async function getBlockComments(usageKey: string): Promise<BlockReviewComment[]> {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getLifecycleBaseUrl()}/v1/blocks/${encodeURIComponent(usageKey)}/comments`,
  );
  return camelCaseObject(data) as BlockReviewComment[];
}

export async function createComment(usageKey: string, comment: string): Promise<BlockReviewComment> {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getLifecycleBaseUrl()}/v1/blocks/${encodeURIComponent(usageKey)}/comments`,
    { comment },
  );
  return camelCaseObject(data) as BlockReviewComment;
}

export async function resolveComment(commentId: number): Promise<BlockReviewComment> {
  // Backend uses PATCH /v1/comments/{id} with { resolved: true } to resolve a comment
  const { data } = await getAuthenticatedHttpClient().patch(
    `${getLifecycleBaseUrl()}/v1/comments/${commentId}`,
    { resolved: true },
  );
  return camelCaseObject(data) as BlockReviewComment;
}

export async function deleteComment(commentId: number): Promise<void> {
  await getAuthenticatedHttpClient().delete(
    `${getLifecycleBaseUrl()}/v1/comments/${commentId}`,
  );
}
