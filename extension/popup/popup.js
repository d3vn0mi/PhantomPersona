/**
 * Phantom — Popup Script
 */

const enabledToggle = document.getElementById("enabledToggle");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const actionsCount = document.getElementById("actionsCount");
const backendUrlInput = document.getElementById("backendUrl");
const dashboardLink = document.getElementById("dashboardLink");

async function loadConfig() {
  const result = await chrome.storage.local.get("phantomConfig");
  const config = result.phantomConfig || {
    backendUrl: "http://localhost:8000",
    enabled: false,
    actionsToday: 0,
    lastResetDate: new Date().toDateString(),
  };

  const today = new Date().toDateString();
  if (config.lastResetDate !== today) {
    config.actionsToday = 0;
    config.lastResetDate = today;
    await chrome.storage.local.set({ phantomConfig: config });
  }

  enabledToggle.checked = config.enabled;
  backendUrlInput.value = config.backendUrl;
  actionsCount.textContent = config.actionsToday;
  updateStatus(config.enabled);
}

function updateStatus(enabled) {
  if (enabled) {
    statusDot.className = "status-dot active";
    statusText.textContent = "Active — generating noise";
  } else {
    statusDot.className = "status-dot paused";
    statusText.textContent = "Paused";
  }
}

enabledToggle.addEventListener("change", async () => {
  const enabled = enabledToggle.checked;
  const result = await chrome.storage.local.get("phantomConfig");
  const config = result.phantomConfig || {};
  config.enabled = enabled;
  await chrome.storage.local.set({ phantomConfig: config });
  updateStatus(enabled);
});

let urlTimeout;
backendUrlInput.addEventListener("input", () => {
  clearTimeout(urlTimeout);
  urlTimeout = setTimeout(async () => {
    const result = await chrome.storage.local.get("phantomConfig");
    const config = result.phantomConfig || {};
    config.backendUrl = backendUrlInput.value;
    await chrome.storage.local.set({ phantomConfig: config });
  }, 500);
});

dashboardLink.addEventListener("click", async () => {
  const result = await chrome.storage.local.get("phantomConfig");
  const config = result.phantomConfig || {};
  const dashboardUrl = config.dashboardUrl || "http://localhost:3000";
  chrome.tabs.create({ url: dashboardUrl });
});

loadConfig();
