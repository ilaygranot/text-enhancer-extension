// content.js

function getSelectedTextAndRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const text = selection.toString();
  return { text, range };
}

function replaceSelectedText(newText) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  // Try to preserve style by wrapping in a span with computed style
  const span = document.createElement('span');
  const parent = range.startContainer.parentElement;
  if (parent) {
    const style = window.getComputedStyle(parent);
    span.style.cssText = style.cssText;
  }
  span.textContent = newText;
  range.deleteContents();
  range.insertNode(span);
  selection.removeAllRanges();
}

function showEnhancerSpinner(range) {
  removeEnhancerSpinner();
  const rect = range.getBoundingClientRect();
  const spinner = document.createElement('div');
  spinner.id = 'text-enhancer-spinner';
  spinner.innerHTML = '<span class="dot-spinner"></span>';
  spinner.style.position = 'fixed';
  spinner.style.left = `${rect.right + 6}px`;
  spinner.style.top = `${rect.top - 2}px`;
  spinner.style.zIndex = 2147483646;
  spinner.style.pointerEvents = 'none';
  spinner.style.background = 'rgba(255,255,255,0.9)';
  spinner.style.borderRadius = '50%';
  spinner.style.padding = '2px 7px 2px 7px';
  spinner.style.boxShadow = '0 1px 4px rgba(0,0,0,0.11)';
  spinner.style.transition = 'opacity 0.2s';
  spinner.style.opacity = '1';
  spinner.style.fontSize = '17px';
  spinner.style.lineHeight = '1';
  spinner.style.color = '#5b9aff';
  spinner.style.border = '1px solid #e0e0e0';
  spinner.style.userSelect = 'none';
  spinner.style.maxWidth = '38px';
  spinner.style.minHeight = '22px';
  spinner.style.display = 'flex';
  spinner.style.alignItems = 'center';
  spinner.style.justifyContent = 'center';
  spinner.style.boxSizing = 'border-box';
  spinner.setAttribute('aria-live', 'polite');
  document.body.appendChild(spinner);
  addDotSpinnerStyle();
}

function removeEnhancerSpinner() {
  const old = document.getElementById('text-enhancer-spinner');
  if (old) old.remove();
}

function addDotSpinnerStyle() {
  if (document.getElementById('dot-spinner-style')) return;
  const style = document.createElement('style');
  style.id = 'dot-spinner-style';
  style.textContent = `.dot-spinner { display: inline-block; width: 18px; height: 18px; position: relative; }
    .dot-spinner:after { content: " "; display: block; width: 14px; height: 14px; margin: 2px; border-radius: 50%; border: 2px solid #5b9aff; border-color: #5b9aff transparent #5b9aff transparent; animation: dot-spin 1.1s linear infinite; }
    @keyframes dot-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

function enhanceSelectedTextWithMode(mode, apiKey, sendResponse) {
  const sel = getSelectedTextAndRange();
  if (!sel || !sel.text) {
    sendResponse && sendResponse({ success: false, error: 'No text selected.' });
    return;
  }
  showEnhancerSpinner(sel.range);
  chrome.runtime.sendMessage({
    action: 'callGptApi',
    text: sel.text,
    prompt: (mode && mode.prompt) || 'Correct the grammar and spelling of the following text:',
    apiKey
  }, (response) => {
    removeEnhancerSpinner();
    if (response && response.success) {
      replaceSelectedText(response.result);
      sendResponse && sendResponse({ success: true });
    } else {
      sendResponse && sendResponse({ success: false, error: (response && response.error) || 'Unknown error.' });
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'enhanceSelection') {
    const sel = getSelectedTextAndRange();
    if (!sel || !sel.text) return;
    showEnhancerSpinner(sel.range);
    chrome.storage.local.get(['modes', 'apiKey'], (data) => {
      const modes = data.modes || [];
      const apiKey = data.apiKey || '';
      // Default to first mode
      const mode = modes[0] || { prompt: 'Correct the grammar and spelling of the following text:' };
      chrome.runtime.sendMessage({
        action: 'callGptApi',
        text: sel.text,
        prompt: mode.prompt,
        apiKey
      }, (response) => {
        removeEnhancerSpinner();
        if (response && response.success) {
          replaceSelectedText(response.result);
        } else {
          alert('Enhancement failed: ' + (response && response.error));
        }
      });
    });
  } else if (request.action === 'enhanceSelectionWithMode') {
    enhanceSelectedTextWithMode(request.mode, request.apiKey, sendResponse);
    return true; // async
  }
});
