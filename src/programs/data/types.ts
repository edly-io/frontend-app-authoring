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

export interface ProgramTypeOption {
  id: number;
  name: string;
  slug: string;
}

export interface ProgramConfig {
  orgs: OrgOption[];
  programTypes: ProgramTypeOption[];
  statuses: string[];
}

export interface ProgramDetailResponse {
  program: Program;
  /** All target audiences available system-wide — used for the dropdown options. */
  availableAudiences: string[];
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
  instructorId?: number;
  instructorName: string;
  traineeId?: number;
  traineeName: string;
  courseId: string;
  deadline: string;
  requestedById?: number;
  requestedByName: string;
  submittedAt: string | null;
  status: FeedbackRequestStatus;
  response: FeedbackResponse | null;
  created: string;
}

export interface FeedbackFiltersState {
  feedbackName: string;
  instructor: string;
  trainee: string;
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
}
