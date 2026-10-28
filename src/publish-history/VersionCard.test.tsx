import {
  initializeMocks,
  render,
  screen,
  within,
} from '@src/testUtils';

import PreviewModal from './PreviewModal';
import VersionCard, { SideLine, VersionId } from './VersionCard';
import {
  COURSE_ID,
  node,
  V2,
  V3,
} from './testHelpers';
import type { DiffSide } from './types';
import messages from './messages';

const OLDER: DiffSide = { id: V2, kind: 'version', at: '2026-01-02T12:00:00Z', by: { id: 7, username: 'writer' } };
const NEWER: DiffSide = { id: V3, kind: 'version', at: '2026-01-03T12:00:00Z', by: { id: 8, username: 'editor' } };

/** Selects the text of an element, as a user dragging over it does. */
const select = (text: string) => {
  jest.spyOn(window, 'getSelection').mockReturnValue({ toString: () => text } as unknown as Selection);
};

const copy = (target: Element) => {
  const setData = jest.fn();
  const event = new Event('copy', { bubbles: true, cancelable: true });
  Object.assign(event, { clipboardData: { setData } });
  target.dispatchEvent(event);
  return { setData, event };
};

describe('version ids and side lines', () => {
  beforeEach(() => {
    initializeMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('<VersionId />', () => {
    it('shows the first 7 characters with the full id in the title', () => {
      render(<VersionId id="0123456789abcdef01234567" />);
      const code = screen.getByText('0123456');
      expect(code).toHaveAttribute('title', '0123456789abcdef01234567');
      expect(screen.queryByText('0123456789abcdef01234567')).not.toBeInTheDocument();
    });

    it('puts the full id on the clipboard when the short id is copied', () => {
      render(<VersionId id="0123456789abcdef01234567" />);
      select('0123456');
      const { setData, event } = copy(screen.getByText('0123456'));
      expect(setData).toHaveBeenCalledWith('text/plain', '0123456789abcdef01234567');
      expect(event.defaultPrevented).toBe(true);
    });

    it('leaves the clipboard alone when the selection is something else', () => {
      render(<VersionId id="0123456789abcdef01234567" />);
      select('unrelated text');
      const { setData, event } = copy(screen.getByText('0123456'));
      expect(setData).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('leaves the clipboard alone when nothing is selected', () => {
      render(<VersionId id="0123456789abcdef01234567" />);
      select('');
      const { setData } = copy(screen.getByText('0123456'));
      expect(setData).not.toHaveBeenCalled();
    });
  });

  describe('<SideLine />', () => {
    it('reads "date by user · short id", the user bold and the full id in the title', () => {
      const { container } = render(<SideLine side={OLDER} />);
      expect(container).toHaveTextContent(/^Jan 2, 2026.* by writer · 2222222$/);
      expect(within(container).getByText('writer').tagName).toBe('STRONG');
      expect(within(container).getByTitle(V2)).toHaveTextContent('2222222');
    });

    it('shows Unknown for a missing user', () => {
      const { container } = render(<SideLine side={{ ...OLDER, by: null }} />);
      expect(within(container).getByText(messages.unknownUser.defaultMessage).tagName).toBe('STRONG');
    });

    it('adds a Current badge to the published side and Current Draft to the draft side', () => {
      const { rerender } = render(<SideLine side={{ ...NEWER, kind: 'published' }} />);
      expect(screen.getByText(messages.currentBadge.defaultMessage)).toBeInTheDocument();
      rerender(<SideLine side={{ ...NEWER, kind: 'draft' }} />);
      expect(screen.getByText(messages.optionDraft.defaultMessage)).toBeInTheDocument();
    });

    it('has no badge on an ordinary version', () => {
      render(<SideLine side={OLDER} />);
      expect(screen.queryByText(/^Current/)).not.toBeInTheDocument();
    });
  });

  describe('<VersionCard />', () => {
    it('shows the heading, then the side line, and no "Published Version"', () => {
      render(<VersionCard heading="Selected Version" age="older" side={OLDER} />);
      const region = screen.getByRole('region', { name: 'Selected Version' });
      expect(region).toHaveTextContent('by writer · 2222222');
      expect(within(region).getByTitle(V2)).toBeInTheDocument();
      expect(region).not.toHaveTextContent('Published Version');
    });

    it('shows no side line while the side is unknown', () => {
      render(<VersionCard heading="Compare With" age={null} side={null} />);
      expect(screen.getByRole('region', { name: 'Compare With' })).not.toHaveTextContent(' by ');
    });
  });

  describe('<PreviewModal /> headers', () => {
    const renderModal = () =>
      render(
        <PreviewModal
          courseId={COURSE_ID}
          node={node()}
          sides={{ older: OLDER, newer: { ...NEWER, kind: 'published' } }}
          columns={['older', 'newer']}
          onClose={jest.fn()}
        />,
      );

    it('shows "date by user · short id" for each side, with the full ids in titles', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveTextContent(/by writer · 2222222/);
      expect(dialog).toHaveTextContent(/by editor · 3333333/);
      expect(within(dialog).getByTitle(V2)).toBeInTheDocument();
      expect(within(dialog).getByTitle(V3)).toBeInTheDocument();
    });

    it('has no "Published Version" text anywhere in the modal', () => {
      renderModal();
      expect(screen.getByRole('dialog')).not.toHaveTextContent('Published Version');
    });

    it('copies the full id from a header\'s short id', () => {
      renderModal();
      select('2222222');
      const { setData } = copy(within(screen.getByRole('dialog')).getByTitle(V2));
      expect(setData).toHaveBeenCalledWith('text/plain', V2);
    });
  });
});
