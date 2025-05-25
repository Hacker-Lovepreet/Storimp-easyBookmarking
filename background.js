// background.js

let extensionWindowId = null; // To store the ID of the panel window

const CHECK_INTERVAL = 2000; // Check every 2 seconds
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

// Function to check if an offscreen document is already active
async function hasOffscreenDocument(path) {
  // Get all active extension contexts
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(path)] // Match the specific offscreen document URL
  });
  return contexts.length > 0;
}

// Function to create offscreen document if not already present
async function setupOffscreenDocumentIfNeeded() {
  const path = OFFSCREEN_DOCUMENT_PATH;
  if (!(await hasOffscreenDocument(path))) {
    console.log("Offscreen document not found, creating now.");
    await chrome.offscreen.createDocument({
      url: path, // Corrected from 'path' to 'url'
      reasons: ['CLIPBOARD'],
      justification: 'Clipboard access for automatic note creation'
    });
    console.log("Offscreen document created.");
  } else {
    // console.log("Offscreen document already exists."); // Can be noisy
  }
}

// Initialize and start clipboard checking loop
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ isAutoCaptureEnabled: false, lastCopiedText: "" });
  await setupOffscreenDocumentIfNeeded(); // Initial setup
  // The interval is started globally after this listener to ensure it runs even if the SW restarts
  console.log("Background script initialized, auto-capture off. Clipboard check interval will start.");
});

// Main function to trigger clipboard check via offscreen document
async function checkClipboard() {
  const settings = await chrome.storage.local.get(["isAutoCaptureEnabled"]);
  if (!settings.isAutoCaptureEnabled) {
    // console.log("Auto-capture is disabled."); // Can be noisy
    return; 
  }
  // console.log("Auto-capture enabled, checking clipboard via offscreen document."); // Can be noisy
  await setupOffscreenDocumentIfNeeded(); // Ensure it's there (e.g., if closed or SW restarted)
  
  // Check if there are any active offscreen documents before sending a message
  // This is an extra safeguard, setupOffscreenDocumentIfNeeded should handle creation.
  if (await hasOffscreenDocument(OFFSCREEN_DOCUMENT_PATH)) {
    chrome.runtime.sendMessage({ type: 'read-clipboard', target: 'offscreen' });
  } else {
    console.warn("Attempted to send message, but no offscreen document found after setup attempt.");
    // Optionally, attempt setup again or handle this case, though setupOffscreenDocumentIfNeeded should prevent this.
  }
}

// Listener for messages from the offscreen document
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'background' || message.type !== 'clipboard-data') {
    return; // Ignore messages not intended for this part of the background script
  }

  if (message.error) {
    console.warn(`Error reading clipboard from offscreen: ${message.error}. This might be due to the offscreen document not having focus or clipboard permissions.`);
    return;
  }

  const clipboardText = message.data;

  // Retrieve isAutoCaptureEnabled again to ensure it wasn't disabled between checkClipboard and now
  // Also get lastCopiedText for comparison
  const currentStorage = await chrome.storage.local.get(["isAutoCaptureEnabled", "lastCopiedText"]);
  
  if (!currentStorage.isAutoCaptureEnabled) {
    // console.log("Auto-capture was disabled before processing clipboard data."); // Can be noisy
    return; 
  }

  if (clipboardText && clipboardText.trim() !== "" && clipboardText !== currentStorage.lastCopiedText) {
    console.log("New text received from offscreen:", clipboardText);
    await chrome.storage.local.set({ lastCopiedText: clipboardText });

    const dataResult = await chrome.storage.local.get(["data"]);
    let notes = dataResult.data || [];
    if (!Array.isArray(notes)) { // Ensure notes is an array, though storage sync should maintain type
        console.warn("Notes data in storage was not an array, resetting.");
        notes = [];
    }

    const newNote = {
      title: "Copied Text",
      content: clipboardText,
      folder: "uncategorized", // Default folder
      timestamp: new Date().toISOString(),
      isLink: false // Assuming copied text is not a link by default
    };

    notes.push(newNote);
    await chrome.storage.local.set({ data: notes });
    console.log("New note saved from clipboard via offscreen.");
  } else if (clipboardText && clipboardText === currentStorage.lastCopiedText) {
    // console.log("Clipboard text is the same as last copied, not saving."); // Can be very noisy
  } else if (!clipboardText || clipboardText.trim() === "") {
    // console.log("Clipboard text is empty, not saving."); // Can be noisy
  }
});

// Start the interval check when the extension's service worker starts.
// This covers cases where the SW might restart.
// The onInstalled listener handles the very first installation.
setInterval(checkClipboard, CHECK_INTERVAL);
console.log("Background script loaded and clipboard check interval started.");


chrome.action.onClicked.addListener(async (tab) => {
  const targetUrl = chrome.runtime.getURL('index.html');

  if (extensionWindowId !== null) {
    try {
      // Check if the window still exists
      const existingWindow = await chrome.windows.get(extensionWindowId);
      if (existingWindow) {
        // Window exists, focus it
        await chrome.windows.update(extensionWindowId, { focused: true });
        return;
      } else {
        // Window ID is stored but window doesn't exist (e.g., closed by user)
        extensionWindowId = null;
      }
    } catch (e) {
      // Error means window doesn't exist
      console.log(`Error getting window ${extensionWindowId}: ${e}. Setting ID to null.`);
      extensionWindowId = null;
    }
  }

  // If window doesn't exist or ID was invalid, create it
  if (extensionWindowId === null) {
    try {
      const newWindow = await chrome.windows.create({
        url: targetUrl,
        type: 'popup', // Creates a panel-like window without address bar etc.
        width: 420,
        height: 700 // Increased height
      });
      extensionWindowId = newWindow.id;

      // Optional: Listen for window removal to clear the ID
      chrome.windows.onRemoved.addListener(function onRemovedListener(removedWindowId) {
        if (removedWindowId === extensionWindowId) {
          console.log(`Window ${extensionWindowId} removed. Clearing ID.`);
          extensionWindowId = null;
          chrome.windows.onRemoved.removeListener(onRemovedListener); // Clean up listener
        }
      });

    } catch (e) {
      console.error("Error creating window:", e);
    }
  }
});
