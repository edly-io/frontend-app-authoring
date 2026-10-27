import {
  initializeMocks,
  render,
  screen,
  within,
} from '@src/testUtils';

import { DiffTreeRoot } from './DiffTree';
import { field, node } from './testHelpers';
import messages from './messages';

const key = (type: string, id: string) => `block-v1:Uber+101+2026+type@${type}+block@${id}`;
const item = (usageKey: string) => screen.getByTestId(`diff-node-${usageKey}`);

const tree = () =>
  node({
    usageKey: key('chapter', 's1'),
    blockType: 'chapter',
    displayName: 'Week 1',
    change: null,
    children: [node({
      usageKey: key('sequential', 'ss1'),
      blockType: 'sequential',
      displayName: 'Lesson 1',
      change: null,
      children: [node({
        usageKey: key('vertical', 'u1'),
        blockType: 'vertical',
        displayName: 'Unit 1',
        change: null,
        children: [node({ usageKey: key('html', 'h1'), displayName: 'Intro text', fields: [field()] })],
      })],
    })],
  });

describe('<DiffTree /> outline cards', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('nests each level inside its parent\'s card, section to xblock', () => {
    render(<DiffTreeRoot nodes={[tree()]} columns={['older', 'newer']} />);
    const levels = [
      item(key('chapter', 's1')),
      item(key('sequential', 'ss1')),
      item(key('vertical', 'u1')),
      item(key('html', 'h1')),
    ];
    levels.forEach((level, index) => {
      expect(level).toHaveClass('publish-history-level');
      if (index > 0) {
        expect(levels[index - 1]).toContainElement(level);
        expect(level).not.toContainElement(levels[index - 1]);
      }
    });
  });

  it('alternates the colour: section white, subsection beige, unit white, xblock beige', () => {
    render(<DiffTreeRoot nodes={[tree()]} columns={['older', 'newer']} />);
    expect(item(key('chapter', 's1'))).toHaveClass('publish-history-level-white');
    expect(item(key('sequential', 'ss1'))).toHaveClass('publish-history-level-beige');
    expect(item(key('vertical', 'u1'))).toHaveClass('publish-history-level-white');
    expect(item(key('html', 'h1'))).toHaveClass('publish-history-level-beige');
    [key('chapter', 's1'), key('vertical', 'u1')].forEach((usageKey) => {
      expect(item(usageKey)).not.toHaveClass('publish-history-level-beige');
    });
    [key('sequential', 'ss1'), key('html', 'h1')].forEach((usageKey) => {
      expect(item(usageKey)).not.toHaveClass('publish-history-level-white');
    });
  });

  it('keeps a top-level course beige and its sections white', () => {
    const course = node({
      usageKey: key('course', 'c'),
      blockType: 'course',
      displayName: 'Driving',
      change: null,
      children: [node({
        usageKey: key('chapter', 's1'),
        blockType: 'chapter',
        displayName: 'Week 1',
        change: null,
      })],
    });
    render(<DiffTreeRoot nodes={[course]} columns={['older', 'newer']} />);
    expect(item(key('course', 'c'))).toHaveClass('publish-history-level-beige');
    expect(item(key('chapter', 's1'))).toHaveClass('publish-history-level-white');
  });

  it('gives sibling sections each their own white card', () => {
    const sections = ['a', 'b'].map((id) =>
      node({ usageKey: key('chapter', id), blockType: 'chapter', displayName: `Week ${id}`, change: null })
    );
    render(<DiffTreeRoot nodes={sections} columns={['older', 'newer']} />);
    const [a, b] = sections.map((section) => item(section.usageKey));
    expect(a).not.toContainElement(b);
    expect(a).toHaveClass('publish-history-level-white');
    expect(b).toHaveClass('publish-history-level-white');
  });

  it('flips the colour for a component nested in a component', () => {
    const parent = node({
      usageKey: key('library_content', 'lc'),
      blockType: 'library_content',
      displayName: 'Bank',
      children: [node({ usageKey: key('problem', 'p1'), blockType: 'problem', displayName: 'Question' })],
    });
    render(<DiffTreeRoot nodes={[parent]} columns={['older', 'newer']} />);
    // A component straight on the page's beige is white, so its child is beige.
    expect(item(key('library_content', 'lc'))).toHaveClass('publish-history-level-white');
    expect(item(key('problem', 'p1'))).toHaveClass('publish-history-level-beige');
    expect(item(key('library_content', 'lc'))).toContainElement(item(key('problem', 'p1')));
  });
});

describe('<DiffTree /> xblock header bar', () => {
  const renderBlock = (overrides = {}, columns: ['older' | 'newer', 'older' | 'newer'] = ['older', 'newer']) =>
    render(
      <DiffTreeRoot
        nodes={[node({ fields: [field()], ...overrides })]}
        columns={columns}
        onPreview={jest.fn()}
      />,
    );

  beforeEach(() => {
    initializeMocks();
  });

  it('has one header bar per block, a group named by the block', () => {
    const second = node({ usageKey: key('html', 'h2'), displayName: 'Second text', fields: [field()] });
    render(
      <DiffTreeRoot nodes={[node({ fields: [field()] }), second]} columns={['older', 'newer']} onPreview={jest.fn()} />,
    );
    expect(screen.getByRole('group', { name: 'Intro text' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Second text' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Preview/ })).toHaveLength(2);
  });

  it('holds the icon, name, badge, editor line and Preview, in the block\'s own card', () => {
    renderBlock();
    const header = screen.getByRole('group', { name: 'Intro text' });
    expect(header.querySelector('svg')).not.toBeNull();
    expect(within(header).getByText('Intro text')).toBeInTheDocument();
    expect(within(header).getByText(messages.changeChanged.defaultMessage)).toBeInTheDocument();
    expect(within(header).getByText('Changed By', { exact: false })).toBeInTheDocument();
    expect(within(header).getByText('writer').tagName).toBe('STRONG');
    // The editor line may wrap in a narrow (deeply inset) card instead of overflowing it.
    expect(within(header).getByText('writer').parentElement).not.toHaveClass('text-nowrap');
    expect(within(header).getByRole('button', { name: 'Preview Intro text' })).toBeInTheDocument();
    expect(item(key('html', 'h1'))).toContainElement(header);
  });

  it('puts each block\'s Preview in its own header, named by that block', () => {
    const second = node({ usageKey: key('html', 'h2'), displayName: 'Second text', fields: [field()] });
    render(
      <DiffTreeRoot nodes={[node({ fields: [field()] }), second]} columns={['older', 'newer']} onPreview={jest.fn()} />,
    );
    const header = screen.getByRole('group', { name: 'Second text' });
    expect(within(header).getByRole('button')).toHaveAccessibleName('Preview Second text');
    expect(within(header).queryByRole('button', { name: 'Preview Intro text' })).not.toBeInTheDocument();
  });

  it('shows the name and the badge only once in the block, not again on the side cards', () => {
    renderBlock();
    expect(screen.getAllByText('Intro text')).toHaveLength(1);
    expect(screen.getAllByText(messages.changeChanged.defaultMessage)).toHaveLength(1);
  });

  it('keeps the block\'s header bar out of container cards', () => {
    render(<DiffTreeRoot nodes={[tree()]} columns={['older', 'newer']} onPreview={jest.fn()} />);
    expect(screen.queryByRole('group', { name: 'Week 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preview Week 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Intro text' })).toBeInTheDocument();
  });

  it('shows no Preview in the header without a preview handler', () => {
    render(<DiffTreeRoot nodes={[node({ fields: [field()] })]} columns={['older', 'newer']} />);
    expect(screen.getByRole('group', { name: 'Intro text' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Preview/ })).not.toBeInTheDocument();
  });

  it.each(
    [
      ['ADDED', 'Added By'],
      ['REMOVED', 'Removed By'],
      ['CHANGED', 'Changed By'],
      ['MOVED', 'Moved By'],
    ] as const,
  )('reads "%s" as "%s" with a bold username in the header', (change, text) => {
    renderBlock({ change });
    const header = screen.getByRole('group', { name: 'Intro text' });
    expect(within(header).getByText(text, { exact: false })).toBeInTheDocument();
    expect(within(header).getByText('writer').tagName).toBe('STRONG');
  });

  describe('side labels', () => {
    const left = (age: string) => screen.getByRole('group', { name: `Intro text, ${age} version` });

    it('reads Selected · Older then Compare With · Newer when the selected version is older', () => {
      renderBlock({}, ['older', 'newer']);
      expect(left('older')).toHaveTextContent('Selected · Older');
      expect(left('newer')).toHaveTextContent('Compare With · Newer');
    });

    it('reads Selected · Newer then Compare With · Older when the selected version is newer', () => {
      renderBlock({}, ['newer', 'older']);
      expect(left('newer')).toHaveTextContent('Selected · Newer');
      expect(left('older')).toHaveTextContent('Compare With · Older');
      expect(left('newer').compareDocumentPosition(left('older'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('keeps the label on the present side of an added block, the absent side showing only the placeholder', () => {
      renderBlock({ change: 'ADDED' }, ['newer', 'older']);
      expect(left('newer')).toHaveTextContent('Selected · Newer');
      expect(left('older')).toHaveTextContent(messages.blockNotInVersion.defaultMessage);
      expect(left('newer')).not.toHaveTextContent(messages.blockNotInVersion.defaultMessage);
    });
  });

  describe('approximate editor', () => {
    it('shows a bold ≈ and the username bold, with the tooltip text as its name', () => {
      renderBlock({ change: 'REMOVED', editorApproximate: true });
      const header = screen.getByRole('group', { name: 'Intro text' });
      const bold = [...header.querySelectorAll('strong')].map((el) => el.textContent);
      expect(bold).toEqual(['≈', 'writer']);
      expect(within(header).getByLabelText(/^Probably by writer: the editor of the parent/)).toBeInTheDocument();
    });

    it('has no ≈ for an exact editor', () => {
      renderBlock();
      expect(screen.queryByText('≈')).not.toBeInTheDocument();
    });

    it('keeps the screen reader text and title for an approximate editor in a container heading', () => {
      render(
        <DiffTreeRoot
          nodes={[node({
            blockType: 'vertical',
            displayName: 'Unit 1',
            change: 'MOVED',
            editorApproximate: true,
          })]}
          columns={['older', 'newer']}
        />,
      );
      const toggle = screen.getByRole('button', { name: /Unit 1/ });
      expect(within(toggle).getByText('≈').tagName).toBe('STRONG');
      expect(toggle.querySelector('.sr-only')).toHaveTextContent(/^Probably by writer/);
    });
  });
});
