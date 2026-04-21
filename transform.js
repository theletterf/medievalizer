(() => {
  'use strict';

  const OVERLAY_ID = '__medievalizer_overlay';

  // Second click restores the original page
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    existing.remove();
    document.querySelectorAll('[data-medievalizer]').forEach((el) => el.remove());
    chrome.runtime.sendMessage({ type: 'RESTORED' }); // tells background to clear the badge
    return;
  }

  const SCRIBE_MESSAGES = [
    'The scribe doth sharpen his quill…',
    'Consulting the ancient tomes of knowledge…',
    'Translating thy modern tongue into archaic script…',
    'Applying gilded ink to parchment…',
    'Invoking the spirits of antiquity…',
    'Transcribing by candlelight…',
    'The illuminated manuscript taketh form…',
    'Beseeching the muses for divine inspiration…',
    'Perusing the sacred scrolls for guidance…',
  ];

  // ── Embedded styles (scoped inside Shadow DOM) ─────────────────────────────
  const CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .page {
      min-height: 100vh;
      background: #1a0f08;
      background-image:
        repeating-linear-gradient(90deg,
          rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px,
          transparent 1px, transparent 48px),
        repeating-linear-gradient(0deg,
          rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px,
          transparent 1px, transparent 48px);
      display: flex;
      flex-direction: column;
      font-family: 'IM Fell English', Georgia, serif;
      font-size: 16px;
      color: #2c1a0a;
    }

    /* ── Controls bar ── */
    .controls {
      position: sticky;
      top: 0;
      background: linear-gradient(180deg, #2a1508 0%, #1a0f08 100%);
      border-bottom: 2px solid #8b6914;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      z-index: 100;
    }

    .brand {
      font-family: 'UnifrakturMaguntia', cursive;
      font-size: 22px;
      color: #c8a84b;
      text-shadow: 0 0 10px rgba(200,168,75,0.4), 1px 1px 3px rgba(0,0,0,0.8);
      letter-spacing: 2px;
      flex-shrink: 0;
    }

    .ctrl-btns { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

    .word-count {
      font-size: 11px;
      font-style: italic;
      color: #c8a84b;
      opacity: 0.65;
      flex: 1;
      text-align: center;
      letter-spacing: 0.3px;
    }

    .btn {
      cursor: pointer;
      border: 1px solid #8b6914;
      background: rgba(200,168,75,0.1);
      color: #c8a84b;
      font-family: 'IM Fell English', serif;
      font-size: 13px;
      padding: 5px 13px;
      border-radius: 3px;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .btn:hover { background: rgba(200,168,75,0.22); color: #e8d080; }

    .btn-restore {
      background: rgba(139,0,0,0.2);
      border-color: #8b0000;
      color: #f4a0a0;
    }
    .btn-restore:hover { background: rgba(139,0,0,0.38); color: #ffb4b4; }

    /* ── Content area ── */
    .content-area {
      flex: 1;
      padding: 40px 16px 56px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .hidden { display: none !important; }

    /* ── Loading ── */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 55vh;
      gap: 20px;
      color: #c8a84b;
      font-style: italic;
      font-size: 1.15em;
    }

    .quill {
      font-size: 72px;
      animation: quill-rock 0.9s ease-in-out infinite;
      transform-origin: bottom center;
      filter: drop-shadow(0 0 14px rgba(200,168,75,0.55));
    }

    @keyframes quill-rock {
      0%   { transform: rotate(-8deg); }
      50%  { transform: rotate(8deg); }
      100% { transform: rotate(-8deg); }
    }

    .error-msg {
      color: #f4a0a0;
      background: rgba(139,0,0,0.18);
      border: 1px solid #8b0000;
      border-radius: 4px;
      padding: 20px 32px;
      text-align: center;
      font-style: italic;
      max-width: 540px;
      line-height: 1.6;
    }

    /* ── Manuscript scroll ── */
    .manuscript { width: 100%; max-width: 820px; }

    .scroll-roll {
      height: 22px;
      border-radius: 50% / 50%;
      background: linear-gradient(to right,
        #6b4f1a 0%, #c8a84b 5%, #e8c870 11%,
        #c8a84b 17%, #8b6914 22%,
        #8b6914 78%,
        #c8a84b 83%, #e8c870 89%, #c8a84b 95%, #6b4f1a 100%);
      border: 1px solid #6b4f1a;
      box-shadow: 0 3px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.15);
    }

    /* ── Parchment ── */
    .parchment {
      background-color: #f4e0ba;
      background-image:
        radial-gradient(ellipse 80% 60% at 15% 20%, rgba(180,140,60,0.18) 0%, transparent 65%),
        radial-gradient(ellipse 60% 80% at 85% 75%, rgba(160,120,50,0.14) 0%, transparent 60%),
        radial-gradient(ellipse 100% 40% at 50% 95%, rgba(140,100,40,0.12) 0%, transparent 80%),
        repeating-linear-gradient(0deg,
          transparent, transparent 27px,
          rgba(139,105,20,0.055) 27px, rgba(139,105,20,0.055) 28px);
      border: 1px solid #8b6914;
      padding: 52px 60px 56px;
      box-shadow: inset 0 0 40px rgba(0,0,0,0.13), 0 4px 20px rgba(0,0,0,0.45);
    }

    /* ── Typography ── */
    .parchment h1, .parchment h2, .parchment h3,
    .parchment h4, .parchment h5, .parchment h6 {
      font-family: 'UnifrakturMaguntia', cursive;
      color: #8b0000;
      line-height: 1.2;
    }
    .parchment h1 { font-size: 2.4em; margin: 0 0 0.4em; border-bottom: 1px solid #c8a84b; padding-bottom: 6px; }
    .parchment h2 { font-size: 1.9em; margin: 1.2em 0 0.35em; }
    .parchment h3 { font-size: 1.5em; margin: 1em 0 0.3em; }
    .parchment h4 { font-size: 1.25em; margin: 0.9em 0 0.25em; }
    .parchment h5, .parchment h6 { font-size: 1.1em; margin: 0.8em 0 0.2em; }

    .parchment p {
      line-height: 1.85;
      margin: 0.75em 0;
      text-align: justify;
      hyphens: auto;
    }

    .parchment p.drop-cap::first-letter {
      float: left;
      font-family: 'UnifrakturMaguntia', cursive;
      font-size: 5.2em;
      line-height: 0.75;
      padding-right: 7px;
      padding-top: 5px;
      color: #8b0000;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.18);
    }

    .parchment ul { margin: 0.6em 0 0.6em 1.5em; padding: 0; }
    .parchment li { margin: 0.35em 0; line-height: 1.75; }
    .parchment li::marker { content: '⚜ '; color: #8b0000; }

    .parchment strong { color: #4a1a0a; font-weight: bold; }
    .parchment em     { font-style: italic; color: #3a2a10; }

    .parchment hr { border: none; border-top: 1px solid #c8a84b; margin: 2em 0; opacity: 0.5; }

    .parchment blockquote {
      border-left: 4px solid #c8a84b;
      padding: 8px 18px;
      margin: 1em 0;
      font-style: italic;
      opacity: 0.85;
    }

    .parchment pre {
      background: #e8d0a0;
      border: 1px solid #8b6914;
      border-left: 4px solid #8b0000;
      border-radius: 2px;
      padding: 14px 16px;
      margin: 1.2em 0;
      overflow-x: auto;
      box-shadow: inset 0 0 12px rgba(0,0,0,0.08);
      position: relative;
    }

    .parchment pre::before {
      content: '⚜';
      position: absolute;
      top: -10px; left: 10px;
      background: #f4e0ba;
      padding: 0 6px;
      color: #8b6914;
      font-size: 12px;
      line-height: 1;
    }

    .parchment pre code {
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: 0.855em;
      color: #1a0f08;
      background: none;
      border: none;
      padding: 0;
    }

    .parchment code {
      font-family: 'Courier New', monospace;
      font-size: 0.875em;
      background: rgba(139,105,20,0.12);
      border: 1px solid rgba(139,105,20,0.28);
      border-radius: 2px;
      padding: 1px 5px;
      color: #3a1a08;
    }

    .cursor {
      display: inline-block;
      color: #8b0000;
      font-weight: bold;
      animation: blink 0.8s step-end infinite;
    }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

    ::-webkit-scrollbar       { width: 8px; }
    ::-webkit-scrollbar-track { background: #1a0f08; }
    ::-webkit-scrollbar-thumb { background: #8b6914; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #c8a84b; }

    @media (max-width: 640px) {
      .parchment { padding: 28px 20px 32px; }
      .parchment h1 { font-size: 1.8em; }
      .parchment h2 { font-size: 1.5em; }
      .brand { font-size: 17px; }
    }
  `;

  // ── Build the overlay ───────────────────────────────────────────────────────

  // Fonts go into the main document head (font-face data is global to the browsing context)
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.dataset.medievalizer = 'true';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English:ital@0;1&display=swap';
  document.head.appendChild(fontLink);

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    overflowY: 'auto',
  });
  document.documentElement.appendChild(overlay);

  const shadow = overlay.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>${CSS}</style>
    <div class="page">
      <div class="controls">
        <span class="brand">&#x2767;&nbsp;Medievalizer&nbsp;&#x2767;</span>
        <span class="word-count hidden" id="word-count"></span>
        <div class="ctrl-btns">
          <button class="btn" id="copy-btn">&#x2398; Copy</button>
          <button class="btn btn-restore" id="restore-btn">&#x21B6; Restore Page</button>
        </div>
      </div>
      <div class="content-area">
        <div class="loading" id="loading">
          <div class="quill">&#9997;</div>
          <p id="loading-text">${SCRIBE_MESSAGES[0]}</p>
        </div>
        <div class="manuscript hidden" id="manuscript">
          <div class="scroll-roll"></div>
          <div class="parchment" id="output"></div>
          <div class="scroll-roll"></div>
        </div>
      </div>
    </div>
  `;

  // ── Wire up controls ────────────────────────────────────────────────────────

  shadow.querySelector('#restore-btn').addEventListener('click', () => {
    overlay.remove();
    document.querySelectorAll('[data-medievalizer]').forEach((el) => el.remove());
  });

  shadow.querySelector('#copy-btn').addEventListener('click', async () => {
    const out = shadow.querySelector('#output');
    try {
      await navigator.clipboard.writeText(out.innerText);
      const btn = shadow.querySelector('#copy-btn');
      const orig = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    } catch (_) {}
  });

  // ── Streaming ──────────────────────────────────────────────────────────────

  const loadingEl    = shadow.querySelector('#loading');
  const loadingText  = shadow.querySelector('#loading-text');
  const manuscriptEl = shadow.querySelector('#manuscript');
  const outputEl     = shadow.querySelector('#output');
  const wordCountEl  = shadow.querySelector('#word-count');

  // Cycle loading messages while waiting for the first chunk
  let msgIdx = 0;
  const msgTimer = setInterval(() => {
    msgIdx = (msgIdx + 1) % SCRIBE_MESSAGES.length;
    loadingText.textContent = SCRIBE_MESSAGES[msgIdx];
  }, 2500);

  const port = chrome.runtime.connect({ name: 'medievalize' });

  let accumulated   = '';
  let renderPending = false;
  let streamingStarted = false;

  function updateWordCount() {
    const words = accumulated.trim().split(/\s+/).filter(Boolean).length;
    wordCountEl.textContent = `~${words.toLocaleString()} words transcribed`;
    wordCountEl.classList.remove('hidden');
  }

  function showOutput(streaming) {
    loadingEl.classList.add('hidden');
    manuscriptEl.classList.remove('hidden');
    outputEl.innerHTML = renderMarkdown(accumulated) + (streaming ? '<span class="cursor">|</span>' : '');
    if (!streaming) {
      const firstP = outputEl.querySelector('p');
      if (firstP) firstP.classList.add('drop-cap');
    }
  }

  port.onMessage.addListener((msg) => {
    if (msg.type === 'CHUNK') {
      if (!streamingStarted) {
        streamingStarted = true;
        clearInterval(msgTimer); // stop cycling messages once text arrives
      }
      accumulated += msg.text;
      if (!renderPending) {
        renderPending = true;
        requestAnimationFrame(() => {
          renderPending = false;
          showOutput(true);
          updateWordCount();
        });
      }
    } else if (msg.type === 'DONE') {
      clearInterval(msgTimer);
      showOutput(false);
      updateWordCount();
    } else if (msg.type === 'ERROR') {
      clearInterval(msgTimer);
      loadingEl.innerHTML = `<p class="error-msg">The mystical arts have failed:<br>${escHtml(msg.message)}</p>`;
    }
  });

  port.onDisconnect.addListener(() => {
    clearInterval(msgTimer);
    if (accumulated) showOutput(false);
    else loadingEl.innerHTML = '<p class="error-msg">The connection was severed unexpectedly.</p>';
  });

  port.postMessage({
    type: 'START',
    content: extractContent(),
    title: document.title,
    url: location.href,
  });

  // ── DOM → Markdown extraction ───────────────────────────────────────────────

  function extractContent() {
    const SKIP = new Set(['script','style','nav','header','footer','aside',
                          'noscript','svg','img','figure','figcaption','iframe']);
    const HEADING = { h1:'#', h2:'##', h3:'###', h4:'####', h5:'#####', h6:'######' };

    function toMd(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent.replace(/\s+/g, ' ');
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const tag = node.tagName.toLowerCase();
      if (SKIP.has(tag)) return '';
      if (node.getAttribute('role') === 'navigation') return '';
      if (node.getAttribute('aria-hidden') === 'true') return '';
      if (node.hasAttribute('hidden')) return '';

      const kids = () => Array.from(node.childNodes).map(toMd).join('');

      if (HEADING[tag]) return `\n\n${HEADING[tag]} ${node.textContent.trim()}\n\n`;

      switch (tag) {
        case 'p':         return `\n\n${kids().trim()}\n\n`;
        case 'br':        return '\n';
        case 'hr':        return '\n\n---\n\n';
        case 'strong': case 'b': return `**${node.textContent.trim()}**`;
        case 'em':    case 'i':  return `*${node.textContent.trim()}*`;
        case 'a':         return kids();
        case 'li':        return `\n- ${kids().trim()}`;
        case 'ul': case 'ol': return `\n${kids()}\n`;
        case 'blockquote':    return `\n\n> ${kids().trim()}\n\n`;
        case 'pre': {
          const codeEl = node.querySelector('code');
          const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] ?? '';
          return `\n\n\`\`\`${lang}\n${(codeEl ?? node).textContent.trim()}\n\`\`\`\n\n`;
        }
        case 'code':
          return node.closest('pre') ? node.textContent : `\`${node.textContent}\``;
        default:
          return kids();
      }
    }

    const candidates = ['main','article','[role="main"]','.markdown-body','.rst-content',
                        '.documentation','.doc-content','#main-content','#content','.content'];
    let root = null;
    for (const sel of candidates) {
      root = document.querySelector(sel);
      if (root) break;
    }
    root = root ?? document.body;

    const clone = root.cloneNode(true);
    ['nav','header','footer','aside','.sidebar','.toc','[role="navigation"]',
     '.breadcrumb','.cookie-banner'].forEach((sel) => {
      try { clone.querySelectorAll(sel).forEach((el) => el.remove()); } catch (_) {}
    });

    return toMd(clone).trim().replace(/\n{3,}/g, '\n\n');
  }

  // ── Markdown → HTML renderer ────────────────────────────────────────────────

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderInline(text) {
    // Handle backtick spans first (preserve inner content verbatim)
    let out = '';
    let i = 0;
    while (i < text.length) {
      if (text[i] === '`') {
        const close = text.indexOf('`', i + 1);
        if (close !== -1) {
          out += `<code>${escHtml(text.slice(i + 1, close))}</code>`;
          i = close + 1;
          continue;
        }
      }
      out += escHtml(text[i]);
      i++;
    }
    out = out.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');
    out = out.replace(/\*(.+?)\*/gs, '<em>$1</em>');
    return out;
  }

  function renderMarkdown(text) {
    const lines  = text.split('\n');
    const parts  = [];
    let inCode   = false;
    let codeLang = '';
    let codeLines = [];
    let listItems = [];

    function flushList() {
      if (!listItems.length) return;
      parts.push('<ul>' + listItems.join('') + '</ul>');
      listItems = [];
    }

    for (const line of lines) {
      if (line.startsWith('```')) {
        if (!inCode) {
          flushList();
          inCode = true;
          codeLang = line.slice(3).trim();
          codeLines = [];
        } else {
          inCode = false;
          const langAttr = codeLang ? ` class="language-${escHtml(codeLang)}"` : '';
          parts.push(`<pre><code${langAttr}>${escHtml(codeLines.join('\n'))}</code></pre>`);
          codeLines = []; codeLang = '';
        }
        continue;
      }

      if (inCode) { codeLines.push(line); continue; }

      const hm = line.match(/^(#{1,6})\s+(.+)$/);
      if (hm) {
        flushList();
        parts.push(`<h${hm[1].length}>${renderInline(hm[2])}</h${hm[1].length}>`);
        continue;
      }

      if (/^---+\s*$/.test(line)) { flushList(); parts.push('<hr>'); continue; }

      const bq = line.match(/^>\s*(.*)$/);
      if (bq) { flushList(); parts.push(`<blockquote>${renderInline(bq[1])}</blockquote>`); continue; }

      const li = line.match(/^[-*]\s+(.+)$/);
      if (li) { listItems.push(`<li>${renderInline(li[1])}</li>`); continue; }

      if (!line.trim()) { flushList(); continue; }

      flushList();
      parts.push(`<p>${renderInline(line)}</p>`);
    }

    flushList();
    // Unclosed code block mid-stream
    if (inCode && codeLines.length) {
      parts.push(`<pre><code>${escHtml(codeLines.join('\n'))}</code></pre>`);
    }

    return parts.join('\n');
  }
})();
