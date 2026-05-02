chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "INVESTIQ_TOGGLE_OVERLAY" }).catch(() => {
    // The content script may be unavailable on restricted Chrome pages.
  });
});
