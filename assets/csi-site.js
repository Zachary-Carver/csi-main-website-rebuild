(() => {
  "use strict";

  const analyticsId = "G-77H71FC77X";
  const consentKey = "csi-cookie-consent";

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
