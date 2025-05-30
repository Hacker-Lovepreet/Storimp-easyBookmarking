document.addEventListener('DOMContentLoaded', async () => {
    const settingsThemeToggle = document.getElementById('settings-theme-toggle');
    const settingsSearchToggle = document.getElementById('settings-search-toggle');
    // const settingsDefaultFolderSelect = document.getElementById('settings-default-folder-select'); // For future use

    // Function to apply theme class to the settings page body
    function applySettingsPageTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
    }

    // Load initial settings
    const storedSettings = await chrome.storage.local.get(['theme', 'isSearchVisible']);
    
    const currentTheme = storedSettings.theme || 'light';
    settingsThemeToggle.checked = currentTheme === 'dark';
    applySettingsPageTheme(currentTheme); // Apply theme to settings page itself

    const isSearchVisibleStored = storedSettings.isSearchVisible !== undefined ? storedSettings.isSearchVisible : true;
    settingsSearchToggle.checked = isSearchVisibleStored;

    // Event Listeners
    settingsThemeToggle.addEventListener('change', async () => {
        const newTheme = settingsThemeToggle.checked ? 'dark' : 'light';
        await chrome.storage.local.set({ theme: newTheme });
        applySettingsPageTheme(newTheme);
        // Notify popup if open
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'settingChanged', setting: 'theme', newValue: newTheme }, response => {
                if (chrome.runtime.lastError) {
                    console.log("Popup not open or error in sending message: " + chrome.runtime.lastError.message);
                } else {
                    console.log("Theme change message sent, response:", response);
                }
            });
        }
    });

    settingsSearchToggle.addEventListener('change', async () => {
        const newSearchVisible = settingsSearchToggle.checked;
        await chrome.storage.local.set({ isSearchVisible: newSearchVisible });
        // Notify popup if open
         if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'settingChanged', setting: 'searchVisibility', newValue: newSearchVisible }, response => {
                if (chrome.runtime.lastError) {
                    console.log("Popup not open or error in sending message: " + chrome.runtime.lastError.message);
                } else {
                    console.log("Search visibility change message sent, response:", response);
                }
            });
        }
    });
});
