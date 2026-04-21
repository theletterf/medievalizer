# ⚜ Medievalizer

A Chrome extension that transforms any documentation page into an illuminated medieval manuscript — blackletter headings, Shakespearean prose, parchment styling — powered by Claude Sonnet.

![Side panel showing medievalized documentation on a parchment background with blackletter headings](docs/screenshot.png)

---

## Features

- **One-click conversion** — open the side panel, press *Medievalize*, done.
- **Streaming output** — text appears word by word as the scribe writes.
- **Faithful technical preservation** — all code blocks, commands, and inline code are reproduced character-for-character; only the prose is rewritten.
- **Rich medieval language** — Shakespearean inversions, archaic vocabulary, consistent metaphor map (`install` → *summon*, `error` → *affliction*, `API` → *the Arcane Interface*, etc.).
- **Document structure preserved** — headings stay headings, lists stay lists, code fences stay code fences.
- **Drop cap + colophon** — every manuscript opens with an illuminated first letter and closes with a scribe's colophon.
- **Parchment UI** — UnifrakturMaguntia blackletter headings, IM Fell English body text, scroll-roll decorations.

---

## Installation

### From a release ZIP (recommended)

1. Download the latest `medievalizer-vX.Y.Z.zip` from the [Releases](../../releases) page.
2. Unzip the archive.
3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode** (toggle in the top-right corner).
5. Click **Load unpacked** and select the unzipped folder.

### From source

```bash
git clone https://github.com/theletterf/medievalizer.git
cd medievalizer
python3 icons/generate_icons.py   # regenerate icons if needed
```

Then follow steps 3–5 above, pointing *Load unpacked* at the cloned directory.

---

## Usage

1. Navigate to any documentation page in Chrome.
2. Click the **Medievalizer** icon in the toolbar — the side panel opens.
3. On first launch, enter your [Anthropic API key](https://console.anthropic.com/) (`sk-ant-...`). It is stored locally in `chrome.storage.local` and never leaves your browser.
4. Click **⚔ Medievalize this Page ⚔**.
5. The scribe begins transcribing. Watch the parchment fill up in real time.
6. Use **Copy Text** to copy the plain-text markdown, or **New** to go back and try another page.

> **Note:** Pages longer than ~25 000 characters are truncated at the input stage; the scribe will note this at the bottom of the manuscript.

---

## Permissions

| Permission | Why |
|---|---|
| `sidePanel` | Renders the output panel alongside the page |
| `activeTab` + `scripting` | Injects the content extractor into the current tab |
| `storage` | Saves your API key locally |
| `<all_urls>` (host permission) | Allows the content script to run on any documentation site, and the background worker to reach `api.anthropic.com` |

---

## Development

### Project layout

```
manifest.json        MV3 extension manifest
background.js        Service worker — Claude API calls, SSE streaming
content.js           Injected into the page — DOM → markdown extraction
sidepanel.html       Side panel markup
sidepanel.js         Side panel logic + markdown renderer
sidepanel.css        Medieval parchment styling
icons/
  generate_icons.py  Pure-Python stdlib icon generator (no dependencies)
  icon{16,32,48,128}.png
```

### Regenerating icons

```bash
python3 icons/generate_icons.py
```

No third-party libraries required.

### Releasing

Releases are produced by the `Release` GitHub Actions workflow (`workflow_dispatch`):

1. Go to **Actions → Release → Run workflow**.
2. Enter a SemVer version (e.g. `1.2.0`).
3. The workflow stamps the version into `manifest.json`, zips the extension files, and publishes a GitHub release with the ZIP attached.

---

## License

MIT — see [LICENSE](LICENSE).
