import React from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { defineMessages, isRtl, useIntl } from '@edx/frontend-platform/i18n';

import 'tinymce';
import 'tinymce/themes/silver';
import 'tinymce/skins/ui/oxide/skin.css';
import 'tinymce/icons/default';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/code';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/hr';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/table';
import tinyMCEEmbedIframePlugin from '../editors/sharedComponents/TinyMceWidget/customTinyMcePlugins/embedIframePlugin';

// Register the embediframe plugin explicitly — the plugin file's IIFE uses window.tinymce
// which may not be set in all webpack bundling scenarios, so we also register here.
const w = window as any;
if (w.tinymce && !w.tinymce.PluginManager.get('embediframe')) {
  w.tinymce.PluginManager.add('embediframe', tinyMCEEmbedIframePlugin);
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  editorKey?: string | number;
}

const messages = defineMessages({
  heading2: { id: 'studio.rich-text.heading-2', defaultMessage: 'Header 2' },
  heading3: { id: 'studio.rich-text.heading-3', defaultMessage: 'Header 3' },
  paragraph: { id: 'studio.rich-text.paragraph', defaultMessage: 'Paragraph' },
  preformatted: { id: 'studio.rich-text.preformatted', defaultMessage: 'Preformatted' },
  sourceCode: { id: 'studio.rich-text.source-code', defaultMessage: 'Source code' },
});

const TOOLBAR = [
  'undo redo',
  'formatselect',
  'bold italic underline forecolor backcolor',
  'alignleft aligncenter alignright alignjustify',
  'bullist numlist outdent indent',
  'link unlink blockquote',
  'table charmap hr',
  'removeformat html-source embediframe',
].join(' | ');

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  editorKey,
}) => {
  const intl = useIntl();
  const isArabic = isRtl(intl.locale);
  return (
    <Editor
      key={editorKey}
      initialValue={value}
      onEditorChange={onChange}
      init={{
        plugins: 'lists link code autoresize hr charmap table embediframe',
        directionality: isArabic ? 'rtl' : 'ltr',
        toolbar: TOOLBAR,
        menubar: false,
        branding: false,
        statusbar: false,
        toolbar_mode: 'wrap' as const,
        toolbar_sticky: true,
        toolbar_sticky_offset: 0,
        autoresize_bottom_margin: 50,
        min_height: 250,
        relative_urls: true,
        convert_urls: false,
        block_formats: [
          `${intl.formatMessage(messages.heading2)}=h2`,
          `${intl.formatMessage(messages.heading3)}=h3`,
          `${intl.formatMessage(messages.paragraph)}=p`,
          `${intl.formatMessage(messages.preformatted)}=pre`,
        ].join(';'),
        // Register 'html-source' as a text button matching the course editor's 'HTML' label.
        // The code plugin is kept in plugins so mceCodeEditor command is available.
        setup: (editor) => {
          editor.ui.registry.addButton('html-source', {
            text: 'HTML',
            tooltip: intl.formatMessage(messages.sourceCode),
            onAction: () => editor.execCommand('mceCodeEditor'),
          });
        },
      }}
    />
  );
};

RichTextEditor.defaultProps = {
  editorKey: undefined,
};

export default RichTextEditor;
