import {
  act,
  fireEvent,
  initializeMocks,
  render,
  screen,
} from '@src/testUtils';
import { COURSE_CREATOR_STATES } from '@src/constants';
import { type DeprecatedReduxState } from '@src/store';
import studioHomeMock from '@src/studio-home/__mocks__/studioHomeMock';
import { RequestStatus } from '@src/data/constants';
import { initialState } from '../../factories/mockApiResponses';
import { page, rawCourseBadge, rawStatus } from '@src/curriculum-management/__mocks__/fixtures';
import { apiUrls as curriculumApiUrls } from '@src/curriculum-management/data/api';

import { CoursesList } from '.';
import { studioHomeCoursesRequestParamsDefault } from '../../data/slice';

type StudioHomeState = DeprecatedReduxState['studioHome'];

const onClickNewCourse = jest.fn();
const isShowProcessing = false;
const numPages = 1;
const coursesCount = studioHomeMock.courses.length;
const showNewCourseContainer = true;

const renderComponent = (
  overrideProps = {},
  studioHomeState: Partial<StudioHomeState> = {},
  curriculumManagementEnabled = false,
) => {
  // Generate a custom initial state based on studioHomeCoursesRequestParams
  const customInitialState: Partial<DeprecatedReduxState> = {
    ...initialState,
    studioHome: {
      ...initialState.studioHome,
      studioHomeData: {
        courses: studioHomeMock.courses,
        numPages,
        coursesCount,
      },
      loadingStatuses: {
        ...initialState.studioHome.loadingStatuses,
        courseLoadingStatus: RequestStatus.SUCCESSFUL,
      },
      ...studioHomeState,
    },
  };

  // Initialize the store with the custom initial state
  const { reduxStore: store, axiosMock } = initializeMocks({ initialState: customInitialState });
  axiosMock.onGet(curriculumApiUrls.status()).reply(200, rawStatus(curriculumManagementEnabled));
  axiosMock.onGet(curriculumApiUrls.badgesPage(1)).reply(
    200,
    page([
      {
        ...rawCourseBadge,
        courses: [{ course_id: studioHomeMock.courses[0].courseKey, display_name: null, exists: true }],
      },
    ]),
  );
  axiosMock.onGet(curriculumApiUrls.curriculumsPage(1)).reply(200, page([]));

  return {
    ...render(
      <CoursesList
        showNewCourseContainer={showNewCourseContainer}
        onClickNewCourse={onClickNewCourse}
        isShowProcessing={isShowProcessing}
        {...overrideProps}
      />,
    ),
    store,
    axiosMock,
  };
};

/** Lets the status request resolve and any list requests it triggers go out. */
const settle = () =>
  act(() =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    })
  );
const requested = (axiosMock: ReturnType<typeof initializeMocks>['axiosMock'], url: string) =>
  axiosMock.history.get.some((request) => request.url === url);

describe('<CoursesTab />', () => {
  it('should render correctly', async () => {
    renderComponent();
    const coursesPaginationInfo = screen.getByTestId('pagination-info');
    const coursesTypesMenu = screen.getByTestId('dropdown-toggle-course-type-menu');
    const coursesOrderMenu = screen.getByTestId('dropdown-toggle-courses-order-menu');
    const coursesFilterSearchInput = screen.getByTestId('input-filter-courses-search');
    expect(coursesPaginationInfo).toBeInTheDocument();
    expect(coursesTypesMenu).toBeInTheDocument();
    expect(coursesOrderMenu).toBeInTheDocument();
    expect(coursesFilterSearchInput).toBeInTheDocument();
  });

  it('should render loading spinner when isLoading is true and isFiltered is false', () => {
    const customStoreData = {
      loadingStatuses: {
        ...initialState.studioHome.loadingStatuses,
        courseLoadingStatus: RequestStatus.IN_PROGRESS,
      },
      studioHomeCoursesRequestParams: { currentPage: 1, isFiltered: true },
    };
    renderComponent({}, customStoreData);
    const loadingSpinner = screen.getByRole('status');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('should render an error message when something went wrong', () => {
    const customStoreData = {
      loadingStatuses: {
        ...initialState.studioHome.loadingStatuses,
        courseLoadingStatus: RequestStatus.FAILED,
      },
      studioHomeCoursesRequestParams: { currentPage: 1, isFiltered: false },
    };
    renderComponent({}, customStoreData);
    const alertErrorFailed = screen.queryByTestId('error-failed-message');
    expect(alertErrorFailed).toBeInTheDocument();
  });

  it('should render an alert message when there is not courses found', () => {
    const customStoreData = {
      studioHomeData: {
        courses: [],
        numPages: 0,
        coursesCount: 0,
      },
      studioHomeCoursesRequestParams: { currentPage: 1, isFiltered: true },
    };
    renderComponent({}, customStoreData);
    const alertCoursesNotFound = screen.queryByTestId('courses-not-found-alert');
    expect(alertCoursesNotFound).toBeInTheDocument();
  });

  it('should render processing courses component when isEnabledPagination is false and isShowProcessing is true', async () => {
    const props = { isShowProcessing: true, isEnabledPagination: false };
    const customStoreData = {
      studioHomeData: {
        inProcessCourseActions: [],
      },
      studioHomeCoursesRequestParams: {
        currentPage: 1,
        isFiltered: true,
      },
    };
    renderComponent(props, customStoreData);
    const alertCoursesNotFound = await screen.findByTestId('processing-courses-title');
    expect(alertCoursesNotFound).toBeInTheDocument();
  });

  it('should render CollapsibleStateWithAction when courseCreatorStatus is true', () => {
    const props = { isShowProcessing: true, isEnabledPagination: false };
    const customStoreData = {
      studioHomeData: {
        inProcessCourseActions: [],
        courseCreatorStatus: COURSE_CREATOR_STATES.denied,
      },
    };
    renderComponent(props, customStoreData);
    const collapsibleStateWithAction = screen.queryByTestId('collapsible-state-with-action');
    expect(collapsibleStateWithAction).toBeInTheDocument();
  });

  it('should reset filters when in pressed the button to clean them', () => {
    const customStoreData = {
      studioHomeData: {
        courses: [],
        numPages: 0,
        coursesCount: 0,
      },
      studioHomeCoursesRequestParams: { currentPage: 1, isFiltered: true },
    };
    const { store } = renderComponent({}, customStoreData);
    const cleanFiltersButton = screen.getByRole('button', { name: /clear filters/i });
    expect(cleanFiltersButton).toBeInTheDocument();

    fireEvent.click(cleanFiltersButton!);

    const state = store.getState();
    expect(state.studioHome.studioHomeCoursesRequestParams).toStrictEqual(studioHomeCoursesRequestParamsDefault);
  });

  it('should render displayNumber in the card subtitle when it is provided', () => {
    const courseWithDisplayNumber = {
      ...studioHomeMock.courses[0],
      number: '123',
      displayNumber: 'DISP-999',
    };
    const customStoreData = {
      studioHomeData: {
        courses: [courseWithDisplayNumber],
        numPages: 1,
        coursesCount: 1,
      },
    };
    renderComponent({}, customStoreData);
    expect(screen.getByText(/DISP-999/)).toBeInTheDocument();
    expect(screen.queryByText(/\/ 123 \//)).not.toBeInTheDocument();
  });

  it('should fall back to number in the card subtitle when displayNumber is empty', () => {
    const courseWithEmptyDisplayNumber = {
      ...studioHomeMock.courses[0],
      number: '123',
      displayNumber: '',
    };
    const customStoreData = {
      studioHomeData: {
        courses: [courseWithEmptyDisplayNumber],
        numPages: 1,
        coursesCount: 1,
      },
    };
    renderComponent({}, customStoreData);
    expect(screen.getByText(/\/ 123 \//)).toBeInTheDocument();
  });

  it('should render displayOrg in the card subtitle when it is provided', () => {
    const courseWithDisplayOrg = {
      ...studioHomeMock.courses[0],
      org: 'HarvardX',
      displayOrg: 'Harvard University',
    };
    const customStoreData = {
      studioHomeData: {
        courses: [courseWithDisplayOrg],
        numPages: 1,
        coursesCount: 1,
      },
    };
    renderComponent({}, customStoreData);
    expect(screen.getByText(/Harvard University \//)).toBeInTheDocument();
    expect(screen.queryByText(/HarvardX \//)).not.toBeInTheDocument();
  });

  it('should fall back to org in the card subtitle when displayOrg is empty', () => {
    const courseWithEmptyDisplayOrg = {
      ...studioHomeMock.courses[0],
      org: 'HarvardX',
      displayOrg: '',
    };
    const customStoreData = {
      studioHomeData: {
        courses: [courseWithEmptyDisplayOrg],
        numPages: 1,
        coursesCount: 1,
      },
    };
    renderComponent({}, customStoreData);
    expect(screen.getByText(/HarvardX \//)).toBeInTheDocument();
  });

  describe('badge and curriculum links', () => {
    it('shows a course\'s badge, or "No badge", when curriculum management is on', async () => {
      renderComponent({}, {}, true);
      expect(await screen.findByRole('link', { name: `Badge: ${rawCourseBadge.title}` })).toBeInTheDocument();
      expect(screen.getAllByText('No badge')).toHaveLength(studioHomeMock.courses.length - 1);
    });

    it('shows nothing and loads no badges when curriculum management is off', async () => {
      const { axiosMock } = renderComponent({}, {}, false);
      await settle();
      expect(requested(axiosMock, curriculumApiUrls.status())).toBe(true);
      expect(requested(axiosMock, curriculumApiUrls.badgesPage(1))).toBe(false);
      expect(screen.queryByText('No badge')).not.toBeInTheDocument();
    });

    it('shows nothing in the course picker', async () => {
      const { axiosMock } = renderComponent({ handleSelect: jest.fn() }, {}, true);
      await settle();
      expect(requested(axiosMock, curriculumApiUrls.status())).toBe(true);
      expect(requested(axiosMock, curriculumApiUrls.badgesPage(1))).toBe(false);
      expect(screen.queryByText('No badge')).not.toBeInTheDocument();
    });
  });
});
