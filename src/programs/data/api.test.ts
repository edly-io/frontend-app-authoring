import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { bulkEnrollProgram } from './api';

jest.mock('@edx/frontend-platform', () => ({ getConfig: () => ({ STUDIO_BASE_URL: 'http://studio.local' }) }));
jest.mock('@edx/frontend-platform/auth', () => ({ getAuthenticatedHttpClient: jest.fn() }));

it('uses the backend address for failures when the pasted list contains non-ASCII spaces', async () => {
  const post = jest.fn().mockResolvedValue({
    data: {
      enrolled: [],
      already_enrolled: [],
      invited: [],
      failed: [{ index: 1, email: 'second@example.com', reason: 'Could not enroll learner' }],
      course_failures: [],
      notification_failures: [],
    },
  });
  (getAuthenticatedHttpClient as jest.Mock).mockReturnValue({ post });
  const result = await bulkEnrollProgram('program', 'first@example.com\u00a0second@example.com', '', false, false);
  expect(result.failed[0].email).toBe('second@example.com');
});
