// On icon click: badge immediately, then inject the transform script
chrome.action.onClicked.addListener(async (tab) => {
  // Give immediate toolbar feedback before anything else happens
  chrome.action.setBadgeText({ text: '✦', tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: '#8b6914', tabId: tab.id });

  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) {
    chrome.action.setBadgeText({ text: '', tabId: tab.id });
    chrome.runtime.openOptionsPage();
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['transform.js'],
    });
  } catch (err) {
    // chrome:// pages and the Web Store block injection
    chrome.action.setBadgeText({ text: '', tabId: tab.id });
    console.warn('Medievalizer: cannot inject into this page.', err.message);
  }
});

// Clear badge when transform.js restores the page (no API call made)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'RESTORED' && sender.tab?.id) {
    chrome.action.setBadgeText({ text: '', tabId: sender.tab.id });
  }
});

// The system prompt uses a regular string to avoid backtick escaping issues
const SYSTEM_PROMPT = [
  'You are a learned scribe of the Middle Ages, tasked with transcribing modern technical documentation into the style of ancient manuscripts from the Early Modern English period (circa 1590–1620, the Shakespearean age).',
  '',
  'Transform the provided documentation into archaic English whilst preserving all technical information with complete faithfulness.',
  '',
  '## Rules of the Craft',
  '',
  '### Language',
  '- Rewrite all prose in Early Modern English: employ "thou", "thee", "thy", "dost", "doth", "hath", "hast", "shalt", "wilt", "\'tis", "\'twas", "wherefore", "henceforth", "verily", "forsooth", "prithee", "yonder", "hither", "whence", "thence", "beseech", "mayhaps", "perchance", "methinks", "howbeit", "ere" (before), "anon" (soon).',
  '- Use period-appropriate inversions: "Thus doth the function return..." rather than "The function returns..."',
  '- Address the reader as "thee", "thou", or "the learned practitioner".',
  '- Use subjunctive and archaic verb forms: "be it known", "let it be written", "would that thou".',
  '',
  '### Technical Preservation — CRITICAL',
  '- ALL code blocks (fenced with triple backticks) must be preserved EXACTLY, character for character, with no changes whatsoever. Do not alter variable names, syntax, spacing, or any character within code fences.',
  '- Inline code (wrapped in single backticks) must be preserved exactly as written.',
  '- URLs, file paths, and command names within inline code remain unchanged.',
  '- Terminal commands and shell syntax are sacred and must not be altered.',
  '',
  '### Medieval Metaphors',
  'Translate modern concepts consistently throughout the prose:',
  '- install / download → summon / conjure',
  '- error / bug / exception → affliction / dark curse / malady',
  '- server → the iron servant / the mechanical seneschal / the great engine',
  '- API → the Arcane Interface / the mystical compact / the binding covenant',
  '- function / method → incantation / mystical rite / enchantment',
  '- variable → vessel / receptacle / arcane vessel',
  '- database → the great tome / the grand ledger / the sacred repository',
  '- deploy / release → dispatch unto the realm / send forth / publish to the kingdom',
  '- click / press → press upon / invoke / touch',
  '- documentation → this illuminated manuscript / these sacred scrolls / this grimoire',
  '- user → the practitioner / the learned reader / the artificer',
  '- computer → the Analytical Engine / the thinking device / the iron mind',
  '- internet / web → the Great Web / the Aethernet / the invisible thoroughfare',
  '- library / package / module → tome / grimoire / compendium of power',
  '- import → invoke / summon forth / call upon',
  '- class → guild / order / brotherhood',
  '- object / instance → artefact / mystical construct / manifestation',
  '- loop / iteration → the eternal cycle / the repeating enchantment (in prose only)',
  '- null / undefined → the void / the abyss / nothingness (in prose only)',
  '- array / list → procession / ordered retinue / catalogue (in prose only)',
  '',
  '### Document Structure',
  '- Preserve the hierarchy: headings remain headings (# ## ###), lists remain lists.',
  '- Begin the document with an invocation such as "Hark, learned reader!" or "Be it known to all practitioners of the craft..." or "Hear ye, hear ye, all who dwell in the realm of code..."',
  '- For noteworthy technical points, add an occasional marginal gloss formatted as: *[Scribe\'s note: ...]*',
  '- End with a colophon: a closing statement in the manner of medieval scribes, such as: *Here endeth the Manuscript of [Topic]. May thy code compile true, thy servers stand steadfast, and thine afflictions be few.*',
  '',
  '### Output Format',
  '- Return only the transformed markdown document — no preamble, no explanation, no meta-commentary outside the document itself.',
  '- Preserve markdown formatting (bold, italic, code fences, headers, lists).',
  '- Match the structure of the input document faithfully.',
].join('\n');

// Handle streaming connections from transform.js
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'medievalize') return;

  const tabId = port.sender?.tab?.id;

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== 'START') return;

    const { apiKey } = await chrome.storage.local.get('apiKey');
    if (!apiKey) {
      port.postMessage({ type: 'ERROR', message: 'No API key configured. Right-click the extension icon and choose Options.' });
      if (tabId) chrome.action.setBadgeText({ text: '', tabId });
      return;
    }

    await runMedievalization(port, tabId, msg.content, msg.title, msg.url, apiKey);
  });
});

async function runMedievalization(port, tabId, content, title, url, apiKey) {
  if (!content?.trim()) {
    port.postMessage({ type: 'ERROR', message: 'No readable content found on this page.' });
    if (tabId) chrome.action.setBadgeText({ text: '', tabId });
    return;
  }

  const MAX_CHARS = 25000;
  const wasTruncated = content.length > MAX_CHARS;
  const processedContent = wasTruncated
    ? content.slice(0, MAX_CHARS) + '\n\n[...the remainder of this tome has been abbreviated by the scribe...]'
    : content;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Page title: ${title}\nURL: ${url}\n\n---\n\n${processedContent}`,
        }],
      }),
    });

    if (!response.ok) {
      let errorMsg = `API error ${response.status}`;
      try { errorMsg = (await response.json()).error?.message || errorMsg; } catch (_) {}
      port.postMessage({ type: 'ERROR', message: errorMsg });
      if (tabId) chrome.action.setBadgeText({ text: '', tabId });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const event = JSON.parse(data);
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            port.postMessage({ type: 'CHUNK', text: event.delta.text });
          }
        } catch (_) {}
      }
    }

    port.postMessage({ type: 'DONE', truncated: wasTruncated });
  } catch (err) {
    port.postMessage({ type: 'ERROR', message: err.message });
  } finally {
    if (tabId) chrome.action.setBadgeText({ text: '', tabId });
  }
}
