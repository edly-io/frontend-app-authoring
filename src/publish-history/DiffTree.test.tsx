import { initializeMocks, render, screen } from '@src/testUtils';

import DiffTree from './DiffTree';
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
    expect(screen.getByText(/^probably by writer \(editor of the parent/)).toBeInTheDocument();
    expect(screen.queryByText('by writer')).not.toBeInTheDocument();
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
    expect(screen.getByText('Moved from position 3 to 1')).toBeInTheDocument();
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
    expect(screen.getByText('Moved to another parent')).toBeInTheDocument();
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
    expect(screen.getByRole('group', { name: 'Changes in data' })).toHaveTextContent('same');
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

  it('says a too-large text was not compared and shows no values', () => {
    render(
      <DiffTree
        nodes={[node({
          fields: [field({ name: 'data', scope: 'content', old: null, new: null, tooLarge: true })],
        })]}
      />,
    );
    expect(screen.getByText('Too large to compare, or cut short here.')).toBeInTheDocument();
    expect(screen.queryByText('Before')).not.toBeInTheDocument();
  });

  it('shows cut values together with the too-large note', () => {
    render(<DiffTree nodes={[node({ fields: [field({ old: 'abc', new: 'abd', tooLarge: true })] })]} />);
    expect(screen.getByText('Too large to compare, or cut short here.')).toBeInTheDocument();
    expect(screen.getByText('abc')).toBeInTheDocument();
  });

  it('gives the list the label it is passed', () => {
    render(<DiffTree nodes={[node()]} label="Changed blocks" />);
    expect(screen.getByRole('list', { name: 'Changed blocks' })).toBeInTheDocument();
  });
});
