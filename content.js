// Injected into the active tab to extract readable page content as markdown.
// The last expression is returned to the caller via chrome.scripting.executeScript.
(() => {
  const SKIP_TAGS = new Set([
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    'noscript', 'svg', 'img', 'figure', 'figcaption', 'iframe',
  ]);

  const HEADING_PREFIX = { h1: '#', h2: '##', h3: '###', h4: '####', h5: '#####', h6: '######' };

  function domToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.replace(/\s+/g, ' ');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();

    if (SKIP_TAGS.has(tag)) return '';
    if (node.getAttribute('role') === 'navigation') return '';
    if (node.getAttribute('aria-hidden') === 'true') return '';
    if (node.getAttribute('hidden') !== null) return '';

    const children = () => Array.from(node.childNodes).map(domToMarkdown).join('');

    if (HEADING_PREFIX[tag]) {
      return `\n\n${HEADING_PREFIX[tag]} ${node.textContent.trim()}\n\n`;
    }

    switch (tag) {
      case 'p':
        return `\n\n${children().trim()}\n\n`;
      case 'br':
        return '\n';
      case 'hr':
        return '\n\n---\n\n';
      case 'strong':
      case 'b':
        return `**${node.textContent.trim()}**`;
      case 'em':
      case 'i':
        return `*${node.textContent.trim()}*`;
      case 'a':
        return children();
      case 'li':
        return `\n- ${children().trim()}`;
      case 'ul':
      case 'ol':
        return `\n${children()}\n`;
      case 'pre': {
        const codeEl = node.querySelector('code');
        const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] ?? '';
        const text = (codeEl ?? node).textContent.trim();
        return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
      }
      case 'code':
        // Inline code — skip if already inside a <pre>
        if (node.closest('pre')) return node.textContent;
        return `\`${node.textContent}\``;
      case 'blockquote':
        return `\n\n> ${children().trim().replace(/\n/g, '\n> ')}\n\n`;
      case 'table':
        // Tables are complex; emit a plain-text summary to keep context manageable
        return `\n\n${node.innerText?.trim().replace(/\s*\n\s*/g, ' | ') ?? ''}\n\n`;
      default:
        return children();
    }
  }

  function findMainContent() {
    const candidates = [
      'main',
      'article',
      '[role="main"]',
      '.markdown-body',
      '.rst-content',
      '.documentation',
      '.doc-content',
      '.devsite-article-body',
      '#main-content',
      '#content',
      '.content',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return document.body;
  }

  function extractPageContent() {
    const root = findMainContent();
    const clone = root.cloneNode(true);

    // Strip navigation-like subtrees from the clone
    const noiseSelectors = [
      'nav', 'header', 'footer', 'aside',
      '.sidebar', '.toc', '.navigation', '.breadcrumb',
      '[role="navigation"]', '[role="complementary"]',
      '.cookie-banner', '.announcement-banner',
    ];
    for (const sel of noiseSelectors) {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    }

    const raw = domToMarkdown(clone);
    // Collapse runs of blank lines to a single blank line
    return raw.trim().replace(/\n{3,}/g, '\n\n');
  }

  return {
    title: document.title,
    url: window.location.href,
    content: extractPageContent(),
  };
})();
