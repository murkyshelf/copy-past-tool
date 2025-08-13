let serverUrl = '';
let selectedModel = 'qwen-coder';
let lastClipboardContent = '';
let isProcessing = false;
let websocket = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Code Clipboard extension installed');
  loadSettings();
});

chrome.runtime.onStartup.addListener(() => {
  loadSettings();
});

// Load settings from storage
async function loadSettings() {
  const settings = await chrome.storage.sync.get(['serverUrl', 'selectedModel']);
  serverUrl = settings.serverUrl || '';
  selectedModel = settings.selectedModel || 'qwen-coder';
  
  // Initialize WebSocket connection if server URL is available
  if (serverUrl) {
    initWebSocket();
  }
}

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'updateSettings':
      serverUrl = message.serverUrl;
      selectedModel = message.selectedModel;
      
      // Reconnect WebSocket with new server URL
      if (websocket) {
        websocket.close();
      }
      if (serverUrl) {
        initWebSocket();
      }
      break;
    
    case 'forceSyncClipboard':
      readClipboard();
      break;
    
    case 'clipboardRead':
      handleClipboardContent(message.content);
      break;
    
    case 'requestAICode':
      if (message.content) {
        sendToServerWebSocket(message.content);
      }
      break;
    
    case 'getWebSocketStatus':
      sendResponse({
        connected: websocket && websocket.readyState === WebSocket.OPEN,
        url: serverUrl,
        reconnectAttempts: reconnectAttempts
      });
      return true; // Keep message channel open for async response
  }
});

// Monitor clipboard changes
setInterval(async () => {
  if (!isProcessing) {
    await readClipboard();
  }
}, 1000);

async function readClipboard() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getClipboardContent
      });
    }
  } catch (error) {
    console.error('Error reading clipboard:', error);
  }
}

function getClipboardContent() {
  navigator.clipboard.readText().then(text => {
    chrome.runtime.sendMessage({
      action: 'clipboardRead',
      content: text
    });
  }).catch(err => {
    console.error('Failed to read clipboard:', err);
  });
}

async function handleClipboardContent(content) {
  if (content && content !== lastClipboardContent && content.trim().length > 0) {
    lastClipboardContent = content;
    
    // Store in local storage
    await chrome.storage.local.set({ latestClipboard: content });
    
    // Notify popup if open
    try {
      chrome.runtime.sendMessage({
        action: 'clipboardUpdated',
        content: content
      });
    } catch (error) {
      // Popup might not be open, ignore error
    }
    
    // Send to server if URL is configured
    if (serverUrl && websocket && websocket.readyState === WebSocket.OPEN) {
      await sendToServerWebSocket(content);
    } else if (serverUrl) {
      // Fallback to HTTP if WebSocket is not available
      await sendToServer(content);
    }
  }
}

// WebSocket connection management
function initWebSocket() {
  if (!serverUrl) return;
  
  const wsUrl = serverUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  
  try {
    websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connected to:', wsUrl);
      reconnectAttempts = 0;
      
      // Send initial connection message
      websocket.send(JSON.stringify({
        type: 'connection',
        model: selectedModel,
        timestamp: Date.now()
      }));
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    websocket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      websocket = null;
      
      // Attempt to reconnect after a delay
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(() => {
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
          initWebSocket();
        }, Math.pow(2, reconnectAttempts) * 1000); // Exponential backoff
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
  }
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'ai_code_generated':
      if (data.success && data.aiCode) {
        chrome.storage.local.set({ 
          aiGeneratedCode: data.aiCode,
          originalContent: data.originalContent,
          generationTimestamp: Date.now()
        });
        
        // Notify content script
        notifyContentScript('aiCodeReady', {
          aiCode: data.aiCode,
          model: data.model
        });
      }
      break;
      
    case 'processing_status':
      console.log('Processing status:', data.status);
      break;
      
    case 'error':
      console.error('Server error:', data.message);
      break;
      
    case 'pong':
      // Handle ping/pong for connection keep-alive
      break;
  }
}

async function sendToServerWebSocket(content) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    console.log('WebSocket not connected, falling back to HTTP');
    return await sendToServer(content);
  }
  
  if (isProcessing) return;
  isProcessing = true;
  
  try {
    const message = {
      type: 'process_clipboard',
      content: content,
      model: selectedModel,
      timestamp: Date.now()
    };
    
    websocket.send(JSON.stringify(message));
    console.log('Sent clipboard content via WebSocket');
    
  } catch (error) {
    console.error('Error sending via WebSocket:', error);
    // Fallback to HTTP
    await sendToServer(content);
  } finally {
    isProcessing = false;
  }
}

function notifyContentScript(action, data) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: action,
        ...data
      }).catch(() => {
        // Content script might not be ready, ignore error
      });
    }
  });
}

// Keep WebSocket connection alive
setInterval(() => {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000); // Ping every 30 seconds

async function sendToServer(content) {
  if (!serverUrl || isProcessing) return;
  
  isProcessing = true;
  
  try {
    const response = await fetch(`${serverUrl}/process-clipboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        model: selectedModel,
        timestamp: Date.now()
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('Clipboard content sent to server successfully');
        
        // If AI generated code is returned, store it for pasting
        if (result.aiCode) {
          await chrome.storage.local.set({ 
            aiGeneratedCode: result.aiCode,
            originalContent: content
          });
        }
      }
    } else {
      console.error('Server response error:', response.status);
    }
  } catch (error) {
    console.error('Error sending to server:', error);
  } finally {
    isProcessing = false;
  }
}

// Handle requests from content script for AI code
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'getAICode') {
    const data = await chrome.storage.local.get(['aiGeneratedCode', 'originalContent']);
    sendResponse({
      aiCode: data.aiGeneratedCode || null,
      originalContent: data.originalContent || null
    });
  }
});
