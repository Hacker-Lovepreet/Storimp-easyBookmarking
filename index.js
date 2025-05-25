// =================================================================================
// Constants & DOM Element Selectors
// =================================================================================
const saveNoteBtnEl = document.getElementById("save-note-btn");
const noteTitleEl = document.getElementById("note-title");
const noteContentEl = document.getElementById("note-content");
const storeEl = document.getElementById("store"); // UL element for displaying notes
const clrEl = document.getElementById("clr"); // "Clear All Data" button
const saveTabBtnEl = document.getElementById("save-tab"); // Save Tab button
const deleteAllNotesBtnEl = document.getElementById("delete-all-notes-btn"); // "Delete All Notes" button
const deleteSelectedNotesBtnEl = document.getElementById("delete-selected-notes-btn"); // "Delete Selected Notes" button

// Modal Elements
const noteModalEl = document.getElementById("note-modal");
const modalCloseBtnEl = document.querySelector(".modal-close-btn");
const modalNoteTitleEl = document.getElementById("modal-note-title");
const modalNoteContentEl = document.getElementById("modal-note-content");

// Folder Management Elements
const folderSelectEl = document.getElementById("folder-select");
const newFolderInputEl = document.getElementById("new-folder-name");
const createFolderBtnEl = document.getElementById("create-folder-btn");

// Settings Elements
const autoCaptureToggleEl = document.getElementById("auto-capture-toggle");

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
const MAX_NOTE_CONTENT_PREVIEW_LENGTH = 100; // Max characters to show in list view

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
    let content = noteItem.content ? noteItem.content : ""; // Full content
    let displayContentHTML = "";
    let expandButtonHTML = "";

    if (noteItem.isLink) {
        // For links, usually display the full link, or a shortened version if very long.
        // For now, keep as is, but truncation could be applied to 'title' or 'content' here too.
        displayContentHTML = `<strong>${title}</strong><br><a href="${content}" target="_blank">${content}</a>`;
    } else {
        const contentForDisplay = content.replace(/\n/g, '<br>'); // Handle newlines for HTML
        if (content.length > MAX_NOTE_CONTENT_PREVIEW_LENGTH) {
            displayContentHTML = `<strong>${title}</strong><br>${contentForDisplay.substring(0, MAX_NOTE_CONTENT_PREVIEW_LENGTH)}...`;
            expandButtonHTML = `<button class="expand-note-btn" data-note-original-index="${originalIndex}">Expand</button>`;
        } else {
            displayContentHTML = `<strong>${title}</strong><br>${contentForDisplay}`;
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
                <div class="note-text-content">${folderDisplayHTML}${displayContentHTML} ${expandButtonHTML}</div>
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
    const content = noteContentEl.value.trim();
    let selectedFolderForSave = folderSelectEl.value;

    if (selectedFolderForSave === ALL_NOTES_FOLDER_VALUE) {
        selectedFolderForSave = DEFAULT_FOLDER;
    }

    if (title || content) {
        myData.push({ title: title, content: content, folder: selectedFolderForSave });
        await saveDataToStorage();
        renderNotes();
        noteTitleEl.value = "";
        noteContentEl.value = "";
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
        // Clear notes, folders, and also reset lastCopiedText and auto-capture setting for a full reset.
        await chrome.storage.local.remove(["data", "folders", "lastCopiedText"]);
        await chrome.storage.local.set({ isAutoCaptureEnabled: false }); 
        
        myData = [];
        myFolders = [];
        autoCaptureToggleEl.checked = false; // Update UI for auto-capture

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
        await chrome.storage.local.set({ lastCopiedText: "" }); // Reset lastCopiedText
        renderNotes();
    }
}

/**
 * Handles changes to the auto-capture toggle.
 */
async function handleAutoCaptureToggleChange() {
    await chrome.storage.local.set({ isAutoCaptureEnabled: autoCaptureToggleEl.checked });
    console.log("Auto-capture setting saved:", autoCaptureToggleEl.checked);
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
    const note = myData[noteIndex]; // Direct access using the original index

    if (note) {
        modalNoteTitleEl.textContent = note.title || "Note"; // Default title if note.title is empty
        // For content, use textContent to prevent XSS if content could be HTML.
        // If content is expected to be plain text with newlines, CSS white-space: pre-wrap handles it.
        modalNoteContentEl.textContent = note.content || ""; 
        noteModalEl.style.display = "block";
    } else {
        console.error("Note not found for modal display, index:", noteIndex);
    }
}

function closeNoteModal() {
    noteModalEl.style.display = "none";
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
    saveNoteBtnEl.addEventListener("click", handleSaveNote);
    createFolderBtnEl.addEventListener("click", handleCreateFolder);
    saveTabBtnEl.addEventListener("click", handleSaveTab);
    deleteAllNotesBtnEl.addEventListener("click", handleDeleteAllNotes);
    deleteSelectedNotesBtnEl.addEventListener("click", handleDeleteSelectedNotes);
    clrEl.addEventListener("click", handleClearAllData);
    storeEl.addEventListener("click", handleStoreElClick); // Delegated for delete and expand buttons
    folderSelectEl.addEventListener("change", renderNotes);
    autoCaptureToggleEl.addEventListener("change", handleAutoCaptureToggleChange);

    // Modal listeners
    modalCloseBtnEl.addEventListener("click", closeNoteModal);
    window.addEventListener("click", (event) => {
        if (event.target === noteModalEl) { // Clicked on the modal backdrop
            closeNoteModal();
        }
    });
}

// =================================================================================
// Initialization
// =================================================================================

/**
 * Initializes the application:
 * - Loads data (notes, folders, settings) from chrome.storage.local.
 * - Populates the folder dropdown.
 * - Sets the auto-capture toggle state.
 * - Renders the initial list of notes.
 * - Attaches event listeners.
 */
async function init() {
    const result = await chrome.storage.local.get(["data", "folders", "isAutoCaptureEnabled"]);
    myData = result.data || [];
    myFolders = result.folders || [];
    
    if (autoCaptureToggleEl) { // Check if element exists
         autoCaptureToggleEl.checked = result.isAutoCaptureEnabled || false;
    }

    if (folderSelectEl) { // Check if element exists
        populateFolderSelect();
    }
    renderNotes(); // Render notes after data is loaded
    attachEventListeners();
}

// Start the application
init().catch(error => console.error("Initialization failed:", error));