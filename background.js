// background.js

// Initialize basic settings on installation if needed
chrome.runtime.onInstalled.addListener(async () => {
  // Example: Set up default folders or other initial data if necessary in the future.
  // For now, we just log that the extension is installed.
  console.log("Storimp extension installed/updated.");
});

// Listener for messages from other parts of the extension (e.g., content scripts or popup)
// This is a placeholder and can be expanded if other background tasks are needed.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background script:", message);

  // Example: Handle a message to perform some action
  // if (message.type === "some-action") {
  //   // Do something
  //   sendResponse({ status: "Action completed" });
  // }

  // Return true to indicate you wish to send a response asynchronously
  // This is important if you do any async operations before sending a response.
  // return true; 
});

console.log("Background script loaded.");

// Removed all clipboard-related and offscreen document functionality.
// The background script is now much simpler.
// It can be used for other extension-wide event handling or tasks if needed in the future.
