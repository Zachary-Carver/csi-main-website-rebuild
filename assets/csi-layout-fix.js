(() => {
  "use strict";

  const cleanText = (element) => (element?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

  function findClosingCtaSection(geo) {
    const sections = [...document.querySelectorAll("section")].filter(
      (section) => section !== geo && !section.contains(geo) && !geo.contains(section)
    );

    return sections.reverse().find((section) => {
      const text = cleanText(section);
      return (
        text.includes("you do not have to do this alone") ||
        text.includes("you do not have to handle this alone") ||
        text.includes("you do not have to know what happens next") ||
        text.includes("submit confidential inquiry")
      );
    });
  }

  function findFallbackSection(geo) {
    const footer = document.querySelector("footer");
    const sections = [...document.querySelectorAll("section")].filter((section) => {
      if (section === geo || section.contains(geo) || geo.contains(section)) return false;
      if (!footer) return true;
      return Boolean(section.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    return sections.at(-1) || null;
  }

  function repositionGeoPanel() {
    const geo = document.querySelector('.csi-geo-seo[data-csi-geo-seo="true"], .csi-geo-seo');
    if (!geo) return;

    const anchor = findClosingCtaSection(geo) || findFallbackSection(geo);
    if (!anchor || !anchor.parentNode) return;

    anchor.parentNode.insertBefore(geo, anchor);
  }

  function start() {
    requestAnimationFrame(repositionGeoPanel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
