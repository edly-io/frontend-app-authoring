import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { initializeMocks, render, screen } from '@src/testUtils';

import PreviewModal from './PreviewModal';
import { COURSE_ID, node, V2, V3 } from './testHelpers';
import type { Age, DiffNodeData, DiffSide } from './types';

const OLDER: DiffSide = { id: V2, kind: 'version', at: '2026-01-02T12:00:00Z', by: { id: 7, username: 'writer' } };
const NEWER: DiffSide = { id: V3, kind: 'version', at: '2026-01-03T12:00:00Z', by: { id: 8, username: 'editor' } };

const renderModal = ({
  block = node(),
  sides = { older: OLDER, newer: NEWER },
  columns = ['older', 'newer'] as [Age, Age],
  onClose = jest.fn(),
}: {
  block?: DiffNodeData;
  sides?: Record<Age, DiffSide>;
  columns?: [Age, Age];
  onClose?: jest.Mock;
} = {}) => {
  render(<PreviewModal courseId={COURSE_ID} node={block} sides={sides} columns={columns} onClose={onClose} />);
  return onClose;
};

const frame = (age: 'older' | 'newer', name = 'Intro text') => screen.getByTitle(`${name}, ${age} version`);
const frames = () => screen.getAllByTitle(/ version$/) as HTMLIFrameElement[];

describe('<PreviewModal />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('opens a dialog titled with the component name', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: 'Preview: Intro text' })).toBeInTheDocument();
  });

  it('falls back to the usage key when the component has no name', () => {
    const block = node({ displayName: null });
    renderModal({ block });
    expect(screen.getByRole('dialog', { name: `Preview: ${block.usageKey}` })).toBeInTheDocument();
  });

  it('shows the component in two iframes, one per version', () => {
    renderModal();
    expect(frames()).toHaveLength(2);
    expect(document.querySelectorAll('iframe')).toHaveLength(2);
  });

  it.each(['older', 'newer'] as const)('sandboxes the %s iframe with exactly allow-scripts', (age) => {
    renderModal();
    expect(frame(age)).toHaveAttribute('sandbox', 'allow-scripts');
  });

  it('never grants same-origin, forms, popups or top navigation', () => {
    renderModal();
    frames().forEach((element) => {
      const tokens = (element.getAttribute('sandbox') ?? '').split(/\s+/);
      expect(tokens).toEqual(['allow-scripts']);
    });
  });

  it('sends only the origin as referrer', () => {
    renderModal();
    expect(frame('older')).toHaveAttribute('referrerpolicy', 'origin');
  });

  it('points each iframe at the render endpoint with the usage key and that side\'s version id', () => {
    const block = node();
    renderModal({ block });
    [['older', V2], ['newer', V3]].forEach(([age, id]) => {
      const url = new URL(frame(age as Age).getAttribute('src') as string);
      expect(decodeURIComponent(url.pathname)).toBe(`/api/uber/publish_history/v1/courses/${COURSE_ID}/render/`);
      expect(url.searchParams.get('usage_key')).toBe(block.usageKey);
      expect(url.searchParams.get('version')).toBe(id);
    });
  });

  it('uses the draft keyword for a draft side', () => {
    renderModal({ sides: { older: OLDER, newer: { ...NEWER, id: 'd'.repeat(24), kind: 'draft' } } });
    expect(new URL(frame('newer').getAttribute('src') as string).searchParams.get('version')).toBe('draft');
  });

  it('uses the version id for a published side', () => {
    renderModal({ sides: { older: OLDER, newer: { ...NEWER, kind: 'published' } } });
    expect(new URL(frame('newer').getAttribute('src') as string).searchParams.get('version')).toBe(V3);
  });

  it('puts the frames in the order of the columns', () => {
    renderModal({ columns: ['newer', 'older'] });
    expect(frames().map((element) => element.title)).toEqual([
      'Intro text, newer version',
      'Intro text, older version',
    ]);
  });

  it('labels each column Older or Newer', () => {
    renderModal();
    expect(screen.getByText('Older')).toBeInTheDocument();
    expect(screen.getByText('Newer')).toBeInTheDocument();
  });

  it('shows a spinner until a frame has loaded', () => {
    renderModal();
    expect(screen.getAllByText('Loading the preview')).toHaveLength(2);
    fireEvent.load(frame('older'));
    expect(screen.getAllByText('Loading the preview')).toHaveLength(1);
    fireEvent.load(frame('newer'));
    expect(screen.queryByText('Loading the preview')).not.toBeInTheDocument();
  });

  it('shows no iframe for the older side of an added component', () => {
    renderModal({ block: node({ change: 'ADDED' }) });
    expect(screen.queryByTitle('Intro text, older version')).not.toBeInTheDocument();
    expect(frames()).toHaveLength(1);
    expect(screen.getByText('Not in this version')).toBeInTheDocument();
  });

  it('shows no iframe for the newer side of a removed component', () => {
    renderModal({ block: node({ change: 'REMOVED' }) });
    expect(screen.queryByTitle('Intro text, newer version')).not.toBeInTheDocument();
    expect(frame('older')).toBeInTheDocument();
    expect(screen.getByText('Not in this version')).toBeInTheDocument();
  });

  it('keeps the placeholder on the right side when the columns are swapped', () => {
    renderModal({ block: node({ change: 'ADDED' }), columns: ['newer', 'older'] });
    expect(frame('newer')).toBeInTheDocument();
    expect(screen.queryByTitle('Intro text, older version')).not.toBeInTheDocument();
  });

  it('says the preview is read-only and shows today\'s files and code', () => {
    renderModal();
    expect(screen.getByText(/Read-only\. Files and XBlock code are today's/)).toBeInTheDocument();
  });

  it('closes from the footer Close button', async () => {
    const onClose = renderModal();
    const buttons = screen.getAllByRole('button', { name: 'Close' });
    await userEvent.click(buttons[buttons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the header Close button', async () => {
    const onClose = renderModal();
    await userEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes with Escape', async () => {
    const onClose = renderModal();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('does not open a window', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    renderModal();
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
