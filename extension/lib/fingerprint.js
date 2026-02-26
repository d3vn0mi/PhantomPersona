/**
 * Phantom — Fingerprint Randomizer
 * This file is injected into the page context to override browser APIs
 * used for fingerprinting.
 */

(function () {
  "use strict";

  // --- Canvas fingerprint noise ---
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const origToBlob = HTMLCanvasElement.prototype.toBlob;

  function addCanvasNoise(canvas) {
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx || canvas.width === 0 || canvas.height === 0) return;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      // Modify a small number of random pixels by +/- 1
      const modifications = Math.min(20, Math.floor(pixels.length / 400));
      for (let i = 0; i < modifications; i++) {
        const idx = Math.floor(Math.random() * (pixels.length / 4)) * 4;
        const channel = Math.floor(Math.random() * 3); // R, G, or B
        const delta = Math.random() < 0.5 ? -1 : 1;
        pixels[idx + channel] = Math.max(
          0,
          Math.min(255, pixels[idx + channel] + delta)
        );
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (e) {
      // SecurityError if canvas is tainted — ignore
    }
  }

  HTMLCanvasElement.prototype.toDataURL = function (...args) {
    addCanvasNoise(this);
    return origToDataURL.apply(this, args);
  };

  HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
    addCanvasNoise(this);
    return origToBlob.call(this, callback, ...args);
  };

  // --- Hardware concurrency ---
  const fakeHWConcurrency = [2, 4, 6, 8, 10, 12, 16][
    Math.floor(Math.random() * 7)
  ];
  Object.defineProperty(navigator, "hardwareConcurrency", {
    get: () => fakeHWConcurrency,
    configurable: true,
  });

  // --- Screen dimensions noise ---
  const screenWidthNoise = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
  const screenHeightNoise = Math.floor(Math.random() * 3) - 1;
  const origWidth = screen.width;
  const origHeight = screen.height;

  Object.defineProperty(screen, "width", {
    get: () => origWidth + screenWidthNoise,
    configurable: true,
  });
  Object.defineProperty(screen, "height", {
    get: () => origHeight + screenHeightNoise,
    configurable: true,
  });

  // --- WebGL renderer/vendor spoofing ---
  const renderers = [
    "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 640 OpenGL Engine)",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (Intel, Intel(R) HD Graphics 530 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (AMD, AMD Radeon Pro 5500M OpenGL Engine)",
  ];
  const vendors = [
    "Google Inc. (Intel)",
    "Google Inc. (NVIDIA)",
    "Google Inc. (AMD)",
    "Google Inc. (Apple)",
  ];

  const fakeRenderer = renderers[Math.floor(Math.random() * renderers.length)];
  const fakeVendor = vendors[Math.floor(Math.random() * vendors.length)];

  function patchWebGLGetParameter(proto) {
    const orig = proto.getParameter;
    proto.getParameter = function (param) {
      const ext = this.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        if (param === ext.UNMASKED_RENDERER_WEBGL) return fakeRenderer;
        if (param === ext.UNMASKED_VENDOR_WEBGL) return fakeVendor;
      }
      return orig.call(this, param);
    };
  }

  patchWebGLGetParameter(WebGLRenderingContext.prototype);
  if (typeof WebGL2RenderingContext !== "undefined") {
    patchWebGLGetParameter(WebGL2RenderingContext.prototype);
  }
})();
