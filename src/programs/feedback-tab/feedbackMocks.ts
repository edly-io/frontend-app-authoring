import type { Program } from '../data/types';

export type FeedbackRequestStatus = 'Pending' | 'Completed' | 'Not Submitted';
export type FeedbackQuestionType = 'star_rating' | 'textarea';

export interface FeedbackResponseAnswer {
  questionId: number;
  question: string;
  type: FeedbackQuestionType;
  value: number | string;
}

export interface FeedbackResponse {
  answers: FeedbackResponseAnswer[];
}

export interface FeedbackFormQuestion {
  id: number;
  type: FeedbackQuestionType;
  question: string;
  required: boolean;
  isDefault: boolean;
}

export interface FeedbackFormTemplate {
  id: number;
  name: string;
  questions: FeedbackFormQuestion[];
}

export interface FeedbackRequest {
  id: number;
  feedbackName: string;
  selectedFormId: number;
  selectedFormName: string;
  requestedBy: string;
  instructor: string;
  trainee: string;
  course: string;
  deadline: string;
  requestedOn: string;
  submittedOn: string | null;
  questions: FeedbackFormQuestion[];
  response: FeedbackResponse | null;
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

export interface InitiateFeedbackPayload {
  feedbackName: string;
  deadline: string;
  selectedForm: FeedbackFormTemplate;
}

export const CREATE_NEW_FORM_VALUE = '__create_new_form__';

export const defaultFeedbackFilters: FeedbackFiltersState = {
  feedbackName: 'All',
  instructor: '',
  trainee: '',
  status: 'All',
};

export const defaultNewFormQuestions: FeedbackFormQuestion[] = [
  {
    id: 1,
    type: 'star_rating',
    question: 'How would you rate the instructor\'s teaching quality?',
    required: true,
    isDefault: true,
  },
  {
    id: 2,
    type: 'textarea',
    question: 'Any further feedback?',
    required: false,
    isDefault: true,
  },
];

export const mockFeedbackFormQuestions: FeedbackFormQuestion[] = [
  {
    id: 1,
    type: 'star_rating',
    question: 'How would you rate the instructor\'s teaching quality?',
    required: true,
    isDefault: true,
  },
  {
    id: 2,
    type: 'star_rating',
    question: 'How would you rate the course content and learning material?',
    required: true,
    isDefault: true,
  },
  {
    id: 3,
    type: 'star_rating',
    question: 'How would you rate the instructor\'s availability and support?',
    required: true,
    isDefault: true,
  },
  {
    id: 4,
    type: 'textarea',
    question: 'Any further feedback?',
    required: false,
    isDefault: true,
  },
];

export const mockFeedbackForms: FeedbackFormTemplate[] = [
  {
    id: 1,
    name: 'Mid-Course Feedback Form',
    questions: mockFeedbackFormQuestions,
  },
  {
    id: 2,
    name: 'End of Course Feedback Form',
    questions: [
      ...mockFeedbackFormQuestions,
      {
        id: 5,
        type: 'star_rating',
        question: 'How confident are you applying what you learned?',
        required: false,
        isDefault: false,
      },
    ],
  },
  {
    id: 3,
    name: 'Instructor Evaluation Form',
    questions: [
      {
        id: 1,
        type: 'star_rating',
        question: 'How would you rate the instructor\'s clarity of explanations?',
        required: true,
        isDefault: true,
      },
      {
        id: 2,
        type: 'star_rating',
        question: 'How would you rate the instructor\'s responsiveness to trainee questions?',
        required: true,
        isDefault: true,
      },
      {
        id: 3,
        type: 'textarea',
        question: 'What should the instructor continue doing?',
        required: false,
        isDefault: true,
      },
    ],
  },
];

export const cloneFeedbackQuestions = (
  questions: FeedbackFormQuestion[] = mockFeedbackFormQuestions,
): FeedbackFormQuestion[] => questions.map((question) => ({ ...question }));

export const cloneFeedbackForm = (form: FeedbackFormTemplate): FeedbackFormTemplate => ({
  ...form,
  questions: cloneFeedbackQuestions(form.questions),
});

const uniqueSorted = (values: string[]) => [...new Set(values)].sort((left, right) => left.localeCompare(right));

const buildResponseAnswers = (
  questions: FeedbackFormQuestion[],
  starRatings: number[],
  comment: string,
): FeedbackResponseAnswer[] => {
  let starRatingIndex = 0;

  return questions.map((question) => {
    if (question.type === 'star_rating') {
      const value = starRatings[starRatingIndex] ?? 0;
      starRatingIndex += 1;
      return {
        questionId: question.id,
        question: question.question,
        type: question.type,
        value,
      };
    }

    return {
      questionId: question.id,
      question: question.question,
      type: question.type,
      value: comment,
    };
  });
};

const createHistoricalFeedbackRequests = (): FeedbackRequest[] => {
  const midCourseForm = cloneFeedbackForm(mockFeedbackForms[0]);
  const endCourseForm = cloneFeedbackForm(mockFeedbackForms[1]);
  const instructorEvalForm = cloneFeedbackForm(mockFeedbackForms[2]);

  return [
    {
      id: 1,
      feedbackName: 'Mid-Course Feedback',
      selectedFormId: midCourseForm.id,
      selectedFormName: midCourseForm.name,
      requestedBy: 'Program Admin',
      instructor: 'Instructor A',
      trainee: 'Trainee One',
      course: 'Programming Fundamentals',
      deadline: 'Jun 12, 2026',
      requestedOn: 'Jun 02, 2026 09:00 AM',
      submittedOn: null,
      questions: cloneFeedbackQuestions(midCourseForm.questions),
      response: null,
    },
    {
      id: 2,
      feedbackName: 'Mid-Course Feedback',
      selectedFormId: midCourseForm.id,
      selectedFormName: midCourseForm.name,
      requestedBy: 'Program Admin',
      instructor: 'Instructor B',
      trainee: 'Trainee One',
      course: 'Programming Fundamentals',
      deadline: 'Jun 05, 2026',
      requestedOn: 'Jun 02, 2026 09:05 AM',
      submittedOn: null,
      questions: cloneFeedbackQuestions(midCourseForm.questions),
      response: null,
    },
    {
      id: 3,
      feedbackName: 'Instructor Evaluation - Week 2',
      selectedFormId: instructorEvalForm.id,
      selectedFormName: instructorEvalForm.name,
      requestedBy: 'newAdmin',
      instructor: 'Instructor A',
      trainee: 'Trainee Two',
      course: 'Web Development Basics',
      deadline: 'Jun 18, 2026',
      requestedOn: 'Jun 03, 2026 11:15 AM',
      submittedOn: 'Jun 04, 2026 01:20 PM',
      questions: cloneFeedbackQuestions(instructorEvalForm.questions),
      response: {
        answers: buildResponseAnswers(
          instructorEvalForm.questions,
          [5, 4],
          'The instructor explained the concepts clearly and kept the sessions engaging.',
        ),
      },
    },
    {
      id: 4,
      feedbackName: 'End of Course Feedback',
      selectedFormId: endCourseForm.id,
      selectedFormName: endCourseForm.name,
      requestedBy: 'Program Admin',
      instructor: 'Instructor C',
      trainee: 'Trainee Three',
      course: 'Database Design',
      deadline: 'Jun 07, 2026',
      requestedOn: 'Jun 01, 2026 10:30 AM',
      submittedOn: 'Jun 06, 2026 10:45 AM',
      questions: cloneFeedbackQuestions(endCourseForm.questions),
      response: {
        answers: buildResponseAnswers(
          endCourseForm.questions,
          [4, 5, 4, 4],
          'The course material was useful and well organized.',
        ),
      },
    },
    {
      id: 5,
      feedbackName: 'End of Course Feedback',
      selectedFormId: endCourseForm.id,
      selectedFormName: endCourseForm.name,
      requestedBy: 'Program Admin',
      instructor: 'Instructor B',
      trainee: 'Trainee Four',
      course: 'Advanced JavaScript',
      deadline: 'Jun 08, 2026',
      requestedOn: 'Jun 03, 2026 02:00 PM',
      submittedOn: null,
      questions: cloneFeedbackQuestions(endCourseForm.questions),
      response: null,
    },
  ];
};

const formatCourseNames = (program: Program): string[] => {
  if (program.courses && program.courses.length > 0) {
    return program.courses.map((course) => course.displayName);
  }

  return [
    'Programming Fundamentals',
    'Web Development Basics',
    'Database Design',
  ];
};

const createNewBatchRequests = (
  program: Program,
  payload: InitiateFeedbackPayload,
): FeedbackRequest[] => {
  const courseNames = formatCourseNames(program);
  const requestedOn = 'Jun 09, 2026 10:30 AM';

  return [
    {
      id: 101,
      feedbackName: payload.feedbackName,
      selectedFormId: payload.selectedForm.id,
      selectedFormName: payload.selectedForm.name,
      requestedBy: 'newAdmin',
      instructor: 'Instructor A',
      trainee: 'Trainee One',
      course: courseNames[0] ?? 'Programming Fundamentals',
      deadline: payload.deadline,
      requestedOn,
      submittedOn: null,
      questions: cloneFeedbackQuestions(payload.selectedForm.questions),
      response: null,
    },
    {
      id: 102,
      feedbackName: payload.feedbackName,
      selectedFormId: payload.selectedForm.id,
      selectedFormName: payload.selectedForm.name,
      requestedBy: 'newAdmin',
      instructor: 'Instructor B',
      trainee: 'Trainee Two',
      course: courseNames[1] ?? courseNames[0] ?? 'Web Development Basics',
      deadline: payload.deadline,
      requestedOn,
      submittedOn: null,
      questions: cloneFeedbackQuestions(payload.selectedForm.questions),
      response: null,
    },
    {
      id: 103,
      feedbackName: payload.feedbackName,
      selectedFormId: payload.selectedForm.id,
      selectedFormName: payload.selectedForm.name,
      requestedBy: 'newAdmin',
      instructor: 'Instructor C',
      trainee: 'Trainee Three',
      course: courseNames[2] ?? courseNames[0] ?? 'Database Design',
      deadline: payload.deadline,
      requestedOn,
      submittedOn: null,
      questions: cloneFeedbackQuestions(payload.selectedForm.questions),
      response: null,
    },
  ];
};

const parseDate = (value: string) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getFeedbackStatus = (
  request: FeedbackRequest,
  referenceDate: Date = new Date(),
): FeedbackRequestStatus => {
  if (request.submittedOn) {
    return 'Completed';
  }

  const deadlineDate = parseDate(request.deadline);
  const normalizedReferenceDate = new Date(referenceDate);
  normalizedReferenceDate.setHours(0, 0, 0, 0);

  return deadlineDate < normalizedReferenceDate ? 'Not Submitted' : 'Pending';
};

export const initiateFeedbackRequests = (
  program: Program,
  payload: InitiateFeedbackPayload,
): FeedbackRequest[] => [
  ...createHistoricalFeedbackRequests(),
  ...createNewBatchRequests(program, payload),
];

export const getFeedbackFilterOptions = (requests: FeedbackRequest[]): FeedbackFilterOptions => ({
  feedbackNames: uniqueSorted(requests.map((request) => request.feedbackName)),
});

export const filterFeedbackRequests = (
  requests: FeedbackRequest[],
  filters: FeedbackFiltersState,
): FeedbackRequest[] => requests.filter((request) => {
  const status = getFeedbackStatus(request);
  const matchesFeedbackName = filters.feedbackName === 'All' || request.feedbackName === filters.feedbackName;
  const matchesInstructor = !filters.instructor.trim()
    || request.instructor.toLowerCase().includes(filters.instructor.trim().toLowerCase());
  const matchesTrainee = !filters.trainee.trim()
    || request.trainee.toLowerCase().includes(filters.trainee.trim().toLowerCase());
  const matchesStatus = filters.status === 'All' || status === filters.status;

  return matchesFeedbackName && matchesInstructor && matchesTrainee && matchesStatus;
});
