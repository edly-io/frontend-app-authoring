import { camelCaseObject } from '@edx/frontend-platform';
import { AxiosError, AxiosHeaders } from 'axios';
import { rawBadges, rawCourseGroups, rawCurriculums } from './__mocks__/fixtures';
import type { CourseGroup, Curriculum } from './types';
import {
  buildAppLink,
  mapBadgeErrors,
  mapCourseGroupErrors,
  mapCurriculumErrors,
  mapTestLinkErrors,
  toCourseGroupFormValues,
  toCourseGroupWriteData,
  toCurriculumFormValues,
  toCurriculumWriteData,
} from './utils';

const axiosError = (status: number, data: unknown) => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('x', 'ERR', config, {}, {
    status,
    data,
    statusText: '',
    headers: {},
    config,
  });
};

describe('curriculum form mapping', () => {
  it('round-trips a curriculum into form values and back into the write shape', () => {
    const curriculum = camelCaseObject(rawCurriculums[0]) as Curriculum;
    const values = toCurriculumFormValues(curriculum);
    expect(values.courses).toEqual([
      { id: 'course-v1:Uber+DRV101+2026_Q4', displayName: 'Getting started', exists: true },
      { id: 'course-v1:Uber+DRV102+2026_Q4', displayName: null, exists: false },
    ]);
    expect(values.knowledgeCheckDelayDays).toEqual('30');
    expect(values.badges).toEqual({
      complete: rawBadges[0].uuid,
      retained: rawBadges[2].uuid,
    });
    expect(toCurriculumWriteData({ ...values, title: '  Trimmed  ', badges: { ...values.badges, complete: '' } }))
      .toEqual({
        slug: 'new-driver-essentials',
        title: 'Trimmed',
        description: 'Required courses for new drivers.',
        courseIds: ['course-v1:Uber+DRV101+2026_Q4', 'course-v1:Uber+DRV102+2026_Q4'],
        knowledgeCheckCourseId: 'course-v1:Uber+DRVKC1+2026_Q4',
        knowledgeCheckDelayDays: 30,
        knowledgeCheckPassThreshold: 80,
        knowledgeCheckMaxAttempts: 1,
        knowledgeCheckTimeLimit: null,
        badges: { complete: null, retained: rawBadges[2].uuid },
        image: null,
        removeImage: false,
      });
  });

  it('maps the knowledge check settings both ways; an empty optional input becomes null', () => {
    const curriculum = {
      ...(camelCaseObject(rawCurriculums[0]) as Curriculum),
      knowledgeCheckPassThreshold: 70,
      knowledgeCheckMaxAttempts: 2,
      knowledgeCheckTimeLimit: 15,
    };
    const values = toCurriculumFormValues(curriculum);
    expect(values).toMatchObject({
      knowledgeCheckPassThreshold: 70,
      knowledgeCheckMaxAttempts: 2,
      knowledgeCheckTimeLimit: 15,
    });
    expect(toCurriculumWriteData({ ...values, knowledgeCheckTimeLimit: '' }))
      .toMatchObject({
        knowledgeCheckPassThreshold: 70,
        knowledgeCheckMaxAttempts: 2,
        knowledgeCheckTimeLimit: null,
      });
  });

  it('falls back to the backend defaults when a curriculum has no knowledge check settings', () => {
    const { knowledgeCheckPassThreshold, knowledgeCheckMaxAttempts, ...legacy } = camelCaseObject(
      rawCurriculums[0],
    ) as Curriculum;
    expect(toCurriculumFormValues(legacy as Curriculum)).toMatchObject({
      knowledgeCheckPassThreshold: 80,
      knowledgeCheckMaxAttempts: 1,
    });
  });

  it('gives empty defaults for a new curriculum', () => {
    expect(toCurriculumFormValues()).toEqual({
      slug: '',
      title: '',
      description: '',
      courses: [],
      knowledgeCheck: null,
      knowledgeCheckDelayDays: '30',
      knowledgeCheckPassThreshold: 80,
      knowledgeCheckMaxAttempts: 1,
      knowledgeCheckTimeLimit: '',
      badges: { complete: '', retained: '' },
      image: null,
      removeImage: false,
    });
  });

  it('propagates a picked image file into the write data', () => {
    const file = new File(['x'], 'cover.jpg', { type: 'image/jpeg' });
    const values = toCurriculumFormValues();
    const data = toCurriculumWriteData({ ...values, title: 'T', image: file, removeImage: false });
    expect(data.image).toBe(file);
    expect(data.removeImage).toBe(false);
  });

  it('sets removeImage:true only when image is null (not replacing with a new file)', () => {
    const values = toCurriculumFormValues();
    const withRemoveOnly = toCurriculumWriteData({ ...values, title: 'T', image: null, removeImage: true });
    expect(withRemoveOnly.removeImage).toBe(true);
    const file = new File(['x'], 'cover.jpg', { type: 'image/jpeg' });
    const withNewFile = toCurriculumWriteData({ ...values, title: 'T', image: file, removeImage: true });
    // When a new file is present, removeImage must be suppressed to avoid sending both.
    expect(withNewFile.removeImage).toBe(false);
  });
});

describe('mapCurriculumErrors', () => {
  it('maps snake_case keys (without camelCasing course keys) and list-index course errors', () => {
    const result = mapCurriculumErrors(
      axiosError(400, {
        title: ['Too long.'],
        course_ids: { 1: ['Course not found.'] },
        knowledge_check_course_id: ['Must not be a curriculum course.'],
        knowledge_check_delay_days: ['"7" is not a valid choice.'],
        knowledge_check_pass_threshold: ['Ensure this value is less than or equal to 100.'],
        knowledge_check_max_attempts: ['Ensure this value is greater than or equal to 1.'],
        knowledge_check_time_limit: ['A valid integer is required.'],
        non_field_errors: ['Something general.'],
      }),
      ['course-v1:A+1+R', 'course-v1:A+2+R'],
    );
    expect(result).toEqual({
      fieldErrors: {
        title: 'Too long.',
        knowledgeCheck: 'Must not be a curriculum course.',
        knowledgeCheckDelayDays: '"7" is not a valid choice.',
        knowledgeCheckPassThreshold: 'Ensure this value is less than or equal to 100.',
        knowledgeCheckMaxAttempts: 'Ensure this value is greater than or equal to 1.',
        knowledgeCheckTimeLimit: 'A valid integer is required.',
      },
      rowErrors: { 'course-v1:A+2+R': 'Course not found.' },
      formError: 'Something general.',
    });
  });

  it('maps a list-level course_ids error onto the courses field', () => {
    const result = mapCurriculumErrors(axiosError(400, { course_ids: ['Add at least one course.'] }), []);
    expect(result?.fieldErrors).toEqual({ courses: 'Add at least one course.' });
    expect(result?.formError).toBeNull();
  });

  it('maps badges.<slot> errors onto the slots, and anything else under badges onto the form', () => {
    const slotErrors = mapCurriculumErrors(
      axiosError(400, { badges: { retained: ['Badge not found.'], bonus: ['Unknown badge slot.'] } }),
      [],
    );
    expect(slotErrors).toEqual({
      fieldErrors: { badges: { retained: 'Badge not found.' } },
      rowErrors: {},
      formError: 'Unknown badge slot.',
    });
    const listError = mapCurriculumErrors(axiosError(400, { badges: ['Expected a dictionary.'] }), []);
    expect(listError?.formError).toEqual('Expected a dictionary.');
  });

  it('returns null for anything that is not a 400 with an object body', () => {
    expect(mapCurriculumErrors(axiosError(500, {}), [])).toBeNull();
    expect(mapCurriculumErrors(new Error('network'), [])).toBeNull();
  });
});

describe('mapBadgeErrors', () => {
  it('maps kind, title, description, image and form-level errors', () => {
    expect(mapBadgeErrors(axiosError(400, {
      kind: ['"streak" is not a valid choice.'],
      title: ['Required.'],
      description: ['Too long.'],
      image: ['Upload a PNG or JPEG.'],
      detail: 'Nope.',
    }))).toEqual({
      fieldErrors: {
        kind: '"streak" is not a valid choice.',
        title: 'Required.',
        description: 'Too long.',
        image: 'Upload a PNG or JPEG.',
      },
      rowErrors: {},
      formError: 'Nope.',
    });
  });

  it('maps course_ids errors by list index onto course rows, and a list-level one onto the courses field', () => {
    const rows = mapBadgeErrors(
      axiosError(400, { course_ids: { 1: ['This course already awards "Airport pro".'] } }),
      ['course-v1:A+1+R', 'course-v1:A+2+R'],
    );
    expect(rows?.rowErrors).toEqual({ 'course-v1:A+2+R': 'This course already awards "Airport pro".' });
    const list = mapBadgeErrors(axiosError(400, { course_ids: ['Only course badges have courses.'] }), []);
    expect(list?.fieldErrors).toEqual({ courses: 'Only course badges have courses.' });
  });
});

describe('course group form mapping', () => {
  it('round-trips a group into form values and back, trimming text', () => {
    const group = camelCaseObject(rawCourseGroups[0]) as CourseGroup;
    const values = toCourseGroupFormValues(group);
    expect(values).toEqual({
      slug: 'ev-drivers',
      title: 'EV drivers',
      description: 'Drivers with an electric vehicle.',
      courses: [
        { id: 'course-v1:Uber+DRV101+2026_Q4', displayName: 'Getting started', exists: true },
        { id: 'course-v1:Uber+DRV102+2026_Q4', displayName: null, exists: false },
      ],
    });
    expect(toCourseGroupWriteData({ ...values, title: '  EV  ', slug: ' ev-drivers ' })).toEqual({
      slug: 'ev-drivers',
      title: 'EV',
      description: 'Drivers with an electric vehicle.',
      courseIds: ['course-v1:Uber+DRV101+2026_Q4', 'course-v1:Uber+DRV102+2026_Q4'],
    });
    expect(toCourseGroupFormValues()).toEqual({ slug: '', title: '', description: '', courses: [] });
  });

  it('maps a 400 onto fields, course rows and the form; anything else is null', () => {
    const mapped = mapCourseGroupErrors(
      axiosError(400, {
        slug: ['A course group with this ID already exists.'],
        course_ids: { 1: ['Course not found.'] },
        non_field_errors: ['Nope.'],
      }),
      ['c1', 'c2'],
    );
    expect(mapped).toEqual({
      fieldErrors: { slug: 'A course group with this ID already exists.' },
      rowErrors: { c2: 'Course not found.' },
      formError: 'Nope.',
    });
    expect(mapCourseGroupErrors(axiosError(400, { course_ids: ['Add a course.'] }), [])?.fieldErrors).toEqual({
      courses: 'Add a course.',
    });
    expect(mapCourseGroupErrors(axiosError(500, {}), [])).toBeNull();
  });
});

describe('deep links helpers', () => {
  it('buildAppLink adds the course key only for a course link, percent-encoded', () => {
    expect(buildAppLink('uber://learn', 'home', '')).toEqual('uber://learn?target=home');
    expect(buildAppLink('uber://learn', 'optional', '')).toEqual('uber://learn?target=optional');
    expect(buildAppLink('uber://learn', 'optional', 'course-v1:Uber+DRV101+2026_Q4'))
      .toEqual('uber://learn?target=optional&course_id=course-v1%3AUber%2BDRV101%2B2026_Q4');
    expect(buildAppLink('uber://learn', 'course', 'course-v1:Uber+DRV101+2026_Q4'))
      .toEqual('uber://learn?target=course&course_id=course-v1%3AUber%2BDRV101%2B2026_Q4');
    expect(buildAppLink('uber://learn', 'path', '', '3f2c9b7d-4e10-4a6b-9c1d-0b7e4f2a91c3'))
      .toEqual('uber://learn?target=path&path_id=3f2c9b7d-4e10-4a6b-9c1d-0b7e4f2a91c3');
    expect(buildAppLink('uber://learn', 'home', '', 'a,b')).toEqual('uber://learn?target=home&path_id=a%2Cb');
    expect(buildAppLink('uber://learn', 'home', '', '', 'ev,nyc')).toEqual('uber://learn?target=home&groups=ev%2Cnyc');
  });

  it('mapTestLinkErrors maps API fields onto the form fields', () => {
    expect(
      mapTestLinkErrors(
        axiosError(400, { external_id: ['Bad.'], course_id: ['Pick one.'], ttl: ['No.'], path_id: ['P.'] }),
      ),
    )
      .toEqual({
        fieldErrors: { externalId: 'Bad.', courseId: 'Pick one.', ttl: 'No.', pathId: 'P.' },
        formError: null,
      });
    expect(mapTestLinkErrors(axiosError(400, { detail: 'CSRF failed.' })))
      .toEqual({ fieldErrors: {}, formError: 'CSRF failed.' });
    expect(mapTestLinkErrors(axiosError(404, { error_code: 'launch_disabled' }))).toBeNull();
  });
});
