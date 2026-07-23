import {
  initializeMocks, render, screen,
} from '@src/testUtils';
import ProgramDetailPage from './ProgramDetailPage';
import { mockProgram } from './data/api.mock';
import { getProgramCapabilities } from './data/permissions';

const mockUpdateProgram = jest.fn();
const mockUseProgramAccess = jest.fn();
const mockInitiateFeedbackRequests = jest.fn();
const mockCreateFeedbackForm = jest.fn();

jest.mock('../header', () => function MockHeader() {
  return <header>Header</header>;
});
jest.mock('./courses-tab/CoursesTab', () => function MockCoursesTab() {
  return <div>Courses content</div>;
});
jest.mock('./instructors-tab/InstructorsTab', () => function MockInstructorsTab() {
  return <div>Instructors content</div>;
});
jest.mock('./enrollment-tab/EnrollmentTab', () => function MockEnrollmentTab() {
  return <div>Enrollment content</div>;
});
jest.mock('./data/apiHooks', () => ({
  useProgramAccess: () => mockUseProgramAccess(),
  useProgramDetail: () => ({
    data: {
      program: mockProgram({
        displayName: 'Permission Test Program',
        status: 'active',
      }),
      availableAudiences: [],
    },
    isLoading: false,
    isError: false,
  }),
  useUpdateProgram: () => ({
    mutateAsync: mockUpdateProgram,
    isPending: false,
  }),
  useFeedbackRequests: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
  useInitiateFeedbackRequests: () => ({
    mutateAsync: mockInitiateFeedbackRequests,
    isPending: false,
  }),
  useFeedbackRequestDetail: () => ({
    data: null,
    isLoading: false,
    isError: false,
  }),
  useFeedbackForms: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useFeedbackForm: () => ({
    data: null,
    isLoading: false,
    isError: false,
  }),
  useCreateFeedbackForm: () => ({
    mutateAsync: mockCreateFeedbackForm,
    isPending: false,
  }),
  useAllPlatformUsersForRole: () => ({
    data: { results: [], count: 0, numPages: 1 },
    isLoading: false,
    isError: false,
  }),
  useFeedbackDashboardInitiations: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useFeedbackDashboardReport: () => ({
    data: null,
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
}));

const renderPage = () => render(
  <ProgramDetailPage />,
  {
    path: '/programs/:programId',
    params: { programId: 'prog-key-1' },
  },
);

describe('<ProgramDetailPage /> permissions', () => {
  beforeEach(() => {
    initializeMocks();
    mockInitiateFeedbackRequests.mockReset();
    mockCreateFeedbackForm.mockReset();
    mockUseProgramAccess.mockReturnValue({
      capabilities: getProgramCapabilities(['super_admin']),
      isLoading: false,
    });
  });

  it('allows Super Admins to save and change program status', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'Save Program' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Program Status' })).toBeInTheDocument();
  });

  it('lets Data Admins edit metadata without exposing archive status controls', () => {
    mockUseProgramAccess.mockReturnValue({
      capabilities: getProgramCapabilities(['data_admin']),
      isLoading: false,
    });

    renderPage();

    expect(screen.getByRole('button', { name: 'Save Program' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Program Status' })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Active')).toHaveAttribute('readonly');
  });

  it('renders instructor access as read-only', () => {
    mockUseProgramAccess.mockReturnValue({
      capabilities: getProgramCapabilities(['instructor']),
      isLoading: false,
    });

    renderPage();

    expect(screen.queryByRole('button', { name: 'Save Program' })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Permission Test Program')).toHaveAttribute('readonly');
    expect(screen.getByText('View program details')).toBeInTheDocument();
  });

  it('denies trainees direct access to program details', () => {
    mockUseProgramAccess.mockReturnValue({
      capabilities: getProgramCapabilities(['trainee']),
      isLoading: false,
    });

    renderPage();

    expect(screen.getByTestId('permissionDeniedAlert')).toBeInTheDocument();
  });
});
