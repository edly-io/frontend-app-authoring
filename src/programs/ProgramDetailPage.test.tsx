import { useLocation } from 'react-router-dom';
import {
  fireEvent, initializeMocks, render, screen,
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
jest.mock('./certificates-tab/CertificatesTab', () => function MockCertificatesTab() {
  return <div>Certificates content</div>;
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

const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;

const renderPage = (url = '/programs/prog-key-1') => render(
  <>
    <ProgramDetailPage />
    <LocationDisplay />
  </>,
  {
    path: '/programs/:programId/*',
    routerProps: { initialEntries: [url] },
  },
);

// Some tabs (Feedback) nest their own tabs, so the page-level tab is the first selected one.
const activeTabName = () => screen.getAllByRole('tab', { selected: true })[0].textContent;

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
    expect(screen.getByRole('tab', { name: 'Certificates' })).toBeInTheDocument();
  });

  it('hides the Certificates tab from instructors', () => {
    mockUseProgramAccess.mockReturnValue({
      capabilities: getProgramCapabilities(['instructor']),
      isLoading: false,
    });

    renderPage();

    expect(screen.queryByRole('tab', { name: 'Certificates' })).not.toBeInTheDocument();
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

describe('<ProgramDetailPage /> tab URLs', () => {
  beforeEach(() => {
    initializeMocks();
    mockUseProgramAccess.mockReturnValue({
      capabilities: getProgramCapabilities(['super_admin']),
      isLoading: false,
    });
  });

  it('redirects a program URL with no tab to the details tab', () => {
    renderPage('/programs/prog-key-1');

    expect(screen.getByTestId('location')).toHaveTextContent('/programs/prog-key-1/details');
    expect(activeTabName()).toBe('Program Details');
  });

  it('opens the tab named in the URL', () => {
    renderPage('/programs/prog-key-1/feedback');

    expect(activeTabName()).toBe('Feedback');
    expect(screen.getByTestId('location')).toHaveTextContent('/programs/prog-key-1/feedback');
  });

  it('falls back to details for an unknown tab', () => {
    renderPage('/programs/prog-key-1/nope');

    expect(activeTabName()).toBe('Program Details');
    expect(screen.getByTestId('location')).toHaveTextContent('/programs/prog-key-1/details');
  });

  it('falls back to details for a tab the user cannot see', () => {
    mockUseProgramAccess.mockReturnValue({
      capabilities: getProgramCapabilities(['instructor']),
      isLoading: false,
    });

    renderPage('/programs/prog-key-1/certificates');

    expect(activeTabName()).toBe('Program Details');
    expect(screen.getByTestId('location')).toHaveTextContent('/programs/prog-key-1/details');
  });

  it('changes the URL when a tab is clicked', () => {
    renderPage('/programs/prog-key-1/details');

    fireEvent.click(screen.getByRole('tab', { name: 'Courses' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/programs/prog-key-1/courses');
    expect(activeTabName()).toBe('Courses');
  });
});

describe('<ProgramDetailPage /> program operation tabs', () => {
  const OPERATION_TABS = ['Calendar', 'Requests', 'Attendance', 'Locations', 'Holidays'];

  beforeEach(() => {
    initializeMocks();
  });

  it('shows the operation tabs to Middle Admins, after Certificates', () => {
    mockUseProgramAccess.mockReturnValue({
      capabilities: getProgramCapabilities(['middle_admin']),
      isLoading: false,
    });

    renderPage();

    // Paragon adds a "More..." overflow tab at the end of the strip.
    const tabNames = screen.getAllByRole('tab').map((tab) => tab.textContent).filter((name) => name !== 'More...');
    expect(tabNames.slice(-5)).toEqual(OPERATION_TABS);
  });

  it('hides the operation tabs from instructors', () => {
    mockUseProgramAccess.mockReturnValue({
      capabilities: getProgramCapabilities(['instructor']),
      isLoading: false,
    });

    renderPage();

    OPERATION_TABS.forEach((name) => {
      expect(screen.queryByRole('tab', { name })).not.toBeInTheDocument();
    });
  });

  it('sends an instructor on an operation tab URL to Details', () => {
    mockUseProgramAccess.mockReturnValue({
      capabilities: getProgramCapabilities(['instructor']),
      isLoading: false,
    });

    renderPage('/programs/prog-key-1/requests/leaves');

    expect(screen.getByTestId('location')).toHaveTextContent('/programs/prog-key-1/details');
  });
});
