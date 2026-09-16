import * as reactRedux from 'react-redux';
import { getConfig, setConfig } from '@edx/frontend-platform';
import { useSearchParams } from 'react-router-dom';

import {
  fireEvent,
  render,
  screen,
  waitFor,
  initializeMocks,
  within,
} from '@src/testUtils';
import { RequestStatus } from '../data/constants';
import { COURSE_CREATOR_STATES } from '../constants';
import studioHomeMock from './__mocks__/studioHomeMock';
import { getStudioHomeApiUrl } from './data/api';
import { StudioHome } from '.';

const {
  studioShortName,
  studioRequestEmail,
} = studioHomeMock;

const mockUseSelector = jest.fn();
jest.spyOn(reactRedux, 'useSelector').mockImplementation(mockUseSelector);
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

/** Helper function to get the Studio header in the rendered HTML */
function getHeaderElement(): HTMLElement {
  const header = screen.getByRole('banner');
  expect(header.tagName).toEqual('HEADER');
  return header;
}

describe('<StudioHome />', () => {
  describe('api fetch fails', () => {
    beforeEach(async () => {
      const mocks = initializeMocks();
      mocks.axiosMock.onGet(getStudioHomeApiUrl()).reply(404);
      mockUseSelector.mockReturnValue({ studioHomeLoadingStatus: RequestStatus.FAILED });
    });

    it('should render fetch error', async () => {
      render(<StudioHome />, { path: '/home' });
      expect(screen.getByText('Failed to load Studio home. Please try again later.')).toBeInTheDocument();
    });

    it('should render Studio home title', async () => {
      render(<StudioHome />, { path: '/home' });
      // Search only within the header; don't match on the similar text in the body's error message.
      const header = getHeaderElement();
      expect(within(header).getByText('Studio home')).toBeInTheDocument();
    });
  });

  describe('api fetch succeeds', () => {
    beforeEach(async () => {
      const mocks = initializeMocks();
      mocks.axiosMock.onGet(getStudioHomeApiUrl()).reply(200, studioHomeMock);
      mockUseSelector.mockReturnValue(studioHomeMock);
    });

    it('should render page and page title correctly', async () => {
      render(<StudioHome />, { path: '/home' });
      const header = getHeaderElement();
      expect(within(header).getByText(`${studioShortName} home`)).toBeInTheDocument();
    });

    it('should render "email staff" header button for users without create permission', async () => {
      mockUseSelector.mockReturnValue({
        ...studioHomeMock,
        courseCreatorStatus: COURSE_CREATOR_STATES.disallowedForThisSite,
      });

      render(<StudioHome />, { path: '/home' });
      const header = getHeaderElement();
      const link = within(header).getByRole('link', { name: 'Email staff to create course' });
      expect(link).toHaveAttribute('href', `mailto:${studioRequestEmail}`);
    });

    it('should render create new course button for users with create permission', async () => {
      mockUseSelector.mockReturnValue({
        ...studioHomeMock,
        courseCreatorStatus: COURSE_CREATOR_STATES.granted,
      });

      render(<StudioHome />, { path: '/home' });
      const header = getHeaderElement();
      within(header).getByRole('button', { name: 'New course' }); // will error if not found
    });

    it('should show verify email layout if user inactive', async () => {
      mockUseSelector.mockReturnValue({
        ...studioHomeMock,
        userIsActive: false,
      });

      render(<StudioHome />, { path: '/home' });
      screen.getByText('Thanks for signing up, abc123!', { exact: false }); // will error if not found
    });

    it('shows the spinner before the query is complete', async () => {
      mockUseSelector.mockReturnValue({
        studioHomeLoadingStatus: RequestStatus.IN_PROGRESS,
        userIsActive: true,
      });

      render(<StudioHome />, { path: '/home' });
      const spinner = screen.getByRole('status');
      expect(spinner.textContent).toEqual('Loading...');
    });

    describe('render new library button', () => {
      it('should navigate to legacy library creation when libraries-v2 disabled', async () => {
        mockUseSelector.mockReturnValue({
          ...studioHomeMock,
          courseCreatorStatus: COURSE_CREATOR_STATES.granted,
          librariesV2Enabled: false,
        });
        render(<StudioHome />, { path: '/home' });
        await waitFor(() => {
          const createNewLibraryButton = screen.getByRole('button', { name: 'New library' });

          fireEvent.click(createNewLibraryButton);
          expect(mockNavigate).toHaveBeenCalledWith('/libraries-v1/create');
        });
      });

      it('should navigate to the library authoring page in course authoring', async () => {
        mockUseSelector.mockReturnValue({
          ...studioHomeMock,
          librariesV1Enabled: false,
        });
        render(<StudioHome />, { path: '/home' });
        const createNewLibraryButton = screen.getByRole('button', { name: 'New library' });
        fireEvent.click(createNewLibraryButton);
        expect(mockNavigate).toHaveBeenCalledWith('/library/create');
      });
    });

    it('does not render new library button for "v1 only" mode if showNewLibraryButton is False', () => {
      mockUseSelector.mockReturnValue({
        ...studioHomeMock,
        showNewLibraryButton: false,
        librariesV2Enabled: false,
      });
      render(<StudioHome />, { path: '/home' });
      expect(screen.queryByRole('button', { name: 'New library' })).not.toBeInTheDocument();
    });

    it('render new library button for "v2 only" mode even if showNewLibraryButton is False', () => {
      mockUseSelector.mockReturnValue({
        ...studioHomeMock,
        showNewLibraryButton: false,
        librariesV1Enabled: false,
      });
      render(<StudioHome />, { path: '/home' });
      expect(screen.queryByRole('button', { name: 'New library' })).toBeInTheDocument();
    });

    it('should render "create new course" container', async () => {
      mockUseSelector.mockReturnValue({
        ...studioHomeMock,
        courseCreatorStatus: COURSE_CREATOR_STATES.granted,
      });

      const newCourseContainerText = 'Create a new course';
      render(<StudioHome />, { path: '/home' });

      expect(screen.queryByText(newCourseContainerText)).not.toBeInTheDocument();
      const createNewCourseButton = screen.getByRole('button', { name: 'New course' });
      fireEvent.click(createNewCourseButton);
      expect(screen.queryByText(newCourseContainerText)).toBeInTheDocument();
    });

    it('should hide "create new course" container', async () => {
      mockUseSelector.mockReturnValue({
        ...studioHomeMock,
        courseCreatorStatus: COURSE_CREATOR_STATES.granted,
      });

      const newCourseContainerText = 'Create a new course';
      render(<StudioHome />, { path: '/home' });

      const createNewCourseButton = screen.getByRole('button', { name: 'New course' });
      fireEvent.click(createNewCourseButton);
      expect(screen.queryByText(newCourseContainerText)).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);
      expect(screen.queryByText(newCourseContainerText)).not.toBeInTheDocument();
    });

    describe('contact administrator card', () => {
      const adminCardTitleText = 'Are you staff on an existing Studio course?';

      it('should show the "contact administrator" card with no "add course" buttons', () => {
        mockUseSelector.mockReturnValue({
          ...studioHomeMock,
          courses: [],
          courseCreatorStatus: COURSE_CREATOR_STATES.pending,
        });
        render(<StudioHome />, { path: '/home' });
        const administratorCardTitle = screen.getByText(adminCardTitleText);
        expect(administratorCardTitle).toBeVisible();
        expect(screen.queryByText('Create your first course')).not.toBeInTheDocument();
      });

      it('should show contact administrator card with add course buttons', () => {
        mockUseSelector.mockReturnValue({
          ...studioHomeMock,
          courses: [],
          courseCreatorStatus: COURSE_CREATOR_STATES.granted,
        });
        render(<StudioHome />, { path: '/home' });
        const administratorCardTitle = screen.getByText(adminCardTitleText);
        expect(administratorCardTitle).toBeVisible();
        const addCourseButton = screen.getByTestId('contact-admin-create-course');
        expect(addCourseButton).toBeVisible();
        fireEvent.click(addCourseButton);
        expect(screen.getByTestId('create-course-form')).toBeVisible();
      });
    });

    it('should show footer', () => {
      render(<StudioHome />, { path: '/home' });
      expect(screen.getByText('Looking for help with Studio?')).toBeInTheDocument();
      expect(screen.getByText('LMS')).toHaveAttribute('href', process.env.LMS_BASE_URL);
    });

    describe('creation forms are mutually exclusive', () => {
      /** The three creation forms, keyed by the header button that opens each one. */
      const FORMS = {
        course: { buttonName: 'New course', testId: 'create-course-form' },
        program: { buttonName: 'New program', testId: 'create-program-form' },
        instructor: { buttonName: 'New Instructor', testId: 'create-instructor-form' },
      } as const;
      type FormName = keyof typeof FORMS;
      const allForms = Object.keys(FORMS) as FormName[];

      let originalConfig: ReturnType<typeof getConfig>;

      beforeEach(() => {
        originalConfig = getConfig();
        setConfig({
          ...originalConfig,
          ENABLE_PROGRAMS: true,
          ENABLE_INSTRUCTOR_MANAGEMENT: true,
        });
        mockUseSelector.mockReturnValue({
          ...studioHomeMock,
          courseCreatorStatus: COURSE_CREATOR_STATES.granted,
        });
      });

      afterEach(() => {
        setConfig(originalConfig);
      });

      /** Click the header button that opens the given creation form. */
      const openForm = (form: FormName) => {
        const header = getHeaderElement();
        fireEvent.click(within(header).getByRole('button', { name: FORMS[form].buttonName }));
      };

      /** Assert that `form` is the only creation form on the page. */
      const expectOnlyFormShown = (form: FormName | null) => {
        allForms.forEach((name) => {
          const query = screen.queryByTestId(FORMS[name].testId);
          if (name === form) {
            expect(query).toBeInTheDocument();
          } else {
            expect(query).not.toBeInTheDocument();
          }
        });
      };

      it.each(allForms)('shows only the %s form when opened on its own', (form) => {
        render(<StudioHome />, { path: '/home' });
        expectOnlyFormShown(null);
        openForm(form);
        expectOnlyFormShown(form);
      });

      // Every ordered pair of distinct forms: course <-> program, course <-> instructor,
      // program <-> instructor, in both directions.
      const transitions = allForms.flatMap(
        (from) => allForms.filter((to) => to !== from).map((to) => [from, to] as const),
      );

      it.each(transitions)('replaces the %s form when the %s form is opened', (from, to) => {
        render(<StudioHome />, { path: '/home' });
        openForm(from);
        expectOnlyFormShown(from);
        openForm(to);
        expectOnlyFormShown(to);
      });

      it.each(allForms)('keeps a single %s form when its button is clicked twice', (form) => {
        render(<StudioHome />, { path: '/home' });
        openForm(form);
        openForm(form);
        expect(screen.getAllByTestId(FORMS[form].testId)).toHaveLength(1);
        expectOnlyFormShown(form);
      });

      it('leaves only the last selected form after rapid switching', () => {
        render(<StudioHome />, { path: '/home' });
        openForm('course');
        openForm('program');
        openForm('instructor');
        openForm('course');
        expectOnlyFormShown('course');
      });

      it('closes the active form via its own Cancel button without opening another', () => {
        render(<StudioHome />, { path: '/home' });
        openForm('program');
        expectOnlyFormShown('program');

        const programForm = screen.getByTestId('create-program-form');
        fireEvent.click(within(programForm).getByRole('button', { name: 'Cancel' }));
        expectOnlyFormShown(null);
      });

      /**
       * Wraps the page with a control that changes the course-list query string, the way the
       * course filters/search do. Only `useNavigate` is mocked in this file, so `useSearchParams`
       * drives the real MemoryRouter here.
       */
      const CourseFilterChanger = ({ children }: { children: React.ReactNode }) => {
        const [, setSearchParams] = useSearchParams();
        return (
          <>
            <button
              type="button"
              data-testid="change-course-filters"
              onClick={() => setSearchParams({ org: 'SomeOrg' })}
            >
              change course filters
            </button>
            {children}
          </>
        );
      };

      // The course-list effect closes ONLY the course form; an open Program/Instructor form is
      // unrelated to that query and must survive. That asymmetry is deliberate, so pin it down —
      // a future "simplification" to an unconditional close would otherwise pass every other test.
      it('closes the course form when the course-list filters change', () => {
        render(<StudioHome />, { path: '/home', extraWrapper: CourseFilterChanger });
        openForm('course');
        expectOnlyFormShown('course');

        fireEvent.click(screen.getByTestId('change-course-filters'));
        expectOnlyFormShown(null);
      });

      it.each(['program', 'instructor'] as const)(
        'leaves the %s form open when the course-list filters change',
        (form) => {
          render(<StudioHome />, { path: '/home', extraWrapper: CourseFilterChanger });
          openForm(form);
          expectOnlyFormShown(form);

          fireEvent.click(screen.getByTestId('change-course-filters'));
          expectOnlyFormShown(form);
        },
      );

      it('does not leak form state from a previous creation form', () => {
        render(<StudioHome />, { path: '/home' });

        openForm('instructor');
        const instructorName = screen.getByPlaceholderText('e.g. Jane Doe');
        fireEvent.change(instructorName, { target: { value: 'Ada Lovelace' } });
        expect(instructorName).toHaveValue('Ada Lovelace');

        // Switching away unmounts the form, so coming back gives a pristine one.
        openForm('program');
        openForm('instructor');
        expect(screen.getByPlaceholderText('e.g. Jane Doe')).toHaveValue('');
      });
    });
  });
});
