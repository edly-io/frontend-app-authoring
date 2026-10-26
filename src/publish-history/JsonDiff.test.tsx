import { initializeMocks, render, screen } from '@src/testUtils';

import BlockPair from './BlockPair';
import { jsonDiffSlots } from './JsonDiff';
import type { Age, JsonChange, JsonDiffData } from './types';

const change = (overrides: Partial<JsonChange> = {}): JsonChange => ({
  path: ['color'],
  oldPath: null,
  op: 'changed',
  old: 'red',
  new: 'blue',
  tooLarge: false,
  ...overrides,
});

const diff = (overrides: Partial<JsonDiffData> = {}): JsonDiffData => ({
  changes: [change()],
  unchanged: [],
  truncated: false,
  ...overrides,
});

const OLDER_FIRST: [Age, Age] = ['older', 'newer'];
const NEWER_FIRST: [Age, Age] = ['newer', 'older'];

const renderDiff = (data: JsonDiffData, columns: [Age, Age] = OLDER_FIRST) => (
  render(
    <BlockPair
      columns={columns}
      slots={jsonDiffSlots('metadata', data, 'metadata')}
      label={(side) => `${side} card`}
    />,
  )
);

/** The value cells of one card (`older card` or `newer card`), top to bottom. */
const cardCells = (side: Age) =>
  Array.from(
    screen.getByRole('group', { name: `${side} card` }).querySelectorAll('.publish-history-json-cell'),
  );

/** The value cells of the left card, then the right card's. */
const cells = (container: HTMLElement) => Array.from(container.querySelectorAll('.publish-history-json-cell'));

describe('jsonDiffSlots', () => {
  beforeEach(() => {
    initializeMocks();
  });

  describe('colours by side', () => {
    it('puts the old value in red (del) on the older side and the new one in green (ins) on the newer side', () => {
      const { container } = renderDiff(diff());
      const [left, right] = cells(container);
      expect(left.querySelector('del')).toHaveTextContent('red');
      expect(left.querySelector('ins')).toBeNull();
      expect(right.querySelector('ins')).toHaveTextContent('blue');
      expect(right.querySelector('del')).toBeNull();
    });

    it('follows the columns when the newer side is on the left', () => {
      const { container } = renderDiff(diff(), NEWER_FIRST);
      const [left, right] = cells(container);
      expect(left.querySelector('ins')).toHaveTextContent('blue');
      expect(left.querySelector('del')).toBeNull();
      expect(right.querySelector('del')).toHaveTextContent('red');
      expect(right.querySelector('ins')).toBeNull();
    });

    it('shows an added key green on the newer side and an empty cell on the older side', () => {
      const { container } = renderDiff(diff({ changes: [change({ op: 'added', old: null, new: 'blue' })] }));
      const [older, newer] = cells(container);
      expect(older.querySelector('del')).toBeNull();
      expect(older.querySelector('ins')).toBeNull();
      expect(older).toHaveTextContent('Not in this version');
      expect(newer.querySelector('ins')).toHaveTextContent('blue');
    });

    it('shows a removed key red on the older side and an empty cell on the newer side', () => {
      const { container } = renderDiff(diff({ changes: [change({ op: 'removed', old: 'red', new: null })] }));
      const [older, newer] = cells(container);
      expect(older.querySelector('del')).toHaveTextContent('red');
      expect(newer.querySelector('del')).toBeNull();
      expect(newer.querySelector('ins')).toBeNull();
      expect(newer).toHaveTextContent('Not in this version');
    });

    it('never puts a red mark in the newer column or a green mark in the older one', () => {
      const changes = [
        change({ path: ['a'], op: 'added', old: null, new: 1 }),
        change({ path: ['b'], op: 'removed', old: 2, new: null }),
        change({ path: ['c'], op: 'changed', old: 3, new: 4 }),
      ];
      renderDiff(diff({ changes }));
      const older = cardCells('older');
      const newer = cardCells('newer');
      expect(older.flatMap((cell) => Array.from(cell.querySelectorAll('ins')))).toHaveLength(0);
      expect(newer.flatMap((cell) => Array.from(cell.querySelectorAll('del')))).toHaveLength(0);
    });

    it('marks removed and added text for screen readers too, so colour is not the only cue', () => {
      const { container } = renderDiff(diff());
      expect(container.querySelector('del')).toHaveTextContent('removed:red');
      expect(container.querySelector('ins')).toHaveTextContent('added:blue');
    });
  });

  describe('only changes are highlighted', () => {
    it('lists the changed key and nothing about unchanged keys except their count', () => {
      const { container } = renderDiff(diff({ unchanged: [{ path: [], count: 2 }] }));
      expect(screen.getAllByText('color')).toHaveLength(2);
      expect(container.querySelectorAll('del, ins')).toHaveLength(2);
    });

    it('shows how many entries are unchanged', () => {
      renderDiff(diff({ unchanged: [{ path: [], count: 3 }] }));
      expect(screen.getAllByText('3 unchanged entries')).toHaveLength(2);
    });

    it('uses the singular for one unchanged entry', () => {
      renderDiff(diff({ unchanged: [{ path: [], count: 1 }] }));
      expect(screen.getAllByText('1 unchanged entry')).toHaveLength(2);
    });

    it('shows no unchanged row when nothing is unchanged', () => {
      renderDiff(diff());
      expect(screen.queryByText(/unchanged/)).not.toBeInTheDocument();
    });

    it('does not highlight the unchanged row', () => {
      const { container } = renderDiff(diff({ changes: [], unchanged: [{ path: [], count: 2 }] }));
      expect(container.querySelector('del, ins')).toBeNull();
      expect(screen.getAllByText('2 unchanged entries')).toHaveLength(2);
    });

    it('shows nested paths with their parents as muted context, which are not highlighted', () => {
      const { container } = renderDiff(diff({
        changes: [change({ path: ['zones', 0, 'title'], old: 'a', new: 'b' })],
        unchanged: [{ path: ['zones', 0], count: 4 }],
      }));
      expect(screen.getAllByText('zones')).toHaveLength(2);
      expect(screen.getAllByText('zones › 0')).toHaveLength(2);
      expect(screen.getAllByText('zones › 0 › title')).toHaveLength(2);
      expect(screen.getAllByText('4 unchanged entries')).toHaveLength(2);
      expect(container.querySelectorAll('del, ins')).toHaveLength(2);
    });

    it('does not repeat a context row for each change under the same parent', () => {
      renderDiff(diff({
        changes: [change({ path: ['zones', 'a'] }), change({ path: ['zones', 'b'] })],
      }));
      expect(screen.getAllByText('zones')).toHaveLength(2); // once per card
    });

    it('orders rows by path, list indexes numerically', () => {
      renderDiff(diff({
        changes: [
          change({ path: ['items', 10] }),
          change({ path: ['items', 2] }),
        ],
      }));
      const paths = screen.getAllByText(/^items › \d+$/).map((element) => element.textContent);
      expect(paths).toEqual(['items › 2', 'items › 10', 'items › 2', 'items › 10']);
    });

    it('labels a change at the root with the field name', () => {
      renderDiff(diff({ changes: [change({ path: [] })] }));
      expect(screen.getAllByText('metadata')).toHaveLength(2);
    });
  });

  describe('notes', () => {
    it('says where a moved list item was before', () => {
      renderDiff(diff({ changes: [change({ path: ['items', 2, 'k'], oldPath: ['items', 1, 'k'] })] }));
      expect(screen.getByText('was at items › 1 › k')).toBeInTheDocument();
    });

    it('shows no "was at" note when the item did not move', () => {
      renderDiff(diff());
      expect(screen.queryByText(/^was at/)).not.toBeInTheDocument();
    });

    it('says when more entries changed than are listed', () => {
      renderDiff(diff({ truncated: true }));
      expect(screen.getAllByText('More changed entries are not listed.')).toHaveLength(2);
    });

    it('does not say so when the list is complete', () => {
      renderDiff(diff());
      expect(screen.queryByText('More changed entries are not listed.')).not.toBeInTheDocument();
    });

    it('says a cut value is cut short', () => {
      renderDiff(diff({ changes: [change({ tooLarge: true })] }));
      expect(screen.getAllByText('Cut short').length).toBeGreaterThan(0);
    });

    it('does not say so for a value shown in full', () => {
      renderDiff(diff());
      expect(screen.queryByText('Cut short')).not.toBeInTheDocument();
    });

    it('shows (empty) for an unset value and JSON for a non-text one', () => {
      const { container } = renderDiff(diff({ changes: [change({ old: null, new: { a: 1 } })] }));
      expect(screen.getByText('(empty)')).toBeInTheDocument();
      expect(container.querySelector('ins')).toHaveTextContent('"a": 1');
    });
  });

  describe('authored data is inert', () => {
    const payload = '<script>window.__pwned = true</script><img src=x onerror="window.__pwned = true">';

    it('renders a <script> value as text on both sides', () => {
      const { container } = renderDiff(diff({ changes: [change({ old: payload, new: payload })] }));
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
      expect(screen.getAllByText(payload, { exact: false })).toHaveLength(2);
      expect((window as any).__pwned).toBeUndefined();
    });

    it('renders a <script> key as text, in the path and as context', () => {
      const key = '<script>window.__pwned = true</script>';
      const { container } = renderDiff(diff({ changes: [change({ path: [key, 'child'] })] }));
      expect(container.querySelector('script')).toBeNull();
      expect(screen.getAllByText(key)).toHaveLength(2);
      expect(screen.getAllByText(`${key} › child`)).toHaveLength(2);
      expect((window as any).__pwned).toBeUndefined();
    });

    it('renders a <script> key inside an object value as text', () => {
      const { container } = renderDiff(diff({ changes: [change({ old: null, new: { [payload]: payload } })] }));
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
    });

    it('renders markup in the "was at" path as text', () => {
      const { container } = renderDiff(diff({ changes: [change({ path: ['a', 1], oldPath: [payload, 0] })] }));
      expect(container.querySelector('script')).toBeNull();
      expect(screen.getByText(`was at ${payload} › 0`)).toBeInTheDocument();
    });
  });
});
