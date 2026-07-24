/**
 * Real implementation of the Scoring Grid API (`program-results-scoring-api.md`):
 * `GET /trainees/scores/`, `PUT /trainees/scores/`, `POST /trainees/scores/finalize/`.
 *
 * Kept deliberately independent from `add-trainee-results/data/api.ts`: this API
 * contract explicitly supersedes the per-username scoring routes that module
 * used, so there is no shared code between the two.
 */
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import type {
  FinalizeScoresInput,
  FinalizeScoresResponse,
  FinalizeErrorCode,
  SaveScoreErrorCode,
  ScoreCell,
  ScoringGridParams,
  ScoringGridResponse,
  ScoringGridRow,
  ScoringSection,
  SaveScoresInput,
  SaveScoresTraineeInput,
  SaveScoresResponse,
  WriteEnvelopeError,
} from './types';

/** Matches the API doc's documented default (§2.1) unless the caller overrides it. */
const DEFAULT_PAGE_SIZE = 50;

/**
 * The API accepts 1-100 `trainees` per `PUT` (§2.2), but the grid batches in
 * smaller, steadier chunks so one "Save changed rows" click never sends an
 * oversized request even on a large page size.
 */
export const SAVE_SCORES_BATCH_SIZE = 25;

const getProgramResultsBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/program-results`;
const getEncodedProgramKey = (programKey: string) => encodeURIComponent(programKey);
const getScoresUrl = (programKey: string) => (
  `${getProgramResultsBaseUrl()}/${getEncodedProgramKey(programKey)}/trainees/scores/`
);
const getFinalizeUrl = (programKey: string) => `${getScoresUrl(programKey)}finalize/`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toScoreCell = (d: any): ScoreCell => ({
  subsectionId: d.id,
  title: d.title,
  maxMarks: Number(d.max_marks),
  score: d.score === null || d.score === undefined ? null : Number(d.score),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSection = (d: any): ScoringSection => ({
  id: d.id,
  title: d.title,
  total: Number(d.total),
  score: Number(d.score),
  subsections: (d.subsections ?? []).map(toScoreCell),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toScoringGridRow = (d: any): ScoringGridRow => ({
  username: d.username,
  fullName: d.full_name,
  avatar: d.avatar ?? '',
  // §5 "Open": the row shape has no enrollment id yet — fall back to blank
  // rather than inventing one, until the backend adds the field.
  enrollmentId: d.enrollment_id ?? '',
  rank: Number(d.rank),
  total: Number(d.total),
  targetTotal: Number(d.target_total),
  percent: Number(d.percent),
  result: d.result,
  status: d.status,
  sections: (d.sections ?? []).map(toSection),
});

const buildScoresQuery = (params: ScoringGridParams): string => {
  const query = new URLSearchParams();
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.scoreRange) {
    query.set('score_range', params.scoreRange);
  }
  query.set('page', String(params.page ?? 1));
  query.set('page_size', String(params.pageSize ?? DEFAULT_PAGE_SIZE));
  return query.toString();
};

export const getScoringGrid = async (
  programKey: string,
  params: ScoringGridParams = {},
): Promise<ScoringGridResponse> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getScoresUrl(programKey)}?${buildScoresQuery(params)}`,
  );
  return {
    count: Number(data.count),
    numPages: Number(data.num_pages),
    currentPage: Number(data.current_page),
    next: data.next ?? null,
    previous: data.previous ?? null,
    start: Number(data.start),
    results: (data.results ?? []).map(toScoringGridRow),
  };
};

const fromSaveScoresTrainee = (trainee: SaveScoresTraineeInput) => ({
  username: trainee.username,
  scores: trainee.scores.map((entry) => ({ subsection_id: entry.subsectionId, value: entry.value })),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toWriteEnvelopeError = <TCode extends string>(d: any): WriteEnvelopeError<TCode> => ({
  username: d.username,
  code: d.code,
  detail: d.detail,
});

const chunk = <T >(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/**
 * Bulk-saves via `PUT /trainees/scores/` (§2.2). De-dupes usernames (the API
 * rejects duplicates within one request) and chunks into batches of
 * `SAVE_SCORES_BATCH_SIZE` so any number of changed rows can be saved in one
 * call from the UI's point of view, regardless of the API's per-request cap.
 */
export const saveScores = async (
  programKey: string,
  input: SaveScoresInput,
): Promise<SaveScoresResponse> => {
  const uniqueTrainees = Array.from(
    new Map(input.trainees.map((trainee) => [trainee.username, trainee])).values(),
  );
  const batches = chunk(uniqueTrainees, SAVE_SCORES_BATCH_SIZE);

  const responses = await Promise.all(batches.map(async (batch) => {
    const { data } = await getAuthenticatedHttpClient().put(getScoresUrl(programKey), {
      trainees: batch.map(fromSaveScoresTrainee),
    });
    return data;
  }));

  return responses.reduce<SaveScoresResponse>((acc, data) => ({
    ok: [...acc.ok, ...(data.ok ?? [])],
    errors: [...acc.errors, ...(data.errors ?? []).map(toWriteEnvelopeError<SaveScoreErrorCode>)],
  }), { ok: [], errors: [] });
};

export const finalizeScores = async (
  programKey: string,
  input: FinalizeScoresInput = {},
): Promise<FinalizeScoresResponse> => {
  const body = input.usernames && input.usernames.length > 0 ? { usernames: input.usernames } : {};
  const { data } = await getAuthenticatedHttpClient().post(getFinalizeUrl(programKey), body);
  return {
    ok: data.ok ?? [],
    errors: (data.errors ?? []).map(toWriteEnvelopeError<FinalizeErrorCode>),
  };
};
