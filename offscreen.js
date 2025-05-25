// offscreen.js

// Listen for messages from the background script (service worker)
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'offscreen') {
    return; // Ignore messages not intended for the offscreen document
  }

  if (message.type === 'read-clipboard') {
    let data = '';
    let error = null;
    try {
      // navigator.clipboard.readText() is available in offscreen documents
      data = await navigator.clipboard.readText();
    } catch (e) {
      error = e.message; // Send back error message if clipboard read fails
      console.error('Offscreen: Error reading clipboard:', e);
    }
    // Send the clipboard data (or error) back to the service worker
    chrome.runtime.sendMessage({
      type: 'clipboard-data',
      target: 'background', // Send to background script
      data: data,
      error: error
    });
  }
});
