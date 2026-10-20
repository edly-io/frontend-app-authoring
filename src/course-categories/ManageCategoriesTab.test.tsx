import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';

import { apiUrls } from './data/api';
import ManageCategoriesTab from './ManageCategoriesTab';
import {
  DRIVING,
  FIRE,
  mockLoaded,
  requestsOf,
  ROAD,
} from './testHelpers';

let axiosMock;

const row = (name: string) => screen.getByText(name).closest('li') as HTMLElement;

describe('<ManageCategoriesTab />', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  describe('list', () => {
    it('lists every category with its course count', async () => {
      mockLoaded(axiosMock);
      render(<ManageCategoriesTab />);
      const list = await screen.findByRole('list', { name: 'All categories' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(3);
      expect(within(row('Road Safety')).getByText('2 courses')).toBeInTheDocument();
      expect(within(row('Fire Safety')).getByText('1 course')).toBeInTheDocument();
      expect(within(row('Driving')).getByText('0 courses')).toBeInTheDocument();
    });

    it('shows an empty state', async () => {
      mockLoaded(axiosMock, { categories: [] });
      render(<ManageCategoriesTab />);
      expect(await screen.findByText('No categories exist yet.')).toBeInTheDocument();
    });

    it('shows an alert when the list fails to load', async () => {
      axiosMock.onGet(apiUrls.categoriesPage(1)).reply(403);
      render(<ManageCategoriesTab />);
      expect(await screen.findByText(/Categories could not be loaded/)).toBeInTheDocument();
    });
  });

  describe('create', () => {
    it('disables Create until a name is typed', async () => {
      mockLoaded(axiosMock);
      render(<ManageCategoriesTab />);
      expect(await screen.findByRole('button', { name: 'Create' })).toBeDisabled();
      await userEvent.type(screen.getByRole('textbox', { name: 'New category' }), '   ');
      expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    });

    it('creates a category, clears the field, confirms and refreshes the list', async () => {
      mockLoaded(axiosMock);
      axiosMock.onPost(apiUrls.categories()).reply(201, { name: 'Health', slug: 'health', course_count: 0 });
      render(<ManageCategoriesTab />);
      const input = await screen.findByRole('textbox', { name: 'New category' });
      await userEvent.type(input, 'Health');
      axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, {
        count: 4,
        next: null,
        previous: null,
        results: [DRIVING, FIRE, ROAD, { name: 'Health', slug: 'health', course_count: 0 }],
      });
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByText('Created "Health".')).toBeInTheDocument();
      expect(requestsOf(axiosMock, 'post')).toEqual([[apiUrls.categories(), { name: 'Health' }]]);
      expect(input).toHaveValue('');
      await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(4));
    });

    it('shows the message for the API name error code inline and keeps the typed name', async () => {
      mockLoaded(axiosMock);
      axiosMock.onPost(apiUrls.categories()).reply(400, { name: ['English from the API'], name_code: 'name_taken' });
      render(<ManageCategoriesTab />);
      const input = await screen.findByRole('textbox', { name: 'New category' });
      await userEvent.type(input, 'road safety');
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByText('A category with this name already exists.')).toBeInTheDocument();
      expect(screen.queryByText('English from the API')).not.toBeInTheDocument();
      expect(input).toHaveValue('road safety');
      expect(screen.queryByText(/^Created/)).not.toBeInTheDocument();
    });

    it('shows the API name error text when there is no code', async () => {
      mockLoaded(axiosMock);
      axiosMock.onPost(apiUrls.categories()).reply(400, { name: ['English from the API'] });
      render(<ManageCategoriesTab />);
      await userEvent.type(await screen.findByRole('textbox', { name: 'New category' }), 'road safety');
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByText('English from the API')).toBeInTheDocument();
    });

    it('clears the error when the name is edited', async () => {
      mockLoaded(axiosMock);
      axiosMock.onPost(apiUrls.categories()).reply(400, { name: ['Enter a category name.'] });
      render(<ManageCategoriesTab />);
      const input = await screen.findByRole('textbox', { name: 'New category' });
      await userEvent.type(input, 'x');
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));
      await screen.findByText('Enter a category name.');
      await userEvent.type(input, 'y');
      expect(screen.queryByText('Enter a category name.')).not.toBeInTheDocument();
    });

    it('shows the permission message on a 403', async () => {
      mockLoaded(axiosMock);
      axiosMock.onPost(apiUrls.categories()).reply(403);
      render(<ManageCategoriesTab />);
      await userEvent.type(await screen.findByRole('textbox', { name: 'New category' }), 'x');
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByText('You don\'t have permission to make this change.')).toBeInTheDocument();
    });

    it('shows a generic message on another client error', async () => {
      mockLoaded(axiosMock);
      axiosMock.onPost(apiUrls.categories()).reply(404);
      render(<ManageCategoriesTab />);
      await userEvent.type(await screen.findByRole('textbox', { name: 'New category' }), 'x');
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByText('The change could not be saved. Try again.')).toBeInTheDocument();
    });
  });

  describe('rename', () => {
    const startRename = async () => {
      mockLoaded(axiosMock);
      render(<ManageCategoriesTab />);
      await userEvent.click(await screen.findByRole('button', { name: 'Rename Road Safety' }));
      return screen.getByRole('textbox', { name: 'Name of Road Safety' });
    };

    it('opens an inline field with the current name, focused', async () => {
      const input = await startRename();
      expect(input).toHaveValue('Road Safety');
      expect(input).toHaveFocus();
    });

    it('saves with the Save button and keeps the slug in the request', async () => {
      axiosMock.onPatch(apiUrls.category(ROAD.slug)).reply(200, { ...ROAD, name: 'Driving Safety', course_count: 2 });
      const input = await startRename();
      await userEvent.clear(input);
      await userEvent.type(input, 'Driving Safety');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(screen.queryByRole('textbox', { name: /^Name of/ })).not.toBeInTheDocument());
      expect(requestsOf(axiosMock, 'patch')).toEqual([[apiUrls.category('road-safety'), { name: 'Driving Safety' }]]);
    });

    it('saves with Enter', async () => {
      axiosMock.onPatch(apiUrls.category(ROAD.slug)).reply(200, ROAD);
      const input = await startRename();
      await userEvent.type(input, ' 2{Enter}');
      await waitFor(() => expect(requestsOf(axiosMock, 'patch')).toHaveLength(1));
    });

    it('cancels with the Cancel button without a request', async () => {
      const input = await startRename();
      await userEvent.type(input, 'xyz');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByText('Road Safety')).toBeInTheDocument();
      expect(requestsOf(axiosMock, 'patch')).toEqual([]);
    });

    it('cancels with Escape without a request, and the dialog does not see the key', async () => {
      const onKeyDown = jest.fn();
      mockLoaded(axiosMock);
      render(
        <div onKeyDown={onKeyDown}>
          <ManageCategoriesTab />
        </div>,
      );
      await userEvent.click(await screen.findByRole('button', { name: 'Rename Road Safety' }));
      onKeyDown.mockClear();
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('textbox', { name: /^Name of/ })).not.toBeInTheDocument();
      expect(onKeyDown).not.toHaveBeenCalled();
      expect(requestsOf(axiosMock, 'patch')).toEqual([]);
    });

    it('starts again from the saved name after a cancel', async () => {
      const input = await startRename();
      await userEvent.type(input, 'xyz');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await userEvent.click(screen.getByRole('button', { name: 'Rename Road Safety' }));
      expect(screen.getByRole('textbox', { name: 'Name of Road Safety' })).toHaveValue('Road Safety');
    });

    it('shows the message for a 400 name error code inline and stays in edit mode', async () => {
      axiosMock.onPatch(apiUrls.category(ROAD.slug)).reply(400, {
        name: ['English from the API'],
        name_code: 'name_too_long',
      });
      const input = await startRename();
      await userEvent.type(input, '{Enter}');
      expect(await screen.findByText('Use at most 100 characters.')).toBeInTheDocument();
      expect(screen.queryByText('English from the API')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Name of Road Safety' })).toBeInTheDocument();
    });

    it('shows the API text of a 400 name error with an unknown code', async () => {
      axiosMock.onPatch(apiUrls.category(ROAD.slug)).reply(400, {
        name: ['English from the API'],
        name_code: 'name_new_rule',
      });
      const input = await startRename();
      await userEvent.type(input, '{Enter}');
      expect(await screen.findByText('English from the API')).toBeInTheDocument();
    });

    it('shows the permission message on a 403', async () => {
      axiosMock.onPatch(apiUrls.category(ROAD.slug)).reply(403);
      const input = await startRename();
      await userEvent.type(input, '{Enter}');
      expect(await screen.findByText('You don\'t have permission to make this change.')).toBeInTheDocument();
    });
  });

  describe('delete', () => {
    const openDelete = async (name = 'Road Safety') => {
      mockLoaded(axiosMock);
      render(<ManageCategoriesTab />);
      await userEvent.click(await screen.findByRole('button', { name: `Delete ${name}` }));
      return screen.findByRole('dialog', { name: `Delete "${name}"?` });
    };

    it('asks for confirmation with the plural course count', async () => {
      const dialog = await openDelete();
      expect(within(dialog).getByText('Assigned to 2 courses; they will be unassigned.')).toBeInTheDocument();
      expect(requestsOf(axiosMock, 'delete')).toEqual([]);
    });

    it('uses the singular for one course', async () => {
      const dialog = await openDelete('Fire Safety');
      expect(within(dialog).getByText('Assigned to 1 course; it will be unassigned.')).toBeInTheDocument();
    });

    it('says an unassigned category is not in use', async () => {
      const dialog = await openDelete('Driving');
      expect(within(dialog).getByText('It isn\'t assigned to any course.')).toBeInTheDocument();
    });

    it('keeps the row and sends nothing on Cancel', async () => {
      const dialog = await openDelete();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByText('Road Safety')).toBeInTheDocument();
      expect(requestsOf(axiosMock, 'delete')).toEqual([]);
    });

    it('sends DELETE on confirm, removes the row and confirms', async () => {
      axiosMock.onDelete(apiUrls.category(ROAD.slug)).reply(204);
      const dialog = await openDelete();
      axiosMock.onGet(apiUrls.categoriesPage(1)).reply(200, {
        count: 2,
        next: null,
        previous: null,
        results: [DRIVING, FIRE],
      });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      expect(await screen.findByText('Deleted "Road Safety".')).toBeInTheDocument();
      expect(requestsOf(axiosMock, 'delete')).toEqual([[apiUrls.category('road-safety'), undefined]]);
      await waitFor(() => expect(screen.queryByText('2 courses')).not.toBeInTheDocument());
      expect(screen.queryByRole('button', { name: 'Delete Road Safety' })).not.toBeInTheDocument();
    });

    it('shows an alert in the dialog when the delete fails, and keeps the row', async () => {
      axiosMock.onDelete(apiUrls.category(ROAD.slug)).reply(404);
      const dialog = await openDelete();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      expect(await within(dialog).findByText('The change could not be saved. Try again.')).toBeInTheDocument();
      expect(screen.getByText('Road Safety')).toBeInTheDocument();
      expect(screen.queryByText(/^Deleted/)).not.toBeInTheDocument();
    });

    it('shows the permission message on a 403', async () => {
      axiosMock.onDelete(apiUrls.category(ROAD.slug)).reply(403);
      const dialog = await openDelete();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      expect(await within(dialog).findByText('You don\'t have permission to make this change.')).toBeInTheDocument();
    });

    it('clears the error when the dialog is cancelled and reopened', async () => {
      axiosMock.onDelete(apiUrls.category(ROAD.slug)).reply(404);
      const dialog = await openDelete();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await within(dialog).findByText('The change could not be saved. Try again.');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete Road Safety' }));
      const reopened = await screen.findByRole('dialog', { name: 'Delete "Road Safety"?' });
      expect(within(reopened).queryByText('The change could not be saved. Try again.')).not.toBeInTheDocument();
    });
  });
});
