import { cleanPastedHtml } from './pluginConfig';

describe('cleanPastedHtml', () => {
  it('keeps structure, links and Uber classes but drops source styling', () => {
    const root = document.createElement('div');
    root.innerHTML = '<h2 id="x" style="color: red"><span data-metadata="blob">Title</span></h2>'
      + '<p class="MsoNormal uber-note" data-buffer="blob"><span style="font-weight: 400">Lead '
      + '<a href="/x" class="c1">link</a></span></p>';
    cleanPastedHtml(root);
    expect(root.innerHTML).toEqual('<h2>Title</h2><p class="uber-note">Lead <a href="/x">link</a></p>');
  });
});
