/**
 * Page preview and print layout.
 *
 * Paged.js lays the rendered document out on real pages (A4 or Letter, with
 * page numbers) inside an overlay. Its Print button prints exactly those
 * pages, so what you see is what the PDF holds, in every browser.
 *
 * Printing without the preview (Ctrl+P) uses the same paper size, margins and
 * footer through an injected @page rule; Chrome and Edge draw that footer,
 * other browsers may leave it out.
 */

import { loadPaperSizePreference, savePaperSizePreference } from './state.js';

const PAGED_JS_URL = 'https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.min.js';

const PAPER_SIZES = {
  A4: { css: 'A4', label: 'A4' },
  letter: { css: 'letter', label: 'Letter' }
};

const PAGE_MARGIN = '20mm 15mm';
const FOOTER_FONT = "8pt 'Figtree', 'Segoe UI', system-ui, sans-serif";
const MAX_FOOTER_TITLE = 80;

const PAGED_BREAK_CSS = `.md-paged-doc .page-break { break-after: page; }
.md-paged-doc h1, .md-paged-doc h2, .md-paged-doc h3,
.md-paged-doc h4, .md-paged-doc h5, .md-paged-doc h6 { break-after: avoid; }
.md-paged-doc tr, .md-paged-doc img,
.md-paged-doc mjx-container[display="true"] { break-inside: avoid; }`;

let pagedLoadPromise = null;

function loadPagedJs() {
  if (window.PagedModule) return Promise.resolve(window.PagedModule);
  if (!pagedLoadPromise) {
    pagedLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PAGED_JS_URL;
      script.onload = () => (window.PagedModule ? resolve(window.PagedModule) : reject(new Error('Paged.js missing')));
      script.onerror = () => reject(new Error('Paged.js failed to load'));
      document.head.appendChild(script);
    }).catch(error => {
      pagedLoadPromise = null; // allow a retry once back online
      throw error;
    });
  }
  return pagedLoadPromise;
}

function cssString(text) {
  return `"${text.replace(/[\\"]/g, '\\$&').replace(/[\n\r\f]+/g, ' ')}"`;
}

function shortenTitle(title) {
  const clean = title.replace(/\s+/g, ' ').trim();
  return clean.length > MAX_FOOTER_TITLE ? `${clean.slice(0, MAX_FOOTER_TITLE - 1).trimEnd()}…` : clean;
}

/** The @page rule shared by the preview and by plain printing. */
export function buildPageCss(paperKey, title) {
  const paper = PAPER_SIZES[paperKey] || PAPER_SIZES.A4;
  const footerTitle = title ? shortenTitle(title) : '';
  const box = `font: ${FOOTER_FONT}; color: #5f6672;`;
  return `@page {
  size: ${paper.css};
  margin: ${PAGE_MARGIN};
  ${footerTitle ? `@bottom-left { content: ${cssString(footerTitle)}; ${box} }` : ''}
  @bottom-right { content: "Page " counter(page) " of " counter(pages); ${box} }
}`;
}

/**
 * @param {object} options
 * @param {HTMLElement} options.source - the rendered preview to lay out
 * @param {() => Promise<unknown>} options.whenRendered - settles once math is typeset
 * @param {() => string} options.getHeading - the document's first heading, or ''
 * @param {(open: boolean) => void} [options.onToggle] - called as the preview opens and closes
 */
export function initPagePreview({ source, whenRendered, getHeading, onToggle }) {
  const overlay = document.getElementById('pagePreview');
  const pagesHost = document.getElementById('pagePreviewPages');
  const scroller = document.getElementById('pagePreviewScroll');
  const status = document.getElementById('pagePreviewStatus');
  const printButton = document.getElementById('pagePreviewPrint');
  const closeButton = document.getElementById('pagePreviewClose');
  const paperButtons = [...overlay.querySelectorAll('[data-paper]')];
  const backgroundRegions = [...document.body.children].filter(element => element !== overlay);

  const pageStyle = document.createElement('style');
  pageStyle.id = 'mdPageStyle';
  document.head.appendChild(pageStyle);

  let paperKey = PAPER_SIZES[loadPaperSizePreference()] ? loadPaperSizePreference() : 'A4';
  let previewer = null;
  let layoutId = 0;
  let opener = null;

  function refreshPageStyle() {
    pageStyle.textContent = buildPageCss(paperKey, getHeading());
  }

  function updatePaperButtons() {
    paperButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.paper === paperKey));
    });
  }

  function destroyPreviewer() {
    if (!previewer) return;
    try {
      // Each page watches its own size; disconnect those watchers before the
      // pages go, or they fire on removed pages.
      (previewer.chunker.pages || []).forEach(page => page.destroy());
      previewer.polisher.destroy();
      previewer.chunker.destroy();
    } catch (error) {
      console.error(error);
    }
    previewer = null;
    pagesHost.textContent = '';
  }

  // While the laid-out pages are showing, they are what prints; otherwise
  // printing falls back to the plain document with the @page rule above.
  function setPagesReady(ready) {
    document.body.classList.toggle('md-pages-ready', ready);
    pageStyle.media = ready ? 'not all' : 'all';
    printButton.disabled = !ready && !overlay.classList.contains('is-fallback');
  }

  function fitPages() {
    const firstPage = pagesHost.querySelector('.pagedjs_page');
    const pages = pagesHost.querySelector('.pagedjs_pages');
    if (!firstPage || !pages) return;
    pages.style.zoom = '';
    const available = scroller.clientWidth - 32;
    const scale = Math.min(1, available / firstPage.offsetWidth);
    pages.style.zoom = scale < 1 ? String(Math.max(0.2, scale)) : '';
  }

  async function waitForContent() {
    await whenRendered();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const images = [...source.querySelectorAll('img')];
    await Promise.all(images.map(image => (image.complete ? null : image.decode().catch(() => {}))));
  }

  function buildContent() {
    const doc = document.createElement('div');
    doc.className = 'md-paged-doc';
    const copy = source.cloneNode(true);
    copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    doc.append(...copy.childNodes);
    return doc;
  }

  async function layOut() {
    const id = ++layoutId;
    overlay.classList.remove('is-fallback');
    setPagesReady(false);
    destroyPreviewer();
    refreshPageStyle();
    status.textContent = 'Laying out pages…';
    overlay.setAttribute('aria-busy', 'true');

    try {
      const [Paged] = await Promise.all([loadPagedJs(), waitForContent()]);
      if (id !== layoutId || overlay.hidden) return;
      const next = new Paged.Previewer();
      previewer = next;
      // Paged.js only follows break rules from the CSS it is given.
      const pageCss = `${buildPageCss(paperKey, getHeading())}\n${PAGED_BREAK_CSS}`;
      const flow = await next.preview(buildContent(), [{ [new URL('panphymd-page.css', location.href).href]: pageCss }], pagesHost);
      if (id !== layoutId || overlay.hidden) {
        if (previewer === next) destroyPreviewer();
        return;
      }
      // The pages are final now; stop them reflowing when the zoom changes.
      (next.chunker.pages || []).forEach(page => page.removeListeners());
      const total = flow && flow.total ? flow.total : pagesHost.querySelectorAll('.pagedjs_page').length;
      status.textContent = `${total} ${total === 1 ? 'page' : 'pages'}`;
      setPagesReady(true);
      fitPages();
    } catch (error) {
      console.error('Page preview failed:', error);
      if (id !== layoutId) return;
      destroyPreviewer();
      overlay.classList.add('is-fallback');
      status.textContent = 'Page preview is unavailable offline. Print still works, without the preview.';
      setPagesReady(false);
    } finally {
      if (id === layoutId) overlay.removeAttribute('aria-busy');
    }
  }

  function open() {
    if (!overlay.hidden) return;
    opener = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('md-page-preview-open');
    backgroundRegions.forEach(element => { element.inert = true; });
    if (onToggle) onToggle(true);
    updatePaperButtons();
    closeButton.focus();
    layOut();
  }

  function close() {
    if (overlay.hidden) return;
    layoutId++;
    destroyPreviewer();
    setPagesReady(false);
    overlay.hidden = true;
    overlay.classList.remove('is-fallback');
    document.body.classList.remove('md-page-preview-open');
    backgroundRegions.forEach(element => { element.inert = false; });
    if (onToggle) onToggle(false);
    if (opener && typeof opener.focus === 'function') opener.focus();
    opener = null;
  }

  // window.print() must run straight from the click, or Safari blocks it.
  function print() {
    window.print();
  }

  paperButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.paper === paperKey) return;
      paperKey = button.dataset.paper;
      savePaperSizePreference(paperKey);
      updatePaperButtons();
      layOut();
    });
  });
  printButton.addEventListener('click', print);
  closeButton.addEventListener('click', close);
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  window.addEventListener('resize', () => {
    if (!overlay.hidden) fitPages();
  });
  // Plain printing (Ctrl+P) picks up the current heading for its footer.
  window.addEventListener('beforeprint', () => {
    if (!document.body.classList.contains('md-pages-ready')) refreshPageStyle();
  });

  refreshPageStyle();
  updatePaperButtons();

  return { open, close, isOpen: () => !overlay.hidden };
}
