export type { FbrRole, FbrUserProfile } from '@src/fbr-access/types';

export interface Course {
  id: string;
  displayName: string;
  org: string;
  run: string;
  targetAudience: string;
}

export interface PaginatedCourses {
  results: Course[];
  count: number;
  numPages: number;
}

export interface Program {
  id: string;
  displayName: string;
  org: string;
  programType: string;
  run: string;
  targetAudience: string;
  city?: string;
  shortDescription?: string;
  longDescription?: string;
  status?: string;
  isFeatured?: boolean;
  startDate?: string;
  endDate?: string;
  image?: string;
  courses?: Course[];
}

export interface OrgOption {
  id: number;
  name: string;
  shortName: string;
}

export interface CityOption {
  id: number;
  name: string;
}

export interface ProgramTypeOption {
  id: number;
  name: string;
  slug: string;
}

export interface ProgramConfig {
  orgs: OrgOption[];
  programTypes: ProgramTypeOption[];
  statuses: string[];
  cities: CityOption[];
}

export interface CreateProgramInput {
  displayName: string;
  org: string;
  programType: string;
  run: string;
  cityId?: number;
}

export interface ProgramCapabilities {
  canAccessPrograms: boolean;
  canCreateProgram: boolean;
  canEditProgram: boolean;
  canArchiveProgram: boolean;
  canManageCourses: boolean;
  canManageEnrollment: boolean;
  canManageInstructors: boolean;
  isReadOnly: boolean;
}

export interface ProgramDetailResponse {
  program: Program;
  /** All target audiences available system-wide — used for the dropdown options. */
  availableAudiences: string[];
  /** All cities available — returned by the detail endpoint alongside the program. */
  availableCities: CityOption[];
}

export interface Instructor {
  id: string; // = username, kept for React key prop
  username: string;
  email: string;
  name: string;
  role?: string;
}

export interface PaginatedInstructors {
  results: Instructor[];
  count: number;
  numPages: number;
}

export interface Learner {
  id: string; // = username
  username: string;
  email: string;
  name: string;
}

export interface PaginatedLearners {
  results: Learner[];
  count: number;
  numPages: number;
}

export interface Batch {
  id: string;
  name: string;
}

export type FeedbackRequestStatus = 'Pending' | 'Completed' | 'Not Submitted';
export type FeedbackQuestionType = 'star_rating' | 'textarea';

export interface FeedbackFormQuestion {
  id: number;
  type: FeedbackQuestionType;
  question: string;
  required: boolean;
  isDefault: boolean;
  order?: number;
  includeComment?: boolean;
}

export interface FeedbackFormTemplate {
  id: number;
  name: string;
  questions?: FeedbackFormQuestion[];
  isInUse: boolean;
  createdByName?: string;
  created?: string;
  modified?: string;
}

export interface FeedbackResponseAnswer {
  id: number;
  questionId?: number;
  question: string;
  type: FeedbackQuestionType;
  starValue: number | null;
  textValue: string | null;
}

export interface FeedbackResponse {
  submittedAt: string;
  answers: FeedbackResponseAnswer[];
}

export interface FeedbackRequest {
  id: number;
  feedbackName: string;
  formId: number;
  formName: string;
  subjectId?: number | null;
  subjectName: string | null;
  subjectRole?: string | null;
  subjectRoles?: string[];
  subjectEmail?: string | null;
  subjectAvatar?: string | null;
  reviewerId?: number;
  reviewerName: string;
  reviewerRole?: string | null;
  reviewerRoles?: string[];
  reviewerEmail?: string | null;
  reviewerAvatar?: string | null;
  courseId: string;
  deadline: string;
  requestedById?: number;
  requestedByName: string;
  requestedByRole?: string | null;
  requestedByRoles?: string[];
  requestedByEmail?: string | null;
  requestedByAvatar?: string | null;
  submittedAt: string | null;
  status: FeedbackRequestStatus;
  response: FeedbackResponse | null;
  created: string;
}

export interface FeedbackFiltersState {
  feedbackName: string;
  subject: string;
  reviewer: string;
  status: 'All' | FeedbackRequestStatus;
}

export interface FeedbackFilterOptions {
  feedbackNames: string[];
}

export interface CreateFeedbackFormInput {
  name: string;
  questions: FeedbackFormQuestion[];
}

export interface InitiateFeedbackPayload {
  feedbackName: string;
  deadline: string;
  formId: number;
  reviewerEmails: string[];
  subjectEmails?: string[];
}

export type RatingLevelKey = 'excellent' | 'veryGood' | 'good' | 'needsAttention';

export type RatingBandFilter = 'all' | 'top' | 'mid' | 'low';
export type DashboardViewMode = 'table' | 'cards';
export type DashboardAggregationMode = 'percentage' | 'count';

export interface RatingLevel {
  key: RatingLevelKey;
  label: string;
  shortLabel: string;
}

export interface RatingDistributionBucket {
  count: number;
  percentage: number;
}

export type RatingDistribution = Record<RatingLevelKey, RatingDistributionBucket> & {
  total?: number;
};

export interface FeedbackDashboardCriterion {
  id: string;
  label: string;
  order?: number;
}

export interface FeedbackDashboardCommentUser {
  id: string | number;
  name: string;
  email?: string;
  avatar?: string | null;
  roles?: string[];
}

export interface FeedbackDashboardComment {
  id: string | number;
  reviewer: FeedbackDashboardCommentUser;
  rating?: number | null;
  criterionId?: string;
  criterionLabel?: string;
  comment: string;
  createdAt?: string;
}

export interface FeedbackDashboardCommentsSummary {
  total: number;
  latest?: FeedbackDashboardComment | null;
}

export interface FeedbackDashboardSubject {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string | null;
  subtitle?: string;
  rating?: number | null;
  submittedResponses?: number;
  totalRequests?: number;
  distributions: Record<string, RatingDistribution>;
  averageDistribution?: RatingDistribution;
  commentsSummary?: FeedbackDashboardCommentsSummary;
}

export interface FeedbackDashboardSummary {
  subjectCount: number;
  submittedResponses: number;
  responseRate: number;
  averageRating: number;
  topSubjectName: string;
  topSubjectRating: number;
  needsAttentionCount: number;
}

export interface FeedbackDashboardReport {
  id: string;
  feedbackName: string;
  selectionValue?: string;
  programName: string;
  respondentsLabel: string;
  submittedResponses: number;
  totalRequests: number;
  responseRate: number;
  criteria: FeedbackDashboardCriterion[];
  subjects: FeedbackDashboardSubject[];
  summary?: FeedbackDashboardSummary;
}

export interface FeedbackDashboardInitiationOption {
  id: number;
  feedbackName: string;
  selectionValue: string;
  formId: number;
  formName: string;
  programKey: string;
  programName: string;
  deadline: string;
  created: string;
  totalRequests: number;
  submittedResponses: number;
  responseRate: number;
  subjectCount: number;
}

export interface FeedbackDashboardCommentsResponse {
  subject: FeedbackDashboardCommentUser;
  total: number;
  comments: FeedbackDashboardComment[];
}
