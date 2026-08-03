import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

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
}) => (
  <Editor
    key={editorKey}
    initialValue={value}
    onEditorChange={onChange}
    init={{
      plugins: 'lists link code autoresize hr charmap table embediframe',
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
      block_formats: 'Header 2=h2;Header 3=h3;Paragraph=p;Preformatted=pre',
      // Register 'html-source' as a text button matching the course editor's 'HTML' label.
      // The code plugin is kept in plugins so mceCodeEditor command is available.
      setup: (editor) => {
        editor.ui.registry.addButton('html-source', {
          text: 'HTML',
          tooltip: 'Source code',
          onAction: () => editor.execCommand('mceCodeEditor'),
        });
      },
    }}
  />
);

RichTextEditor.defaultProps = {
  editorKey: undefined,
};

export default RichTextEditor;
