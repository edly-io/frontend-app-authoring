import {
  fireEvent, initializeMocks, render, screen, waitFor, within,
} from '@src/testUtils';
import SubstituteRequestsView from './SubstituteRequestsView';
import {
  PROGRAM_KEY, SUBSTITUTES_URL, makeSubstituteRequest, page,
} from './testFixtures';
import type { SubstituteRequest } from './data/types';

// Studio's jest setup answers every media query with `matches: false`, which reads as a phone.
jest.mock('@edly-io/frontend-component-fbr', () => ({
  ...jest.requireActual('@edly-io/frontend-component-fbr'),
  useIsBelowLg: () => false,
}));

const CLOSE_URL = /\/substitute-requests\/14\/close\/$/;
const CANCEL_URL = /\/sessions\/sess-1\/cancel\/$/;

let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

const mockList = (results: SubstituteRequest[]) => axiosMock.onGet(SUBSTITUTES_URL).reply(200, page(results));
const renderView = () => render(<SubstituteRequestsView programId={PROGRAM_KEY} />);
const posted = (url: RegExp) => axiosMock.history.post.filter((req) => url.test(req.url ?? ''));

beforeEach(() => {
  ({ axiosMock } = initializeMocks());
  axiosMock.onPost(CLOSE_URL).reply(200, {});
  axiosMock.onPost(CANCEL_URL).reply(200, {});
});

describe('SubstituteRequestsView — a live session', () => {
  it('offers both actions', async () => {
    mockList([makeSubstituteRequest()]);
    renderView();
    expect(await screen.findByRole('button', { name: 'Assign Substitute' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel Session' })).toBeInTheDocument();
    expect(screen.queryByText('Cancelled')).not.toBeInTheDocument();
  });

  it('cancels the session and closes the request after confirming', async () => {
    mockList([makeSubstituteRequest()]);
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel Session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Session' }));
    await waitFor(() => expect(posted(CLOSE_URL)).toHaveLength(1));
    expect(posted(CANCEL_URL)).toHaveLength(1);
  });
});

describe('SubstituteRequestsView — a cancelled session', () => {
  const cancelled = () => makeSubstituteRequest({
    session: { ...makeSubstituteRequest().session, status: 'cancelled' },
  });

  it('marks the row as cancelled', async () => {
    mockList([cancelled()]);
    renderView();
    // The Status column shows the request's status ("Open"), so the session badge is what
    // tells the admin the class is not happening.
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Open')).toBeInTheDocument();
  });

  it('withdraws both actions, since neither is possible', async () => {
    mockList([cancelled()]);
    renderView();
    await screen.findByText('Cancelled');
    expect(screen.queryByRole('button', { name: 'Assign Substitute' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel Session' })).not.toBeInTheDocument();
  });

  it('offers Close so the row is not stranded', async () => {
    mockList([cancelled()]);
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(posted(CLOSE_URL)).toHaveLength(1));
    expect(posted(CANCEL_URL)).toHaveLength(0);
  });
});

describe('SubstituteRequestsView — after a substitute is assigned', () => {
  const assigned = () => makeSubstituteRequest({
    status: 'assigned',
    substitute_instructor_email: 'sub@fbr.test',
    substitute_instructor_name: 'Sub One',
    session: {
      ...makeSubstituteRequest().session,
      instructor_emails: ['instructor1@fbr.test', 'sub@fbr.test', 'sub2@fbr.test'],
      instructor_names: ['Instructor One', 'Sub One', 'Sub Two'],
    },
  });
  // "Assigned" also appears in the status filter, so look inside the table.
  const inTable = async () => within(await screen.findByRole('table'));

  it('drops the action buttons — the request is resolved', async () => {
    mockList([assigned()]);
    renderView();
    const table = await inTable();
    expect(table.getByText('Assigned')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign Substitute' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel Session' })).not.toBeInTheDocument();
  });

  it('lists every current instructor except the one on leave in the Substitute column', async () => {
    mockList([assigned()]);
    renderView();
    const table = await inTable();
    expect(table.getByText('Sub One')).toBeInTheDocument();
    expect(table.getByText('Sub Two')).toBeInTheDocument();
    expect(table.getByText('(sub@fbr.test)')).toBeInTheDocument();
    expect(table.getByText('(sub2@fbr.test)')).toBeInTheDocument();
    const substituteCell = table.getAllByRole('cell')[4];
    expect(within(substituteCell).queryByText(/instructor1@fbr.test/)).not.toBeInTheDocument();
  });
});

describe('SubstituteRequestsView — assign deep links', () => {
  it('ignores an id that is not a substitute request id', async () => {
    mockList([makeSubstituteRequest()]);
    render(<SubstituteRequestsView programId={PROGRAM_KEY} />, {
      routerProps: { initialEntries: ['/?modal=assign-substitute&id=../../users/me'] },
    });
    await screen.findByRole('table');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(axiosMock.history.get.some((req) => /users/.test(req.url ?? ''))).toBe(false);
  });
});

describe('AssignSubstituteModal — session summary', () => {
  it("keeps the session's course in the summary when the course field is cleared", async () => {
    const withCourse = makeSubstituteRequest({
      session: {
        ...makeSubstituteRequest().session, course_id: 'course-v1:X', course_name: 'Intro to Python', session_type: 'workshop',
      },
    });
    mockList([withCourse]);
    axiosMock.onGet().reply(200, []);
    render(<SubstituteRequestsView programId={PROGRAM_KEY} />, {
      routerProps: { initialEntries: ['/?modal=assign-substitute&id=14'] },
    });
    const dialog = await screen.findByRole('dialog');
    const summary = () => dialog.querySelector('.assign-substitute-modal__session-summary');
    expect(summary()).toHaveTextContent('Course: Intro to Python');

    fireEvent.change(within(dialog).getByLabelText('Course'), { target: { value: 'zz' } });

    expect(summary()).toHaveTextContent('Course: Intro to Python');
  });
});
