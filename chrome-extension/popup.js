document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const wsStatusElement = document.getElementById('wsStatus');
  const serverUrlInput = document.getElementById('serverUrl');
  const modelSelect = document.getElementById('modelSelect');
  const saveButton = document.getElementById('saveSettings');
  const testButton = document.getElementById('testConnection');
  const clipboardContentDiv = document.getElementById('clipboardContent');
  const forceSyncButton = document.getElementById('forceSync');

  // Load saved settings
  const settings = await chrome.storage.sync.get(['serverUrl', 'selectedModel']);
  if (settings.serverUrl) {
    serverUrlInput.value = settings.serverUrl;
  }
  if (settings.selectedModel) {
    modelSelect.value = settings.selectedModel;
  }

  // Load latest clipboard content
  const clipboardData = await chrome.storage.local.get(['latestClipboard']);
  if (clipboardData.latestClipboard) {
    clipboardContentDiv.textContent = clipboardData.latestClipboard.substring(0, 200) + '...';
  }

  // Check connection status
  updateConnectionStatus();
  updateWebSocketStatus();

  saveButton.addEventListener('click', async () => {
    await chrome.storage.sync.set({
      serverUrl: serverUrlInput.value,
      selectedModel: modelSelect.value
    });
    
    // Send settings to background script
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      serverUrl: serverUrlInput.value,
      selectedModel: modelSelect.value
    });
    
    alert('Settings saved!');
  });

  testButton.addEventListener('click', async () => {
    testButton.textContent = 'Testing...';
    testButton.disabled = true;
    
    try {
      const response = await fetch(`${serverUrlInput.value}/health`);
      if (response.ok) {
        statusElement.textContent = 'Connected';
        statusElement.className = 'status connected';
      } else {
        throw new Error('Server responded with error');
      }
    } catch (error) {
      statusElement.textContent = 'Connection Failed';
      statusElement.className = 'status disconnected';
    }
    
    testButton.textContent = 'Test Connection';
    testButton.disabled = false;
  });

  forceSyncButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'forceSyncClipboard' });
  });

  async function updateConnectionStatus() {
    const settings = await chrome.storage.sync.get(['serverUrl']);
    if (!settings.serverUrl) {
      statusElement.textContent = 'Server URL not set';
      return;
    }

    try {
      const response = await fetch(`${settings.serverUrl}/health`);
      if (response.ok) {
        statusElement.textContent = 'Connected';
        statusElement.className = 'status connected';
      } else {
        statusElement.textContent = 'Server Error';
        statusElement.className = 'status disconnected';
      }
    } catch (error) {
      statusElement.textContent = 'Connection Failed';
      statusElement.className = 'status disconnected';
    }
  }

  async function updateWebSocketStatus() {
    // Query background script for WebSocket status
    chrome.runtime.sendMessage({ action: 'getWebSocketStatus' }, (response) => {
      if (response && response.connected) {
        wsStatusElement.textContent = 'WebSocket: Connected';
        wsStatusElement.className = 'status connected';
      } else {
        wsStatusElement.textContent = 'WebSocket: Disconnected';
        wsStatusElement.className = 'status disconnected';
      }
    });
  }

  // Listen for clipboard updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'clipboardUpdated') {
      clipboardContentDiv.textContent = message.content.substring(0, 200) + '...';
    }
  });
});
