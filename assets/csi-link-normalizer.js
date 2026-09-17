(() => {
  "use strict";

  const routes = new Map([
    ["/insurance-&-payment-help", "/insurance-payment-help/"],
    ["/media,-speaking-&-press", "/media-speaking-press/"],
    ["/follow-us/f/247-crime-scene-biohazard-cleanup-in-dfw-|-csi-clean-scene-in", "/follow-us/f/247-crime-scene-biohazard-cleanup-dfw/"],
    ["/follow-us/f/some-people-think-“cleaning”-is-just-wiping-surfaces…", "/follow-us/f/some-people-think-cleaning-is-just-wiping-surfaces/"],
    ["/follow-us/f/spring-cleaning-isn’t-enough-here’s-what-your-home-actually-need", "/follow-us/f/spring-cleaning-isnt-enough-heres-what-your-home-actually-needs/"],
    ["/follow-us/f/unattended-death-cleanup-denton-tx-|-csi-clean-scene-investigator", "/follow-us/f/unattended-death-cleanup-denton-tx/"],
    ["/follow-us/f/when-the-crime-scene-is-over-the-biohazard-risk-isn’t", "/follow-us/f/when-the-crime-scene-is-over-the-biohazard-risk-isnt/"],
    ["/follow-us/f/who-cleans-up-after-a-crime-scene-in-texas-|-csi", "/follow-us/f/who-cleans-up-after-a-crime-scene-in-texas/"],
    ["/follow-us/f/🚨-this-is-why-you-don’t-clean-it-yourself-🚨", "/follow-us/f/this-is-why-you-dont-clean-it-yourself/"]
  ]);

  const stripSlash = (value) => value === "/" ? value : value.replace(/\/+$/, "");
  const decode = (value) => {
    try { return decodeURIComponent(value); } catch { return value; }
  };

  function normalizeHref(raw) {
    if (!raw || /^(?:mailto:|tel:|sms:|javascript:|data:|#)/i.test(raw)) return raw;
    try {
      const url = new URL(raw, window.location.href);
      if (url.origin !== window.location.origin) return raw;
      const mapped = routes.get(stripSlash(decode(url.pathname)));
      if (!mapped) return raw;
      url.pathname = mapped;
      return /^https?:/i.test(raw) ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return raw;
    }
  }

  function normalize(root = document) {
    root.querySelectorAll?.("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      const normalized = normalizeHref(href);
      if (normalized && normalized !== href) link.setAttribute("href", normalized);
    });
  }

  function start() {
    normalize();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.matches?.("a[href]")) {
            const href = node.getAttribute("href");
            const normalized = normalizeHref(href);
            if (normalized && normalized !== href) node.setAttribute("href", normalized);
          }
          normalize(node);
        });
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
