import type { AxiosError } from 'axios';
import type { FormikErrors } from 'formik';
import type { MessageDescriptor } from 'react-intl';

import { SLOT_KEYS } from './constants';
import type { CourseItem } from './curriculums/CourseOrderList';
import messages from './messages';
import type {
  BadgeKind,
  Curriculum,
  CurriculumWriteData,
  SlotKey,
} from './types';

/** Slot key → display messages. Raw API slot values are never shown. */
export const slotMessages: Record<SlotKey, { label: MessageDescriptor; rule: MessageDescriptor; }> = {
  complete: { label: messages.slotComplete, rule: messages.slotCompleteRule },
  retained: { label: messages.slotRetained, rule: messages.slotRetainedRule },
};

/** Badge kind → display messages. Raw API kind values are never shown. */
export const kindMessages: Record<BadgeKind, { label: MessageDescriptor; help: MessageDescriptor; }> = {
  curriculum: { label: messages.kindCurriculum, help: messages.kindCurriculumHelp },
  course: { label: messages.kindCourse, help: messages.kindCourseHelp },
};

export interface CurriculumFormValues {
  title: string;
  description: string;
  courses: CourseItem[];
  knowledgeCheck: CourseItem | null;
  knowledgeCheckDelayDays: '15' | '30';
  /** Slot -> badge UUID, or '' for no badge. */
  badges: Record<SlotKey, string>;
}

export const toCurriculumFormValues = (curriculum?: Curriculum): CurriculumFormValues => {
  if (!curriculum) {
    return {
      title: '',
      description: '',
      courses: [],
      knowledgeCheck: null,
      knowledgeCheckDelayDays: '30',
      badges: { complete: '', retained: '' },
    };
  }
  return {
    title: curriculum.title,
    description: curriculum.description,
    courses: curriculum.courses.map((course) => ({
      id: course.courseId,
      displayName: course.displayName,
      exists: course.exists,
    })),
    knowledgeCheck: {
      id: curriculum.knowledgeCheck.courseId,
      displayName: curriculum.knowledgeCheck.displayName,
      exists: curriculum.knowledgeCheck.exists,
    },
    knowledgeCheckDelayDays: String(curriculum.knowledgeCheckDelayDays) === '15' ? '15' : '30',
    badges: {
      complete: curriculum.badges.complete?.uuid ?? '',
      retained: curriculum.badges.retained?.uuid ?? '',
    },
  };
};

export const toCurriculumWriteData = (values: CurriculumFormValues): CurriculumWriteData => ({
  title: values.title.trim(),
  description: values.description.trim(),
  courseIds: values.courses.map((course) => course.id),
  knowledgeCheckCourseId: values.knowledgeCheck?.id ?? '',
  knowledgeCheckDelayDays: Number(values.knowledgeCheckDelayDays),
  badges: {
    complete: values.badges.complete || null,
    retained: values.badges.retained || null,
  },
});

const firstMessage = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return value.length ? String(value[0]) : undefined;
  }
  return typeof value === 'string' ? value : undefined;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

/** The DRF field-error body of a 400, or null for anything else (network error, 5xx, 403…). */
const badRequestBody = (error: unknown): Record<string, unknown> | null => {
  const response = (error as AxiosError | undefined)?.response;
  if (response?.status !== 400 || !isPlainObject(response.data)) {
    return null;
  }
  return response.data;
};

const formLevelErrors = (body: Record<string, unknown>, extra: unknown[] = []): string | null => {
  const found = [...extra, body.non_field_errors, body.detail]
    .map(firstMessage)
    .filter((message): message is string => !!message);
  return found.length ? found.join(' ') : null;
};

export interface MappedCurriculumErrors {
  fieldErrors: FormikErrors<CurriculumFormValues>;
  /** Keyed by course key, mapped from the list index the server used. */
  rowErrors: Record<string, string>;
  formError: string | null;
}

/**
 * Map a 400 from the curriculum API onto Formik fields. Keys are mapped explicitly;
 * never camelCaseObject the body (keys like course ids would be mangled).
 */
export const mapCurriculumErrors = (error: unknown, courseIds: string[]): MappedCurriculumErrors | null => {
  const body = badRequestBody(error);
  if (!body) {
    return null;
  }
  const fieldErrors: Record<string, unknown> = {};
  const rowErrors: Record<string, string> = {};
  const setField = (formKey: string, value: unknown) => {
    const message = firstMessage(value);
    if (message) {
      fieldErrors[formKey] = message;
    }
  };

  setField('title', body.title);
  setField('description', body.description);
  setField('knowledgeCheck', body.knowledge_check_course_id);
  setField('knowledgeCheckDelayDays', body.knowledge_check_delay_days);

  if (isPlainObject(body.course_ids)) {
    Object.entries(body.course_ids).forEach(([index, value]) => {
      const message = firstMessage(value);
      const courseId = courseIds[Number(index)];
      if (message && courseId) {
        rowErrors[courseId] = message;
      }
    });
  } else {
    setField('courses', body.course_ids);
  }

  // badges: {<slot>: [msg]} goes onto that slot's select; an unknown slot or a list-level error goes to the form.
  const extraFormErrors: unknown[] = [];
  if (isPlainObject(body.badges)) {
    const slotErrors: Record<string, string> = {};
    Object.entries(body.badges).forEach(([slot, value]) => {
      const message = firstMessage(value);
      if (!message) {
        return;
      }
      if ((SLOT_KEYS as readonly string[]).includes(slot)) {
        slotErrors[slot] = message;
      } else {
        extraFormErrors.push(message);
      }
    });
    if (Object.keys(slotErrors).length) {
      fieldErrors.badges = slotErrors;
    }
  } else {
    extraFormErrors.push(body.badges);
  }

  return {
    fieldErrors: fieldErrors as FormikErrors<CurriculumFormValues>,
    rowErrors,
    formError: formLevelErrors(body, extraFormErrors),
  };
};

export interface MappedBadgeErrors {
  fieldErrors: Record<string, string>;
  /** Keyed by course key, mapped from the `course_ids` list index the server used. */
  rowErrors: Record<string, string>;
  formError: string | null;
}

export const mapBadgeErrors = (error: unknown, courseIds: string[] = []): MappedBadgeErrors | null => {
  const body = badRequestBody(error);
  if (!body) {
    return null;
  }
  const fieldErrors: Record<string, string> = {};
  const rowErrors: Record<string, string> = {};
  (['kind', 'title', 'description', 'image'] as const).forEach((key) => {
    const message = firstMessage(body[key]);
    if (message) {
      fieldErrors[key] = message;
    }
  });
  if (isPlainObject(body.course_ids)) {
    Object.entries(body.course_ids).forEach(([index, value]) => {
      const message = firstMessage(value);
      const courseId = courseIds[Number(index)];
      if (message && courseId) {
        rowErrors[courseId] = message;
      }
    });
  } else {
    const message = firstMessage(body.course_ids);
    if (message) {
      fieldErrors.courses = message;
    }
  }
  return { fieldErrors, rowErrors, formError: formLevelErrors(body, [body.remove_image]) };
};
