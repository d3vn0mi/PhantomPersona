/**
 * Phantom — Background Service Worker
 * Polls the backend for browsing plans and executes phantom actions.
 */

const DEFAULT_CONFIG = {
  backendUrl: "http://localhost:8000",
  dashboardUrl: "http://localhost:3000",
  apiKey: "",
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

// --- Auth headers ---

function authHeaders(apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
}

// --- Plan fetching with exponential backoff ---

let consecutiveFailures = 0;

async function fetchNextPlans(backendUrl, apiKey) {
  const resp = await fetch(`${backendUrl}/api/plans/next`, {
    headers: authHeaders(apiKey),
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  consecutiveFailures = 0;
  return resp.json();
}

async function completePlan(backendUrl, apiKey, planId, actionsCompleted) {
  await fetch(`${backendUrl}/api/plans/${planId}/complete`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ actions_completed: actionsCompleted }),
  });
}

// --- Plan validation ---

function isValidPlan(plan) {
  if (!plan || !plan.plan_data) return false;
  const d = plan.plan_data;
  if (!Array.isArray(d.searches) && !Array.isArray(d.page_visits) && !Array.isArray(d.product_browsing)) {
    return false;
  }
  return true;
}

// --- Tab execution (one at a time) ---

let executing = false;

async function openPhantomTab(url, dwellMs = 5000) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        console.warn("[Phantom] Tab create failed:", chrome.runtime.lastError.message);
        return resolve();
      }
      setTimeout(() => {
        chrome.tabs.remove(tab.id, () => {
          if (chrome.runtime.lastError) {
            // Tab already closed — not an error
          }
          resolve();
        });
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

async function executePlan(backendUrl, apiKey, plan) {
  if (!isValidPlan(plan)) {
    console.warn("[Phantom] Skipping invalid plan:", plan?.id);
    return;
  }

  const data = plan.plan_data;
  const allActions = [];

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
      await new Promise((r) => setTimeout(r, 10000 + Math.random() * 50000));
    } catch (err) {
      console.warn("[Phantom] Action failed:", err);
    }
  }

  await completePlan(backendUrl, apiKey, plan.id, batch.length);
}

// --- Alarm handler with exponential backoff ---

async function onAlarm() {
  if (executing) return;

  const config = await getConfig();
  if (!config.enabled) return;

  // Exponential backoff: skip polls when failing
  if (consecutiveFailures > 0) {
    const backoffMs = Math.min(2 ** consecutiveFailures * 2000, 16000);
    const skipChance = 1 - 1 / (consecutiveFailures + 1);
    if (Math.random() < skipChance) {
      console.log(`[Phantom] Backing off (${consecutiveFailures} failures), skipping poll`);
      return;
    }
  }

  executing = true;
  try {
    const plans = await fetchNextPlans(config.backendUrl, config.apiKey);
    if (plans.length > 0) {
      await executePlan(config.backendUrl, config.apiKey, plans[0]);
    }
  } catch (err) {
    consecutiveFailures++;
    console.warn(`[Phantom] Polling error (failure #${consecutiveFailures}):`, err);
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
