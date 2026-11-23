import { renderHook } from '@testing-library/react';

import { useCourseRerun } from './hooks';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(() => ({
    displayName: 'Source course',
    org: 'ORG',
    run: '2025',
    number: 'CS101',
    slug: 'source-course-slug',
  })),
}));

jest.mock('@edx/frontend-platform/i18n', () => ({
  useIntl: () => ({ formatMessage: (m: { defaultMessage: string }) => m.defaultMessage }),
}));

jest.mock('@src/generic/data/thunks', () => ({
  fetchCourseRerunQuery: jest.fn(() => ({ type: 'rerun' })),
  fetchOrganizationsQuery: jest.fn(() => ({ type: 'orgs' })),
}));

jest.mock('@src/studio-home/data/thunks', () => ({
  fetchStudioHomeData: jest.fn(() => ({ type: 'home' })),
}));

describe('useCourseRerun', () => {
  it('starts the rerun form with an empty slug', () => {
    const { result } = renderHook(() => useCourseRerun('course-v1:ORG+CS101+2025'));

    expect(result.current.initialFormValues.slug).toBe('');
    expect(result.current.initialFormValues.run).toBe('');
  });
});
