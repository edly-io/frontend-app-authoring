import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';

import DiffTree, { DiffTreeRoot } from './DiffTree';
import { field, node } from './testHelpers';

/** The editor line ("Changed By writer"), whose username (and "≈") are in <strong> elements. */
const editorLine = (text: string) =>
  screen.getByText((_, el) =>
    !!el && el.tagName === 'SPAN' && el.textContent === text
    && [...el.children].every((child) => child.tagName === 'STRONG')
  );

describe('<DiffTree />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it.each(
    [
      ['ADDED', 'Added'],
      ['REMOVED', 'Removed'],
      ['CHANGED', 'Changed'],
      ['MOVED', 'Moved'],
    ] as const,
  )('shows the %s badge once, in the block\'s header bar', (change, text) => {
    render(<DiffTree nodes={[node({ change })]} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('shows no badge and no editor for a block that only holds changes', () => {
    render(<DiffTree nodes={[node({ change: null, displayName: 'Week 1', blockType: 'chapter' })]} />);
    expect(screen.getByText('Week 1')).toBeInTheDocument();
    expect(screen.queryByText(/ By /)).not.toBeInTheDocument();
    expect(screen.queryByText('Changed')).not.toBeInTheDocument();
  });

  it.each(
    [
      ['ADDED', 'Added By writer'],
      ['REMOVED', 'Removed By writer'],
      ['CHANGED', 'Changed By writer'],
      ['MOVED', 'Moved By writer'],
    ] as const,
  )('shows who made the %s change, with the username bold', (change, text) => {
    render(<DiffTree nodes={[node({ change })]} />);
    const editor = editorLine(text);
    expect(editor.querySelector('strong')).toHaveTextContent(/^writer$/);
  });

  it('labels an approximate editor as probable, with a bold ≈', () => {
    render(<DiffTree nodes={[node({ change: 'REMOVED', editorApproximate: true })]} />);
    const editor = editorLine('Removed By ≈ writer');
    expect(editor).toHaveAccessibleName(/^Probably by writer: the editor of the parent/);
    expect([...editor.querySelectorAll('strong')].map((el) => el.textContent)).toEqual(['≈', 'writer']);
    expect(screen.queryByText(/^Removed By writer/)).not.toBeInTheDocument();
  });

  it('explains an approximate editor in a group toggle without a focusable element inside the toggle', () => {
    render(
      <DiffTree
        nodes={[node({
          change: 'REMOVED',
          editorApproximate: true,
          blockType: 'vertical',
          displayName: 'Unit 1',
        })]}
      />,
    );
    const toggle = screen.getByRole('button', { name: /Unit 1/ });
    expect(toggle).toHaveAccessibleName(/Probably by writer: the editor of the parent/);
    expect(toggle.querySelector('[tabindex]')).toBeNull();
    expect(editorLine('Removed By ≈ writer').parentElement).toHaveAttribute(
      'title',
      expect.stringMatching(/^Probably by writer/),
    );
  });

  it('shows Unknown for a missing editor', () => {
    render(<DiffTree nodes={[node({ editor: null })]} />);
    expect(editorLine('Changed By Unknown')).toBeInTheDocument();
  });

  it('falls back to the usage key when the block has no name', () => {
    render(<DiffTree nodes={[node({ displayName: null, usageKey: 'block-v1:Uber+101+2026+type@html+block@h9' })]} />);
    expect(screen.getByText('block-v1:Uber+101+2026+type@html+block@h9')).toBeInTheDocument();
  });

  it('shows the positions of a block moved among its siblings (1-based)', () => {
    render(
      <DiffTree
        nodes={[node({
          change: 'MOVED',
          move: { fromParent: 'p', toParent: 'p', fromIndex: 2, toIndex: 0 },
        })]}
      />,
    );
    expect(screen.getByText('Position 3')).toBeInTheDocument();
    expect(screen.getByText('Position 1')).toBeInTheDocument();
  });

  it('shows a move to another parent', () => {
    render(
      <DiffTree
        nodes={[node({
          change: 'MOVED',
          move: { fromParent: 'p1', toParent: 'p2', fromIndex: 0, toIndex: 0 },
        })]}
      />,
    );
    expect(screen.getByText('Under another parent')).toBeInTheDocument();
    expect(screen.getByText('Moved here from another parent')).toBeInTheDocument();
  });

  it('nests children in a list under their parent', () => {
    render(
      <DiffTree
        nodes={[node({
          change: null,
          displayName: 'Section',
          children: [node({ usageKey: 'child', displayName: 'Child block' })],
        })]}
        label="Changed blocks"
      />,
    );
    const parent = screen.getByTestId('diff-node-block-v1:Uber+101+2026+type@html+block@h1');
    expect(parent).toContainElement(screen.getAllByText('Child block')[0]);
    expect(screen.getAllByRole('list')).toHaveLength(2);
  });

  it('shows settings as before and after values', () => {
    render(<DiffTree nodes={[node({ fields: [field()] })]} />);
    expect(screen.getAllByText('display_name')).toHaveLength(2);
    expect(screen.getAllByText('Setting')).toHaveLength(2);
    expect(screen.getByText('Old name')).toBeInTheDocument();
    expect(screen.getByText('New name')).toBeInTheDocument();
  });

  it('shows non-string values as JSON and unset values as (empty)', () => {
    render(<DiffTree nodes={[node({ fields: [field({ old: null, new: { a: [1] } })] })]} />);
    expect(screen.getByText('(empty)')).toBeInTheDocument();
    expect(screen.getByText(/"a": \[/)).toBeInTheDocument();
  });

  it('renders text diff segments as ins and del', () => {
    const { container } = render(
      <DiffTree
        nodes={[node({
          fields: [field({
            name: 'data',
            scope: 'content',
            old: null,
            new: null,
            textDiff: {
              kind: 'words',
              segments: [
                { op: 'equal', text: 'same ' },
                { op: 'delete', text: 'old' },
                { op: 'insert', text: 'new' },
              ],
            },
          })],
        })]}
      />,
    );
    expect(container.querySelector('del')).toHaveTextContent('removed:old');
    expect(container.querySelector('ins')).toHaveTextContent('added:new');
    expect(screen.getByRole('group', { name: 'Changes in data, older version' })).toHaveTextContent('same');
    expect(screen.queryByText('Before')).not.toBeInTheDocument();
  });

  it('renders an HTML payload in a text diff as inert text', () => {
    const payload = '<script>window.__pwned = true</script><b onclick="x()">bold</b>';
    const { container } = render(
      <DiffTree
        nodes={[node({
          fields: [field({
            name: 'data',
            scope: 'content',
            old: null,
            new: null,
            textDiff: { kind: 'words', segments: [{ op: 'insert', text: payload }, { op: 'delete', text: payload }] },
          })],
        })]}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getAllByText(payload, { exact: false })).toHaveLength(2);
    expect((window as any).__pwned).toBeUndefined();
  });

  it('renders HTML in a plain field value as text', () => {
    const payload = '<script>window.__pwned = true</script>';
    const { container } = render(<DiffTree nodes={[node({ fields: [field({ new: payload })] })]} />);
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(payload)).toBeInTheDocument();
  });

  it('renders HTML in a block name as text', () => {
    const payload = '<img src=x onerror="window.__pwned = true">';
    const { container } = render(<DiffTree nodes={[node({ displayName: payload })]} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(payload)).toBeInTheDocument();
  });

  it('says a too-large text was not compared and shows no text diff', () => {
    render(
      <DiffTree
        nodes={[node({
          fields: [field({ name: 'data', scope: 'content', old: null, new: null, tooLarge: true })],
        })]}
      />,
    );
    expect(screen.getAllByText('Too large to compare. Values are cut short.')).toHaveLength(2);
    expect(screen.queryByRole('group', { name: /^Changes in/ })).not.toBeInTheDocument();
  });

  it('shows cut values together with the too-large note', () => {
    render(<DiffTree nodes={[node({ fields: [field({ old: 'abc', new: 'abd', tooLarge: true })] })]} />);
    expect(screen.getAllByText('Too large to compare. Values are cut short.')).toHaveLength(2);
    expect(screen.getByText('abc')).toBeInTheDocument();
  });

  it('gives the list the label it is passed', () => {
    render(<DiffTree nodes={[node()]} label="Changed blocks" />);
    expect(screen.getByRole('list', { name: 'Changed blocks' })).toBeInTheDocument();
  });

  describe('Preview button', () => {
    const renderRoot = (nodes, onPreview = jest.fn()) => {
      render(<DiffTreeRoot nodes={nodes} columns={['older', 'newer']} onPreview={onPreview} />);
      return onPreview;
    };

    it('is on a changed component row', () => {
      renderRoot([node()]);
      expect(screen.getByRole('button', { name: 'Preview Intro text' })).toBeInTheDocument();
    });

    it.each(['html', 'problem', 'video', 'library_content'])('is on a %s row', (blockType) => {
      renderRoot([node({ blockType })]);
      expect(screen.getByRole('button', { name: /^Preview / })).toBeInTheDocument();
    });

    it.each(['chapter', 'sequential', 'vertical', 'course'])('is not on a %s row', (blockType) => {
      renderRoot([node({ blockType, change: 'CHANGED', displayName: 'Container' })]);
      expect(screen.queryByRole('button', { name: /^Preview / })).not.toBeInTheDocument();
    });

    it('is only on the component when a unit holds it', () => {
      renderRoot([node({
        blockType: 'vertical',
        change: null,
        displayName: 'Unit',
        children: [node({ usageKey: 'child', displayName: 'Child html' })],
      })]);
      expect(screen.getAllByRole('button', { name: /^Preview / })).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Preview Child html' })).toBeInTheDocument();
    });

    it('is not on a block that only holds changes', () => {
      renderRoot([node({ change: null })]);
      expect(screen.queryByRole('button', { name: /^Preview / })).not.toBeInTheDocument();
    });

    it('is not shown without a preview handler', () => {
      render(<DiffTree nodes={[node()]} />);
      expect(screen.queryByRole('button', { name: /^Preview / })).not.toBeInTheDocument();
    });

    it('is on added and removed components too', () => {
      renderRoot([node({ change: 'ADDED' }), node({ usageKey: 'b', change: 'REMOVED' })]);
      expect(screen.getAllByRole('button', { name: /^Preview / })).toHaveLength(2);
    });

    it('hands the row\'s block to the handler', async () => {
      const onPreview = renderRoot([node()]);
      await userEvent.click(screen.getByRole('button', { name: 'Preview Intro text' }));
      expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Intro text' }));
    });
  });

  describe('random selection note', () => {
    it.each(['library_content', 'itembank'])('is on a %s row', (blockType) => {
      render(<DiffTree nodes={[node({ blockType })]} />);
      expect(screen.getByText(/random selection of its components/)).toBeInTheDocument();
    });

    it('is not on an html row', () => {
      render(<DiffTree nodes={[node()]} />);
      expect(screen.queryByText(/random selection/)).not.toBeInTheDocument();
    });
  });

  describe('expand and collapse', () => {
    const tree = [node({
      blockType: 'vertical',
      change: null,
      displayName: 'Unit',
      usageKey: 'unit',
      children: [node({ usageKey: 'child', displayName: 'Child html' })],
    })];

    it('shows groups open by default', () => {
      render(<DiffTreeRoot nodes={tree} columns={['older', 'newer']} />);
      expect(screen.getByText('Child html')).toBeInTheDocument();
    });

    it('collapses every group on a collapse signal and expands them on the next', async () => {
      const { rerender } = render(
        <DiffTreeRoot nodes={tree} columns={['older', 'newer']} expand={{ open: false, version: 1 }} />,
      );
      await waitFor(() => expect(screen.queryAllByText('Child html')).toHaveLength(0));
      rerender(<DiffTreeRoot nodes={tree} columns={['older', 'newer']} expand={{ open: true, version: 2 }} />);
      await waitFor(() => expect(screen.getByText('Child html')).toBeInTheDocument());
    });
  });

  describe('moves in the columns', () => {
    const moved = node({ change: 'MOVED', move: { fromParent: 'p', toParent: 'p', fromIndex: 2, toIndex: 0 } });

    it('shows the old position in the older column and the new one in the newer column', () => {
      render(<DiffTreeRoot nodes={[moved]} columns={['older', 'newer']} />);
      expect(screen.getByText('Position 3').compareDocumentPosition(screen.getByText('Position 1')))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('swaps them when the newer version is on the left', () => {
      render(<DiffTreeRoot nodes={[moved]} columns={['newer', 'older']} />);
      expect(screen.getByText('Position 1').compareDocumentPosition(screen.getByText('Position 3')))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  it('puts red on the older side and green on the newer side whichever is on the left', () => {
    const nodes = [node({ fields: [field()] })];
    const { rerender } = render(<DiffTreeRoot nodes={nodes} columns={['older', 'newer']} />);
    expect(screen.getByText('Old name')).toHaveClass('publish-history-value-older');
    expect(screen.getByText('New name')).toHaveClass('publish-history-value-newer');
    rerender(<DiffTreeRoot nodes={nodes} columns={['newer', 'older']} />);
    expect(screen.getByText('Old name')).toHaveClass('publish-history-value-older');
    expect(screen.getByText('New name')).toHaveClass('publish-history-value-newer');
  });

  it('renders a <script> in a JSON key and value as text', () => {
    const payload = '<script>window.__pwned = true</script>';
    const jsonDiff = {
      changes: [{
        path: [payload],
        oldPath: null,
        op: 'changed' as const,
        old: payload,
        new: payload,
        tooLarge: false,
      }],
      unchanged: [],
      truncated: false,
    };
    const { container } = render(
      <DiffTree nodes={[node({ fields: [field({ old: null, new: null, jsonDiff })] })]} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getAllByText(payload, { exact: false }).length).toBeGreaterThan(0);
    expect((window as any).__pwned).toBeUndefined();
  });
  describe('side-by-side layout', () => {
    const both = ['older', 'newer'] as const;
    const jsonField = field({
      name: 'items',
      old: null,
      new: null,
      jsonDiff: {
        changes: [
          { path: ['a'], oldPath: null, op: 'changed', old: 'A1', new: 'A2', tooLarge: false },
          { path: ['b'], oldPath: null, op: 'added', old: null, new: 'B2', tooLarge: false },
        ],
        unchanged: [{ path: [], count: 2 }],
        truncated: false,
      },
    });
    const cardOf = (name: string, age: 'older' | 'newer') =>
      screen.getByRole('group', { name: `${name}, ${age} version` });

    it('renders a changed block as two separate cards labelled by side', () => {
      render(<DiffTreeRoot nodes={[node({ fields: [field()] })]} columns={[...both]} />);
      const [left, right] = [cardOf('Intro text', 'older'), cardOf('Intro text', 'newer')];
      expect(left).not.toContainElement(right);
      expect(right).not.toContainElement(left);
      expect(left.compareDocumentPosition(right)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(left).toHaveTextContent('Selected · Older');
      expect(right).toHaveTextContent('Compare With · Newer');
      expect(left).not.toHaveTextContent('Changed');
      expect(right).not.toHaveTextContent('Changed');
    });

    it.each(
      [
        ['selected newer', ['newer', 'older'], 'newer'],
        ['selected older', ['older', 'newer'], 'older'],
      ] as const,
    )('puts the selected version in the left card (%s)', (_name, columns, leftAge) => {
      render(<DiffTreeRoot nodes={[node({ fields: [field()] })]} columns={[...columns]} />);
      const left = cardOf('Intro text', leftAge);
      const right = cardOf('Intro text', leftAge === 'older' ? 'newer' : 'older');
      expect(left.compareDocumentPosition(right)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(left.getAttribute('style')).toContain('grid-column: 1');
      expect(right.getAttribute('style')).toContain('grid-column: 2');
    });

    it('shows the placeholder on the older side of an added block, with the content on the newer side', () => {
      render(<DiffTreeRoot nodes={[node({ change: 'ADDED', fields: [field()] })]} columns={[...both]} />);
      expect(cardOf('Intro text', 'older')).toHaveTextContent('Not in this version');
      expect(cardOf('Intro text', 'newer')).toHaveTextContent('Compare With · Newer');
      expect(cardOf('Intro text', 'newer')).toHaveTextContent('New name');
    });

    it('shows the placeholder on the newer side of a removed block, also when the columns are swapped', () => {
      render(<DiffTreeRoot nodes={[node({ change: 'REMOVED', fields: [field()] })]} columns={['newer', 'older']} />);
      expect(cardOf('Intro text', 'newer')).toHaveTextContent('Not in this version');
      expect(cardOf('Intro text', 'older')).toHaveTextContent('Compare With · Older');
      expect(screen.getAllByText('Not in this version')).toHaveLength(1);
    });

    it('marks the older value red only in the older card and the newer value green only in the newer card', () => {
      render(<DiffTreeRoot nodes={[node({ fields: [field()] })]} columns={['newer', 'older']} />);
      const older = cardOf('Intro text', 'older');
      const newer = cardOf('Intro text', 'newer');
      expect(within(older).getByText('Old name')).toHaveClass('publish-history-value-older');
      expect(within(newer).getByText('New name')).toHaveClass('publish-history-value-newer');
      expect(within(older).queryByText('New name')).not.toBeInTheDocument();
      expect(within(newer).queryByText('Old name')).not.toBeInTheDocument();
    });

    it('marks text removals only in the older card and additions only in the newer card', () => {
      const textDiff = {
        kind: 'words' as const,
        segments: [{ op: 'delete' as const, text: 'gone' }, { op: 'insert' as const, text: 'fresh' }],
      };
      const { container } = render(
        <DiffTreeRoot
          nodes={[node({ fields: [field({ name: 'data', scope: 'content', old: null, new: null, textDiff })] })]}
          columns={[...both]}
        />,
      );
      const older = cardOf('Intro text', 'older');
      const newer = cardOf('Intro text', 'newer');
      expect(older.querySelector('del')).toHaveTextContent('gone');
      expect(older.querySelector('ins')).toBeNull();
      expect(newer.querySelector('ins')).toHaveTextContent('fresh');
      expect(newer.querySelector('del')).toBeNull();
      expect(container.querySelectorAll('del, ins')).toHaveLength(2);
    });

    it('shows each field name once per card, in the same order', () => {
      render(
        <DiffTreeRoot
          nodes={[node({ fields: [field({ name: 'zeta' }), field({ name: 'alpha', scope: 'content' })] })]}
          columns={[...both]}
        />,
      );
      const names = (age: 'older' | 'newer') =>
        within(cardOf('Intro text', age)).getAllByText(/^(zeta|alpha)$/)
          .map((el) => el.textContent);
      expect(names('older')).toEqual(['zeta', 'alpha']);
      expect(names('newer')).toEqual(['zeta', 'alpha']);
    });

    it('shows each JSON key row once per card, in the same order, with equal grid spans', () => {
      render(<DiffTreeRoot nodes={[node({ fields: [jsonField] })]} columns={[...both]} />);
      const older = cardOf('Intro text', 'older');
      const newer = cardOf('Intro text', 'newer');
      const keys = (card: HTMLElement) =>
        [...card.querySelectorAll('.publish-history-json-path')]
          .map((el) => el.textContent);
      expect(keys(older).length).toBeGreaterThan(1);
      expect(keys(older)).toEqual(keys(newer));
      const rowsOf = (card: HTMLElement) => card.querySelectorAll('.publish-history-slot').length;
      expect(rowsOf(older)).toBe(rowsOf(newer));
      expect(older.getAttribute('style')).toBe(
        newer.getAttribute('style')?.replace('grid-column: 2', 'grid-column: 1'),
      );
    });

    it('shows a JSON added key as a dash on the older side and the value on the newer side', () => {
      render(<DiffTreeRoot nodes={[node({ fields: [jsonField] })]} columns={[...both]} />);
      expect(within(cardOf('Intro text', 'older')).queryByText('B2')).not.toBeInTheDocument();
      expect(within(cardOf('Intro text', 'newer')).getByText('B2').closest('ins')).not.toBeNull();
      expect(within(cardOf('Intro text', 'older')).getByText('A1').closest('del')).not.toBeNull();
    });

    it('keeps two same-named fields of different scopes as separate rows', () => {
      render(
        <DiffTreeRoot
          nodes={[
            node({
              fields: [
                field({ name: 'x', scope: 'settings' }),
                field({ name: 'x', scope: 'content', old: 'o2', new: 'n2' }),
              ],
            }),
          ]}
          columns={[...both]}
        />,
      );
      expect(within(cardOf('Intro text', 'older')).getAllByText('x')).toHaveLength(2);
      expect(screen.getByText('o2')).toBeInTheDocument();
    });

    it('puts the editor and Preview in the block\'s header bar, a group named by the block, before both cards', () => {
      render(
        <DiffTreeRoot
          nodes={[node({ fields: [field()] })]}
          columns={[...both]}
          onPreview={jest.fn()}
        />,
      );
      const header = screen.getByRole('group', { name: 'Intro text' });
      const left = cardOf('Intro text', 'older');
      const editor = editorLine('Changed By writer');
      const preview = screen.getByRole('button', { name: 'Preview Intro text' });
      [editor, preview].forEach((el) => {
        expect(header).toContainElement(el);
        expect(el.compareDocumentPosition(left)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(left).not.toContainElement(el);
        expect(cardOf('Intro text', 'newer')).not.toContainElement(el);
      });
    });

    describe('hierarchy headings', () => {
      const tree = [node({
        blockType: 'chapter',
        change: null,
        usageKey: 'sec',
        displayName: 'Section A',
        children: [node({
          blockType: 'sequential',
          change: null,
          usageKey: 'sub',
          displayName: 'Subsection B',
          children: [node({
            blockType: 'vertical',
            change: null,
            usageKey: 'unit',
            displayName: 'Unit C',
            children: [node({ usageKey: 'comp', displayName: 'Comp D', fields: [field()] })],
          })],
        })],
      })];

      it('renders section, subsection and unit as h3, h4 and h5 headings', () => {
        render(<DiffTreeRoot nodes={tree} columns={[...both]} />);
        expect(screen.getByRole('heading', { level: 3, name: /Section A/ })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 4, name: /Subsection B/ })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 5, name: /Unit C/ })).toBeInTheDocument();
      });

      it('does not put a heading inside a card, and no card around a container heading', () => {
        render(<DiffTreeRoot nodes={tree} columns={[...both]} />);
        expect(screen.getAllByRole('group', { name: /^Comp D, / })).toHaveLength(2);
        expect(screen.queryByRole('group', { name: /^Section A, / })).not.toBeInTheDocument();
        expect(within(cardOf('Comp D', 'older')).queryByRole('heading')).not.toBeInTheDocument();
      });

      it('collapses the group when its heading toggle is clicked, and opens it again', async () => {
        render(<DiffTreeRoot nodes={tree} columns={[...both]} />);
        const toggle = within(screen.getByRole('heading', { level: 4 })).getByRole('button');
        await userEvent.click(toggle);
        await waitFor(() => expect(screen.queryByText('Comp D')).not.toBeInTheDocument());
        expect(screen.getByRole('heading', { level: 3, name: /Section A/ })).toBeInTheDocument();
        await userEvent.click(toggle);
        expect(await screen.findByText('Comp D')).toBeInTheDocument();
      });

      it('toggles from the keyboard', async () => {
        render(<DiffTreeRoot nodes={tree} columns={[...both]} />);
        const toggle = within(screen.getByRole('heading', { level: 5 })).getByRole('button');
        toggle.focus();
        await userEvent.keyboard('{Enter}');
        await waitFor(() => expect(screen.queryByText('Comp D')).not.toBeInTheDocument());
      });

      it('toggles with Space like a button, and opens again', async () => {
        render(<DiffTreeRoot nodes={tree} columns={[...both]} />);
        const toggle = within(screen.getByRole('heading', { level: 5 })).getByRole('button');
        toggle.focus();
        await userEvent.keyboard(' ');
        await waitFor(() => expect(screen.queryByText('Comp D')).not.toBeInTheDocument());
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await userEvent.keyboard(' ');
        expect(await screen.findByText('Comp D')).toBeInTheDocument();
      });

      it('caps deeper levels at h6', () => {
        const deep = node({
          blockType: 'vertical',
          change: null,
          usageKey: 'd0',
          displayName: 'D0',
          children: [node({
            blockType: 'vertical',
            change: null,
            usageKey: 'd1',
            displayName: 'D1',
            children: [node({
              blockType: 'vertical',
              change: null,
              usageKey: 'd2',
              displayName: 'D2',
              children: [node({
                blockType: 'vertical',
                change: null,
                usageKey: 'd3',
                displayName: 'D3',
                children: [node({ blockType: 'vertical', change: null, usageKey: 'd4', displayName: 'D4' })],
              })],
            })],
          })],
        });
        render(<DiffTreeRoot nodes={[deep]} columns={[...both]} />);
        expect(screen.getByRole('heading', { level: 6, name: /D4/ })).toBeInTheDocument();
      });
    });

    describe('a container\'s own change', () => {
      it('renders a moved unit as two cards under its heading, labelled only by side', () => {
        render(
          <DiffTreeRoot
            nodes={[node({
              blockType: 'vertical',
              change: 'MOVED',
              displayName: 'Unit 1',
              usageKey: 'u',
              move: { fromParent: 'p', toParent: 'p', fromIndex: 2, toIndex: 0 },
            })]}
            columns={[...both]}
          />,
        );
        const heading = screen.getByRole('heading', { level: 3, name: /Unit 1/ });
        const older = cardOf('Unit 1', 'older');
        const newer = cardOf('Unit 1', 'newer');
        expect(heading.compareDocumentPosition(older)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(older).toHaveTextContent('Position 3');
        expect(newer).toHaveTextContent('Position 1');
        expect(older.querySelector('.publish-history-card-header')).toHaveTextContent(/^Selected · Older$/);
        expect(newer.querySelector('.publish-history-card-header')).toHaveTextContent(/^Compare With · Newer$/);
        expect(screen.getAllByText('Moved')).toHaveLength(1);
      });

      it('renders a settings change on a section as side-labelled cards with red and green values', () => {
        render(
          <DiffTreeRoot
            nodes={[node({ blockType: 'chapter', change: 'CHANGED', displayName: 'Week 1', fields: [field()] })]}
            columns={[...both]}
          />,
        );
        expect(within(cardOf('Week 1', 'older')).getByText('Old name')).toHaveClass('publish-history-value-older');
        expect(within(cardOf('Week 1', 'newer')).getByText('New name')).toHaveClass('publish-history-value-newer');
        expect(cardOf('Week 1', 'older')).not.toHaveTextContent('Week 1');
      });

      it('renders no cards for a container with no move and no fields', () => {
        render(
          <DiffTreeRoot
            nodes={[node({ blockType: 'chapter', change: 'ADDED', displayName: 'Week 2' })]}
            columns={[...both]}
          />,
        );
        expect(screen.getByRole('heading', { name: /Week 2/ })).toHaveTextContent('Added');
        expect(screen.queryAllByRole('group')).toHaveLength(0);
      });
    });

    it('uses text in every badge, not colour only', () => {
      render(
        <DiffTreeRoot
          nodes={['ADDED', 'REMOVED', 'CHANGED', 'MOVED'].map((change, i) =>
            node({ usageKey: `k${i}`, displayName: `N${i}`, change: change as any })
          )}
          columns={[...both]}
        />,
      );
      ['Added', 'Removed', 'Changed', 'Moved'].forEach((text) => {
        expect(screen.getAllByText(text).length).toBeGreaterThan(0);
      });
    });

    it('renders a <script> in a field value inside the cards as text', () => {
      const payload = '<script>window.__pwned = true</script>';
      const { container } = render(
        <DiffTreeRoot nodes={[node({ fields: [field({ old: payload, new: payload })] })]} columns={[...both]} />,
      );
      expect(container.querySelector('script')).toBeNull();
      expect(within(cardOf('Intro text', 'older')).getByText(payload)).toBeInTheDocument();
      expect(within(cardOf('Intro text', 'newer')).getByText(payload)).toBeInTheDocument();
      expect((window as any).__pwned).toBeUndefined();
    });
  });
});
