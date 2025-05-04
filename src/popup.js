// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const toggleApiKeyBtn = document.getElementById('toggleApiKey');
  const modeSelect = document.getElementById('modeSelect');
  const enhanceBtn = document.getElementById('enhanceBtn');
  const modeInfo = document.getElementById('modeInfo');
  const shortcutInfo = document.getElementById('shortcutInfo');
  const spinner = document.getElementById('spinner');
  const checkmark = document.getElementById('checkmark');
  const errorMsg = document.getElementById('errorMsg');

  let modes = [];

  // Feedback helpers
  function showSpinner() {
    spinner.classList.remove('hidden');
    spinner.innerHTML = '<span class="dot-spinner"></span> Enhancing...';
    checkmark.classList.add('hidden');
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';
  }
  function showCheckmark() {
    spinner.classList.add('hidden');
    checkmark.classList.remove('hidden');
    setTimeout(() => checkmark.classList.add('hidden'), 1200);
  }
  function showError(msg) {
    spinner.classList.add('hidden');
    checkmark.classList.add('hidden');
    errorMsg.classList.remove('hidden');
    errorMsg.textContent = msg;
    setTimeout(() => errorMsg.classList.add('hidden'), 2500);
  }
  function clearFeedback() {
    spinner.classList.add('hidden');
    checkmark.classList.add('hidden');
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';
  }

  // API key show/hide
  let apiKeyVisible = false;
  toggleApiKeyBtn.onclick = () => {
    apiKeyVisible = !apiKeyVisible;
    apiKeyInput.type = apiKeyVisible ? 'text' : 'password';
    toggleApiKeyBtn.textContent = apiKeyVisible ? 'Hide' : 'Show';
    apiKeyInput.focus();
  };

  // Load API key and modes
  chrome.storage.local.get(['apiKey', 'modes'], (data) => {
    if (data.apiKey) apiKeyInput.value = data.apiKey;
    modes = data.modes || [];
    modeSelect.innerHTML = '';
    modes.forEach((mode, idx) => {
      const opt = document.createElement('option');
      opt.value = mode.id;
      opt.textContent = mode.name;
      opt.setAttribute('data-desc', mode.prompt || '');
      modeSelect.appendChild(opt);
    });
    updateModeInfo();
  });

  // Save API key
  saveApiKeyBtn.onclick = () => {
    chrome.storage.local.set({ apiKey: apiKeyInput.value }, () => {
      showCheckmark();
    });
  };

  // Mode info tooltip/description
  function updateModeInfo() {
    const selected = modeSelect.options[modeSelect.selectedIndex];
    modeInfo.textContent = selected ? 'ⓘ' : '';
    if (selected) {
      modeInfo.title = selected.getAttribute('data-desc') || '';
    } else {
      modeInfo.title = '';
    }
  }
  modeSelect.onchange = updateModeInfo;
  modeInfo.onfocus = modeInfo.onmouseover = updateModeInfo;

  // Show shortcut
  chrome.commands.getAll((cmds) => {
    const enhanceCmd = cmds.find(cmd => cmd.name === 'enhance-selection');
    shortcutInfo.textContent = enhanceCmd && enhanceCmd.shortcut ? `Shortcut: ${enhanceCmd.shortcut}` : '';
  });

  // Enhance button
  enhanceBtn.onclick = () => {
    clearFeedback();
    showSpinner();
    chrome.storage.local.get(['modes', 'apiKey'], (data) => {
      const modeId = modeSelect.value;
      const mode = (data.modes || []).find(m => m.id === modeId);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'enhanceSelectionWithMode',
          mode,
          apiKey: data.apiKey
        }, (resp) => {
          clearFeedback();
          if (resp && resp.success) {
            showCheckmark();
          } else if (resp && resp.error) {
            showError(resp.error);
          }
        });
      });
    });
  };

  // Keyboard accessibility
  document.getElementById('enhancerForm').onkeydown = (e) => {
    if (e.key === 'Enter' && document.activeElement === enhanceBtn) {
      enhanceBtn.click();
      e.preventDefault();
    }
  };
});
