import { Editor } from '@tinymce/tinymce-react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { initializeMocks, render } from '@src/testUtils';
import RichTextEditor from './RichTextEditor';

jest.mock('@tinymce/tinymce-react', () => ({ Editor: jest.fn(() => null) }));

const arabic = {
  'studio.rich-text.heading-2': 'عنوان 2',
  'studio.rich-text.heading-3': 'عنوان 3',
  'studio.rich-text.paragraph': 'فقرة',
  'studio.rich-text.preformatted': 'نص منسق مسبقًا',
  'studio.rich-text.source-code': 'الشيفرة المصدرية',
};

const getEditorConfig = (locale: string) => {
  render(<RichTextEditor value="" onChange={jest.fn()} />, {
    extraWrapper: ({ children }) => <IntlProvider locale={locale} messages={locale === 'ar' ? arabic : {}}>{children}</IntlProvider>,
  });
  return (Editor as unknown as jest.Mock).mock.calls[0][0].init;
};

describe('RichTextEditor', () => {
  beforeEach(() => {
    initializeMocks();
    jest.clearAllMocks();
  });

  it('uses Arabic direction and labels for app-defined controls', () => {
    const config = getEditorConfig('ar');
    expect(config.directionality).toBe('rtl');
    expect(config.block_formats).toContain('فقرة=p');
    const addButton = jest.fn();
    config.setup({ ui: { registry: { addButton } } });
    expect(addButton).toHaveBeenCalledWith('html-source', expect.objectContaining({ tooltip: 'الشيفرة المصدرية' }));
  });

  it('preserves English direction and labels', () => {
    const config = getEditorConfig('en');
    expect(config.directionality).toBe('ltr');
    expect(config.block_formats).toContain('Paragraph=p');
  });
});
