import { userEvent } from '@testing-library/user-event';
import {
  fireEvent,
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';

import { CourseOutlineProvider, OutlineSidebarProvider } from '@src/course-outline';
import { CourseAuthoringProvider } from '@src/CourseAuthoringContext';
import { apiUrls } from '@src/course-categories/data/api';
import { apiUrls as publishHistoryApiUrls } from '@src/publish-history/data/api';
import messages from './messages';
import HeaderActions, { HeaderActionsProps } from './HeaderActions';

const headerNavigationsActions = {
  handleNewSection: jest.fn(),
  handleReIndex: jest.fn(),
  handleExpandAll: jest.fn(),
  lmsLink: '',
};

const courseActions = {
  draggable: true,
  childAddable: true,
  deletable: true,
  duplicable: true,
};

const setCurrentPageKeyMock = jest.fn();

jest.mock('../outline-sidebar/OutlineSidebarContext', () => ({
  ...jest.requireActual('../outline-sidebar/OutlineSidebarContext'),
  useOutlineSidebarContext: () => ({
    ...jest.requireActual('../outline-sidebar/OutlineSidebarContext').useOutlineSidebarContext(),
    setCurrentPageKey: setCurrentPageKeyMock,
  }),
}));

const renderComponent = (props?: Partial<HeaderActionsProps>) =>
  render(
    <HeaderActions
      courseActions={courseActions}
      headerNavigationsActions={headerNavigationsActions}
      isReIndexShow
      isDisabledReindexButton
      {...props}
    />,
    {
      extraWrapper: ({ children }) => (
        <CourseAuthoringProvider courseId="1">
          <CourseOutlineProvider>
            <OutlineSidebarProvider>
              {children}
            </OutlineSidebarProvider>
          </CourseOutlineProvider>
        </CourseAuthoringProvider>
      ),
    },
  );

describe('<HeaderActions />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('render HeaderActions component correctly', async () => {
    renderComponent();

    expect(await screen.findByRole('button', { name: messages.addButton.defaultMessage })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: messages.viewLiveButton.defaultMessage })).toBeInTheDocument();
  });

  it('calls the correct handlers when clicking buttons', async () => {
    renderComponent();

    const addButton = await screen.findByRole('button', { name: messages.addButton.defaultMessage });
    fireEvent.click(addButton);
    expect(setCurrentPageKeyMock).toHaveBeenCalledWith('add');
  });

  it('disables new section button if course outline fetch fails', async () => {
    renderComponent({
      errors: { outlineIndexApi: { data: 'some error', type: 'serverError' } },
    });

    expect(await screen.findByRole('button', { name: messages.addButton.defaultMessage })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: messages.addButton.defaultMessage })).toBeDisabled();
  });

  it('should show course info on click', async () => {
    renderComponent();

    // Click on the dropdown button
    await userEvent.click(screen.getByRole('button', { name: 'Course info' }));

    // Check if the current page change is called
    expect(setCurrentPageKeyMock).toHaveBeenCalledWith('info');
  });

  it('render reindex button and call the correct handlers when clicking', async () => {
    renderComponent({
      isReIndexShow: true,
      isDisabledReindexButton: false,
    });

    const reindexButton = await screen.findByRole('button', { name: messages.reindexButton.defaultMessage });
    expect(reindexButton).toBeInTheDocument();

    fireEvent.click(reindexButton);
    expect(headerNavigationsActions.handleReIndex).toHaveBeenCalledTimes(1);
  });

  it('render reindex button when isDisabledReindexButton is true', async () => {
    renderComponent({
      isReIndexShow: true,
      isDisabledReindexButton: true,
    });

    expect(await screen.findByRole('button', { name: messages.reindexButton.defaultMessage })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: messages.reindexButton.defaultMessage })).toBeDisabled();
  });

  it('hide reindex button', async () => {
    renderComponent({
      isReIndexShow: false,
    });

    expect(screen.queryByRole('button', { name: messages.reindexButton.defaultMessage })).not.toBeInTheDocument();
  });

  describe('course categories button', () => {
    const categoriesButtonName = 'Categories';

    it('sits between Course info and Reindex', async () => {
      const { axiosMock } = initializeMocks();
      axiosMock.onGet(apiUrls.status('1')).reply(200, { enabled: true, can_assign: true, can_manage: false });
      renderComponent({ isReIndexShow: true, isDisabledReindexButton: false });

      const categories = await screen.findByRole('button', { name: categoriesButtonName });
      const info = screen.getByRole('button', { name: 'Course info' });
      const reindex = screen.getByRole('button', { name: messages.reindexButton.defaultMessage });
      expect(info.compareDocumentPosition(categories) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(categories.compareDocumentPosition(reindex) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('is not rendered when the flag is off', async () => {
      const { axiosMock } = initializeMocks();
      axiosMock.onGet(apiUrls.status('1')).reply(200, { enabled: false, can_assign: true, can_manage: true });
      renderComponent();

      await screen.findByRole('button', { name: messages.addButton.defaultMessage });
      await waitFor(() => expect(axiosMock.history.get.some(({ url }) => url === apiUrls.status('1'))).toBe(true));
      expect(screen.queryByRole('button', { name: categoriesButtonName })).not.toBeInTheDocument();
    });
  });

  describe('publish history button', () => {
    const publishHistoryName = 'Publish History';

    it('sits between Categories and Reindex', async () => {
      const { axiosMock } = initializeMocks();
      axiosMock.onGet(apiUrls.status('1')).reply(200, { enabled: true, can_assign: true, can_manage: false });
      axiosMock.onGet(publishHistoryApiUrls.status('1')).reply(200, { enabled: true, can_view: true });
      renderComponent({ isReIndexShow: true, isDisabledReindexButton: false });

      const history = await screen.findByRole('button', { name: publishHistoryName });
      const categories = await screen.findByRole('button', { name: 'Categories' });
      const reindex = screen.getByRole('button', { name: messages.reindexButton.defaultMessage });
      expect(categories.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(history.compareDocumentPosition(reindex) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('is not rendered when the flag is off', async () => {
      const { axiosMock } = initializeMocks();
      axiosMock.onGet(publishHistoryApiUrls.status('1')).reply(200, { enabled: false, can_view: true });
      renderComponent();

      await screen.findByRole('button', { name: messages.addButton.defaultMessage });
      await waitFor(() =>
        expect(
          axiosMock.history.get.some(({ url }) => url === publishHistoryApiUrls.status('1')),
        ).toBe(true)
      );
      expect(screen.queryByRole('button', { name: publishHistoryName })).not.toBeInTheDocument();
    });
  });
});
