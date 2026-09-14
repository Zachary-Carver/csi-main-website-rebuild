(() => {
  "use strict";

  const INQUIRY_TARGET = "/contact-us#confidential-inquiry-form";
  const TYPES = {
    cleanup: "Cleanup / Scene Help", media: "Media or Speaking",
    vendor: "Vendor / Referral Information", feedback: "Client Feedback",
    recommendation: "Professional Recommendation", "privacy-request": "Privacy Request",
    documentation: "Company / Safety Documentation", other: "Other"
  };
  const ALIASES = { "privacy-question": "privacy-request", general: "other" };
  const PROFESSIONAL_TYPES = {
    media: "media", vendor: "vendor", feedback: "feedback", recommendation: "recommendation",
    "privacy-request": "privacy-request", documentation: "documentation", other: "general"
  };
  const INQUIRY_INTENT = /(submit\s+(?:a\s+)?confidential\s+inquiry|request\s+(?:confidential\s+)?help|open\s+(?:the\s+)?(?:full\s+)?inquiry\s+page|open\s+(?:the\s+)?form|inquiry\s+form|confidential\s+request|request\s+service|start\s+(?:a\s+)?confidential\s+request|get\s+(?:confidential\s+)?help)/i;

  const pagePath = () => window.location.pathname.replace(/\/+$/, "") || "/";
  const isHomepage = () => ["/", "/index.html", "/home"].includes(pagePath());
  const inquiryText = (link) => [link.textContent, link.getAttribute("aria-label"), link.getAttribute("title")].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const isInquiryMailto = (link) => Boolean(link && /^mailto:/i.test(link.getAttribute("href") || "") && INQUIRY_INTENT.test(inquiryText(link)));

  function normalizeInquiryLinks() {
    if (isHomepage()) return;
    document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
      if (!isInquiryMailto(link)) return;
      link.href = INQUIRY_TARGET; link.removeAttribute("target"); link.dataset.csiInquiryLink = "true";
    });
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.('a[href^="mailto:"]');
      if (!link || !isInquiryMailto(link)) return;
      event.preventDefault(); window.location.assign(INQUIRY_TARGET);
    });
  }

  function injectStyles() {
    if (document.getElementById("csi-inquiry-page-styles")) return;
    const style = document.createElement("style");
    style.id = "csi-inquiry-page-styles";
    style.textContent = `
      .csi-inquiry-page{background:#050505;color:#fff;border-top:1px solid rgba(201,162,39,.26);border-bottom:1px solid rgba(201,162,39,.26);font-family:Montserrat,Arial,sans-serif}.csi-inquiry-page *{box-sizing:border-box}.csi-inquiry-page [hidden]{display:none!important}
      .csi-inquiry-page__inner{width:min(calc(100% - 2*clamp(18px,4vw,64px)),1500px);margin:0 auto;padding:clamp(54px,7vw,96px) 0;display:grid;grid-template-columns:minmax(280px,.72fr) minmax(520px,1.28fr);gap:clamp(36px,6vw,84px);align-items:start}.csi-inquiry-page__eyebrow{margin:0 0 14px;color:#d8b54a;font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.csi-inquiry-page h2{margin:0 0 20px;color:#fff;font:400 clamp(42px,5vw,68px)/.98 Georgia,'Times New Roman',serif;letter-spacing:-.025em}.csi-inquiry-page__intro>p:not(.csi-inquiry-page__eyebrow){max-width:620px;margin:0 0 22px;color:#f0f0f0;font-size:16px;line-height:1.7}
      .csi-inquiry-page__contacts{display:grid;gap:10px;margin:28px 0 18px}.csi-inquiry-page__contact{display:flex;justify-content:space-between;gap:20px;align-items:center;min-height:54px;padding:14px 16px;border:1px solid rgba(201,162,39,.46);background:#151515;color:#fff;text-decoration:none;font-size:14px;font-weight:800}.csi-inquiry-page__contact strong{color:#e4bf37}.csi-inquiry-page__contact:hover,.csi-inquiry-page__contact:focus-visible{border-color:#d8b54a;background:#1c1a12}.csi-inquiry-page__notice{margin-top:18px!important;padding:14px 16px;border-left:3px solid #d8b54a;background:#151515;color:#e8e8e8!important;font-size:13px!important;line-height:1.55!important}
      .csi-inquiry-page__panel{padding:clamp(24px,4vw,44px);border:1px solid rgba(201,162,39,.48);background:#151515}.csi-inquiry-page__grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 16px}.csi-inquiry-page__field{display:grid;gap:7px}.csi-inquiry-page__field--wide{grid-column:1/-1}.csi-inquiry-page__field label{color:#fff;font-size:13px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.csi-inquiry-page__field input,.csi-inquiry-page__field select,.csi-inquiry-page__field textarea{width:100%;min-height:48px;padding:12px 14px;border:1px solid rgba(201,162,39,.45);border-radius:0;background:#101010;color:#fff;font:400 16px/1.45 Montserrat,Arial,sans-serif;outline:none}.csi-inquiry-page__field textarea{min-height:170px;resize:vertical}.csi-inquiry-page__field input::placeholder,.csi-inquiry-page__field textarea::placeholder{color:#a9a9a9}.csi-inquiry-page__field input:focus,.csi-inquiry-page__field select:focus,.csi-inquiry-page__field textarea:focus{border-color:#d8b54a;box-shadow:0 0 0 2px rgba(216,181,74,.18)}
      .csi-inquiry-page .csi-combined-contact__button{margin-top:18px;min-height:50px;padding:13px 22px;border:1px solid #d8b54a;background:#d8b54a;color:#080808;font-size:14px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;cursor:pointer}.csi-inquiry-page .csi-combined-contact__button:hover:not(:disabled),.csi-inquiry-page .csi-combined-contact__button:focus-visible:not(:disabled){background:#e5c654;border-color:#e5c654}.csi-inquiry-page .csi-combined-contact__button:disabled{background:#8f7725;border-color:#8f7725;color:#080808;cursor:wait}.csi-inquiry-page .csi-contact-status{min-height:1.5em;margin:14px 0 0;padding-left:12px;border-left:3px solid transparent;color:#fff;font-size:15px;line-height:1.45}.csi-inquiry-page .csi-contact-status[data-state="sending"],.csi-inquiry-page .csi-contact-status[data-state="success"]{border-left-color:#d8b54a}.csi-inquiry-page .csi-contact-status[data-state="error"]{border-left-color:#fff}.csi-inquiry-page .csi-turnstile-wrap{margin:18px 0 4px;min-height:65px}.csi-inquiry-page .csi-turnstile-note{margin:8px 0 14px!important;color:#d7d7d7!important;font-size:13px!important;line-height:1.5!important}.csi-inquiry-page .csi-turnstile-note a{color:#e4bf37}.csi-inquiry-hp{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}
      @media(max-width:900px){.csi-inquiry-page__inner{grid-template-columns:1fr;gap:34px}.csi-inquiry-page__intro{max-width:760px}}@media(max-width:620px){.csi-inquiry-page__inner{width:min(calc(100% - 36px),1500px);padding:48px 0}.csi-inquiry-page__grid{grid-template-columns:1fr}.csi-inquiry-page__field--wide{grid-column:auto}.csi-inquiry-page__contact{align-items:flex-start;flex-direction:column;gap:5px}.csi-inquiry-page .csi-combined-contact__button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function selectedType() {
    const requested = new URLSearchParams(location.search).get("inquiry") || "cleanup";
    const normalized = ALIASES[requested] || requested;
    return Object.hasOwn(TYPES, normalized) ? normalized : "cleanup";
  }

  function buildInquirySection() {
    if (pagePath() !== "/contact-us" || document.getElementById("confidential-inquiry-form")) return;
    injectStyles();
    const chosen = selectedType();
    const options = Object.entries(TYPES).map(([value, label]) => `<option value="${value}"${value === chosen ? " selected" : ""}>${label}</option>`).join("");
    const section = document.createElement("section");
    section.id = "confidential-inquiry-form"; section.className = "csi-inquiry-page"; section.setAttribute("aria-labelledby", "csi-inquiry-title");
    section.innerHTML = `<div class="csi-inquiry-page__inner"><div class="csi-inquiry-page__intro">
      <p class="csi-inquiry-page__eyebrow">Secure inquiry</p><h2 id="csi-inquiry-title">Tell us how we can help.</h2><p>You do not need to know the correct technical term or explain every detail. Select the type of inquiry and share only what is necessary for us to respond.</p>
      <div class="csi-inquiry-page__contacts" aria-label="Direct contact options"><a class="csi-inquiry-page__contact" href="tel:9406546334"><span>Call our support line</span><strong>940-654-6334</strong></a><a class="csi-inquiry-page__contact" href="mailto:dfw.csi.info@gmail.com"><span>Email CSI</span><strong>dfw.csi.info@gmail.com</strong></a></div><p class="csi-inquiry-page__notice">For immediate danger, an active crime scene, or a medical emergency, call 911 first. Do not send graphic photographs, medical records, legal documents, or highly sensitive personal information through this form.</p></div>
      <div class="csi-inquiry-page__panel"><form id="csi-dedicated-inquiry-form" action="/api/contact" method="post" novalidate><div class="csi-inquiry-page__grid">
      <div class="csi-inquiry-page__field csi-inquiry-page__field--wide"><label for="csi-inquiry-type">Inquiry type</label><select id="csi-inquiry-type" name="inquiry_type" required>${options}</select></div>
      <div class="csi-inquiry-page__field"><label for="csi-inquiry-name">Your name</label><input id="csi-inquiry-name" name="name" type="text" autocomplete="name" maxlength="100" required></div>
      <div class="csi-inquiry-page__field"><label for="csi-inquiry-phone">Phone number</label><input id="csi-inquiry-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30"></div>
      <div class="csi-inquiry-page__field"><label for="csi-inquiry-email">Email address</label><input id="csi-inquiry-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254"></div>
      <div class="csi-inquiry-page__field"><label for="csi-inquiry-location">City or general location</label><input id="csi-inquiry-location" name="location" type="text" autocomplete="address-level2" maxlength="120" placeholder="Example: Denton, TX"></div>
      <div id="csi-service-field" class="csi-inquiry-page__field"><label for="csi-inquiry-service">Service needed</label><select id="csi-inquiry-service" name="service"><option value="">Select a service</option><option>Crime Scene Cleanup</option><option>Trauma or Biohazard Cleanup</option><option>Blood or Bodily Fluid Cleanup</option><option>Unattended Death or Decomposition</option><option>Homicide or Suicide Cleanup</option><option>Hoarding or Extreme-Mess Cleanup</option><option>Advanced Odor Removal</option><option>Vehicle Biohazard Cleanup</option></select></div>
      <div class="csi-inquiry-page__field"><label for="csi-inquiry-method">Preferred contact method</label><select id="csi-inquiry-method" name="method"><option value="">Select a method</option><option>Phone</option><option>Email</option><option>Text message</option></select></div>
      <div class="csi-inquiry-page__field"><label for="csi-inquiry-organization">Organization (optional)</label><input id="csi-inquiry-organization" name="organization" type="text" autocomplete="organization" maxlength="160"></div>
      <div class="csi-inquiry-page__field csi-inquiry-page__field--wide"><label for="csi-inquiry-message">How can we help?</label><textarea id="csi-inquiry-message" name="message" maxlength="4000" required></textarea></div></div>
      <div class="csi-inquiry-hp" aria-hidden="true"><label for="csi-inquiry-company">Company website</label><input id="csi-inquiry-company" name="company_website" type="text" tabindex="-1" autocomplete="off"></div><div class="csi-turnstile-wrap"><div class="cf-turnstile" data-theme="dark"></div></div><p class="csi-turnstile-note">This form uses Cloudflare Turnstile for abuse prevention and Resend for secure email delivery. See our <a href="/privacy-policy/">Privacy Policy</a>.</p><button class="csi-combined-contact__button" type="submit" disabled>Submit confidential inquiry</button><p id="csi-dedicated-contact-status" class="csi-contact-status" role="status" aria-live="polite"></p></form></div></div>`;
    const page = document.querySelector(".csi-contact-page"), first = page?.querySelector("section.csi-contact-section");
    if (page && first?.parentNode === page) first.insertAdjacentElement("afterend", section);
    else { const footer = document.querySelector('.widget-footer, [role="contentinfo"]'); footer?.parentNode ? footer.parentNode.insertBefore(section, footer) : document.body.appendChild(section); }
  }

  async function loadTurnstile(status) {
    try {
      const response = await fetch("/api/turnstile-config", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error();
      const { siteKey } = await response.json(); if (!siteKey) throw new Error();
      if (!window.__csiTurnstileReady) window.__csiTurnstileReady = new Promise((resolve, reject) => {
        const script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; script.defer = true;
        script.addEventListener("load", resolve, { once: true }); script.addEventListener("error", reject, { once: true }); document.head.appendChild(script);
      });
      await window.__csiTurnstileReady; return siteKey;
    } catch { status.dataset.state = "error"; status.textContent = "Online security verification is temporarily unavailable. Please call 940-654-6334."; return ""; }
  }

  function initializeForm() {
    const form = document.getElementById("csi-dedicated-inquiry-form"); if (!form || form.dataset.csiBound === "true") return; form.dataset.csiBound = "true";
    const type = form.elements.inquiry_type, service = form.elements.service, phone = form.elements.phone, email = form.elements.email;
    const location = form.elements.location, method = form.elements.method, serviceField = document.getElementById("csi-service-field");
    const status = document.getElementById("csi-dedicated-contact-status"), submit = form.querySelector('button[type="submit"]'), host = form.querySelector(".cf-turnstile");
    let siteKey = "", widgetId, renderedAction = "", securityReady = false;
    const action = () => type.value === "cleanup" ? "contact" : "professional-inquiry";
    function renderTurnstile() {
      const next = action(); if (!siteKey || !window.turnstile || next === renderedAction) return;
      if (widgetId !== undefined) window.turnstile.remove(widgetId); host.replaceChildren();
      securityReady = false; submit.disabled = true;
      widgetId = window.turnstile.render(host, {
        sitekey: siteKey, theme: "dark", action: next,
        callback: () => { securityReady = true; submit.disabled = false; },
        "expired-callback": () => { securityReady = false; submit.disabled = true; },
        "error-callback": () => { securityReady = false; submit.disabled = true; status.dataset.state = "error"; status.textContent = "Online security verification is temporarily unavailable. Please call 940-654-6334."; }
      }); renderedAction = next;
    }
    function updateMode() {
      const cleanup = type.value === "cleanup"; serviceField.hidden = !cleanup; securityReady = false; submit.disabled = true;
      service.required = cleanup; phone.required = cleanup; location.required = cleanup; method.required = cleanup; email.required = !cleanup;
      form.action = cleanup ? "/api/contact" : "/api/professional-inquiry";
      submit.textContent = cleanup ? "Submit confidential inquiry" : "Submit inquiry";
      status.textContent = ""; status.removeAttribute("data-state"); renderTurnstile();
    }
    type.addEventListener("change", updateMode); updateMode(); loadTurnstile(status).then((key) => { siteKey = key; renderTurnstile(); });
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); if (!form.reportValidity()) return;
      if (!securityReady) { status.dataset.state = "error"; status.textContent = "Please wait for the security check to finish."; return; }
      const chosen = type.value, defaultLabel = submit.textContent; submit.disabled = true; submit.textContent = "Sending…"; status.dataset.state = "sending"; status.textContent = "Sending your inquiry…";
      try {
        const body = new FormData(form); if (chosen !== "cleanup") body.set("request_type", PROFESSIONAL_TYPES[chosen]);
        const response = await fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body }); const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "We could not send your inquiry.");
        form.reset(); type.value = chosen; renderedAction = ""; updateMode(); renderTurnstile(); status.dataset.state = "success";
        status.textContent = chosen === "cleanup" ? "Your confidential inquiry was sent. CSI will contact you as soon as possible." : "Your inquiry was sent. CSI will respond as soon as possible.";
      } catch (error) { status.dataset.state = "error"; status.textContent = error?.message || "We could not send your inquiry. Please call 940-654-6334."; if (widgetId !== undefined && window.turnstile) window.turnstile.reset(widgetId); }
      finally { submit.disabled = false; submit.textContent = defaultLabel; }
    });
  }

  function initialize() { normalizeInquiryLinks(); if (!isHomepage()) { buildInquirySection(); initializeForm(); } }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", initialize, { once: true }) : initialize();
})();
