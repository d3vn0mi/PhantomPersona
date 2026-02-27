/**
 * Phantom — Content Script (thin loader)
 * Checks if enabled, then injects lib/fingerprint.js into page world
 * and loads lib/behavioral.js for content-script-level noise.
 */

(async function () {
  const result = await chrome.storage.local.get("phantomConfig");
  const config = result.phantomConfig || {};
  if (!config.enabled) return;

  // Inject fingerprint randomizer into page world (needs to override page APIs)
  const fpScript = document.createElement("script");
  fpScript.src = chrome.runtime.getURL("lib/fingerprint.js");
  (document.head || document.documentElement).appendChild(fpScript);
  fpScript.onload = () => fpScript.remove();

  // Load behavioral noise (runs in content script context)
  const bhScript = document.createElement("script");
  bhScript.src = chrome.runtime.getURL("lib/behavioral.js");
  (document.head || document.documentElement).appendChild(bhScript);
  bhScript.onload = () => bhScript.remove();
})();
