import { initializeMocks, render, screen, waitFor } from '@src/testUtils';
import { getStudioHomeApiUrl } from '@src/studio-home/data/api';
import { getUberFlagsUrl } from '@src/reporting/data/api';
import { apiUrls } from './data/api';
import { rawStatus } from './__mocks__/fixtures';
import StudioHomeNav from './StudioHomeNav';

/**
 * A tab that leads nowhere is worse than a missing one: it looks like a feature the user lacks access to.
 * Both tabs here are behind their own flag, and each has shipped unconditionally at some point.
 */
describe('StudioHomeNav', () => {
  let axiosMock: ReturnType<typeof initializeMocks>['axiosMock'];

  const setUp = ({ curriculum = true, reporting = true } = {}) => {
    ({ axiosMock } = initializeMocks());
    axiosMock.onGet(getStudioHomeApiUrl()).reply(200, {
      librariesV1Enabled: false,
      librariesV2Enabled: false,
    });
    axiosMock.onGet(apiUrls.status()).reply(200, rawStatus(curriculum));
    axiosMock.onGet(getUberFlagsUrl()).reply(200, { enable_reporting: reporting });
  };

  const tabNames = async () => {
    await waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument());
    return screen.getAllByRole('link').map((link) => link.textContent);
  };

  it('shows both optional tabs when both flags are on', async () => {
    setUp({ curriculum: true, reporting: true });
    render(<StudioHomeNav />);

    await waitFor(() => expect(screen.getByText('Learning Paths')).toBeInTheDocument());
    expect(screen.getByText('Reporting')).toBeInTheDocument();
  });

  it('hides the Learning Paths tab when curriculum management is off', async () => {
    setUp({ curriculum: false, reporting: true });
    render(<StudioHomeNav />);

    await waitFor(() => expect(screen.getByText('Reporting')).toBeInTheDocument());
    expect(screen.queryByText('Learning Paths')).not.toBeInTheDocument();
  });

  it('hides the Reporting tab when its flag is off', async () => {
    setUp({ curriculum: true, reporting: false });
    render(<StudioHomeNav />);

    await waitFor(() => expect(screen.getByText('Learning Paths')).toBeInTheDocument());
    expect(screen.queryByText('Reporting')).not.toBeInTheDocument();
  });

  it('shows neither optional tab when both flags are off', async () => {
    setUp({ curriculum: false, reporting: false });
    render(<StudioHomeNav />);

    const names = await tabNames();
    expect(names).not.toContain('Learning Paths');
    expect(names).not.toContain('Reporting');
    // The Courses tab is not optional, so the bar is never empty.
    expect(names).toContain('Courses');
  });
});
