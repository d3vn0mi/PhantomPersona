/**
 * Phantom — Phantom Browser Module
 * Handles opening background tabs and executing decoy actions.
 */

export async function openPhantomTab(url, dwellMs = 5000) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      setTimeout(() => {
        chrome.tabs.remove(tab.id, () => {
          if (chrome.runtime.lastError) {
            // Tab may have been closed already — that's fine
          }
          resolve();
        });
      }, dwellMs);
    });
  });
}

export async function executeSearch(query, engine = "google") {
  const encodedQuery = encodeURIComponent(query);
  const engineUrls = {
    google: `https://www.google.com/search?q=${encodedQuery}`,
    bing: `https://www.bing.com/search?q=${encodedQuery}`,
    duckduckgo: `https://duckduckgo.com/?q=${encodedQuery}`,
    yahoo: `https://search.yahoo.com/search?p=${encodedQuery}`,
  };
  const url = engineUrls[engine] || engineUrls.google;
  // Dwell time: 3-10 seconds (realistic search page viewing)
  const dwellMs = 3000 + Math.random() * 7000;
  await openPhantomTab(url, dwellMs);
}

export async function executeProductBrowse(site, searchTerm) {
  const encodedTerm = encodeURIComponent(searchTerm);
  const siteUrls = {
    amazon: `https://www.amazon.com/s?k=${encodedTerm}`,
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${encodedTerm}`,
    walmart: `https://www.walmart.com/search?q=${encodedTerm}`,
    target: `https://www.target.com/s?searchTerm=${encodedTerm}`,
    bestbuy: `https://www.bestbuy.com/site/searchpage.jsp?st=${encodedTerm}`,
    etsy: `https://www.etsy.com/search?q=${encodedTerm}`,
  };
  const url = siteUrls[site] || siteUrls.amazon;
  // Dwell time: 5-15 seconds (browsing product results)
  const dwellMs = 5000 + Math.random() * 10000;
  await openPhantomTab(url, dwellMs);
}

export async function executePageVisit(url, dwellSeconds = 30) {
  await openPhantomTab(url, dwellSeconds * 1000);
}
