import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = (process.argv[2] || "https://cleansceneinvestigators.com").replace(/\/$/, "");
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "full-site-audit.json");
const SKIP_DIRS = new Set([".git", "node_modules", "_site", "output", "outputs"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, files);
    else if (entry.name.endsWith(".html")) files.push(abs);
  }
  return files;
}

function routeFor(file) {
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");
  if (rel === "index.html") return "/";
  if (rel === "404.html") return "/__csi_audit_missing_page__";
  return "/" + rel.replace(/index\.html$/, "");
}

const sourceFiles = walk(ROOT);
const routes = [...new Set(sourceFiles.map(routeFor))].sort();
const issues = [];
const pageResults = [];
const internalTargets = new Set();
const externalButtonTargets = new Set();
const inquiryIntent = /(submit\s+(?:a\s+)?confidential\s+inquiry|request\s+(?:confidential\s+)?help|open\s+(?:the\s+)?(?:full\s+)?inquiry\s+page|open\s+(?:the\s+)?form|inquiry\s+form|confidential\s+request|request\s+service|start\s+(?:a\s+)?confidential\s+request|get\s+(?:confidential\s+)?help|share\s+private\s+feedback|send\s+recommendation|submit\s+(?:a\s+)?media\s+inquiry|submit\s+(?:a\s+)?privacy\s+request|ask\s+(?:a\s+)?privacy\s+question|request\s+vendor\s+information|request\s+company\s+documentation)/i;

function addIssue(severity, route, type, detail) { issues.push({ severity, route, type, detail }); }
function cleanUrl(value) { try { return new URL(value, BASE + "/"); } catch { return null; } }

async function checkUrl(urlString) {
  let current = urlString;
  const chain = [];
  for (let hop = 0; hop < 6; hop++) {
    let response;
    try {
      response = await fetch(current, { redirect: "manual", headers: { "user-agent": "CSI-Full-Site-Audit/1.0" } });
    } catch (error) {
      return { ok: false, final: current, chain, error: String(error) };
    }
    chain.push({ url: current, status: response.status, location: response.headers.get("location") || "" });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      current = new URL(response.headers.get("location"), current).href;
      continue;
    }
    return { ok: response.status < 400, final: current, status: response.status, chain };
  }
  return { ok: false, final: current, chain, error: "too many redirects" };
}

const browser = await chromium.launch({ headless: true });
try {
  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "failed"}`));

    let response;
    try {
      response = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(350);
    } catch (error) {
      addIssue("critical", route, "page-load", String(error));
      await context.close();
      continue;
    }

    const desktop = await page.evaluate(({ inquirySource }) => {
      const inquiryRx = new RegExp(inquirySource, "i");
      const isVisible = (el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0 && r.width > 0 && r.height > 0;
      };
      const labelFor = (el) => (el.innerText || el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || "").replace(/\s+/g, " ").trim();
      const anchors = [...document.querySelectorAll("a")].map((el, i) => {
        const rawHref = el.getAttribute("href") || "";
        let fragmentExists = true;
        if (rawHref.startsWith("#") && rawHref.length > 1) {
          let id = rawHref.slice(1);
          try { id = decodeURIComponent(id); } catch {}
          fragmentExists = !!document.getElementById(id);
        }
        return {
          i,
          text: labelFor(el),
          href: rawHref,
          absoluteHref: el.href || "",
          visible: isVisible(el),
          className: typeof el.className === "string" ? el.className : "",
          role: el.getAttribute("role") || "",
          fontSize: parseFloat(getComputedStyle(el).fontSize) || 0,
          buttonLike: /button|btn|cta/i.test(typeof el.className === "string" ? el.className : "") || el.getAttribute("role") === "button",
          fragmentExists
        };
      });
      const buttons = [...document.querySelectorAll("button,[role='button']")].map((el, i) => ({
        i,
        text: labelFor(el),
        tag: el.tagName,
        visible: isVisible(el),
        disabled: !!el.disabled || el.getAttribute("aria-disabled") === "true",
        type: el.getAttribute("type") || "",
        controls: el.getAttribute("aria-controls") || "",
        expanded: el.getAttribute("aria-expanded") || "",
        fontSize: parseFloat(getComputedStyle(el).fontSize) || 0,
        inForm: !!el.closest("form"),
        dataAid: el.getAttribute("data-aid") || ""
      }));
      const summaries = [...document.querySelectorAll("summary")].map((el, i) => ({ i, text: labelFor(el), visible: isVisible(el), open: !!el.closest("details")?.open }));
      const forms = [...document.querySelectorAll("form")].map((el) => ({
        id: el.id || "",
        action: el.getAttribute("action") || "",
        method: (el.getAttribute("method") || "get").toLowerCase(),
        visible: isVisible(el),
        submitButtons: el.querySelectorAll('button[type="submit"],input[type="submit"]').length
      }));
      const ids = [...document.querySelectorAll("[id]")].map((el) => el.id).filter(Boolean);
      const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
      const tinyText = [...document.querySelectorAll("p,li,label,a,button,summary")]
        .filter(isVisible)
        .map((el) => ({ tag: el.tagName, text: labelFor(el).slice(0, 120), size: parseFloat(getComputedStyle(el).fontSize) || 0 }))
        .filter((item) => item.text && item.size > 0 && item.size < 12)
        .slice(0, 20);
      return {
        anchors, buttons, summaries, forms, duplicateIds, tinyText,
        h1s: document.querySelectorAll("h1").length,
        canonical: document.querySelector('link[rel="canonical"]')?.href || "",
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        inquiryMailtos: anchors.filter((a) => /^mailto:/i.test(a.href) && inquiryRx.test(a.text)),
        title: document.title,
        finalUrl: location.href
      };
    }, { inquirySource: inquiryIntent.source });

    const status = response?.status() || 0;
    const expected404 = route === "/__csi_audit_missing_page__";
    if (expected404 ? status !== 404 : status >= 400) addIssue("critical", route, "http-status", `status ${status}`);
    if (!expected404 && desktop.h1s !== 1) addIssue("high", route, "h1-count", `${desktop.h1s} H1 elements`);
    if (desktop.duplicateIds.length) addIssue("high", route, "duplicate-ids", desktop.duplicateIds.join(", "));
    if (desktop.overflow) addIssue("high", route, "desktop-overflow", "horizontal overflow at 1440px");
    if (desktop.tinyText.length) addIssue("medium", route, "tiny-text", JSON.stringify(desktop.tinyText));
    if (!expected404 && !desktop.canonical) addIssue("high", route, "canonical", "missing canonical");
    if (desktop.inquiryMailtos.length) addIssue("critical", route, "inquiry-mailto", JSON.stringify(desktop.inquiryMailtos));

    for (const anchor of desktop.anchors) {
      if (!anchor.visible) continue;
      if (!anchor.text) addIssue("high", route, "unnamed-link", `href=${anchor.href || "(empty)"}`);
      const href = anchor.href.trim();
      if (!href || href === "#" || /^javascript:/i.test(href)) addIssue("high", route, "dead-link", `${anchor.text || "(unnamed)"} -> ${href || "(empty)"}`);
      if (href.startsWith("#")) {
        if (href.length > 1 && !anchor.fragmentExists) addIssue("high", route, "missing-fragment-target", `${anchor.text} -> ${href}`);
        continue;
      }
      if (/^mailto:/i.test(href)) {
        if (!/email|e-mail|@/i.test(anchor.text)) addIssue("medium", route, "unexpected-mailto", `${anchor.text} -> ${href}`);
        continue;
      }
      if (/^tel:/i.test(href)) {
        if ((href.match(/\d/g) || []).length < 10) addIssue("high", route, "invalid-tel", `${anchor.text} -> ${href}`);
        continue;
      }
      if (/^sms:/i.test(href)) continue;
      const url = cleanUrl(anchor.absoluteHref || href);
      if (!url) {
        addIssue("high", route, "invalid-url", `${anchor.text} -> ${href}`);
        continue;
      }
      if (url.hostname === "cleansceneinvestigators.com" || url.hostname === "www.cleansceneinvestigators.com") internalTargets.add(url.href);
      else if (anchor.buttonLike) externalButtonTargets.add(url.href);
    }

    for (const button of desktop.buttons) {
      if (!button.visible) continue;
      if (!button.text) addIssue("high", route, "unnamed-button", `button index ${button.i}`);
      if (button.fontSize && button.fontSize < 12) addIssue("medium", route, "tiny-button-text", `${button.text} = ${button.fontSize}px`);
      if ((button.type || "").toLowerCase() === "submit" && !button.inForm) addIssue("critical", route, "orphan-submit", button.text);
    }

    for (const form of desktop.forms) {
      if (!form.visible) continue;
      if (!form.action) addIssue("critical", route, "form-action", `${form.id || "form"} has no action`);
      if (form.action === "/api/contact" && form.method !== "post") addIssue("critical", route, "contact-method", `${form.id} uses ${form.method}`);
      if (!form.submitButtons) addIssue("high", route, "form-submit", `${form.id || "form"} has no submit control`);
    }

    if (route === "/") {
      const homeForm = desktop.forms.find((f) => f.id === "csi-combined-email-form");
      if (!homeForm || homeForm.action !== "/api/contact" || homeForm.method !== "post") addIssue("critical", route, "homepage-form", JSON.stringify(homeForm || null));
    }
    if (route === "/contact-us/") {
      const contactForm = desktop.forms.find((f) => f.id === "csi-dedicated-inquiry-form");
      if (!contactForm || contactForm.action !== "/api/contact" || contactForm.method !== "post") addIssue("critical", route, "contact-page-form", JSON.stringify(contactForm || null));
      const professionalForm = desktop.forms.find((f) => f.id === "csi-professional-form");
      if (!professionalForm || professionalForm.action !== "/api/professional-inquiry" || professionalForm.method !== "post") addIssue("critical", route, "professional-form", JSON.stringify(professionalForm || null));
      const sectionOrder = await page.evaluate(() => {
        const form = document.getElementById("confidential-inquiry-form");
        const parent = form?.parentElement;
        if (!form || !parent) return -1;
        return [...parent.children].filter((el) => el.matches?.("section,.csi-inquiry-page")).indexOf(form);
      });
      if (sectionOrder !== 1) addIssue("high", route, "contact-form-order", `form block index ${sectionOrder}, expected 1`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(250);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (mobileOverflow) addIssue("high", route, "mobile-overflow", "horizontal overflow at 390px");

    const toggles = page.locator('button[aria-controls][aria-expanded]');
    const toggleCount = await toggles.count();
    for (let i = 0; i < toggleCount; i++) {
      const control = toggles.nth(i);
      if (!await control.isVisible()) continue;
      const before = await control.getAttribute("aria-expanded");
      try {
        await control.click({ timeout: 5000 });
        const after = await control.getAttribute("aria-expanded");
        if (before === after) addIssue("high", route, "dead-toggle-button", `${await control.innerText()} did not change aria-expanded`);
      } catch (error) {
        addIssue("high", route, "toggle-click-failed", `${await control.innerText().catch(() => "button")} :: ${String(error)}`);
      }
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(200);
    const summaryCount = await page.locator("summary").count();
    for (let i = 0; i < summaryCount; i++) {
      const summary = page.locator("summary").nth(i);
      if (!await summary.isVisible()) continue;
      const details = summary.locator("xpath=..");
      const before = await details.getAttribute("open");
      try {
        await summary.click({ timeout: 5000 });
        const after = await details.getAttribute("open");
        if (before === after) addIssue("medium", route, "dead-summary", `${await summary.innerText()} did not toggle`);
      } catch (error) {
        addIssue("medium", route, "summary-click-failed", `${await summary.innerText().catch(() => "summary")} :: ${String(error)}`);
      }
    }

    const sameOriginFailures = failedRequests.filter((item) => item.startsWith(BASE));
    if (sameOriginFailures.length) addIssue("high", route, "failed-same-origin-request", JSON.stringify(sameOriginFailures.slice(0, 10)));
    const meaningfulConsoleErrors = consoleErrors.filter((text) => !/turnstile|google|analytics|favicon/i.test(text));
    if (meaningfulConsoleErrors.length) addIssue("medium", route, "console-error", JSON.stringify(meaningfulConsoleErrors.slice(0, 10)));

    pageResults.push({
      route, status, finalUrl: desktop.finalUrl, title: desktop.title,
      anchors: desktop.anchors.length,
      visibleAnchors: desktop.anchors.filter((a) => a.visible).length,
      buttonLikeAnchors: desktop.anchors.filter((a) => a.visible && a.buttonLike).length,
      buttons: desktop.buttons.filter((b) => b.visible).length,
      summaries: desktop.summaries.filter((s) => s.visible).length,
      forms: desktop.forms.length
    });
    await context.close();
  }

  const internalChecks = [];
  for (const target of [...internalTargets].sort()) {
    const result = await checkUrl(target);
    internalChecks.push({ target, ...result });
    if (!result.ok) addIssue("critical", "GLOBAL", "broken-internal-target", `${target} :: ${result.status || result.error || "failed"}`);
    const redirects = result.chain.filter((x) => x.status >= 300 && x.status < 400).length;
    if (redirects > 1) addIssue("medium", "GLOBAL", "multi-hop-internal-redirect", `${target} :: ${JSON.stringify(result.chain)}`);
  }

  const externalChecks = [];
  for (const target of [...externalButtonTargets].sort()) {
    const result = await checkUrl(target);
    externalChecks.push({ target, ...result });
    if (!result.ok && ![401, 403, 429].includes(result.status)) addIssue("medium", "GLOBAL", "external-cta-target", `${target} :: ${result.status || result.error || "failed"}`);
  }

  const counts = {
    htmlFiles: sourceFiles.length,
    liveRoutesAudited: routes.length,
    anchorsInspected: pageResults.reduce((sum, p) => sum + p.anchors, 0),
    visibleAnchorsInspected: pageResults.reduce((sum, p) => sum + p.visibleAnchors, 0),
    buttonLikeAnchorsInspected: pageResults.reduce((sum, p) => sum + p.buttonLikeAnchors, 0),
    visibleButtonsInspected: pageResults.reduce((sum, p) => sum + p.buttons, 0),
    disclosureControlsInspected: pageResults.reduce((sum, p) => sum + p.summaries, 0),
    formsInspected: pageResults.reduce((sum, p) => sum + p.forms, 0),
    uniqueInternalTargetsChecked: internalChecks.length,
    uniqueExternalButtonTargetsChecked: externalChecks.length,
    critical: issues.filter((i) => i.severity === "critical").length,
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length
  };

  const report = { generatedAt: new Date().toISOString(), base: BASE, counts, issues, pages: pageResults, internalChecks, externalChecks };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log("CSI FULL SITE / BUTTON AUDIT");
  console.log(JSON.stringify(counts, null, 2));
  if (issues.length) {
    console.log("ISSUES");
    for (const issue of issues) console.log(`[${issue.severity.toUpperCase()}] ${issue.route} :: ${issue.type} :: ${issue.detail}`);
  } else {
    console.log("No issues found.");
  }
  if (counts.critical || counts.high) process.exitCode = 2;
} finally {
  await browser.close();
}
