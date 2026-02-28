document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('enabledToggle');

    // Load current state
    chrome.storage.local.get(['enabled'], (result) => {
        // Default to true if not set
        const isEnabled = result.enabled !== false;
        toggle.checked = isEnabled;
    });

    // Handle toggle change
    toggle.addEventListener('change', () => {
        const isEnabled = toggle.checked;
        chrome.storage.local.set({ enabled: isEnabled }, () => {
            console.log('Recorder status updated:', isEnabled);
        });
    });
});
