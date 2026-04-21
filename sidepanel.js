'use strict';

// ── State ──────────────────────────────────────────────────────
let apiKey = '';
let isLoading = false;

// ── DOM refs (populated after DOMContentLoaded) ────────────────
const el = {};

document.addEventListener('DOMContentLoaded', async () => {
  el.setupScreen   = document.getElementById('setup-screen');
  el.mainScreen    = document.getElementById('main-screen');
  el.outputCont    = document.getElementById('output-container');
  el.output        = document.getElementById('output');
  el.loading       = document.getElementById('loading');
  el.errorBox      = document.getElementById('error-box');
  el.setupError    = document.getElementById('setup-error');
  el.apiKeyInput   = document.getElementById('api-key-input');
  el.saveKeyBtn    = document.getElementById('save-key-btn');
  el.medievalizeBtn = document.getElementById('medievalize-btn');
  el.changeKeyBtn  = document.getElementById('change-key-btn');
  el.copyBtn       = document.getElementById('copy-btn');
  el.newBtn        = document.getElementById('new-btn');
  el.truncNote     = document.getElementById('truncation-notice');

  const stored = await chrome.storage.local.get('apiKey');
  if (stored.apiKey) {
    apiKey = stored.apiKey;
    showMain();
  } else {
    showSetup();
  }

  el.saveKeyBtn.addEventListener('click', saveKey);
  el.apiKeyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKey(); });
  el.medievalizeBtn.addEventListener('click', startMedievalization);
  el.changeKeyBtn.addEventListener('click', showSetup);
  el.copyBtn.addEventListener('click', copyOutput);
  el.newBtn.addEventListener('click', resetToMain);
});

// ── Screen helpers ─────────────────────────────────────────────
function showSetup() {
  el.setupScreen.classList.remove('hidden');
  el.mainScreen.classList.add('hidden');
  el.outputCont.classList.add('hidden');
  el.loading.classList.add('hidden');
  hideError();
  el.apiKeyInput.focus();
}

function showMain() {
  el.setupScreen.classList.add('hidden');
  el.mainScreen.classList.remove('hidden');
}

function resetToMain() {
  el.outputCont.classList.add('hidden');
  el.output.innerHTML = '';
  hideError();
  showMain();
}

async function saveKey() {
  const key = el.apiKeyInput.value.trim();
  if (!key.startsWith('sk-ant-')) {
    showSetupError('Prithee, a valid Anthropic key begins with sk-ant-');
    return;
  }
  apiKey = key;
  await chrome.storage.local.set({ apiKey: key });
  el.apiKeyInput.value = '';
  hideSetupError();
  showMain();
}

// ── Medievalization flow ───────────────────────────────────────
async function startMedievalization() {
  if (isLoading) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showError('No active page found. Navigate to a documentation page first.');
    return;
  }

  setLoading(true);
  hideError();
  el.outputCont.classList.add('hidden');
  el.output.innerHTML = '';

  const port = chrome.runtime.connect({ name: 'medievalize' });

  let accumulated = '';
  let renderPending = false;

  port.onMessage.addListener((msg) => {
    switch (msg.type) {
      case 'CHUNK':
        accumulated += msg.text;
        if (!renderPending) {
          renderPending = true;
          requestAnimationFrame(() => {
            renderPending = false;
            renderOutput(accumulated, true);
          });
        }
        break;

      case 'DONE':
        renderOutput(accumulated, false);
        if (msg.truncated) el.truncNote.classList.remove('hidden');
        setLoading(false);
        break;

      case 'ERROR':
        showError(`The mystical arts have failed: ${msg.message}`);
        setLoading(false);
        break;
    }
  });

  port.onDisconnect.addListener(() => {
    if (isLoading) {
      setLoading(false);
      if (accumulated) {
        renderOutput(accumulated, false);
      } else {
        showError('The connection was severed unexpectedly.');
      }
    }
  });

  port.postMessage({ type: 'START', tabId: tab.id, apiKey });
}

function renderOutput(text, streaming) {
  el.outputCont.classList.remove('hidden');
  el.mainScreen.classList.add('hidden');
  el.truncNote.classList.add('hidden');

  const html = renderMarkdown(text);
  el.output.innerHTML = html + (streaming ? '<span class="cursor">|</span>' : '');

  if (!streaming) {
    // Apply drop cap to the first real paragraph
    const firstP = el.output.querySelector('p');
    if (firstP) firstP.classList.add('drop-cap');
  }
}

async function copyOutput() {
  const text = el.output.innerText;
  try {
    await navigator.clipboard.writeText(text);
    const orig = el.copyBtn.textContent;
    el.copyBtn.textContent = '✓ Copied!';
    setTimeout(() => { el.copyBtn.textContent = orig; }, 2000);
  } catch (_) {
    showError('Could not access clipboard.');
  }
}

function setLoading(on) {
  isLoading = on;
  el.loading.classList.toggle('hidden', !on);
  el.medievalizeBtn.disabled = on;
}

function showError(msg) {
  el.errorBox.textContent = msg;
  el.errorBox.classList.remove('hidden');
}

function hideError() {
  el.errorBox.classList.add('hidden');
}

function showSetupError(msg) {
  el.setupError.textContent = msg;
  el.setupError.classList.remove('hidden');
}

function hideSetupError() {
  el.setupError.classList.add('hidden');
}

// ── Markdown renderer ──────────────────────────────────────────
function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text) {
  // Escape HTML first, then apply inline markdown on the safe string.
  // Backtick spans are identified before escaping to preserve inner content.
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '`') {
      const close = text.indexOf('`', i + 1);
      if (close !== -1) {
        out += `<code>${esc(text.slice(i + 1, close))}</code>`;
        i = close + 1;
        continue;
      }
    }
    out += esc(text[i]);
    i++;
  }
  // Bold before italic to avoid greedy * conflicts
  out = out.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');
  out = out.replace(/\*(.+?)\*/gs, '<em>$1</em>');
  return out;
}

function renderMarkdown(text) {
  const lines = text.split('\n');
  const parts = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let listItems = [];

  function flushList() {
    if (listItems.length === 0) return;
    parts.push('<ul>' + listItems.join('') + '</ul>');
    listItems = [];
  }

  for (const line of lines) {
    // Code fence
    if (line.startsWith('```')) {
      if (!inCode) {
        flushList();
        inCode = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        inCode = false;
        const langAttr = codeLang ? ` class="language-${esc(codeLang)}"` : '';
        parts.push(`<pre><code${langAttr}>${esc(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        codeLang = '';
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // Heading
    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      flushList();
      const lvl = hm[1].length;
      parts.push(`<h${lvl}>${renderInline(hm[2])}</h${lvl}>`);
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      flushList();
      parts.push('<hr>');
      continue;
    }

    // Blockquote
    const bqm = line.match(/^>\s*(.*)$/);
    if (bqm) {
      flushList();
      parts.push(`<blockquote>${renderInline(bqm[1])}</blockquote>`);
      continue;
    }

    // List item
    const lim = line.match(/^[-*]\s+(.+)$/);
    if (lim) {
      listItems.push(`<li>${renderInline(lim[1])}</li>`);
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Default: paragraph
    flushList();
    parts.push(`<p>${renderInline(line)}</p>`);
  }

  flushList();

  // Handle an unclosed code block (can happen mid-stream)
  if (inCode && codeLines.length > 0) {
    parts.push(`<pre><code>${esc(codeLines.join('\n'))}</code></pre>`);
  }

  return parts.join('\n');
}
