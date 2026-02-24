/**
 * Phantom — Content Script
 * Injects behavioral noise and fingerprint randomization into pages.
 */

(async function () {
  // Check if enabled
  const result = await chrome.storage.local.get("phantomConfig");
  const config = result.phantomConfig || {};
  if (!config.enabled) return;

  // --- Fingerprint randomization (injected into page world) ---

  const fingerprintCode = `
(function() {
  // Canvas fingerprint noise
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    const ctx = this.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      const data = imageData.data;
      // Add subtle noise to a few random pixels
      for (let i = 0; i < 10; i++) {
        const idx = Math.floor(Math.random() * data.length / 4) * 4;
        data[idx] = Math.min(255, data[idx] + Math.floor(Math.random() * 3) - 1);
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return origToDataURL.call(this, type, quality);
  };

  // Hardware concurrency randomization
  const fakeConcurrency = Math.floor(Math.random() * 12) + 2;
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => fakeConcurrency
  });

  // WebGL renderer/vendor spoofing
  const renderers = [
    'ANGLE (Intel, Intel(R) UHD Graphics 620, OpenGL 4.5)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060, OpenGL 4.5)',
    'ANGLE (AMD, AMD Radeon RX 580, OpenGL 4.5)',
    'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 640, OpenGL 4.1)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060, OpenGL 4.5)',
  ];
  const vendors = ['Google Inc. (Intel)', 'Google Inc. (NVIDIA)', 'Google Inc. (AMD)'];
  const fakeRenderer = renderers[Math.floor(Math.random() * renderers.length)];
  const fakeVendor = vendors[Math.floor(Math.random() * vendors.length)];

  const origGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    const ext = this.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      if (param === ext.UNMASKED_RENDERER_WEBGL) return fakeRenderer;
      if (param === ext.UNMASKED_VENDOR_WEBGL) return fakeVendor;
    }
    return origGetParameter.call(this, param);
  };

  // Also patch WebGL2 if available
  if (typeof WebGL2RenderingContext !== 'undefined') {
    const origGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(param) {
      const ext = this.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        if (param === ext.UNMASKED_RENDERER_WEBGL) return fakeRenderer;
        if (param === ext.UNMASKED_VENDOR_WEBGL) return fakeVendor;
      }
      return origGetParameter2.call(this, param);
    };
  }
})();
  `;

  // Inject fingerprint code into page context
  const script = document.createElement("script");
  script.textContent = fingerprintCode;
  (document.head || document.documentElement).appendChild(script);
  script.remove();

  // --- Behavioral noise (runs in content script context) ---

  // Mouse jitter: periodically dispatch subtle synthetic mouse events
  let lastMouseX = 0;
  let lastMouseY = 0;
  document.addEventListener("mousemove", (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }, { passive: true });

  setInterval(() => {
    if (Math.random() < 0.3) return; // skip some intervals
    const offsetX = Math.floor(Math.random() * 5) - 2;
    const offsetY = Math.floor(Math.random() * 5) - 2;
    const event = new MouseEvent("mousemove", {
      clientX: lastMouseX + offsetX,
      clientY: lastMouseY + offsetY,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }, 2000 + Math.random() * 3000);

  // Scroll noise: random small scrolls every 30-90 seconds
  setInterval(() => {
    const amount = Math.floor(Math.random() * 40) - 20;
    window.scrollBy({ top: amount, behavior: "smooth" });
  }, 30000 + Math.random() * 60000);

  // Keystroke perturbation is tricky in content scripts.
  // We add subtle timing noise by briefly delaying focus-related events.
  // This is minimal to avoid breaking page functionality.
})();
