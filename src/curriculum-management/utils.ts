import type { AxiosError } from 'axios';
import type { FormikErrors } from 'formik';
import type { MessageDescriptor } from 'react-intl';

import { SLOT_KEYS } from './constants';
import type { CourseItem } from './curriculums/CourseOrderList';
import messages from './messages';
import type {
  BadgeKind,
  CourseGroup,
  CourseGroupWriteData,
  Curriculum,
  CurriculumWriteData,
  DeepLink,
  DeepLinkWriteData,
  LaunchTarget,
  PickedCourse,
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
  /** The learning path ID; on the create form it follows the title until the author edits it. */
  slug: string;
  title: string;
  description: string;
  image: File | null;
  removeImage: boolean;
  courses: CourseItem[];
  knowledgeCheck: CourseItem | null;
  knowledgeCheckDelayDays: '15' | '30';
  /** Slot -> badge UUID, or '' for no badge. */
  badges: Record<SlotKey, string>;
}

export const toCurriculumFormValues = (curriculum?: Curriculum): CurriculumFormValues => {
  if (!curriculum) {
    return {
      slug: '',
      title: '',
      description: '',
      image: null,
      removeImage: false,
      courses: [],
      knowledgeCheck: null,
      knowledgeCheckDelayDays: '30',
      badges: { complete: '', retained: '' },
    };
  }
  return {
    slug: curriculum.slug,
    title: curriculum.title,
    description: curriculum.description,
    image: null,
    removeImage: false,
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
  slug: values.slug.trim(),
  title: values.title.trim(),
  description: values.description.trim(),
  image: values.image,
  removeImage: values.removeImage && !values.image,
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

  setField('slug', body.slug);
  setField('title', body.title);
  setField('description', body.description);
  setField('image', body.image);
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

export interface CourseGroupFormValues {
  slug: string;
  title: string;
  description: string;
  courses: CourseItem[];
}

export const toCourseGroupFormValues = (group?: CourseGroup): CourseGroupFormValues => {
  if (!group) {
    return {
      slug: '',
      title: '',
      description: '',
      courses: [],
    };
  }
  return {
    slug: group.slug,
    title: group.title,
    description: group.description,
    courses: group.courses.map((course) => ({
      id: course.courseId,
      displayName: course.displayName,
      exists: course.exists,
    })),
  };
};

export const toCourseGroupWriteData = (values: CourseGroupFormValues): CourseGroupWriteData => ({
  slug: values.slug.trim(),
  title: values.title.trim(),
  description: values.description.trim(),
  courseIds: values.courses.map((course) => course.id),
});

export interface MappedCourseGroupErrors {
  fieldErrors: Record<string, string>;
  /** Keyed by course key, mapped from the `course_ids` list index the server used. */
  rowErrors: Record<string, string>;
  formError: string | null;
}

/** Map a 400 from the course groups API onto the form. Keys are mapped explicitly, never camelCased. */
export const mapCourseGroupErrors = (error: unknown, courseIds: string[]): MappedCourseGroupErrors | null => {
  const body = badRequestBody(error);
  if (!body) {
    return null;
  }
  const fieldErrors: Record<string, string> = {};
  const rowErrors: Record<string, string> = {};
  (['slug', 'title', 'description'] as const).forEach((key) => {
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
  return { fieldErrors, rowErrors, formError: formLevelErrors(body) };
};

export interface MappedTestLinkErrors {
  /** Keyed by form field: target, courseId, externalId, groups, ttl. */
  fieldErrors: Record<string, string>;
  formError: string | null;
}

const TEST_LINK_FIELDS: Record<string, string> = {
  target: 'target',
  course_id: 'courseId',
  path_id: 'pathId',
  external_id: 'externalId',
  groups: 'groups',
  ttl: 'ttl',
};

/** Map a 400 from the test links API onto the form fields; anything else is a form-level error. */
export const mapTestLinkErrors = (error: unknown): MappedTestLinkErrors | null => {
  const body = badRequestBody(error);
  if (!body) {
    return null;
  }
  const fieldErrors: Record<string, string> = {};
  Object.entries(TEST_LINK_FIELDS).forEach(([apiKey, formKey]) => {
    const message = firstMessage(body[apiKey]);
    if (message) {
      fieldErrors[formKey] = message;
    }
  });
  return { fieldErrors, formError: formLevelErrors(body) };
};

export interface DeepLinkFormValues {
  title: string;
  description: string;
  target: LaunchTarget;
  /** The course the link enrolls in; a course link needs one. */
  course: PickedCourse | null;
  /** Every learning path the link assigns, in the order picked. */
  pathIds: string[];
  /** The path a path link opens; '' means the first picked one. */
  openedPathId: string;
  groupSlugs: string[];
}

export const toDeepLinkFormValues = (link?: DeepLink): DeepLinkFormValues => {
  if (!link) {
    return {
      title: '',
      description: '',
      target: 'home',
      course: null,
      pathIds: [],
      openedPathId: '',
      groupSlugs: [],
    };
  }
  return {
    title: link.title,
    description: link.description,
    target: link.target,
    course: link.course
      ? { id: link.course.courseId, displayName: link.course.displayName ?? link.course.courseId }
      : null,
    pathIds: link.paths.map((path) => path.slug),
    // A saved path link lists the path it opens first.
    openedPathId: link.target === 'path' ? (link.paths[0]?.slug ?? '') : '',
    groupSlugs: link.groups.map((group) => group.slug),
  };
};

/** The path IDs as the link carries them: for a path link, the one it opens first (the first picked by default). */
export const orderedPathIds = (values: Pick<DeepLinkFormValues, 'target' | 'pathIds' | 'openedPathId'>): string[] => {
  if (values.target !== 'path' || !values.pathIds.includes(values.openedPathId)) {
    return values.pathIds;
  }
  return [values.openedPathId, ...values.pathIds.filter((id) => id !== values.openedPathId)];
};

export const toDeepLinkWriteData = (values: DeepLinkFormValues): DeepLinkWriteData => ({
  title: values.title.trim(),
  description: values.description.trim(),
  target: values.target,
  courseId: values.course?.id ?? '',
  pathIds: orderedPathIds(values),
  groups: values.groupSlugs,
});

export interface MappedDeepLinkErrors {
  /** Keyed by form field: title, description, target, course, pathIds, groupSlugs. */
  fieldErrors: Record<string, string>;
  formError: string | null;
}

const DEEP_LINK_FIELDS: Record<string, string> = {
  title: 'title',
  description: 'description',
  target: 'target',
  course_id: 'course',
  path_ids: 'pathIds',
  groups: 'groupSlugs',
};

/** Map a 400 from the deep links API onto the form fields; anything else is a form-level error. */
export const mapDeepLinkErrors = (error: unknown): MappedDeepLinkErrors | null => {
  const body = badRequestBody(error);
  if (!body) {
    return null;
  }
  const fieldErrors: Record<string, string> = {};
  Object.entries(DEEP_LINK_FIELDS).forEach(([apiKey, formKey]) => {
    const message = firstMessage(body[apiKey]);
    if (message) {
      fieldErrors[formKey] = message;
    }
  });
  return { fieldErrors, formError: formLevelErrors(body) };
};

/**
 * The deep link the Uber app opens for a destination: `<base>?target=<target>` plus the course the link
 * enrolls in (a course link opens it), the learning paths it assigns and the groups it puts the driver in
 * (comma-separated IDs; a path link opens the first path). Uber's backend signs the launch string from these.
 */
export const buildAppLink = (
  base: string,
  target: LaunchTarget,
  courseId: string,
  pathId = '',
  groups = '',
): string => {
  const params = new URLSearchParams({ target });
  if (courseId) {
    params.set('course_id', courseId);
  }
  if (pathId) {
    params.set('path_id', pathId);
  }
  if (groups) {
    params.set('groups', groups);
  }
  return `${base}?${params.toString()}`;
};

/**
 * A learning path ID suggested from a title, the way the server makes one when the ID is left empty: lowercase
 * ASCII letters and digits with single hyphens, at most 64 characters. Accents are stripped; anything else
 * becomes a hyphen.
 */
export const suggestSlug = (title: string): string =>
  title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
