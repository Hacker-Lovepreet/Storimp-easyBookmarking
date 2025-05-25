// =================================================================================
// Constants & DOM Element Selectors
// =================================================================================
const saveNoteBtnEl = document.getElementById("save-note-btn");
const noteTitleEl = document.getElementById("note-title");
const noteContentEl = document.getElementById("note-content");
const storeEl = document.getElementById("store"); // UL element for displaying notes
const clrEl = document.getElementById("clr"); // Clear All button
const saveTabBtnEl = document.getElementById("save-tab"); // Save Tab button

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
    let content = noteItem.content ? noteItem.content : "";
    let listItemContentHTML = "";

    if (noteItem.isLink) {
        listItemContentHTML = `<strong>${title}</strong><br><a href="${content}" target="_blank">${content}</a>`;
    } else {
        listItemContentHTML = `<strong>${title}</strong><br>${content.replace(/\n/g, '<br>')}`;
    }

    let folderDisplayHTML = "";
    if (currentSelectedFolder === ALL_NOTES_FOLDER_VALUE && noteItem.folder && noteItem.folder !== DEFAULT_FOLDER) {
        folderDisplayHTML = `<span class="note-folder-tag">[${noteItem.folder}]</span> `;
    }

    return `<li>
                <div class="note-text-content">${folderDisplayHTML}${listItemContentHTML}</div>
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
    if (confirm("Are you sure you want to delete all notes and folders? This action cannot be undone.")) {
        await chrome.storage.local.remove(["data", "folders"]);
        myData = [];
        myFolders = [];
        // We might also want to reset isAutoCaptureEnabled here, or handle it separately.
        // For now, let's keep it focused on notes and folders.
        // await chrome.storage.local.set({ isAutoCaptureEnabled: false });
        // autoCaptureToggleEl.checked = false;

        populateFolderSelect();
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


// =================================================================================
// Event Handlers & Listener Attachments
// =================================================================================

function handleStoreElClick(event) {
    if (event.target.classList.contains("delete-btn")) {
        const originalIndexToDelete = parseInt(event.target.dataset.originalIndex, 10);
        handleDeleteNote(originalIndexToDelete); // handleDeleteNote is now async
    }
}

function attachEventListeners() {
    saveNoteBtnEl.addEventListener("click", handleSaveNote);
    createFolderBtnEl.addEventListener("click", handleCreateFolder);
    saveTabBtnEl.addEventListener("click", handleSaveTab);
    clrEl.addEventListener("click", handleClearAllData);
    storeEl.addEventListener("click", handleStoreElClick);
    folderSelectEl.addEventListener("change", renderNotes);
    autoCaptureToggleEl.addEventListener("change", handleAutoCaptureToggleChange);
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