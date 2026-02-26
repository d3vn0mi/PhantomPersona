/**
 * Phantom — Background Service Worker
 * Polls the backend for browsing plans and executes phantom actions.
 */

const DEFAULT_CONFIG = {
  backendUrl: "http://localhost:8000",
  enabled: true,
  actionsToday: 0,
  lastResetDate: new Date().toDateString(),
};

// --- Config helpers ---

async function getConfig() {
  const result = await chrome.storage.local.get("phantomConfig");
  return { ...DEFAULT_CONFIG, ...result.phantomConfig };
}

async function setConfig(updates) {
  const config = await getConfig();
  const merged = { ...config, ...updates };
  await chrome.storage.local.set({ phantomConfig: merged });
  return merged;
}

async function incrementActions(count = 1) {
  const config = await getConfig();
  const today = new Date().toDateString();
  if (config.lastResetDate !== today) {
    await setConfig({ actionsToday: count, lastResetDate: today });
  } else {
    await setConfig({ actionsToday: config.actionsToday + count });
  }
}

// --- Plan fetching ---

async function fetchNextPlans(backendUrl) {
  const resp = await fetch(`${backendUrl}/api/plans/next`);
  if (!resp.ok) return [];
  return resp.json();
}

async function completePlan(backendUrl, planId, actionsCompleted) {
  await fetch(`${backendUrl}/api/plans/${planId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actions_completed: actionsCompleted }),
  });
}

// --- Tab execution (one at a time) ---

let executing = false;

async function openPhantomTab(url, dwellMs = 5000) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      setTimeout(() => {
        chrome.tabs.remove(tab.id, () => resolve());
      }, dwellMs);
    });
  });
}

async function executeSearch(query, engine = "google") {
  const encodedQuery = encodeURIComponent(query);
  const urls = {
    google: `https://www.google.com/search?q=${encodedQuery}`,
    bing: `https://www.bing.com/search?q=${encodedQuery}`,
    duckduckgo: `https://duckduckgo.com/?q=${encodedQuery}`,
  };
  const url = urls[engine] || urls.google;
  await openPhantomTab(url, 3000 + Math.random() * 7000);
}

async function executePageVisit(url, dwellSeconds = 30) {
  await openPhantomTab(url, dwellSeconds * 1000);
}

async function executeProductBrowse(site, searchTerm) {
  const urls = {
    amazon: `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}`,
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}`,
    walmart: `https://www.walmart.com/search?q=${encodeURIComponent(searchTerm)}`,
    target: `https://www.target.com/s?searchTerm=${encodeURIComponent(searchTerm)}`,
  };
  const url = urls[site] || urls.amazon;
  await openPhantomTab(url, 5000 + Math.random() * 10000);
}

// --- Plan execution ---

async function executePlan(backendUrl, plan) {
  const data = plan.plan_data;
  const allActions = [];

  // Merge all actions with their type and sort by time_offset_min
  for (const s of data.searches || []) {
    allActions.push({ type: "search", ...s });
  }
  for (const p of data.page_visits || []) {
    allActions.push({ type: "page_visit", ...p });
  }
  for (const pb of data.product_browsing || []) {
    allActions.push({ type: "product_browse", ...pb });
  }
  allActions.sort((a, b) => a.time_offset_min - b.time_offset_min);

  // Execute a random subset (don't do everything at once)
  const batchSize = Math.min(5, allActions.length);
  const batch = allActions.slice(0, batchSize);

  for (const action of batch) {
    try {
      if (action.type === "search") {
        await executeSearch(action.query, action.engine);
      } else if (action.type === "page_visit") {
        await executePageVisit(action.url, action.dwell_seconds);
      } else if (action.type === "product_browse") {
        await executeProductBrowse(action.site, action.search);
      }
      await incrementActions();
      // Random pause between actions (10-60 seconds)
      await new Promise((r) => setTimeout(r, 10000 + Math.random() * 50000));
    } catch (err) {
      console.warn("[Phantom] Action failed:", err);
    }
  }

  await completePlan(backendUrl, plan.id, batch.length);
}

// --- Alarm handler ---

async function onAlarm() {
  if (executing) return;

  const config = await getConfig();
  if (!config.enabled) return;

  executing = true;
  try {
    const plans = await fetchNextPlans(config.backendUrl);
    if (plans.length > 0) {
      await executePlan(config.backendUrl, plans[0]);
    }
  } catch (err) {
    console.warn("[Phantom] Polling error:", err);
  } finally {
    executing = false;
  }
}

// --- Lifecycle ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ phantomConfig: DEFAULT_CONFIG });
  chrome.alarms.create("phantomPoll", { periodInMinutes: 5 });
  console.log("[Phantom] Installed and alarm set.");
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "phantomPoll") {
    onAlarm();
  }
});
