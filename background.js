// =====================================================
// BACKGROUND.JS - Extension Service Worker
// Runs in the background and handles extension lifecycle events
// =====================================================

// Fires when the extension is first installed or updated
chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ Commerce AI Navigator installed successfully');

    // Potential additions:
    // - Open a welcome/onboarding page
    // - Initialise default settings in chrome.storage
    // - Register context menu items
});

// Tracks tab switches (available for future use)
chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log(`Active tab: ${activeInfo.tabId}`);
});