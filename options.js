'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const keyInput = document.getElementById('api-key');
  const saveBtn  = document.getElementById('save-btn');
  const status   = document.getElementById('status');

  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (apiKey) keyInput.placeholder = '••••••••  (key already set — paste to replace)';

  saveBtn.addEventListener('click', save);
  keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });

  async function save() {
    const key = keyInput.value.trim();
    if (!key) { showStatus('error', 'Prithee, enter a key before sealing.'); return; }
    if (!key.startsWith('sk-ant-')) {
      showStatus('error', 'A valid Anthropic key begins with sk-ant-');
      return;
    }
    await chrome.storage.local.set({ apiKey: key });
    keyInput.value = '';
    keyInput.placeholder = '••••••••  (key already set — paste to replace)';
    showStatus('success', 'The key hath been sealed and stored.');
  }

  function showStatus(type, msg) {
    status.textContent = msg;
    status.className = type;
    status.classList.remove('hidden');
    if (type === 'success') setTimeout(() => status.classList.add('hidden'), 3000);
  }
});
