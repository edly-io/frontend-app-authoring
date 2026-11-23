import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import {
  createInstructor, getInstructorDetail, searchInstructorUsers, updateInstructor,
} from './api';

jest.mock('@edx/frontend-platform', () => ({ getConfig: jest.fn() }));
jest.mock('@edx/frontend-platform/auth', () => ({ getAuthenticatedHttpClient: jest.fn() }));

const BASE = 'http://studio.test/rwaq/api/instructors';

describe('instructor user link api', () => {
  const client = { get: jest.fn(), post: jest.fn(), patch: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (getConfig as jest.Mock).mockReturnValue({ STUDIO_BASE_URL: 'http://studio.test' });
    (getAuthenticatedHttpClient as jest.Mock).mockReturnValue(client);
  });

  it('maps user and user_detail from the detail response', async () => {
    client.get.mockResolvedValue({
      data: {
        id: 5, name: 'Amina', user: 7, user_detail: { id: 7, username: 'amina', name: 'Amina Khan' },
      },
    });

    const { instructor } = await getInstructorDetail('5');

    expect(instructor.user).toBe(7);
    expect(instructor.userDetail).toEqual({ id: 7, username: 'amina', name: 'Amina Khan' });
  });

  it('treats a missing user as unlinked', async () => {
    client.get.mockResolvedValue({ data: { id: 5, name: 'Amina' } });

    const { instructor } = await getInstructorDetail('5');

    expect(instructor.user).toBeNull();
    expect(instructor.userDetail).toBeNull();
  });

  it('sends the chosen user id when updating', async () => {
    client.patch.mockResolvedValue({ data: { id: 5, name: 'Amina' } });

    await updateInstructor('5', { name: 'Amina', user: 7 });

    const [url, body] = client.patch.mock.calls[0];
    expect(url).toBe(`${BASE}/5/`);
    expect((body as FormData).get('user')).toBe('7');
  });

  it('sends an empty user to clear the link', async () => {
    client.patch.mockResolvedValue({ data: { id: 5, name: 'Amina' } });

    await updateInstructor('5', { user: null });

    expect((client.patch.mock.calls[0][1] as FormData).get('user')).toBe('');
  });

  it('leaves the user out of the update when it was not touched', async () => {
    client.patch.mockResolvedValue({ data: { id: 5, name: 'Amina' } });

    await updateInstructor('5', { name: 'Amina' });

    expect((client.patch.mock.calls[0][1] as FormData).has('user')).toBe(false);
  });

  it('sends only the user when creating, because the name comes from the user', async () => {
    client.post.mockResolvedValue({ data: { id: 6, name: 'Amina Khan' } });

    await createInstructor({ user: 9 });

    expect(client.post).toHaveBeenCalledWith(`${BASE}/`, { user: 9 });
  });

  it('searches users through the user-options endpoint', async () => {
    const rows = [{
      id: 1, username: 'amina', name: 'Amina Khan', linked: false,
    }];
    client.get.mockResolvedValue({ data: rows });

    const result = await searchInstructorUsers('ami');

    expect(client.get).toHaveBeenCalledWith(`${BASE}/user-options/`, { params: { search: 'ami' } });
    expect(result).toEqual(rows);
  });
});
