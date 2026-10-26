import userEvent from '@testing-library/user-event';
import {
  initializeMocks,
  render,
  screen,
  waitFor,
} from '@src/testUtils';

import DiffTree, { DiffTreeRoot } from './DiffTree';
import { field, node } from './testHelpers';

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
  )('shows the %s badge', (change, text) => {
    render(<DiffTree nodes={[node({ change })]} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('shows no badge and no editor for a block that only holds changes', () => {
    render(<DiffTree nodes={[node({ change: null, displayName: 'Week 1', blockType: 'chapter' })]} />);
    expect(screen.getByText('Week 1')).toBeInTheDocument();
    expect(screen.queryByText(/^by /)).not.toBeInTheDocument();
    expect(screen.queryByText('Changed')).not.toBeInTheDocument();
  });

  it('shows the editor', () => {
    render(<DiffTree nodes={[node()]} />);
    expect(screen.getByText('by writer')).toBeInTheDocument();
  });

  it('labels an approximate editor as probable', () => {
    render(<DiffTree nodes={[node({ change: 'REMOVED', editorApproximate: true })]} />);
    expect(screen.getByText('by ≈ writer')).toHaveAccessibleName(/^Probably by writer: the editor of the parent/);
    expect(screen.queryByText('by writer')).not.toBeInTheDocument();
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
    expect(screen.getByText('by ≈ writer').parentElement).toHaveAttribute(
      'title',
      expect.stringMatching(/^Probably by writer/),
    );
  });

  it('shows Unknown for a missing editor', () => {
    render(<DiffTree nodes={[node({ editor: null })]} />);
    expect(screen.getByText('by Unknown')).toBeInTheDocument();
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
    expect(parent).toContainElement(screen.getByText('Child block'));
    expect(screen.getAllByRole('list')).toHaveLength(2);
  });

  it('shows settings as before and after values', () => {
    render(<DiffTree nodes={[node({ fields: [field()] })]} />);
    expect(screen.getByText('display_name')).toBeInTheDocument();
    expect(screen.getByText('Setting')).toBeInTheDocument();
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
    expect(screen.getByText('Too large to compare. Values are cut short.')).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('shows cut values together with the too-large note', () => {
    render(<DiffTree nodes={[node({ fields: [field({ old: 'abc', new: 'abd', tooLarge: true })] })]} />);
    expect(screen.getByText('Too large to compare. Values are cut short.')).toBeInTheDocument();
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
      await waitFor(() => expect(screen.queryByText('Child html')).not.toBeInTheDocument());
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
});
