import { StrictDict } from '../../utils';
import { buttons, plugins } from '../../data/constants/tinyMCE';

const uberColorMap = [
  '000000',
  'Content Primary',
  '4B4B4B',
  'Content Secondary',
  '757575',
  'Content Tertiary',
  '276EF1',
  'Uber Blue',
  '0E8345',
  'Positive Green',
  'DE1135',
  'Negative Red',
  'E46B10',
  'Warning Orange',
  'FFFFFF',
  'White',
  'F6F6F6',
  'Background Secondary',
  'E2E2E2',
  'Border',
];

const mapToolbars = toolbars => toolbars.map(toolbar => toolbar.join(' ')).join(' | ');

const PASTE_KEPT_ATTRS = ['href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan'];
// Content classes this editor styles or relies on: headings (tinyMCEStyles), code samples, page embeds.
const PASTE_KEPT_CLASS = /^(hd(-\d)?|language-.+|tiny-pageembed)$/;

// HTML pasted from outside the editor (Figma, Word, Google Docs, web pages) keeps its elements but
// loses the source's attributes: inline styles, ids, data-* blobs and foreign classes. Spans left
// without attributes are unwrapped, keeping their text. Elements themselves are not filtered.
export const cleanPastedHtml = (root) => {
  root.querySelectorAll('*').forEach((el) => {
    const keptClasses = [...el.classList].filter(name => PASTE_KEPT_CLASS.test(name));
    [...el.attributes].forEach(({ name }) => {
      if (!PASTE_KEPT_ATTRS.includes(name)) { el.removeAttribute(name); }
    });
    // setAttribute, not className: className is read-only on SVG elements.
    if (keptClasses.length) { el.setAttribute('class', keptClasses.join(' ')); }
  });
  root.querySelectorAll('span:not([class])').forEach(span => span.replaceWith(...span.childNodes));
};

// In-editor copies (args.internal) are the author's own formatting, so they're left alone.
// A cleanup failure must not drop the paste, so it falls back to the uncleaned HTML.
export const pastePostprocess = (_editor, args) => {
  if (args.internal) { return; }
  try {
    cleanPastedHtml(args.node);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Pasted HTML cleanup failed', e);
  }
};

const pluginConfig = ({ placeholder, editorType, enableImageUpload }) => {
  const image = enableImageUpload ? plugins.image : '';
  const imageTools = enableImageUpload ? plugins.imagetools : '';
  const imageUploadButton = enableImageUpload ? buttons.imageUploadButton : '';
  const editImageSettings = enableImageUpload ? buttons.editImageSettings : '';
  const codePlugin = editorType === 'text' ? plugins.code : '';
  const codeButton = editorType === 'text' ? buttons.code : '';
  const labelButton = editorType === 'question' ? buttons.customLabelButton : '';
  const quickToolbar = editorType === 'expandable' ? plugins.quickbars : '';
  const statusbar = editorType !== 'expandable';
  const toolbar = editorType !== 'expandable';
  const autoresizeBottomMargin = editorType === 'expandable' ? 10 : 50;
  const defaultFormat = (editorType === 'question' || editorType === 'expandable') ? 'div' : 'p';
  const hasStudioHeader = document.querySelector('.studio-header');

  return (
    StrictDict({
      plugins: [
        plugins.link,
        plugins.lists,
        plugins.codesample,
        plugins.emoticons,
        plugins.table,
        plugins.hr,
        plugins.charmap,
        codePlugin,
        plugins.autoresize,
        image,
        imageTools,
        quickToolbar,
        plugins.a11ychecker,
        plugins.powerpaste,
        plugins.paste,
        plugins.embediframe,
      ].join(' '),
      menubar: false,
      toolbar: toolbar ?
        mapToolbars([
          [buttons.undo, buttons.redo],
          [buttons.formatSelect],
          [labelButton],
          [buttons.bold, buttons.italic, buttons.underline, buttons.foreColor, buttons.backColor],
          [
            buttons.align.left,
            buttons.align.center,
            buttons.align.right,
            buttons.align.justify,
          ],
          [
            buttons.bullist,
            buttons.numlist,
            buttons.outdent,
            buttons.indent,
          ],
          [imageUploadButton, buttons.link, buttons.unlink, buttons.blockQuote, buttons.codeBlock],
          [buttons.table, buttons.emoticons, buttons.charmap, buttons.hr],
          [buttons.removeFormat, codeButton, buttons.a11ycheck, buttons.embediframe],
        ]) :
        false,
      imageToolbar: mapToolbars([
        // [buttons.rotate.left, buttons.rotate.right],
        // [buttons.flip.horiz, buttons.flip.vert],
        [editImageSettings],
      ]),
      quickbarsInsertToolbar: toolbar ? false : mapToolbars([
        // To keep from blocking the whole text input field when it's empty, this "insert" toolbar
        // used with ExpandableTextArea is kept as minimal as we can.
        [imageUploadButton, buttons.table],
      ]),
      quickbarsSelectionToolbar: toolbar ? false : mapToolbars([
        [buttons.undo, buttons.redo],
        [buttons.formatSelect],
        [buttons.bold, buttons.italic, buttons.underline, buttons.foreColor],
        [
          buttons.align.justify,
          buttons.bullist,
          buttons.numlist,
        ],
        [imageUploadButton, buttons.blockQuote, buttons.codeBlock],
        [buttons.table, buttons.emoticons, buttons.charmap, buttons.removeFormat, buttons.a11ycheck],
      ]),
      config: {
        branding: false,
        height: '100%',
        menubar: false,
        toolbar_mode: /** @type {'sliding'} */ ('sliding'),
        toolbar_sticky: true,
        toolbar_sticky_offset: hasStudioHeader ? 0 : 76,
        relative_urls: true,
        convert_urls: false,
        placeholder,
        statusbar,
        block_formats:
          'Header 1=h1;Header 2=h2;Header 3=h3;Header 4=h4;Header 5=h5;Header 6=h6;Div=div;Paragraph=p;Preformatted=pre',
        forced_root_block: defaultFormat,
        powerpaste_allow_local_images: true,
        powerpaste_word_import: 'prompt',
        powerpaste_html_import: 'prompt',
        powerpaste_googledoc_import: 'prompt',
        // powerpaste is an open-source stub, so the core paste plugin does the cleanup
        paste_data_images: true,
        paste_postprocess: pastePostprocess,
        autoresize_bottom_margin: autoresizeBottomMargin,
        color_map: uberColorMap,
        // Keep content in the Uber font: drop inline font-family from pasted, loaded and saved HTML.
        invalid_styles: { '*': 'font-family' },
      },
    })
  );
};

export default pluginConfig;
