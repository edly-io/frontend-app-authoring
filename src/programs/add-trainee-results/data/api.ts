// The trainee roster (`getProgramTrainees`) and edX course scores
// (`getTraineeCourseScores`) below are real backend calls. Saving/finalizing
// a result (`getTraineeResult` / `saveTraineeResult` / `finalizeTraineeResult`)
// is still MOCK-only (see Program Result Management mock-only requirement) —
// those are served from in-memory state with simulated latency until the
// backend endpoints ship. All components call only the hooks in
// apiHooks.ts, and every function below keeps its original signature/Promise
// contract so swapping the mock functions for real calls later is a no-op
// for the rest of the app.
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { MockHttpError, mockNotFound, simulateLatency } from '../../data/mockUtils';
import type {
  CourseModuleScore,
  CourseScore,
  SaveTraineeResultInput,
  TraineeCourseScores,
  TraineeResult,
  TraineeResultStatus,
  TraineeSummary,
} from './types';

interface SeedResult {
  status: TraineeResultStatus;
  scores: { subsectionId: number; marksAwarded: number }[];
  updatedAt: string;
}

// trainee-004 / trainee-005 are intentionally absent — they have not been
// scored yet, so `getTraineeResult` will 404 for them (the form then starts
// at zero, same as a real "no result saved yet" response).
const SEED_RESULTS: Record<string, SeedResult> = {
  'trainee-001': {
    status: 'in_progress',
    scores: [
      { subsectionId: 11, marksAwarded: 16 },
      { subsectionId: 12, marksAwarded: 14 },
      { subsectionId: 21, marksAwarded: 20 },
      { subsectionId: 22, marksAwarded: 10 },
      { subsectionId: 31, marksAwarded: 9 },
      { subsectionId: 32, marksAwarded: 8 },
    ],
    updatedAt: '2026-07-15T09:30:00.000Z',
  },
  'trainee-002': {
    status: 'in_progress',
    scores: [
      { subsectionId: 11, marksAwarded: 12 },
      { subsectionId: 21, marksAwarded: 18 },
    ],
    updatedAt: '2026-07-14T11:00:00.000Z',
  },
  'trainee-003': {
    status: 'finalized',
    scores: [
      { subsectionId: 11, marksAwarded: 18 },
      { subsectionId: 12, marksAwarded: 19 },
      { subsectionId: 21, marksAwarded: 24 },
      { subsectionId: 22, marksAwarded: 14 },
      { subsectionId: 31, marksAwarded: 10 },
      { subsectionId: 32, marksAwarded: 10 },
    ],
    updatedAt: '2026-07-10T08:00:00.000Z',
  },
};

// In-memory store keyed by programKey; seeded lazily on first access so the
// mock works regardless of which program is selected.
const resultStore = new Map<string, Map<string, TraineeResult>>();

const cloneResult = (result: TraineeResult): TraineeResult => ({
  ...result,
  scores: result.scores.map((score) => ({ ...score })),
});

const getOrCreateProgramResults = (programKey: string): Map<string, TraineeResult> => {
  if (!resultStore.has(programKey)) {
    const seeded = new Map<string, TraineeResult>();
    Object.entries(SEED_RESULTS).forEach(([traineeId, seed]) => {
      seeded.set(traineeId, {
        traineeId,
        programKey,
        status: seed.status,
        scores: seed.scores.map((score) => ({ ...score })),
        grandTotal: seed.scores.reduce((sum, score) => sum + score.marksAwarded, 0),
        updatedAt: seed.updatedAt,
      });
    });
    resultStore.set(programKey, seeded);
  }
  return resultStore.get(programKey) as Map<string, TraineeResult>;
};

const getProgramsBaseUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/programs`;
const getProgramResultsBaseUrl = () => `${getConfig().LMS_BASE_URL}/fbr/api/program-results`;
const getCourseScoresUrl = (programKey: string, traineeId: string) => (
  `${getProgramResultsBaseUrl()}/${programKey}/trainees/${traineeId}/course-scores/`
);

// ── Response → TraineeSummary transformation ─────────────────────────────────
// Shared UserSerializer shape ({username, email, first_name, last_name}), same
// convention as `toUser` in `../../data/api.ts`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toTraineeSummary = (d: any): TraineeSummary => ({
  id: d.username,
  username: d.username,
  email: d.email,
  name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.username,
});

// ── Response → CourseScore transformation ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCourseModuleScore = (d: any): CourseModuleScore => ({
  name: d.name,
  weight: Number(d.weight),
  grade: Number(d.grade),
  weightedGrade: Number(d.weighted_grade),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCourseScore = (d: any): CourseScore => ({
  courseId: d.course_id,
  courseCode: d.course_code,
  courseName: d.course_name,
  percent: Number(d.percent),
  passed: !!d.passed,
  letterGrade: d.letter_grade ?? null,
  moduleCount: Number(d.module_count),
  modules: (d.modules ?? []).map(toCourseModuleScore),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toTraineeCourseScores = (d: any): TraineeCourseScores => ({
  programKey: d.program_key,
  aggregatePercent: Number(d.aggregate_percent),
  courses: (d.courses ?? []).map(toCourseScore),
});

// ── Trainee roster — GET /fbr/api/programs/users/?role=trainee&program_key=<pk>&no_page ──
export const getProgramTrainees = async (programKey: string): Promise<TraineeSummary[]> => {
  const { data } = await getAuthenticatedHttpClient().get(
    `${getProgramsBaseUrl()}/users/`,
    { params: { role: 'trainee', program_key: programKey, no_page: true } },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = Array.isArray(data) ? data : (data.results ?? []);
  return results.map(toTraineeSummary);
};

// ── edX course scores — GET /fbr/api/program-results/<pk>/trainees/<username>/course-scores/ ──
export const getTraineeCourseScores = async (programKey: string, traineeId: string): Promise<TraineeCourseScores> => {
  const { data } = await getAuthenticatedHttpClient().get(getCourseScoresUrl(programKey, traineeId));
  return toTraineeCourseScores(data);
};

export const getTraineeResult = async (programKey: string, traineeId: string): Promise<TraineeResult> => {
  await simulateLatency();
  const result = getOrCreateProgramResults(programKey).get(traineeId);
  if (!result) {
    return mockNotFound(`No saved result for trainee ${traineeId}`);
  }
  return cloneResult(result);
};

export const saveTraineeResult = async (
  programKey: string,
  traineeId: string,
  input: SaveTraineeResultInput,
): Promise<TraineeResult> => {
  await simulateLatency(200);
  const programResults = getOrCreateProgramResults(programKey);
  const existing = programResults.get(traineeId);
  if (existing?.status === 'finalized') {
    throw new MockHttpError(403, 'This result has been finalized and can no longer be edited.');
  }
  const updated: TraineeResult = {
    traineeId,
    programKey,
    status: existing?.status ?? 'in_progress',
    scores: input.scores.map((score) => ({ ...score })),
    grandTotal: input.scores.reduce((sum, score) => sum + score.marksAwarded, 0),
    updatedAt: new Date().toISOString(),
  };
  programResults.set(traineeId, updated);
  return cloneResult(updated);
};

export const finalizeTraineeResult = async (programKey: string, traineeId: string): Promise<TraineeResult> => {
  await simulateLatency();
  const programResults = getOrCreateProgramResults(programKey);
  const existing = programResults.get(traineeId);
  const finalized: TraineeResult = {
    traineeId,
    programKey,
    status: 'finalized',
    scores: existing?.scores.map((score) => ({ ...score })) ?? [],
    grandTotal: existing?.grandTotal ?? 0,
    updatedAt: new Date().toISOString(),
  };
  programResults.set(traineeId, finalized);
  return cloneResult(finalized);
};
