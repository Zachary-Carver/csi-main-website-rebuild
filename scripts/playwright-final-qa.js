async (page) => {
  const base = "http://127.0.0.1:4173";
  const pages = ["/", "/contact-us/", "/crime-scene-cleaning-dfw/", "/dallas-tx-response/", "/follow-us/", "/privacy-policy/", "/missing-final-qa-page"];
  const widths = [1920, 1440, 1280, 1024, 768, 390];
  const results = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    for (const pathname of pages) {
      const response = await page.goto(base + pathname, { waitUntil: "networkidle" });
      const audit = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelectorAll("h1").length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        duplicateIds: [...document.querySelectorAll("[id]")].map((node) => node.id).filter((id, index, ids) => ids.indexOf(id) !== index).length,
        canonical: document.querySelector('link[rel="canonical"]')?.href || "",
        formAction: document.querySelector("#csi-combined-email-form")?.getAttribute("action") || ""
      }));
      results.push({ width, pathname, status: response?.status(), ...audit });
      if ([1920, 1024, 390].includes(width) && ["/", "/contact-us/", "/follow-us/", "/privacy-policy/", "/missing-final-qa-page"].includes(pathname)) {
        const slug = pathname === "/" ? "home" : pathname.replaceAll("/", "-").replace(/^-|-$/g, "");
        await page.screenshot({ path: `output/playwright/${slug}-${width}.png`, fullPage: true });
      }
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const button = page.locator(".csi-combined-contact__button");
  const states = {};
  states.normal = await button.evaluate((node) => ({ color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }));
  await button.hover();
  states.hover = await button.evaluate((node) => ({ color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }));
  await button.focus();
  states.focus = await button.evaluate((node) => ({ outline: getComputedStyle(node).outline, background: getComputedStyle(node).backgroundColor }));
  await button.evaluate((node) => { node.disabled = true; });
  states.disabled = await button.evaluate((node) => ({ color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor, opacity: getComputedStyle(node).opacity }));
  return { results, buttonStates: states };
}
