import React from 'react';
import { useSelector } from 'react-redux';
import { render } from '@testing-library/react';
import { initializeMockApp } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { AppProvider } from '@edx/frontend-platform/react';
import MockAdapter from 'axios-mock-adapter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import studioHomeMock from '@src/studio-home/__mocks__/studioHomeMock';
import initializeStore from '../../store';
import CourseRerunForm from '.';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

let axiosMock;
let store;

const onClickCancelMock = jest.fn();

// CreateOrRerunCourseForm reads the programs config through react-query.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const RootWrapper = (props) => (
  <IntlProvider locale="en">
    <AppProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <CourseRerunForm {...props} />
      </QueryClientProvider>
    </AppProvider>
  </IntlProvider>
);

const props = {
  initialFormValues: {
    displayName: '',
    org: '',
    number: '',
    run: '',
  },
  onClickCancel: onClickCancelMock,
};

describe('<CourseRerunForm />', () => {
  afterEach(() => {
    queryClient.clear();
  });

  beforeEach(() => {
    initializeMockApp({
      authenticatedUser: {
        userId: 3,
        username: 'abc123',
        administrator: true,
        roles: [],
      },
    });

    store = initializeStore();
    axiosMock = new MockAdapter(getAuthenticatedHttpClient());
    axiosMock.onGet(/\/rwaq\/api\/programs\/config\//).reply(200, {
      organizations: [],
      program_types: [],
    });
    useSelector.mockReturnValue(studioHomeMock);
  });

  it('renders description successfully', () => {
    const { getByText } = render(<RootWrapper {...props} />);
    expect(getByText('Provide identifying information for this re-run of the course. The original course is not affected in any way by a re-run', { exact: false })).toBeInTheDocument();
  });
});
