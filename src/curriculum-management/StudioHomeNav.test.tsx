import {
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';
import { getUberFlagsUrl } from '@src/reporting/data/api';

import { rawStatus } from './__mocks__/fixtures';
import { apiUrls } from './data/api';
import { curriculumQueryKeys } from './data/apiHooks';
import StudioHomeNav from './StudioHomeNav';

describe('<StudioHomeNav />', () => {
  it.each([true, false])('shows the Curriculum Management tab only when its flag is on (%s)', async (enabled) => {
    const { axiosMock, queryClient } = initializeMocks();
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus(enabled));
    axiosMock.onGet(getUberFlagsUrl()).reply(200, { enable_reporting: true });
    render(<StudioHomeNav />);

    await waitFor(() => expect(queryClient.getQueryState(curriculumQueryKeys.status())?.status).toBe('success'));
    expect(await screen.findByRole('link', { name: 'Reporting' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Curriculum Management' }) !== null).toBe(enabled);
  });
});
