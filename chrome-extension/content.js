// Content script for handling paste operations
let isAIPasteMode = false;
let lastPasteTime = 0;

// Listen for keyboard shortcuts
document.addEventListener('keydown', async (event) => {
  // Ctrl+Shift+V or Cmd+Shift+V for AI paste
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'V') {
    event.preventDefault();
    await handleAIPaste();
  }
  
  // Regular Ctrl+V or Cmd+V - intercept and provide AI code if available
  if ((event.ctrlKey || event.metaKey) && event.key === 'v' && !event.shiftKey) {
    const aiData = await getAICode();
    if (aiData && aiData.aiCode) {
      event.preventDefault();
      await pasteAICode(aiData.aiCode);
    }
  }
});

// Listen for paste events
document.addEventListener('paste', async (event) => {
  // Small delay to ensure this runs after the default paste
  setTimeout(async () => {
    const currentTime = Date.now();
    if (currentTime - lastPasteTime > 500) { // Avoid duplicate processing
      lastPasteTime = currentTime;
      
      // Get the pasted content
      const pastedText = event.clipboardData?.getData('text/plain');
      if (pastedText) {
        // Send to background script to process
        chrome.runtime.sendMessage({
          action: 'requestAICode',
          content: pastedText
        });
      }
    }
  }, 100);
});

async function handleAIPaste() {
  const aiData = await getAICode();
  if (aiData && aiData.aiCode) {
    await pasteAICode(aiData.aiCode);
  } else {
    // Fallback to regular paste
    try {
      const text = await navigator.clipboard.readText();
      await pasteText(text);
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  }
}

async function getAICode() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getAICode' }, (response) => {
      resolve(response);
    });
  });
}

async function pasteAICode(aiCode) {
  await pasteText(aiCode);
  
  // Show notification that AI code was pasted
  showNotification('AI-generated code pasted!');
}

async function pasteText(text) {
  const activeElement = document.activeElement;
  
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    // Handle input/textarea elements
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    const value = activeElement.value;
    
    activeElement.value = value.substring(0, start) + text + value.substring(end);
    activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
    
    // Trigger input event
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (activeElement && activeElement.contentEditable === 'true') {
    // Handle contentEditable elements
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } else {
    // Try to write to clipboard and trigger paste
    try {
      await navigator.clipboard.writeText(text);
      document.execCommand('paste');
    } catch (error) {
      console.error('Failed to paste text:', error);
    }
  }
}

function showNotification(message) {
  // Create a temporary notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: opacity 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'aiCodeReady') {
    showNotification('AI code generated! Use Ctrl+V to paste AI code, Ctrl+Shift+V for original.');
  }
});
