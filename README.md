# ⚜ Medievalizer

A Chrome extension that transforms any documentation page into an illuminated medieval manuscript — blackletter headings, Shakespearean prose, parchment styling — powered by Claude Sonnet. The page transforms in-place; click again to restore the original.

<img width="1280" height="701" alt="medievalizer" src="https://github.com/user-attachments/assets/b253e08c-70e3-4827-9e1d-a33de3e72f35" />

---

## Features

- **One-click conversion** — click the icon, the page transforms before your eyes.
- **Click again to restore** — a second click (or the *Restore Page* button) brings the original back instantly.
- **Streaming output** — text appears word by word as the scribe writes, with a blinking quill cursor.
- **Full-page takeover** — Shadow DOM overlay covers the viewport with a parchment manuscript; the original DOM is untouched underneath.
- **Faithful technical preservation** — all code blocks, commands, and inline code are reproduced character-for-character; only the prose is rewritten.
- **Rich medieval language** — Shakespearean inversions, archaic vocabulary, consistent metaphor map (`install` → *summon*, `error` → *affliction*, `API` → *the Arcane Interface*, etc.).
- **Document structure preserved** — headings stay headings, lists stay lists, code fences stay code fences.
- **Drop cap + colophon** — every manuscript opens with an illuminated first letter and closes with a scribe's colophon.

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
2. Click the **Medievalizer** icon in the toolbar.
   - First launch: the settings page opens automatically — enter your API key, then return to the page and click the icon again.
3. The page fades into a parchment scroll and the scribe begins writing.
4. Use **⎘ Copy** to copy the plain-text markdown output.
5. Click **↶ Restore Page** (or the icon again) to return to the original.

> **Note:** Pages longer than ~25 000 characters are truncated at the input stage; the scribe notes this at the bottom of the manuscript.

---

## Configuration

Right-click the extension icon and choose **Options** to manage your API key at any time.

Your key is stored in `chrome.storage.local` — it never leaves your browser.

---

## Permissions

| Permission | Why |
|---|---|
| `activeTab` + `scripting` | Injects the transform script into the current tab |
| `storage` | Saves your API key locally |
| `<all_urls>` (host permission) | Allows the transform script to run on any documentation site, and the background worker to reach `api.anthropic.com` |

---

## Development

### Project layout

```
manifest.json        MV3 extension manifest
background.js        Service worker — action click handler, Claude API streaming
transform.js         Injected into the page — DOM extraction, Shadow DOM overlay, rendering
options.html/js/css  API key settings page
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
