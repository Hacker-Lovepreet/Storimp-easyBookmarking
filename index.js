// =================================================================================
// Constants & DOM Element Selectors
// =================================================================================
const saveNoteBtnEl = document.getElementById("save-note-btn");
const noteTitleEl = document.getElementById("note-title");
// Note: noteContentEl is removed as Quill replaces the textarea
const storeEl = document.getElementById("store"); // UL element for displaying notes
const clrEl = document.getElementById("clr"); // "Clear All Data" button
const saveTabBtnEl = document.getElementById("save-tab"); // Save Tab button
const deleteAllNotesBtnEl = document.getElementById("delete-all-notes-btn"); // "Delete All Notes" button
const deleteSelectedNotesBtnEl = document.getElementById("delete-selected-notes-btn"); // "Delete Selected Notes" button
const settingsBtnEl = document.getElementById("settings-btn"); // Settings button in menu bar
const themeToggleBtnEl = document.getElementById("theme-toggle-btn"); // Theme toggle button

// Modal Elements
const noteModalEl = document.getElementById("note-modal");
const modalCloseBtnEl = document.querySelector(".modal-close-btn");
const modalNoteTitleEl = document.getElementById("modal-note-title");
const modalNoteContentEl = document.getElementById("modal-note-content");

// Folder Management Elements
const folderSelectEl = document.getElementById("folder-select");
const newFolderInputEl = document.getElementById("new-folder-name");
const createFolderBtnEl = document.getElementById("create-folder-btn");

// =================================================================================
// Global State (Loaded from chrome.storage.local in init)
// =================================================================================
/**
 * @type {Array<Object>} myData - Array of note objects.
 * Stored in chrome.storage.local under the key "data".
 */
let myData = [];

/**
 * @type {Array<string>} myFolders - Array of folder names.
 * Stored in chrome.storage.local under the key "folders".
 */
let myFolders = [];

const DEFAULT_FOLDER = "uncategorized";
const ALL_NOTES_FOLDER_VALUE = "all";
const MAX_NOTE_CONTENT_PREVIEW_LENGTH = 100; // Max characters to show in list view for text-only part

// =================================================================================
// DOM Manipulation & Rendering Functions
// =================================================================================

/**
 * Populates the folder selection dropdown with default options and user-created folders.
 */
function populateFolderSelect() {
    folderSelectEl.innerHTML = ""; // Clear existing options

    const allNotesOption = document.createElement("option");
    allNotesOption.value = ALL_NOTES_FOLDER_VALUE;
    allNotesOption.textContent = "All Notes";
    folderSelectEl.appendChild(allNotesOption);

    const uncategorizedOption = document.createElement("option");
    uncategorizedOption.value = DEFAULT_FOLDER;
    uncategorizedOption.textContent = "Uncategorized";
    folderSelectEl.appendChild(uncategorizedOption);

    myFolders.forEach(folder => {
        const option = document.createElement("option");
        option.value = folder;
        option.textContent = folder;
        folderSelectEl.appendChild(option);
    });
}

/**
 * Creates the HTML string for a single note list item.
 */
function createNoteListItemHTML(noteItem, originalIndex, currentSelectedFolder) {
    const title = noteItem.title ? noteItem.title : "No Title";
    const content = noteItem.content ? noteItem.content : "";
    let displayContentPreviewHTML = "";
    let expandButtonHTML = "";

    if (noteItem.isLink) {
        displayContentPreviewHTML = `<strong>${title}</strong><br><a href="${content}" target="_blank">${content}</a>`;
    } else {
        // Create a temporary div to get text content for preview from HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content; // 'content' here is fullContentHTML
        const textPreview = tempDiv.textContent || tempDiv.innerText || "";

        if (textPreview.length > MAX_NOTE_CONTENT_PREVIEW_LENGTH) {
            displayContentPreviewHTML = `<strong>${title}</strong><br>${textPreview.substring(0, MAX_NOTE_CONTENT_PREVIEW_LENGTH)}...`;
            expandButtonHTML = `<button class="expand-note-btn" data-note-original-index="${originalIndex}">Expand</button>`;
        } else {
            displayContentPreviewHTML = `<strong>${title}</strong><br>${textPreview}`;
            // Also show expand button if the original HTML content was longer than the text preview
            // (e.g. content had many tags but little text, or if textPreview is short but there was formatting)
            if (content !== textPreview && content.length > textPreview.length) {
                 expandButtonHTML = `<button class="expand-note-btn" data-note-original-index="${originalIndex}">Expand</button>`;
            }
        }
    }

    let folderDisplayHTML = "";
    if (currentSelectedFolder === ALL_NOTES_FOLDER_VALUE && noteItem.folder && noteItem.folder !== DEFAULT_FOLDER) {
        folderDisplayHTML = `<span class="note-folder-tag">[${noteItem.folder}]</span> `;
    }

    // Note: The expand button is placed after the text content div, adjust CSS if needed or place inside.
    // For simplicity, placing it within the flow here.
    return `<li>
                <input type="checkbox" class="note-checkbox" data-note-original-index="${originalIndex}">
                <div class="note-text-content">${folderDisplayHTML}${displayContentPreviewHTML} ${expandButtonHTML}</div>
                <button class="delete-btn" data-original-index="${originalIndex}">Delete</button>
            </li>`;
}

/**
 * Filters notes based on the selected folder.
 */
function getFilteredNotes(selectedFolder) {
    if (selectedFolder === ALL_NOTES_FOLDER_VALUE) {
        return myData.map((item, index) => ({ ...item, originalIndex: index }));
    } else if (selectedFolder === DEFAULT_FOLDER) {
        return myData
            .map((item, index) => ({ ...item, originalIndex: index }))
            .filter(item => !item.folder || item.folder === DEFAULT_FOLDER);
    } else {
        return myData
            .map((item, index) => ({ ...item, originalIndex: index }))
            .filter(item => item.folder === selectedFolder);
    }
}

/**
 * Renders the notes list in the UI based on the currently selected folder.
 */
function renderNotes() {
    if (!storeEl || !folderSelectEl) { // Ensure elements are available (e.g. if popup is closed quickly)
        return;
    }
    const selectedFolder = folderSelectEl.value;
    const notesToRender = getFilteredNotes(selectedFolder);

    let notesHTML = "";
    notesToRender.forEach(noteItemWithOriginalIndex => {
        notesHTML += createNoteListItemHTML(noteItemWithOriginalIndex, noteItemWithOriginalIndex.originalIndex, selectedFolder);
    });
    storeEl.innerHTML = notesHTML;
}

// =================================================================================
// Data Management Functions (using chrome.storage.local)
// =================================================================================

/**
 * Saves the current `myData` array to chrome.storage.local.
 */
async function saveDataToStorage() {
    await chrome.storage.local.set({ data: myData });
}

/**
 * Saves the current `myFolders` array to chrome.storage.local.
 */
async function saveFoldersToStorage() {
    await chrome.storage.local.set({ folders: myFolders });
}

/**
 * Handles the creation of a new folder.
 */
async function handleCreateFolder() {
    const newFolderName = newFolderInputEl.value.trim();
    if (!newFolderName) {
        alert("Folder name cannot be empty.");
        return;
    }
    if (myFolders.includes(newFolderName) || newFolderName === ALL_NOTES_FOLDER_VALUE || newFolderName === DEFAULT_FOLDER) {
        alert("Folder name already exists or is a reserved name.");
        return;
    }

    myFolders.push(newFolderName);
    await saveFoldersToStorage();
    populateFolderSelect();
    folderSelectEl.value = newFolderName;
    newFolderInputEl.value = "";
    renderNotes();
}

/**
 * Handles saving a new note.
 */
async function handleSaveNote() {
    const title = noteTitleEl.value.trim();
    const content = document.getElementById('note-content').value;
    const textContent = content.trim();

    let selectedFolderForSave = folderSelectEl.value;

    if (selectedFolderForSave === ALL_NOTES_FOLDER_VALUE) {
        selectedFolderForSave = DEFAULT_FOLDER;
    }

    if (title || textContent.length > 0) {
        const newNote = { title: title, content: content, folder: selectedFolderForSave, isLink: false };
        myData.push(newNote);
        await saveDataToStorage();
        renderNotes();
        noteTitleEl.value = "";
        document.getElementById('note-content').value = '';
    }
}

/**
 * Handles saving the current browser tab as a note.
 */
function handleSaveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        if (tabs && tabs[0] && tabs[0].url) {
            const url = tabs[0].url;
            const pageTitle = tabs[0].title || url;
            let selectedFolderForSave = folderSelectEl.value;

            if (selectedFolderForSave === ALL_NOTES_FOLDER_VALUE) {
                selectedFolderForSave = DEFAULT_FOLDER;
            }

            myData.push({ title: "Link: " + pageTitle, content: url, isLink: true, folder: selectedFolderForSave });
            await saveDataToStorage();
            renderNotes();
        } else {
            console.error("Could not get tab information.");
        }
    });
}

/**
 * Handles deleting a note.
 */
async function handleDeleteNote(originalIndexToDelete) {
    if (!isNaN(originalIndexToDelete) && originalIndexToDelete >= 0 && originalIndexToDelete < myData.length) {
        myData.splice(originalIndexToDelete, 1);
        await saveDataToStorage();
        renderNotes();
    } else {
        console.error("Error: Could not find note to delete with originalIndex:", originalIndexToDelete);
        renderNotes();
    }
}

/**
 * Handles clearing all notes and folders from chrome.storage.local and the UI.
 */
async function handleClearAllData() {
    if (confirm("Are you sure you want to delete ALL data, including notes AND folders? This action cannot be undone.")) {
        // Clear notes, folders
        await chrome.storage.local.remove(["data", "folders"]);
        
        myData = [];
        myFolders = [];

        populateFolderSelect();
        renderNotes();
    }
}

/**
 * Handles deleting all notes (but not folders).
 */
async function handleDeleteAllNotes() {
    if (confirm("Are you sure you want to delete all notes? Your folders will remain. This action cannot be undone.")) {
        myData = [];
        await saveDataToStorage(); // Saves the empty myData array
        renderNotes();
    }
}

/**
 * Handles deleting selected notes.
 */
async function handleDeleteSelectedNotes() {
    const checkedCheckboxes = document.querySelectorAll('.note-checkbox:checked');
    if (checkedCheckboxes.length === 0) {
        alert("No notes selected for deletion.");
        return;
    }

    const indicesToDelete = Array.from(checkedCheckboxes).map(cb => parseInt(cb.dataset.noteOriginalIndex));

    if (confirm(`Are you sure you want to delete ${indicesToDelete.length} selected note(s)? This action cannot be undone.`)) {
        // Filter out the notes to be deleted.
        // The 'originalIndex' stored in the checkbox directly corresponds to the index in the myData array.
        myData = myData.filter((note, index) => !indicesToDelete.includes(index));
        
        await saveDataToStorage();
        renderNotes(); // Re-render the notes list
    }
}


// =================================================================================
// Modal Interaction Functions
// =================================================================================
function openNoteModal(originalIndex) {
    const noteIndex = parseInt(originalIndex, 10);
    if (isNaN(noteIndex) || noteIndex < 0 || noteIndex >= myData.length) {
        console.error("Invalid note index for modal:", originalIndex);
        return;
    }
    const note = myData[noteIndex]; 

    if (note) {
        modalNoteTitleEl.textContent = note.title || "Note";
        if (note.isLink) {
            modalNoteContentEl.innerHTML = `<a href="${note.content}" target="_blank">${note.content}</a>`;
        } else {
            // For plain text, we can set textContent directly to avoid potential XSS
            // if content ever accidentally contains HTML-like strings.
            // However, if markdown or simple HTML was intended to be rendered, use innerHTML.
            // For old notes, we want to render HTML. For new notes, it's plain text.
            modalNoteContentEl.innerHTML = note.content || "";
        }
        noteModalEl.style.display = "block";
    } else {
        console.error("Note not found for modal display, index:", noteIndex);
    }
}

function closeNoteModal() {
    noteModalEl.style.display = "none";
    modalNoteContentEl.innerHTML = ""; 
    console.log('Modal closed and content cleared.');
}

// =================================================================================
// Theme Management Functions
// =================================================================================
/**
 * Applies the specified theme to the document body.
 * @param {string} theme - The theme to apply ('light' or 'dark').
 */
function applyTheme(theme) {
  console.log('Applying theme:', theme);
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  console.log('document.body classList after applyTheme:', document.body.classList.toString());
}

/**
 * Loads the saved theme from storage and applies it.
 * Defaults to 'light' theme if no setting is found.
 */
async function loadAndApplyTheme() {
  const settings = await chrome.storage.local.get(["theme"]);
  console.log('Loading theme from storage. Stored settings:', settings);
  const themeToApply = settings.theme || 'light'; // Default to light if undefined
  console.log('Theme to apply on load:', themeToApply);
  applyTheme(themeToApply);
}


// =================================================================================
// Event Handlers & Listener Attachments
// =================================================================================

function handleStoreElClick(event) {
    if (event.target.classList.contains("delete-btn")) {
        const originalIndexToDelete = parseInt(event.target.dataset.originalIndex, 10);
        handleDeleteNote(originalIndexToDelete);
    } else if (event.target.classList.contains("expand-note-btn")) {
        const originalIndexToExpand = event.target.dataset.noteOriginalIndex;
        openNoteModal(originalIndexToExpand);
    }
}

function attachEventListeners() {
    if (saveNoteBtnEl) saveNoteBtnEl.addEventListener("click", handleSaveNote);
    if (createFolderBtnEl) createFolderBtnEl.addEventListener("click", handleCreateFolder);
    if (saveTabBtnEl) saveTabBtnEl.addEventListener("click", handleSaveTab);
    if (deleteAllNotesBtnEl) deleteAllNotesBtnEl.addEventListener("click", handleDeleteAllNotes);
    if (deleteSelectedNotesBtnEl) deleteSelectedNotesBtnEl.addEventListener("click", handleDeleteSelectedNotes);
    if (clrEl) clrEl.addEventListener("click", handleClearAllData);
    if (storeEl) storeEl.addEventListener("click", handleStoreElClick); // Delegated for delete and expand buttons
    if (folderSelectEl) folderSelectEl.addEventListener("change", renderNotes);

    // Modal listeners
    if (modalCloseBtnEl) { 
        modalCloseBtnEl.addEventListener("click", closeNoteModal);
        window.addEventListener("click", (event) => {
            if (event.target === noteModalEl) { 
                closeNoteModal();
            }
        });
    }

    // Settings button listener
    if (settingsBtnEl) {
      settingsBtnEl.addEventListener("click", () => {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open(chrome.runtime.getURL('settings.html'));
        }
      });
    }

    // Theme toggle button listener
    if (themeToggleBtnEl) {
        themeToggleBtnEl.addEventListener("click", async () => {
            console.log('Theme toggle clicked.');
            document.body.classList.toggle('dark-mode');
            const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            console.log('New theme to save:', currentTheme);
            await chrome.storage.local.set({ theme: currentTheme });
            console.log('Theme saved to storage.');
            // Note: applyTheme is implicitly handled by the classList.toggle and CSS rules.
            // If we needed to do more JS-based theme adjustments, we might call applyTheme(currentTheme) here.
            // For now, also log the body classList to confirm the toggle worked as expected by the click handler.
            console.log('document.body classList after toggle:', document.body.classList.toString());
        });
    }
}

// =================================================================================
// Initialization
// =================================================================================

/**
 * Initializes the application:
 * - Loads and applies the theme.
 * - Initializes Quill Editor.
 * - Loads data (notes, folders, settings) from chrome.storage.local.
 * - Populates the folder dropdown.
 * - Sets the auto-capture toggle state.
 * - Renders the initial list of notes.
 * - Attaches event listeners.
 */
async function init() {
    await loadAndApplyTheme(); // Load theme first

    const result = await chrome.storage.local.get(["data", "folders"]);
    myData = result.data || [];
    myFolders = result.folders || [];
    
    if (folderSelectEl) { 
        populateFolderSelect();
    }
    renderNotes(); 
    attachEventListeners();
}

// Start the application
// Ensure DOM is fully loaded before initializing Quill, especially if script is in <head>
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init().catch(error => console.error("Initialization failed:", error));
}