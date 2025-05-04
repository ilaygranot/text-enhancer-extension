// background.js (service worker)

const DEFAULT_MODES = [
  {
    id: 'grammar',
    name: 'Fix Grammar',
    prompt: 'Correct the grammar and spelling of the following text:'
  },
  {
    id: 'formal',
    name: 'Make Formal',
    prompt: 'Rewrite the following text to be more formal:'
  },
  {
    id: 'translate',
    name: 'Translate to English',
    prompt: 'Translate the following text to English:'
  }
];

chrome.runtime.onInstalled.addListener(() => {
  // Setup context menu
  chrome.contextMenus.create({
    id: 'enhance-text',
    title: 'Enhance Selected Text',
    contexts: ['selection']
  });
  // Initialize modes if not present
  chrome.storage.local.get(['modes'], (data) => {
    if (!data.modes) {
      chrome.storage.local.set({ modes: DEFAULT_MODES });
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'enhance-text') {
    chrome.tabs.sendMessage(tab.id, { action: 'enhanceSelection' });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'enhance-selection') {
    chrome.tabs.sendMessage(tab.id, { action: 'enhanceSelection' });
  }
});

// Listen for enhancement requests from content or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callGptApi') {
    // Call GPT-4 API with user key and prompt
    (async () => {
      const { text, prompt, apiKey } = request;
      try {
        const result = await callGptApi(text, prompt, apiKey);
        sendResponse({ success: true, result });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true; // async response
  }
});

async function callGptApi(text, prompt, apiKey) {
  // Call OpenAI GPT-4 API (user must provide key)
  const fullPrompt = `${prompt}\n\n${text}`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: fullPrompt }
      ],
      max_tokens: 2048,
      temperature: 0.4
    })
  });
  if (!response.ok) throw new Error('API Error: ' + response.status);
  const data = await response.json();
  return data.choices[0].message.content.trim();
}
