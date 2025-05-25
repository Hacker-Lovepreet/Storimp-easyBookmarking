// background.js

let lastCopiedText = "";
const CHECK_INTERVAL = 2000; // Check every 2 seconds

// Initialize settings on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isAutoCaptureEnabled: false, lastCopiedText: "" }, () => {
    console.log("Auto-capture initialized to false.");
  });
  // Start the clipboard check loop
  setInterval(checkClipboard, CHECK_INTERVAL);
});

async function checkClipboard() {
  try {
    const settings = await chrome.storage.local.get(["isAutoCaptureEnabled", "lastCopiedText"]);
    if (!settings.isAutoCaptureEnabled) {
      return; // Feature is disabled
    }

    // Try to read from clipboard
    // This requires the document to have focus if not using the 'clipboardRead' permission with specific browser handling.
    // For service workers, this might be problematic without an active, focused document.
    // However, with 'clipboardRead' it should generally work.
    const clipboardText = await navigator.clipboard.readText();

    if (clipboardText && clipboardText.trim() !== "" && clipboardText !== settings.lastCopiedText) {
      console.log("New text copied:", clipboardText);
      
      // Update lastCopiedText in storage
      await chrome.storage.local.set({ lastCopiedText: clipboardText });

      // Retrieve current notes
      const dataResult = await chrome.storage.local.get(["data"]);
      let notes = dataResult.data || [];
      if (!Array.isArray(notes)) { // Ensure notes is an array
          console.warn("Notes data in storage was not an array, resetting.");
          notes = [];
      }


      // Create a new note object
      const newNote = {
        title: "Copied Text",
        content: clipboardText,
        folder: "uncategorized", // Default folder
        timestamp: new Date().toISOString(),
        isLink: false // Assuming copied text is not a link by default
      };

      notes.push(newNote);

      // Save updated notes
      await chrome.storage.local.set({ data: notes });
      console.log("New note saved from clipboard.");

    }
  } catch (error) {
    // Common errors: Document not focused, or clipboard permission issues.
    // We'll log this, but for a production extension, more robust error handling/user notification might be needed.
    if (error.name === 'NotAllowedError' || error.message.includes('Read permission denied') || error.message.includes('Document is not focused')) {
        // console.warn("Clipboard read permission denied or document not focused. Auto-capture might not work reliably without focus.");
        // This warning can be very noisy, so disabling it for now.
        // The user must grant clipboard permission if prompted by the browser, or ensure the page is focused.
    } else {
        console.error("Error reading clipboard in background:", error);
    }
  }
}

// Kick off the interval check when the extension starts (not just onInstalled)
// This is important if the service worker becomes inactive and then active again.
// The onInstalled listener only runs once.
setInterval(checkClipboard, CHECK_INTERVAL);
console.log("Background script loaded and clipboard check interval started.");
