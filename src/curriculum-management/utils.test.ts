import { camelCaseObject } from '@edx/frontend-platform';
import { AxiosError, AxiosHeaders } from 'axios';
import { rawBadges, rawCurriculums } from './__mocks__/fixtures';
import type { Curriculum } from './types';
import {
  mapBadgeErrors,
  mapCurriculumErrors,
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
      halfway: rawBadges[0].uuid,
      complete: rawBadges[1].uuid,
      retained: rawBadges[2].uuid,
    });
    expect(toCurriculumWriteData({ ...values, title: '  Trimmed  ', badges: { ...values.badges, complete: '' } }))
      .toEqual({
        title: 'Trimmed',
        description: 'Required courses for new drivers.',
        courseIds: ['course-v1:Uber+DRV101+2026_Q4', 'course-v1:Uber+DRV102+2026_Q4'],
        knowledgeCheckCourseId: 'course-v1:Uber+DRVKC1+2026_Q4',
        knowledgeCheckDelayDays: 30,
        badges: { halfway: rawBadges[0].uuid, complete: null, retained: rawBadges[2].uuid },
      });
  });

  it('gives empty defaults for a new curriculum', () => {
    expect(toCurriculumFormValues()).toEqual({
      title: '',
      description: '',
      courses: [],
      knowledgeCheck: null,
      knowledgeCheckDelayDays: '30',
      badges: { halfway: '', complete: '', retained: '' },
    });
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
        non_field_errors: ['Something general.'],
      }),
      ['course-v1:A+1+R', 'course-v1:A+2+R'],
    );
    expect(result).toEqual({
      fieldErrors: {
        title: 'Too long.',
        knowledgeCheck: 'Must not be a curriculum course.',
        knowledgeCheckDelayDays: '"7" is not a valid choice.',
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
