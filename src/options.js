// options.js

// --- State ---
let editingIdx = null;

// --- DOM Elements ---
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');

const modesList = document.getElementById('modesList');
const addModeBtn = document.getElementById('addModeBtn');
const editModeDiv = document.getElementById('editMode');
const modeNameInput = document.getElementById('modeName');
const modePromptInput = document.getElementById('modePrompt');
const saveModeBtn = document.getElementById('saveModeBtn');
const cancelModeBtn = document.getElementById('cancelModeBtn');
const modesStatus = document.getElementById('modesStatus');

// --- API Key Management ---
let apiKeyVisible = false;

function showApiKeyStatus(msg, color) {
  apiKeyStatus.textContent = msg;
  apiKeyStatus.style.color = color || '#3bb143';
  setTimeout(() => { apiKeyStatus.textContent = ''; }, 1800);
}

toggleApiKeyBtn.onclick = () => {
  apiKeyVisible = !apiKeyVisible;
  apiKeyInput.type = apiKeyVisible ? 'text' : 'password';
  toggleApiKeyBtn.textContent = apiKeyVisible ? 'Hide' : 'Show';
  apiKeyInput.focus();
};

saveApiKeyBtn.onclick = () => {
  if (!apiKeyInput.value.trim()) {
    showApiKeyStatus('API key cannot be empty.', '#c00');
    return;
  }
  chrome.storage.local.set({ apiKey: apiKeyInput.value }, () => {
    showApiKeyStatus('API key saved!', '#3bb143');
  });
};

chrome.storage.local.get(['apiKey'], (data) => {
  if (data.apiKey) apiKeyInput.value = data.apiKey;
});

// --- Modes Management ---
function showModesStatus(msg, color) {
  modesStatus.textContent = msg;
  modesStatus.style.color = color || '#3bb143';
  setTimeout(() => { modesStatus.textContent = ''; }, 1800);
}

function renderModes(modes) {
  modesList.innerHTML = '';
  modes.forEach((mode, idx) => {
    const row = document.createElement('div');
    row.className = 'modes-row';

    const nameCol = document.createElement('span');
    nameCol.className = 'modes-col modes-col-name';
    nameCol.textContent = mode.name;
    row.appendChild(nameCol);

    const promptCol = document.createElement('span');
    promptCol.className = 'modes-col modes-col-prompt';
    promptCol.textContent = mode.prompt;
    row.appendChild(promptCol);

    const shortcutCol = document.createElement('span');
    shortcutCol.className = 'modes-col modes-col-shortcut';
    shortcutCol.textContent = mode.shortcut || '—';
    row.appendChild(shortcutCol);

    const actionsCol = document.createElement('span');
    actionsCol.className = 'modes-col modes-col-actions';

    const editBtn = document.createElement('button');
    editBtn.textContent = '✎';
    editBtn.title = 'Edit mode';
    editBtn.onclick = () => openEditMode(idx);
    actionsCol.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑';
    delBtn.title = 'Delete mode';
    delBtn.onclick = () => deleteMode(idx);
    actionsCol.appendChild(delBtn);

    // Placeholder shortcut button
    const shortcutBtn = document.createElement('button');
    shortcutBtn.textContent = '⌨';
    shortcutBtn.title = 'Assign shortcut (coming soon)';
    shortcutBtn.disabled = true;
    actionsCol.appendChild(shortcutBtn);

    row.appendChild(actionsCol);
    modesList.appendChild(row);
  });
}

function loadModes() {
  chrome.storage.local.get(['modes'], (data) => {
    renderModes(data.modes || []);
  });
}

function saveModes(modes) {
  chrome.storage.local.set({ modes }, () => {
    if (chrome.runtime.lastError) {
      showModesStatus('Failed to save modes: ' + chrome.runtime.lastError.message, '#c00');
      return;
    }
    loadModes();
    showModesStatus('Modes updated!', '#3bb143');
  });
}

function openEditMode(idx) {
  chrome.storage.local.get(['modes'], (data) => {
    const mode = (data.modes || [])[idx];
    modeNameInput.value = mode.name;
    modePromptInput.value = mode.prompt;
    editModeDiv.style.display = 'block';
    editingIdx = idx;
  });
}

function deleteMode(idx) {
  chrome.storage.local.get(['modes'], (data) => {
    const modes = data.modes || [];
    if (confirm('Delete mode "' + modes[idx].name + '"?')) {
      modes.splice(idx, 1);
      saveModes(modes);
    }
  });
}

addModeBtn.onclick = () => {
  modeNameInput.value = '';
  modePromptInput.value = '';
  editModeDiv.style.display = 'block';
  editingIdx = null;
};

saveModeBtn.onclick = () => {
  const name = modeNameInput.value.trim();
  const prompt = modePromptInput.value.trim();
  if (!name || !prompt) {
    showModesStatus('Name and prompt are required.', '#c00');
    return;
  }
  chrome.storage.local.get(['modes'], (data) => {
    const modes = data.modes || [];
    if (editingIdx !== null) {
      modes[editingIdx] = { ...modes[editingIdx], name, prompt };
    } else {
      modes.push({ id: name.toLowerCase().replace(/\s+/g, '-'), name, prompt });
    }
    saveModes(modes);
    editModeDiv.style.display = 'none';
  });
};

cancelModeBtn.onclick = () => {
  editModeDiv.style.display = 'none';
};

// Close modal on Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editModeDiv.style.display === 'block') {
    editModeDiv.style.display = 'none';
  }
});

// Initial load
loadModes();