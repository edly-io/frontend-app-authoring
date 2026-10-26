import { initializeMocks, render, screen } from '@src/testUtils';

import FieldChange from './FieldChange';
import { field } from './testHelpers';
import type { Age } from './types';

const OLDER_FIRST: [Age, Age] = ['older', 'newer'];
const NEWER_FIRST: [Age, Age] = ['newer', 'older'];

describe('<FieldChange />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  describe('plain values', () => {
    it('shows the old value in red on the older side and the new one in green on the newer side', () => {
      render(<FieldChange field={field()} columns={OLDER_FIRST} />);
      expect(screen.getByText('Old name')).toHaveClass('publish-history-value-older');
      expect(screen.getByText('Old name')).not.toHaveClass('publish-history-value-newer');
      expect(screen.getByText('New name')).toHaveClass('publish-history-value-newer');
      expect(screen.getByText('New name')).not.toHaveClass('publish-history-value-older');
    });

    it('lists the older value first when the older side is on the left', () => {
      render(<FieldChange field={field()} columns={OLDER_FIRST} />);
      expect(screen.getByText('Old name').compareDocumentPosition(screen.getByText('New name')))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('lists the newer value first when the selected (newer) version is on the left, colours unchanged', () => {
      render(<FieldChange field={field()} columns={NEWER_FIRST} />);
      expect(screen.getByText('New name').compareDocumentPosition(screen.getByText('Old name')))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(screen.getByText('New name')).toHaveClass('publish-history-value-newer');
      expect(screen.getByText('Old name')).toHaveClass('publish-history-value-older');
    });

    it('shows the field name and its scope', () => {
      render(<FieldChange field={field({ scope: 'content' })} columns={OLDER_FIRST} />);
      expect(screen.getByText('display_name')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders markup in a value as text', () => {
      const payload = '<script>window.__pwned = true</script>';
      const { container } = render(<FieldChange field={field({ old: payload, new: payload })} columns={OLDER_FIRST} />);
      expect(container.querySelector('script')).toBeNull();
      expect(screen.getAllByText(payload)).toHaveLength(2);
    });
  });

  describe('text diffs', () => {
    const textDiff = {
      kind: 'words' as const,
      segments: [
        { op: 'equal' as const, text: 'same ' },
        { op: 'delete' as const, text: 'gone' },
        { op: 'insert' as const, text: 'fresh' },
      ],
    };
    const data = field({ name: 'data', scope: 'content', old: null, new: null, textDiff });

    it('shows only unchanged and removed text in the older column', () => {
      render(<FieldChange field={data} columns={OLDER_FIRST} />);
      const older = screen.getByRole('group', { name: 'Changes in data, older version' });
      expect(older).toHaveTextContent('same');
      expect(older.querySelector('del')).toHaveTextContent('gone');
      expect(older.querySelector('ins')).toBeNull();
      expect(older).not.toHaveTextContent('fresh');
    });

    it('shows only unchanged and added text in the newer column', () => {
      render(<FieldChange field={data} columns={OLDER_FIRST} />);
      const newer = screen.getByRole('group', { name: 'Changes in data, newer version' });
      expect(newer).toHaveTextContent('same');
      expect(newer.querySelector('ins')).toHaveTextContent('fresh');
      expect(newer.querySelector('del')).toBeNull();
      expect(newer).not.toHaveTextContent('gone');
    });

    it('puts the newer column on the left when the columns say so', () => {
      render(<FieldChange field={data} columns={NEWER_FIRST} />);
      const [left] = screen.getAllByRole('group');
      expect(left).toHaveAccessibleName('Changes in data, newer version');
    });
  });

  describe('JSON diffs', () => {
    const jsonDiff = {
      changes: [{
        path: ['a'],
        oldPath: null,
        op: 'changed' as const,
        old: 1,
        new: 2,
        tooLarge: false,
      }],
      unchanged: [{ path: [], count: 5 }],
      truncated: false,
    };

    it('renders the key-level diff instead of old and new values', () => {
      const { container } = render(
        <FieldChange field={field({ old: null, new: null, jsonDiff })} columns={OLDER_FIRST} />,
      );
      expect(screen.getByText('5 unchanged entries')).toBeInTheDocument();
      expect(container.querySelector('.publish-history-json')).toBeInTheDocument();
      expect(container.querySelector('.publish-history-value')).toBeNull();
    });
  });

  describe('too large', () => {
    it('explains a field over the size cap', () => {
      render(<FieldChange field={field({ tooLarge: true, tooLargeReason: 'size' })} columns={OLDER_FIRST} />);
      expect(screen.getByText('Too large to compare. Values are cut short.')).toBeInTheDocument();
    });

    it('explains a field past the comparison budget differently', () => {
      render(<FieldChange field={field({ tooLarge: true, tooLargeReason: 'budget' })} columns={OLDER_FIRST} />);
      expect(screen.getByText(/Not compared, as this comparison has too many changes/)).toBeInTheDocument();
      expect(screen.queryByText('Too large to compare. Values are cut short.')).not.toBeInTheDocument();
    });

    it('still shows the cut values, without red or green', () => {
      render(
        <FieldChange
          field={field({ old: 'abc', new: 'abd', tooLarge: true, tooLargeReason: 'budget' })}
          columns={OLDER_FIRST}
        />,
      );
      expect(screen.getByText('abc')).not.toHaveClass('publish-history-value-older');
      expect(screen.getByText('abd')).not.toHaveClass('publish-history-value-newer');
    });

    it('shows no note for a field that was compared', () => {
      render(<FieldChange field={field()} columns={OLDER_FIRST} />);
      expect(screen.queryByText(/Too large|Not compared/)).not.toBeInTheDocument();
    });
  });
});
