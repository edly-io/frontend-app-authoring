import pluginConfig, { cleanPastedHtml, pastePostprocess } from './pluginConfig';

const pasted = (html) => {
  const node = document.createElement('div');
  node.innerHTML = html;
  return node;
};

describe('cleanPastedHtml', () => {
  it('keeps structure and links but drops source styling', () => {
    const root = pasted(
      '<h2 id="x" style="color: red"><span data-metadata="blob">Title</span></h2>'
        + '<p class="MsoNormal" data-buffer="blob"><span style="font-weight: 400">Lead '
        + '<a href="/x" target="_blank" rel="noopener" class="c1">link</a></span></p>',
    );
    cleanPastedHtml(root);
    expect(root.innerHTML).toEqual(
      '<h2>Title</h2><p>Lead <a href="/x" target="_blank" rel="noopener">link</a></p>',
    );
  });

  it('keeps the editor\'s content classes, including on spans', () => {
    const root = pasted(
      '<div class="hd hd-2 Mso">H</div><pre class="language-python x">print(1)</pre>'
        + '<div class="tiny-pageembed" style="width: 5px"></div><p><span class="hd-3 c1">s</span></p>',
    );
    cleanPastedHtml(root);
    expect(root.innerHTML).toEqual(
      '<div class="hd hd-2">H</div><pre class="language-python">print(1)</pre>'
        + '<div class="tiny-pageembed"></div><p><span class="hd-3">s</span></p>',
    );
  });

  it('cleans SVG elements without throwing', () => {
    const root = pasted('<svg class="hd-1 icon" style="fill: red"><path class="p" d="M0"></path></svg>');
    cleanPastedHtml(root);
    expect(root.innerHTML).toEqual('<svg class="hd-1"><path></path></svg>');
  });
});

describe('pastePostprocess', () => {
  const html = '<p style="text-align: center"><span style="color: #276EF1">Key idea</span></p>';

  it('leaves in-editor copies untouched', () => {
    const node = pasted(html);
    pastePostprocess(null, { node, internal: true });
    expect(node.innerHTML).toEqual(html);
  });

  it('cleans external pastes', () => {
    const node = pasted(html);
    pastePostprocess(null, { node, internal: false });
    expect(node.innerHTML).toEqual('<p>Key idea</p>');
  });

  it('is wired into the editor config', () => {
    const { plugins, config } = pluginConfig({ editorType: 'text' });
    expect(plugins.split(' ')).toContain('paste');
    expect(config.paste_postprocess).toBe(pastePostprocess);
  });
});
