(() => {
  "use strict";

  const cleanText = (element) => (element?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

  function ensureGeoStyle() {
    if (document.getElementById("csi-geo-runtime-style")) return;
    const style = document.createElement("style");
    style.id = "csi-geo-runtime-style";
    style.textContent = `
      .csi-geo-seo,.csi-geo-seo *{box-sizing:border-box}
      .csi-geo-seo{--csi-geo-black:#000;--csi-geo-panel:#171717;--csi-geo-gold:#c9a227;--csi-geo-gold-light:#e7cf76;--csi-geo-white:#fff;--csi-geo-muted:#c2c2c2;--csi-geo-line:rgba(201,162,39,.27);width:min(1180px,100%);margin:42px auto 0;padding:28px 0 2px;border-top:1px solid var(--csi-geo-line);color:var(--csi-geo-white);background:transparent;font-family:Arial,Helvetica,sans-serif;text-align:left}
      .csi-geo-seo__header{max-width:920px}.csi-geo-seo__eyebrow{margin:0 0 9px;color:var(--csi-geo-gold-light)!important;font-size:10px;font-weight:900;letter-spacing:.16em;line-height:1.5;text-transform:uppercase}.csi-geo-seo__title{margin:0;color:var(--csi-geo-white)!important;font-family:Georgia,"Times New Roman",serif;font-size:clamp(23px,2.8vw,34px);font-weight:400;letter-spacing:-.025em;line-height:1.12}.csi-geo-seo__copy{max-width:900px;margin:11px 0 0;color:var(--csi-geo-muted)!important;font-size:13px;line-height:1.7}
      .csi-geo-seo__cities{margin-top:18px;display:flex;flex-wrap:wrap;gap:8px}.csi-geo-seo__cities a{min-height:36px;padding:9px 11px;display:inline-flex;align-items:center;border:1px solid var(--csi-geo-line);border-radius:2px;color:var(--csi-geo-gold-light)!important;background:rgba(23,23,23,.96);font-size:10px!important;font-weight:800;letter-spacing:.04em;line-height:1.4;text-decoration:none!important;text-transform:uppercase}.csi-geo-seo__cities a:hover,.csi-geo-seo__cities a:focus-visible{color:var(--csi-geo-black)!important;background:var(--csi-geo-gold);border-color:var(--csi-geo-gold)}
      .csi-geo-seo__links{margin-top:18px;padding-top:17px;display:flex;flex-wrap:wrap;gap:10px 24px;border-top:1px solid rgba(201,162,39,.16)}.csi-geo-seo__links a{color:var(--csi-geo-gold-light)!important;font-size:10px!important;font-weight:900;letter-spacing:.08em;line-height:1.55;text-decoration:none!important;text-transform:uppercase}.csi-geo-seo__links a:hover,.csi-geo-seo__links a:focus-visible{color:var(--csi-geo-white)!important;text-decoration:underline!important;text-decoration-color:var(--csi-geo-gold)!important;text-underline-offset:5px}.csi-geo-seo a:focus-visible{outline:2px solid var(--csi-geo-gold);outline-offset:4px}
      @media(max-width:590px){.csi-geo-seo{margin-top:32px;padding-top:24px}.csi-geo-seo__cities{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.csi-geo-seo__cities a{justify-content:center;text-align:center}.csi-geo-seo__links{display:grid;gap:12px}}
    `;
    document.head.appendChild(style);
  }

  function createPropertyGeoPanel() {
    if (window.location.pathname !== "/property-manager-landlord/") return null;
    const section = document.createElement("section");
    section.className = "csi-geo-seo";
    section.dataset.csiGeoSeo = "true";
    section.setAttribute("aria-label", "Dallas-Fort Worth and North Texas service area");
    section.innerHTML = `
      <div class="csi-geo-seo__header">
        <p class="csi-geo-seo__eyebrow">DFW &amp; North Texas service area</p>
        <h3 class="csi-geo-seo__title">24/7 response across the Dallas-Fort Worth Metroplex.</h3>
        <p class="csi-geo-seo__copy">CSI provides specialized crime scene, trauma and biohazard cleanup throughout DFW and North Texas, including Dallas, Fort Worth, Denton, Plano, Frisco, Arlington, Irving, McKinney and surrounding communities.</p>
      </div>
      <nav class="csi-geo-seo__cities" aria-label="Featured DFW service areas">
        <a href="/dallas-tx-response/">Dallas</a><a href="/fort-worth-tx-response/">Fort Worth</a><a href="/denton-tx-response/">Denton</a><a href="/plano-tx-response/">Plano</a><a href="/frisco-tx-response/">Frisco</a><a href="/arlington-tx-response/">Arlington</a><a href="/irving-tx-response/">Irving</a><a href="/mckinney-tx-response/">McKinney</a>
      </nav>
      <nav class="csi-geo-seo__links" aria-label="Regional cleanup services">
        <a href="/service-areas-in-texas/">Explore all service areas</a><a href="/crime-scene-cleaning-dfw/">Crime scene cleanup across DFW</a><a href="/biohazard-cleanup-in-dfw/">Biohazard cleanup across DFW</a>
      </nav>`;
    return section;
  }

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
    let geo = document.querySelector('.csi-geo-seo[data-csi-geo-seo="true"], .csi-geo-seo');
    if (!geo) {
      geo = createPropertyGeoPanel();
      if (!geo) return;
      ensureGeoStyle();
    }

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
