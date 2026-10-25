import { getConfig } from '@edx/frontend-platform';
import {
  fireEvent, initializeMocks, render, screen, waitFor,
} from '@src/testUtils';
import ProgramsTab from '.';

const programsUrl = () => `${getConfig().STUDIO_BASE_URL}/fbr/api/programs/`;

const programRow = (name: string) => ({
  program_key: `program-v1:FBR+STP+${name.replace(/\s/g, '')}`,
  name,
  organization: 'FBR',
  program_type: 'STP',
  batch: '2026',
  status: 'active',
});

const page = (names: string[], { count = names.length, numPages = 1 } = {}) => ({
  results: names.map(programRow),
  pagination: { count, num_pages: numPages },
});

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const programRequests = () => axiosMock.history.get.filter((req) => req.url === programsUrl());
const lastProgramParams = () => programRequests().at(-1)?.params;

describe('ProgramsTab', () => {
  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
  });

  it('reaches a program on page 2 through the pagination control', async () => {
    axiosMock.onGet(programsUrl()).reply((config) => [200, String(config.params?.page) === '2'
      ? page(['Oldest Program'], { count: 21, numPages: 2 })
      : page(['Alpha Program'], { count: 21, numPages: 2 })]);

    render(<ProgramsTab />);
    expect(await screen.findByText('Alpha Program')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByText('Oldest Program')).toBeInTheDocument();
    expect(lastProgramParams()).toMatchObject({ page: 2 });
    expect(screen.getByText('Showing 1 of 21')).toBeInTheDocument();
  });

  it('stays on page 2 after the search debounce has passed', async () => {
    axiosMock.onGet(programsUrl()).reply((config) => [200, String(config.params?.page) === '2'
      ? page(['Oldest Program'], { count: 21, numPages: 2 })
      : page(['Alpha Program'], { count: 21, numPages: 2 })]);

    render(<ProgramsTab />);
    await screen.findByText('Alpha Program');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText('Oldest Program');
    await new Promise((resolve) => { setTimeout(resolve, 600); });

    expect(lastProgramParams()).toMatchObject({ page: 2 });
    expect(screen.getByText('Oldest Program')).toBeInTheDocument();
  });

  it('shows the row status and pagination control even with one page', async () => {
    axiosMock.onGet(programsUrl()).reply(200, page(['Alpha Program', 'Bravo Program']));

    render(<ProgramsTab />);

    expect(await screen.findByText('Showing 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Programs pagination' })).toBeInTheDocument();
  });

  describe('sends search, status and sort to the server and restarts at page 1', () => {
    beforeEach(() => {
      axiosMock.onGet(programsUrl()).reply(200, page(['Alpha Program'], { count: 21, numPages: 2 }));
    });

    const openPageTwo = async () => {
      render(<ProgramsTab />);
      await screen.findByText('Alpha Program');
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(lastProgramParams()).toMatchObject({ page: 2 }));
    };

    it('defaults to A-Z with no search or status', async () => {
      render(<ProgramsTab />);
      await screen.findByText('Alpha Program');
      expect(lastProgramParams()).toEqual({ page: 1, page_size: 20, ordering: 'name' });
    });

    it('search', async () => {
      await openPageTwo();
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'tax' } });
      await waitFor(() => expect(lastProgramParams()).toMatchObject({ page: 1, search: 'tax' }));
    });

    it('status filter', async () => {
      await openPageTwo();
      fireEvent.click(screen.getByRole('button', { name: 'All statuses' }));
      fireEvent.click(await screen.findByText('Archived'));
      await waitFor(() => expect(lastProgramParams()).toMatchObject({ page: 1, status: 'archived' }));
    });

    it('sort', async () => {
      await openPageTwo();
      fireEvent.click(screen.getByRole('button', { name: 'Name A-Z' }));
      fireEvent.click(await screen.findByText('Name Z-A'));
      await waitFor(() => expect(lastProgramParams()).toMatchObject({ page: 1, ordering: '-name' }));
    });
  });
});
