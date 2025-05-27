# Storimp - Note Taking Chrome Extension

Storimp is a simple Chrome extension for taking notes, saving URLs, and organizing them into folders. It features a clean interface with light and dark themes.

## Features

*   **Note Taking:** Quickly jot down notes with titles and content.
*   **Save URLs:** Save interesting web pages directly from your browser.
*   **Folder Organization:** Organize your notes and links into custom folders.
*   **Search:** Easily find notes by title or content.
*   **Theme Support:** Switch between light and dark themes for comfortable viewing.
*   **Data Persistence:** Notes and folders are saved locally using `chrome.storage.local`.
*   **Animations:** Smooth UI animations for a better user experience.

## How to Use

1.  **Installation:**
    *   Clone or download this repository.
    *   Open Chrome and navigate to `chrome://extensions/`.
    *   Enable "Developer mode" in the top right corner.
    *   Click "Load unpacked" and select the directory where you cloned/downloaded the extension.
2.  **Accessing the Extension:**
    *   Click on the Storimp extension icon in your Chrome toolbar to open the popup.
3.  **Functionality:**
    *   Use the input fields to write a new note title and content, then click "Save Note".
    *   Click "Save Url" to quickly save the URL and title of the current active tab.
    *   Create new folders using the "New folder name..." input and "Create Folder" button.
    *   Select a folder from the dropdown to view its notes or to save new notes into it.
    *   Use the search bar to filter notes.
    *   Access additional options like theme toggling, search bar visibility, and data management (delete selected/all notes, clear all data) through the hamburger menu (☰).
    *   Click on a note's content preview or the "Expand" button to view the full note in a modal.

## Files

*   `manifest.json`: The extension manifest file.
*   `index.html` / `index.css` / `index.js`: Popup UI and core logic.
*   `settings.html` / `settings.js`: (If applicable, for an options page - current structure implies settings are within the popup menu).
*   `background.js`: (If applicable, for background tasks - may not be heavily used in this version).
*   `icon.png`: Extension icon.

---

This extension is designed for simplicity and ease of use.
