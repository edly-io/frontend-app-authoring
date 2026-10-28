import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import type {
  DiffNodeData,
  DiffResult,
  FieldChangeData,
  JsonDiffData,
  PublishHistoryStatus,
  VersionsPage,
} from '@src/publish-history/types';
import { PREVIOUS } from '@src/publish-history/types';

export const VERSIONS_PAGE_SIZE = 20;

const makeUrl = (path: string, searchParams?: Record<string, string | number>): string => {
  const url = new URL(`api/uber/publish_history/v1/${path}`, getConfig().STUDIO_BASE_URL);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => url.searchParams.append(key, String(value)));
  }
  return url.href;
};

export const apiUrls = {
  status: (courseId: string) => makeUrl('status/', { course_id: courseId }),
  versions: (courseId: string, after?: string) => (
    makeUrl(`courses/${encodeURIComponent(courseId)}/versions/`, {
      page_size: VERSIONS_PAGE_SIZE,
      ...(after ? { after } : {}),
    })
  ),
  diff: (courseId: string, version: string, against: string) => (
    makeUrl(`courses/${encodeURIComponent(courseId)}/diff/`, {
      version,
      // `previous` is the page's name for "no `against`": the API then picks the version before `version`.
      ...(against === PREVIOUS ? {} : { against }),
    })
  ),
  /** The HTML page of one component at `version` (a version id, `published` or `draft`), for a sandboxed iframe. */
  render: (courseId: string, usageKey: string, version: string) => (
    makeUrl(`courses/${encodeURIComponent(courseId)}/render/`, { usage_key: usageKey, version })
  ),
};

export async function getStatus(courseId: string): Promise<PublishHistoryStatus> {
  const { data } = await getAuthenticatedHttpClient().get(apiUrls.status(courseId));
  return { enabled: !!data.enabled, canView: !!data.can_view };
}

export async function getVersions(courseId: string, after?: string): Promise<VersionsPage> {
  const { data } = await getAuthenticatedHttpClient().get(apiUrls.versions(courseId, after));
  const nextAfter = data.next ? new URL(data.next).searchParams.get('after') : null;
  return {
    nextAfter,
    results: camelCaseObject(data.results),
    historyEnds: data.history_ends,
  };
}

// Values (`old`, `new`) and JSON paths are authored data with arbitrary keys, so they are never camelCased.
const toJsonDiff = (diff: any): JsonDiffData => ({
  changes: diff.changes.map((change: any) => ({
    path: change.path,
    oldPath: change.old_path,
    op: change.op,
    old: change.old,
    new: change.new,
    tooLarge: change.too_large,
  })),
  unchanged: diff.unchanged,
  truncated: diff.truncated,
});

const toField = (field: any): FieldChangeData => ({
  name: field.name,
  scope: field.scope,
  old: field.old,
  new: field.new,
  textDiff: field.text_diff ? camelCaseObject(field.text_diff) : null,
  jsonDiff: field.json_diff ? toJsonDiff(field.json_diff) : null,
  tooLarge: field.too_large,
  tooLargeReason: field.too_large_reason ?? null,
});

const toNode = (node: any): DiffNodeData => ({
  usageKey: node.usage_key,
  blockType: node.block_type,
  displayName: node.display_name,
  change: node.change,
  editor: node.editor,
  editorApproximate: node.editor_approximate,
  move: node.move ? camelCaseObject(node.move) : null,
  fields: node.fields.map(toField),
  children: node.children.map(toNode),
});

export async function getDiff(courseId: string, version: string, against: string): Promise<DiffResult> {
  const { data } = await getAuthenticatedHttpClient().get(apiUrls.diff(courseId, version, against));
  return {
    from: camelCaseObject(data.from),
    to: camelCaseObject(data.to),
    identical: data.identical,
    totalChanges: data.total_changes,
    truncated: data.truncated,
    budgetExhausted: !!data.budget_exhausted,
    tree: data.tree.map(toNode),
  };
}
