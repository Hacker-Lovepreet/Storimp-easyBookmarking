// =================================================================================
// Constants & DOM Element Selectors
// =================================================================================
const saveNoteBtnEl = document.getElementById("save-note-btn");
const noteTitleEl = document.getElementById("note-title");
// Note: noteContentEl is removed as Quill replaces the textarea
const storeEl = document.getElementById("store"); // UL element for displaying notes
const saveTabBtnEl = document.getElementById("save-tab"); // Save Tab button

// Hamburger Menu Elements (New)
const hamburgerBtnEl = document.getElementById("hamburger-btn");
const hamburgerMenuEl = document.getElementById("hamburger-menu");
const menuSettingsBtnEl = document.getElementById("menu-settings-btn");
const themeToggleSwitchEl = document.getElementById("theme-toggle-switch"); // New
const searchToggleSwitchEl = document.getElementById("search-toggle-switch"); // New
const menuDeleteSelectedBtnEl = document.getElementById("menu-delete-selected-btn");
const menuDeleteAllBtnEl = document.getElementById("menu-delete-all-btn");
const menuClearDataBtnEl = document.getElementById("menu-clear-data-btn");
const searchContainerEl = document.getElementById("search-container"); // To toggle its visibility


// Modal Elements
const noteModalEl = document.getElementById("note-modal");
const modalCloseBtnEl = document.querySelector(".modal-close-btn");
const modalNoteTitleEl = document.getElementById("modal-note-title");
const modalNoteContentEl = document.getElementById("modal-note-content");

// Folder Management Elements
const searchBarEl = document.getElementById("search-bar");
const searchIconBtnEl = document.getElementById("search-icon-btn"); // New search icon

// New Folder Management Elements (Top Bar Button & Modal)
const currentFolderBtnEl = document.getElementById("current-folder-btn");
const folderModalEl = document.getElementById("folder-modal");
const folderModalCloseBtnEl = document.getElementById("folder-modal-close-btn");
const folderModalListEl = document.getElementById("folder-modal-list");
const newFolderModalInputEl = document.getElementById("new-folder-modal-input");
const createFolderModalBtnEl = document.getElementById("create-folder-modal-btn");


// =================================================================================
// Animation Functions
// =================================================================================

/**
 * Applies a press animation to a button element.
 * @param {HTMLElement} buttonElement - The button to animate.
 */
function animateButtonPress(buttonElement) {
    if (!buttonElement) return;
    buttonElement.classList.add('button-pressed');
    setTimeout(() => {
        buttonElement.classList.remove('button-pressed');
    }, 200); // Duration of the buttonPress animation (should match CSS)
}

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
const ALL_NOTES_FOLDER_VALUE = "all"; // Represents "All Notes"
let currentSelectedFolder = ALL_NOTES_FOLDER_VALUE; // Initialize with "All Notes"
const MAX_NOTE_CONTENT_PREVIEW_LENGTH = 100; // Max characters to show in list view for text-only part

// =================================================================================
// DOM Manipulation & Rendering Functions
// =================================================================================

/**
 * Updates the text of the #current-folder-btn to reflect the currentSelectedFolder.
 */
function updateCurrentFolderButtonText() {
    if (currentFolderBtnEl) {
        const folderName = currentSelectedFolder === ALL_NOTES_FOLDER_VALUE ? "All Notes" :
                           currentSelectedFolder === DEFAULT_FOLDER ? "Uncategorized" :
                           currentSelectedFolder;
        currentFolderBtnEl.textContent = folderName;
    }
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
function renderNotes(searchTerm = "") { // Add searchTerm parameter
    if (!storeEl) { // folderSelectEl removed
        return;
    }
    // const selectedFolder = folderSelectEl.value; // Old way
    const selectedFolder = currentSelectedFolder; // New way
    const notesToRender = getFilteredNotes(selectedFolder);

    let finalNotesToRender = notesToRender;
    if (searchTerm && searchTerm.trim() !== "") {
        const lowerCaseSearchTerm = searchTerm.trim().toLowerCase();
        finalNotesToRender = notesToRender.filter(noteItem => {
            const titleMatch = noteItem.title && noteItem.title.toLowerCase().includes(lowerCaseSearchTerm);
            let contentMatch = false;
            if (noteItem.isLink) {
                // For links, content is the URL
                contentMatch = noteItem.content && noteItem.content.toLowerCase().includes(lowerCaseSearchTerm);
            } else {
                // For text notes, use textPreview logic to search actual text content
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = noteItem.content || "";
                const textContent = (tempDiv.textContent || tempDiv.innerText || "").toLowerCase();
                contentMatch = textContent.includes(lowerCaseSearchTerm);
            }
            return titleMatch || contentMatch;
        });
    }

    let notesHTML = "";
    finalNotesToRender.forEach(noteItemWithOriginalIndex => {
        notesHTML += createNoteListItemHTML(noteItemWithOriginalIndex, noteItemWithOriginalIndex.originalIndex, selectedFolder);
    });
    storeEl.innerHTML = notesHTML;

    // Staggered fade-in for new note items
    const noteItems = storeEl.querySelectorAll('li');
    noteItems.forEach((item, index) => {
        item.classList.remove('note-item-fade-in'); // Good practice: remove if already there
        setTimeout(() => {
            item.classList.add('note-item-fade-in');
        }, index * 50); // 50ms stagger
    });
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
 * Handles saving a new note.
 */
async function handleSaveNote() {
    const title = noteTitleEl.value.trim();
    const content = document.getElementById('note-content').value;
    const textContent = content.trim();

    // let selectedFolderForSave = folderSelectEl.value; // Old way
    let selectedFolderForSave = currentSelectedFolder; // New way

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
            // let selectedFolderForSave = folderSelectEl.value; // Old way
            let selectedFolderForSave = currentSelectedFolder; // New way

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

        // populateFolderSelect(); // Old way
        // Instead of populateFolderSelect, ensure the modal list and button text are updated if needed
        updateCurrentFolderButtonText(); // Current folder might not exist anymore
        // Folder modal list will be repopulated when next opened.
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

// Folder Modal Functions

/**
 * Populates the folder list in the folder management modal.
 */
function populateFolderModalList() {
    if (!folderModalListEl) return;
    folderModalListEl.innerHTML = ""; // Clear existing items

    const items = [
        { name: "All Notes", value: ALL_NOTES_FOLDER_VALUE },
        { name: "Uncategorized", value: DEFAULT_FOLDER }
    ];

    myFolders.forEach(folder => {
        items.push({ name: folder, value: folder });
    });

    items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item.name;
        li.dataset.folderValue = item.value;
        if (item.value === currentSelectedFolder) {
            li.classList.add("selected-folder");
        }
        folderModalListEl.appendChild(li);
    });
}


async function handleCreateNewFolderInModal() {
    if (!newFolderModalInputEl) return;
    const newFolderName = newFolderModalInputEl.value.trim();

    if (!newFolderName) {
        alert("Folder name cannot be empty.");
        return;
    }
    if (myFolders.includes(newFolderName) || newFolderName === ALL_NOTES_FOLDER_VALUE || newFolderName === DEFAULT_FOLDER) {
        alert("Folder name already exists or is a reserved name (All Notes, Uncategorized).");
        return;
    }

    myFolders.push(newFolderName);
    await saveFoldersToStorage();
    
    populateFolderModalList(); // Refresh the list in the modal
    
    // Highlight the newly added folder in the modal list
    const folderItems = folderModalListEl.querySelectorAll('li');
    folderItems.forEach(item => {
        if (item.dataset.folderValue === newFolderName) {
            item.classList.add('newly-added-folder-modal-item');
            setTimeout(() => {
                item.classList.remove('newly-added-folder-modal-item');
            }, 2000); // Remove highlight after 2 seconds
        }
    });
    
    newFolderModalInputEl.value = ""; // Clear the input

    // Optionally, select the newly created folder
    // currentSelectedFolder = newFolderName;
    // updateCurrentFolderButtonText();
    // renderNotes(); 
    // closeFolderModal(); // Or keep modal open to create more
}


function openFolderModal() {
    if (folderModalEl) {
        populateFolderModalList(); // Populate the list each time it's opened
        folderModalEl.style.display = "block";
        folderModalEl.offsetHeight; // Force reflow
        folderModalEl.classList.add("open");
    }
}

function closeFolderModal() {
    if (folderModalEl) {
        folderModalEl.classList.remove("open");
        folderModalEl.addEventListener('transitionend', () => {
            folderModalEl.style.display = "none";
        }, { once: true });
    }
}


// Note Modal Functions
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
        // noteModalEl.style.display = "block"; // Old direct way
        noteModalEl.style.display = "block"; // Make it visible
        noteModalEl.offsetHeight; // Force a reflow
        noteModalEl.classList.add("open"); // Add class to trigger transition

    } else {
        console.error("Note not found for modal display, index:", noteIndex);
    }
}

function closeNoteModal() {
    // noteModalEl.style.display = "none"; // Old direct way
    // modalNoteContentEl.innerHTML = ""; 
    // console.log('Modal closed and content cleared.');
    noteModalEl.classList.remove("open");

    const onTransitionEnd = () => {
        noteModalEl.style.display = "none";
        modalNoteContentEl.innerHTML = ""; // Clear content after transition
        console.log('Modal closed and content cleared after transition.');
        // No need to removeEventListener if { once: true } is used and supported,
        // but explicit removal is safer for broader compatibility or if `once` is omitted.
        // noteModalEl.removeEventListener('transitionend', onTransitionEnd); // Covered by {once: true}
    };
    noteModalEl.addEventListener('transitionend', onTransitionEnd, { once: true });
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

// Hamburger Menu Toggle Function
function toggleHamburgerMenu() {
    if (hamburgerMenuEl) {
        // Animate button press for hamburger a bit differently as it's not a standard button event target for animation in other handlers
        // animateButtonPress(hamburgerBtnEl); // This could be called here or in its direct listener
        hamburgerMenuEl.classList.toggle("open");
    }
}

// Function to apply search visibility
function applySearchVisibility(isSearchFeatureEnabled) {
    if (!searchContainerEl || !searchIconBtnEl || !searchToggleSwitchEl) return;

    if (isSearchFeatureEnabled) {
        searchIconBtnEl.style.display = ''; // Show search icon
        if (!searchContainerEl.classList.contains('hidden-animated')) {
            // If search was enabled and visible, then disabled, then re-enabled,
            // we want it to start hidden but ready to be shown by icon.
            // So, if it's currently visible (no hidden-animated class), hide it.
            searchContainerEl.style.height = searchContainerEl.scrollHeight + 'px'; // Set for transition
            void searchContainerEl.offsetHeight; // Reflow
            searchContainerEl.classList.add('hidden-animated'); // Hide it initially
        }

    } else { // Search feature is disabled
        searchIconBtnEl.style.display = 'none'; // Hide search icon
        // Label is static.
        
        // Hide search bar if it's currently visible
        if (!searchContainerEl.classList.contains('hidden-animated')) {
            searchContainerEl.style.height = searchContainerEl.scrollHeight + 'px';
            void searchContainerEl.offsetHeight; 
            searchContainerEl.classList.add('hidden-animated');
        }
    }
}

/**
 * Toggles the visibility of the search bar itself, used by search-icon-btn.
 * This does not change the persistent "isSearchVisible" (feature enabled/disabled) setting.
 */
function toggleSearchBarVisibility() {
    if (!searchContainerEl) return;

    const isCurrentlyHidden = searchContainerEl.classList.contains('hidden-animated') || getComputedStyle(searchContainerEl).opacity === '0';

    if (isCurrentlyHidden) { // Show it
        searchContainerEl.classList.remove('hidden'); // Remove old direct hide class if used
        searchContainerEl.style.display = 'block'; 

        const scrollHeight = searchContainerEl.scrollHeight;
        searchContainerEl.style.height = '0px'; // Start from 0 for animation
        
        searchContainerEl.classList.remove('hidden-animated'); 
        void searchContainerEl.offsetHeight; // Reflow
        searchContainerEl.style.height = scrollHeight + 'px';
        
        if (searchBarEl) searchBarEl.focus();

        const onTransitionEnd = (event) => {
            if (event.propertyName === 'height' && !searchContainerEl.classList.contains('hidden-animated')) {
                 searchContainerEl.style.height = 'auto';
            }
        };
        searchContainerEl.addEventListener('transitionend', onTransitionEnd, { once: true });

    } else { // Hide it
        searchContainerEl.style.height = searchContainerEl.scrollHeight + 'px';
        void searchContainerEl.offsetHeight; 
        searchContainerEl.classList.add('hidden-animated');
    }
}


// Settings Function (to be called by menu button)
function handleOpenSettings() {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('settings.html'));
    }
}


function handleStoreElClick(event) {
    if (event.target.classList.contains("delete-btn")) {
        animateButtonPress(event.target); // Animate
        const originalIndexToDelete = parseInt(event.target.dataset.originalIndex, 10);
        handleDeleteNote(originalIndexToDelete);
    } else if (event.target.classList.contains("expand-note-btn")) {
        animateButtonPress(event.target); // Animate
        const originalIndexToExpand = event.target.dataset.noteOriginalIndex;
        openNoteModal(originalIndexToExpand);
    }
}

function attachEventListeners() {
    if (saveNoteBtnEl) {
        saveNoteBtnEl.addEventListener("click", (event) => {
            animateButtonPress(event.currentTarget);
            handleSaveNote();
        });
    }
    if (saveTabBtnEl) {
        saveTabBtnEl.addEventListener("click", (event) => {
            animateButtonPress(event.currentTarget);
            handleSaveTab();
        });
    }

    if (storeEl) storeEl.addEventListener("click", handleStoreElClick); 
    
    if (searchBarEl) {
        searchBarEl.addEventListener("input", () => {
            renderNotes(searchBarEl.value);
        });
    }
    
    // Search Icon Button Listener
    if (searchIconBtnEl) {
        searchIconBtnEl.addEventListener("click", (event) => {
            animateButtonPress(event.currentTarget);
            toggleSearchBarVisibility();
        });
    }

    // New Folder Button Listener
    if (currentFolderBtnEl) {
        currentFolderBtnEl.addEventListener("click", (event) => {
            animateButtonPress(event.currentTarget);
            openFolderModal();
        });
    }

    // Folder Modal List Item Click (Event Delegation)
    if (folderModalListEl) {
        folderModalListEl.addEventListener("click", (event) => {
            if (event.target.tagName === "LI") {
                const selectedValue = event.target.dataset.folderValue;
                if (selectedValue) {
                    currentSelectedFolder = selectedValue;
                    updateCurrentFolderButtonText();
                    closeFolderModal();
                    if (searchBarEl) searchBarEl.value = ""; // Clear search on folder change
                    renderNotes();

                    // Optionally, re-highlight selected in modal if it were to stay open
                    // populateFolderModalList(); // Re-adds .selected-folder class correctly
                }
            }
        });
    }

    // Create Folder Button in Modal Listener
    if (createFolderModalBtnEl) {
        createFolderModalBtnEl.addEventListener("click", (event) => {
            animateButtonPress(event.currentTarget);
            handleCreateNewFolderInModal();
        });
    }

    // Hamburger Menu Listeners
    if (hamburgerBtnEl) {
        hamburgerBtnEl.addEventListener("click", (event) => {
            animateButtonPress(event.currentTarget);
            toggleHamburgerMenu();
        });
    }
    // Close menu if clicking outside of it (on the main content area)
    // This needs to be more robust if main-content-area doesn't cover everything or if there are other clickable bg elements.
    // For now, a simple click on main-content-area will close it if it's open.
    const mainContentAreaEl = document.querySelector('.main-content-area');
    if (mainContentAreaEl && hamburgerMenuEl) {
        mainContentAreaEl.addEventListener('click', () => {
            if (hamburgerMenuEl.classList.contains('open')) {
                toggleHamburgerMenu();
            }
        });
    }


    // New Menu Item Listeners
    if (menuSettingsBtnEl) menuSettingsBtnEl.addEventListener("click", (event) => {
        animateButtonPress(event.currentTarget); // Keep animation for standard buttons
        handleOpenSettings();
        toggleHamburgerMenu(); // Close menu after action
    });

    // New Toggle Switch Listeners
    if (themeToggleSwitchEl) {
        themeToggleSwitchEl.addEventListener('change', async () => {
            const isDarkMode = themeToggleSwitchEl.checked;
            applyTheme(isDarkMode ? 'dark' : 'light'); // Apply theme immediately
            await chrome.storage.local.set({ theme: isDarkMode ? 'dark' : 'light' });
            console.log('Theme saved to storage via switch:', isDarkMode ? 'dark' : 'light');
            // No need to animateButtonPress for switches
            // Optionally close menu, or keep open: toggleHamburgerMenu(); 
        });
    }

    if (searchToggleSwitchEl) {
        searchToggleSwitchEl.addEventListener('change', async () => {
            const isSearchEnabled = searchToggleSwitchEl.checked;
            await chrome.storage.local.set({ isSearchVisible: isSearchEnabled });
            applySearchVisibility(isSearchEnabled);
            // No need to animateButtonPress for switches
            // Optionally close menu: toggleHamburgerMenu();
        });
    }

    if (menuDeleteSelectedBtnEl) menuDeleteSelectedBtnEl.addEventListener("click", (event) => {
        animateButtonPress(event.currentTarget);
        handleDeleteSelectedNotes();
        toggleHamburgerMenu(); // Close menu after action
    });
    if (menuDeleteAllBtnEl) menuDeleteAllBtnEl.addEventListener("click", (event) => {
        animateButtonPress(event.currentTarget);
        handleDeleteAllNotes();
        toggleHamburgerMenu(); // Close menu after action
    });
    if (menuClearDataBtnEl) menuClearDataBtnEl.addEventListener("click", (event) => {
        animateButtonPress(event.currentTarget);
        handleClearAllData();
        toggleHamburgerMenu(); // Close menu after action
    });


    // Modal listeners
    // Note Modal
    if (modalCloseBtnEl) { 
        modalCloseBtnEl.addEventListener("click", (event) => {
            animateButtonPress(event.currentTarget); // Assuming modalCloseBtnEl is for the note modal
            closeNoteModal();
        });
    }
    // Folder Modal
    if (folderModalCloseBtnEl) {
        folderModalCloseBtnEl.addEventListener("click", (event) => {
            animateButtonPress(event.currentTarget);
            closeFolderModal();
        });
    }

    // Window click to close modals
    window.addEventListener("click", (event) => {
        if (event.target === noteModalEl) { 
            closeNoteModal();
        }
        if (event.target === folderModalEl) {
            closeFolderModal();
        }
    });
    // Removed old direct button listeners for settings & theme, now handled by menu items.
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
    if (themeToggleSwitchEl) {
        themeToggleSwitchEl.checked = document.body.classList.contains('dark-mode');
    }

    // Load search visibility preference
    const searchPrefResult = await chrome.storage.local.get(["isSearchVisible"]);
    let isSearchVisible = searchPrefResult.isSearchVisible !== undefined ? searchPrefResult.isSearchVisible : true; // Default true
    if (searchToggleSwitchEl) {
        searchToggleSwitchEl.checked = isSearchVisible;
    }
    applySearchVisibility(isSearchVisible); // Apply visibility on init


    const result = await chrome.storage.local.get(["data", "folders"]);
    myData = result.data || [];
    myFolders = result.folders || [];
    
    // if (folderSelectEl) {  // Old way
    //     populateFolderSelect();
    // }
    updateCurrentFolderButtonText(); // New: Initialize button text
    renderNotes(); 
    attachEventListeners(); // Ensure new listeners for folder modal are added here
}

// Start the application
// Ensure DOM is fully loaded before initializing Quill, especially if script is in <head>
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init().catch(error => console.error("Initialization failed:", error));
}

// Listener for messages from other parts of the extension (e.g., settings page)
if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'settingChanged') {
            console.log('Setting changed message received:', message);
            if (message.setting === 'theme') {
                applyTheme(message.newValue); // Ensure applyTheme is defined and works
                if (typeof themeToggleSwitchEl !== 'undefined' && themeToggleSwitchEl) {
                    themeToggleSwitchEl.checked = message.newValue === 'dark';
                }
            } else if (message.setting === 'searchVisibility') {
                applySearchVisibility(message.newValue); // Ensure applySearchVisibility is defined
                if (typeof searchToggleSwitchEl !== 'undefined' && searchToggleSwitchEl) {
                    searchToggleSwitchEl.checked = message.newValue;
                }
            }
            // It's good practice to send a response, especially if the sender expects one.
            sendResponse({ status: "success", message: "Setting updated in popup." });
        }
        return true; // Required for asynchronous sendResponse.
    });
}