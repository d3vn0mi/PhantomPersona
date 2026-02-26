/**
 * Phantom — Behavioral Noise Module
 * Adds subtle human-like noise to mouse, scroll, and timing patterns.
 * Runs as a content script.
 */

(function () {
  "use strict";

  // --- Mouse jitter ---
  // Track real mouse position, periodically emit small synthetic movements

  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener(
    "mousemove",
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    },
    { passive: true }
  );

  function emitMouseJitter() {
    // Small random offset: -3 to +3 pixels
    const dx = Math.floor(Math.random() * 7) - 3;
    const dy = Math.floor(Math.random() * 7) - 3;
    const event = new MouseEvent("mousemove", {
      clientX: mouseX + dx,
      clientY: mouseY + dy,
      bubbles: true,
      cancelable: false,
    });
    document.dispatchEvent(event);
  }

  // Emit jitter every 2-5 seconds, with 30% chance of skipping
  setInterval(() => {
    if (Math.random() < 0.3) return;
    emitMouseJitter();
  }, 2000 + Math.random() * 3000);

  // --- Scroll noise ---
  // Subtle random scrolls every 30-90 seconds

  function emitScrollNoise() {
    const direction = Math.random() < 0.5 ? 1 : -1;
    const amount = Math.floor(Math.random() * 30 + 5) * direction;
    window.scrollBy({
      top: amount,
      behavior: "smooth",
    });
  }

  function scheduleNextScroll() {
    const delay = 30000 + Math.random() * 60000; // 30-90 seconds
    setTimeout(() => {
      emitScrollNoise();
      scheduleNextScroll();
    }, delay);
  }

  scheduleNextScroll();

  // --- Keystroke timing perturbation ---
  // We add a tiny random delay (5-30ms) to keydown events.
  // This is done carefully to avoid breaking page functionality.

  document.addEventListener(
    "keydown",
    (e) => {
      // Only perturb on regular text input, not modifiers or special keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length !== 1) return; // Skip non-character keys

      // Add a subtle synthetic keypress noise after a short random delay
      const delay = 5 + Math.random() * 25;
      setTimeout(() => {
        // Dispatch a harmless compositionupdate event to add timing noise
        // This is picked up by some behavioral biometric trackers
        const noiseEvent = new Event("compositionupdate", { bubbles: true });
        e.target?.dispatchEvent(noiseEvent);
      }, delay);
    },
    { passive: true, capture: false }
  );
})();
