document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('enabledToggle');
    const btnOpenDemo = document.getElementById('btnOpenDemo');

    // Load current state
    chrome.storage.local.get(['enabled'], (result) => {
        const isEnabled = result.enabled !== false;
        toggle.checked = isEnabled;
    });

    // Handle toggle change
    toggle.addEventListener('change', () => {
        const isEnabled = toggle.checked;
        chrome.storage.local.set({ enabled: isEnabled }, () => {
            console.log('[Tracky] Status updated:', isEnabled);
        });
    });

    // Open demo playground page
    if (btnOpenDemo) {
        btnOpenDemo.addEventListener('click', () => {
            const demoUrl = chrome.runtime.getURL('demo.html');
            chrome.tabs.create({ url: demoUrl });
        });
    }
});
