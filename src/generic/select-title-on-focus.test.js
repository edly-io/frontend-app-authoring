import { initSelectTitleOnFocus, resetSelectTitleOnFocus } from './select-title-on-focus';

describe('select-title-on-focus', () => {
  afterEach(() => {
    resetSelectTitleOnFocus();
    document.body.innerHTML = '';
  });

  it.each([
    ['section-edit-field'],
    ['subsection-edit-field'],
    ['unit-edit-field'],
  ])('selects all text when the %s field gains focus', (testId) => {
    initSelectTitleOnFocus();

    const input = document.createElement('input');
    input.setAttribute('data-testid', testId);
    input.value = 'Section';
    document.body.appendChild(input);

    input.focus();

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('selects all text when the standalone unit title field gains focus', () => {
    initSelectTitleOnFocus();

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-testid', 'unit-header-title');
    const input = document.createElement('input');
    input.value = 'Getting Started';
    wrapper.appendChild(input);
    document.body.appendChild(wrapper);

    input.focus();

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('selects all text when the block editor title field gains focus', () => {
    initSelectTitleOnFocus();

    const input = document.createElement('input');
    input.setAttribute('data-testid', 'editable-header-title-field');
    input.value = 'Single select';
    document.body.appendChild(input);

    input.focus();

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('does not select text on unrelated inputs', () => {
    initSelectTitleOnFocus();

    const input = document.createElement('input');
    input.setAttribute('data-testid', 'search-field');
    input.value = 'hello world';
    document.body.appendChild(input);

    input.focus();

    expect(input.selectionStart).toBe(input.value.length);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('is a no-op before initialization and after reset', () => {
    const input = document.createElement('input');
    input.setAttribute('data-testid', 'unit-edit-field');
    input.value = 'Unit';
    document.body.appendChild(input);

    input.focus();
    expect(input.selectionStart).toBe(input.value.length);

    initSelectTitleOnFocus();
    input.blur();
    resetSelectTitleOnFocus();
    input.focus();

    expect(input.selectionStart).toBe(input.value.length);
  });

  it('only attaches a single listener across repeated init calls', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');

    initSelectTitleOnFocus();
    initSelectTitleOnFocus();
    initSelectTitleOnFocus();

    const focusinCalls = addSpy.mock.calls.filter(([eventName]) => eventName === 'focusin');
    expect(focusinCalls).toHaveLength(1);

    addSpy.mockRestore();
  });
});
