import { initializeMocks, render, screen } from '@src/testUtils';

import BlockPair from './BlockPair';
import { fieldSlots } from './FieldChange';
import { field } from './testHelpers';
import type { Age, FieldChangeData } from './types';

const OLDER_FIRST: [Age, Age] = ['older', 'newer'];
const NEWER_FIRST: [Age, Age] = ['newer', 'older'];

/** The field in a block's two cards, as the diff tree shows it. */
const renderField = (data: FieldChangeData, columns: [Age, Age] = OLDER_FIRST) => (
  render(<BlockPair columns={columns} slots={fieldSlots(data)} label={(side) => `${side} card`} />)
);

describe('fieldSlots', () => {
  beforeEach(() => {
    initializeMocks();
  });

  describe('plain values', () => {
    it('shows the old value in red on the older side and the new one in green on the newer side', () => {
      renderField(field(), OLDER_FIRST);
      expect(screen.getByText('Old name')).toHaveClass('publish-history-value-older');
      expect(screen.getByText('Old name')).not.toHaveClass('publish-history-value-newer');
      expect(screen.getByText('New name')).toHaveClass('publish-history-value-newer');
      expect(screen.getByText('New name')).not.toHaveClass('publish-history-value-older');
    });

    it('lists the older value first when the older side is on the left', () => {
      renderField(field(), OLDER_FIRST);
      expect(screen.getByText('Old name').compareDocumentPosition(screen.getByText('New name')))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('lists the newer value first when the selected (newer) version is on the left, colours unchanged', () => {
      renderField(field(), NEWER_FIRST);
      expect(screen.getByText('New name').compareDocumentPosition(screen.getByText('Old name')))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(screen.getByText('New name')).toHaveClass('publish-history-value-newer');
      expect(screen.getByText('Old name')).toHaveClass('publish-history-value-older');
    });

    it('shows the field name and its scope in both cards', () => {
      renderField(field({ scope: 'content' }), OLDER_FIRST);
      expect(screen.getAllByText('display_name')).toHaveLength(2);
      expect(screen.getAllByText('Content')).toHaveLength(2);
    });

    it('renders markup in a value as text', () => {
      const payload = '<script>window.__pwned = true</script>';
      const { container } = renderField(field({ old: payload, new: payload }), OLDER_FIRST);
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
      renderField(data, OLDER_FIRST);
      const older = screen.getByRole('group', { name: 'Changes in data, older version' });
      expect(older).toHaveTextContent('same');
      expect(older.querySelector('del')).toHaveTextContent('gone');
      expect(older.querySelector('ins')).toBeNull();
      expect(older).not.toHaveTextContent('fresh');
    });

    it('shows only unchanged and added text in the newer column', () => {
      renderField(data, OLDER_FIRST);
      const newer = screen.getByRole('group', { name: 'Changes in data, newer version' });
      expect(newer).toHaveTextContent('same');
      expect(newer.querySelector('ins')).toHaveTextContent('fresh');
      expect(newer.querySelector('del')).toBeNull();
      expect(newer).not.toHaveTextContent('gone');
    });

    it('puts the newer column on the left when the columns say so', () => {
      renderField(data, NEWER_FIRST);
      const [left] = screen.getAllByRole('group', { name: /^Changes in/ });
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
      const { container } = renderField(field({ old: null, new: null, jsonDiff }));
      expect(screen.getAllByText('5 unchanged entries')).toHaveLength(2);
      expect(container.querySelector('.publish-history-json')).toBeInTheDocument();
      expect(container.querySelector('.publish-history-value')).toBeNull();
    });
  });

  describe('too large', () => {
    it('explains a field over the size cap', () => {
      renderField(field({ tooLarge: true, tooLargeReason: 'size' }), OLDER_FIRST);
      expect(screen.getAllByText('Too large to compare. Values are cut short.')).toHaveLength(2);
    });

    it('explains a field past the comparison budget differently', () => {
      renderField(field({ tooLarge: true, tooLargeReason: 'budget' }), OLDER_FIRST);
      expect(screen.getAllByText(/Not compared, as this comparison has too many changes/)).toHaveLength(2);
      expect(screen.queryByText('Too large to compare. Values are cut short.')).not.toBeInTheDocument();
    });

    it('still shows the cut values, without red or green', () => {
      renderField(field({ old: 'abc', new: 'abd', tooLarge: true, tooLargeReason: 'budget' }));
      expect(screen.getByText('abc')).not.toHaveClass('publish-history-value-older');
      expect(screen.getByText('abd')).not.toHaveClass('publish-history-value-newer');
    });

    it('shows no note for a field that was compared', () => {
      renderField(field(), OLDER_FIRST);
      expect(screen.queryByText(/Too large|Not compared/)).not.toBeInTheDocument();
    });
  });
});
