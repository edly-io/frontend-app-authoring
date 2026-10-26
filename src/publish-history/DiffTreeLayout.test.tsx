import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  within,
} from '@src/testUtils';

import { DiffTreeRoot } from './DiffTree';
import { field, node } from './testHelpers';

const LONG = 'W'.repeat(120);

describe('<DiffTree /> layout', () => {
  beforeEach(() => {
    initializeMocks();
  });

  describe('group heading toggle (C1)', () => {
    it.each(['chapter', 'sequential', 'vertical'])(
      'puts the chevron before the %s name in DOM order',
      (blockType) => {
        render(
          <DiffTreeRoot
            nodes={[node({ blockType, displayName: 'Group name', change: null })]}
            columns={['older', 'newer']}
          />,
        );
        const toggle = screen.getByRole('button', { name: /Group name/ });
        const name = within(toggle).getByText('Group name');
        const chevron = toggle.querySelector('svg') as SVGElement;
        expect(chevron).not.toBeNull();
        expect(chevron.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        // The chevron is the first icon in the toggle, ahead of the block-type icon too.
        expect(toggle.firstElementChild?.contains(chevron)).toBe(true);
      },
    );

    it('keeps aria-expanded and toggles with Enter and Space after the move', async () => {
      render(
        <DiffTreeRoot
          nodes={[node({ blockType: 'chapter', displayName: 'Week 1', change: null })]}
          columns={['older', 'newer']}
        />,
      );
      const toggle = screen.getByRole('button', { name: /Week 1/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      toggle.focus();
      await userEvent.keyboard('{Enter}');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await userEvent.keyboard(' ');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('long titles (C2)', () => {
    const renderLong = () =>
      render(
        <DiffTreeRoot nodes={[node({ displayName: LONG })]} columns={['older', 'newer']} />,
      );

    it('truncates the title on one line with the full name in a title attribute, in the header bar', () => {
      renderLong();
      const title = screen.getByText(LONG);
      expect(title).toHaveClass('text-truncate');
      expect(title).toHaveAttribute('title', LONG);
      expect(title.textContent).toBe(LONG);
    });

    it('includes the full name in the header bar\'s and each card\'s accessible name', () => {
      renderLong();
      expect(screen.getAllByRole('group', { name: new RegExp(LONG) })).toHaveLength(3);
    });

    it('keeps the icon and the badge from shrinking in the header bar', () => {
      renderLong();
      const header = screen.getByRole('group', { name: LONG }).querySelector(
        '.publish-history-node-header',
      ) as HTMLElement;
      expect(header.querySelector('.pgn__icon')).toHaveClass('flex-shrink-0');
      expect(within(header).getByText('Changed')).toHaveClass('flex-shrink-0');
    });

    it('gives a group heading the same truncating, titled name', () => {
      render(<DiffTreeRoot nodes={[node({ blockType: 'chapter', displayName: LONG })]} columns={['older', 'newer']} />);
      const name = within(screen.getByRole('button', { name: new RegExp(LONG) })).getByText(LONG);
      expect(name).toHaveClass('text-truncate');
      expect(name).toHaveAttribute('title', LONG);
    });

    it('renders a 120-char unbroken value in full, not truncated, on both sides', () => {
      render(
        <DiffTreeRoot
          nodes={[node({ fields: [field({ old: LONG, new: `${LONG}X` })] })]}
          columns={['older', 'newer']}
        />,
      );
      const older = screen.getByText(LONG);
      const newer = screen.getByText(`${LONG}X`);
      expect(older.textContent).toBe(LONG);
      expect(newer.textContent).toBe(`${LONG}X`);
      expect(older).not.toHaveClass('text-truncate');
      expect(newer).not.toHaveClass('text-truncate');
    });

    it('marks field names for wrapping and keeps the scope badge from shrinking, in both cards', () => {
      render(
        <DiffTreeRoot
          nodes={[node({ fields: [field({ name: LONG, scope: 'content' })] })]}
          columns={['older', 'newer']}
        />,
      );
      const names = screen.getAllByText(LONG);
      expect(names).toHaveLength(2);
      names.forEach((n) => expect(n).toHaveClass('publish-history-field-name'));
      screen.getAllByText('Content').forEach((b) => expect(b).toHaveClass('flex-shrink-0'));
      expect(screen.getAllByText('Content')).toHaveLength(2);
    });
  });
});
