(() => {
  "use strict";

  const analyticsId = "G-77H71FC77X";
  const consentKey = "csi-cookie-consent";

  function initializePrimaryNav() {
    if (document.getElementById("csi-primary-nav")) return;
    const style = document.createElement("style");
    style.textContent = `
      [data-aid="HEADER_NAV_RENDERED"], [data-aid="HAMBURGER_MENU_LINK"], [id$="-navId-mobile"] { display:none !important; }
      #csi-primary-nav{position:relative;z-index:1000;background:#080808;color:#fff;border-bottom:2px solid #d8b54a;font-family:Montserrat,Arial,sans-serif}
      #csi-primary-nav *{box-sizing:border-box}
      .csi-nav-shell{max-width:1180px;margin:auto;padding:12px 20px;display:flex;align-items:center;gap:24px}
      .csi-nav-brand{color:#fff;text-decoration:none;font-weight:800;letter-spacing:.04em;font-size:15px;white-space:nowrap}
      .csi-nav-links{margin-left:auto;display:flex;align-items:center;gap:6px}
      .csi-nav-links a,.csi-nav-links summary{color:#fff;text-decoration:none;padding:11px 10px;font-size:13px;font-weight:700;letter-spacing:.035em;cursor:pointer;list-style:none}
      .csi-nav-links summary::-webkit-details-marker{display:none}
      .csi-nav-links details{position:relative}
      .csi-nav-links details[open]>summary,.csi-nav-links a:hover,.csi-nav-links summary:hover{color:#ff5a5a}
      .csi-nav-menu{position:absolute;top:100%;left:0;min-width:260px;padding:8px;background:#111;border:1px solid #333;box-shadow:0 12px 30px rgba(0,0,0,.35);display:grid}
      .csi-nav-menu a{padding:9px 12px;font-size:12px}
      .csi-nav-contact{border:1px solid #c22;border-radius:999px}
      .csi-nav-toggle{display:none;margin-left:auto;background:transparent;color:#fff;border:1px solid #777;border-radius:4px;padding:8px 11px;font:700 13px Montserrat,Arial,sans-serif}
      @media(max-width:900px){
        .csi-nav-shell{flex-wrap:wrap;gap:10px}.csi-nav-toggle{display:block}.csi-nav-links{display:none;width:100%;margin:0;align-items:stretch;flex-direction:column;padding:8px 0}.csi-nav-links[data-open="true"]{display:flex}
        .csi-nav-links a,.csi-nav-links summary{display:block;padding:11px 4px}.csi-nav-menu{position:static;box-shadow:none;border:0;border-left:2px solid #a00;margin:0 0 6px 8px;background:#111}
      }
    `;
    document.head.appendChild(style);
    const nav = document.createElement("nav");
    nav.id = "csi-primary-nav";
    nav.setAttribute("aria-label", "Primary navigation");
    nav.innerHTML = `
      <div class="csi-nav-shell">
        <a class="csi-nav-brand" href="/">CSI: CLEAN SCENE INVESTIGATORS</a>
        <button class="csi-nav-toggle" type="button" aria-expanded="false" aria-controls="csi-nav-links">MENU</button>
        <div class="csi-nav-links" id="csi-nav-links">
          <a href="/">HOME</a>
          <details><summary>SERVICES</summary><div class="csi-nav-menu">
            <a href="/crime-scene-cleaning-dfw">Crime Scene Cleanup</a><a href="/biohazard-cleanup-in-dfw">Trauma &amp; Biohazard Cleanup</a><a href="/blood-cleanup-dallas-tx">Blood Cleanup</a><a href="/unattended-death-cleanup">Unattended Death Cleanup</a><a href="/decomposition-cleanup-dfw">Decomposition Cleanup</a><a href="/hoarding-cleanup-in-texas">Hoarding Cleanup</a><a href="/advanced-odor-removal-dfw">Odor Removal</a><a href="/vehicle-biohazard-dfw-tx">Vehicle Biohazard Cleanup</a>
          </div></details>
          <details><summary>RESOURCES</summary><div class="csi-nav-menu">
            <a href="/what-to-do-after-a-scene">What To Do After a Scene</a><a href="/professional-referrals">Professional Referrals</a><a href="/property-manager/landlord-1">Property Managers</a><a href="/insurance-%26-payment-help">Insurance &amp; Payment Help</a><a href="/safety-and-compliance">Safety &amp; Compliance</a><a href="/follow-us">Blog &amp; Socials</a>
          </div></details>
          <a href="/service-areas-in-texas">SERVICE AREAS</a>
          <a href="/about-us">ABOUT US</a>
          <a class="csi-nav-contact" href="/contact-us">CONTACT US</a>
        </div>
      </div>`;
    document.body.prepend(nav);
    const toggle = nav.querySelector(".csi-nav-toggle");
    const links = nav.querySelector(".csi-nav-links");
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      links.dataset.open = String(open);
    });
    nav.querySelectorAll("details").forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        nav.querySelectorAll("details[open]").forEach((other) => {
          if (other !== details) other.open = false;
        });
      });
    });
  }

  function setExpanded(control, panel, expanded) {
    control.setAttribute("aria-expanded", String(expanded));
    panel.hidden = !expanded;
    panel.style.display = expanded ? "block" : "none";
  }

  function closeDropdowns(except) {
    document.querySelectorAll('[data-aid="NAV_DROPDOWN"][aria-expanded="true"]').forEach((control) => {
      if (control === except) return;
      const panel = control.closest("li")?.querySelector('ul[data-ux="NavDropdown"]');
      if (panel) setExpanded(control, panel, false);
    });
  }

  function initializeNavigation() {
    document.querySelectorAll('[data-aid="NAV_DROPDOWN"][aria-expanded]').forEach((control) => {
      const panel = control.closest("li")?.querySelector('ul[data-ux="NavDropdown"]');
      if (!panel) return;
      panel.hidden = true;
      control.addEventListener("click", (event) => {
        event.preventDefault();
        const expanded = control.getAttribute("aria-expanded") === "true";
        closeDropdowns(control);
        setExpanded(control, panel, !expanded);
      });
    });

    document.querySelectorAll('[data-aid="HAMBURGER_MENU_LINK"]').forEach((control) => {
      const panel = document.getElementById(control.getAttribute("toggleId") || "");
      if (!panel) return;
      panel.hidden = true;
      control.addEventListener("click", (event) => {
        event.preventDefault();
        const expanded = control.getAttribute("aria-expanded") === "true";
        setExpanded(control, panel, !expanded);
        document.documentElement.classList.toggle("csi-menu-open", !expanded);
      });
      panel.querySelectorAll('[data-aid*="CLOSE"], a[href]:not([href="#"])').forEach((item) => {
        item.addEventListener("click", () => {
          setExpanded(control, panel, false);
          document.documentElement.classList.remove("csi-menu-open");
        });
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest('[data-aid="NAV_DROPDOWN"], ul[data-ux="NavDropdown"]')) {
        closeDropdowns();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeDropdowns();
      document.querySelectorAll('[data-aid="HAMBURGER_MENU_LINK"][aria-expanded="true"]').forEach((control) => {
        const panel = document.getElementById(control.getAttribute("toggleId") || "");
        if (panel) setExpanded(control, panel, false);
      });
      document.documentElement.classList.remove("csi-menu-open");
    });
  }

  function loadAnalytics() {
    if (document.querySelector(`script[data-csi-analytics="${analyticsId}"]`)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", analyticsId, { anonymize_ip: true });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`;
    script.dataset.csiAnalytics = analyticsId;
    document.head.appendChild(script);
  }

  function initializeCookieConsent() {
    const banner = document.querySelector('[data-aid="FOOTER_COOKIE_BANNER_RENDERED"]');
    const accept = document.querySelector('[data-aid="FOOTER_COOKIE_CLOSE_RENDERED"]');
    const decline = document.querySelector('[data-aid="FOOTER_COOKIE_DECLINE_RENDERED"]');
    const choice = localStorage.getItem(consentKey);
    if (choice === "accepted") loadAnalytics();
    if (!banner) return;
    banner.hidden = choice === "accepted" || choice === "declined";
    banner.style.display = banner.hidden ? "none" : "";
    const save = (value) => (event) => {
      event.preventDefault();
      localStorage.setItem(consentKey, value);
      banner.hidden = true;
      banner.style.display = "none";
      if (value === "accepted") loadAnalytics();
    };
    accept?.addEventListener("click", save("accepted"));
    decline?.addEventListener("click", save("declined"));
  }

  function initializeStaticContent() {
    document.querySelectorAll("[data-lazybg].d-none").forEach((element) => {
      element.classList.remove("d-none");
    });
    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const values = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      values.add("noopener");
      values.add("noreferrer");
      link.setAttribute("rel", [...values].join(" "));
    });
  }

  function initialize() {
    initializePrimaryNav();
    initializeStaticContent();
    initializeNavigation();
    initializeCookieConsent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
