import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const html = [];
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
  if ([".git", "node_modules", "output", "outputs"].includes(entry.name)) return;
  const file = path.join(directory, entry.name);
  if (entry.isDirectory()) walk(file);
  else if (entry.name.endsWith(".html")) html.push(file);
});
walk(root);

const pageFor = (file) => {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (relative === "index.html") return "/";
  if (relative === "404.html") return "/404.html";
  return "/" + relative.replace(/index\.html$/, "");
};
const encodedRoute = (route) => route.split("/").map((segment) => encodeURIComponent(segment)).join("/");
const canonicalRoute = (route) => {
  if (route.includes("%7C")) return route;
  if (route === "/property-manager/landlord-1/") return "/property-manager%2Flandlord-1/";
  return encodedRoute(route);
};
const pagePaths = new Set(html.map(pageFor));
const errors = [];
const sitemapUrls = new Set();
for (const file of html) {
  const source = fs.readFileSync(file, "utf8");
  const route = pageFor(file);
  const canonical = source.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || source.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical/i)?.[1];
  const isRedirectStub = route === "/home/" || route === "/ols/products/";
  const expected = route === "/404.html" || isRedirectStub ? null : "https://cleansceneinvestigators.com" + canonicalRoute(route);
  if (expected && canonical !== expected) errors.push(`${route}: canonical ${canonical || "missing"}`);
  const og = source.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)/i)?.[1];
  if (og && expected && og !== expected) errors.push(`${route}: og:url ${og}`);
  if (/name=["']robots["'][^>]+noindex/i.test(source) && route !== "/404.html" && !isRedirectStub) errors.push(`${route}: noindex`);
  const ids = [...source.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) errors.push(`${route}: duplicate IDs ${duplicates.join(",")}`);
  for (const match of source.matchAll(/\shref=["']([^"']+)["']/gi)) {
    const value = match[1];
    if (/^(?:mailto:|tel:|sms:|javascript:|#)/i.test(value)) continue;
    let url; try { url = new URL(value, expected || "https://cleansceneinvestigators.com/"); } catch { continue; }
    if (url.hostname !== "cleansceneinvestigators.com" && url.hostname !== "www.cleansceneinvestigators.com") continue;
    let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { pathname = url.pathname; }
    if (/\.[a-z0-9]{2,5}$/i.test(pathname) || pathname.startsWith("/api/")) continue;
    if (!pathname.endsWith("/") && pathname !== "/home" && !pathname.startsWith("/f/") && !pathname.startsWith("/home/f/")) errors.push(`${route}: redirecting internal link ${value}`);
    if (pathname.endsWith("/") && !pagePaths.has(pathname) && !pagePaths.has(url.pathname)) errors.push(`${route}: broken internal link ${value}`);
  }
}
for (const name of ["sitemap.website.xml", "sitemap.blog.xml"]) {
  const source = fs.readFileSync(path.join(root, name), "utf8");
  for (const match of source.matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.add(match[1]);
}
for (const url of sitemapUrls) {
  const urlPath = new URL(url).pathname;
  let pathname; try { pathname = decodeURIComponent(urlPath); } catch { pathname = urlPath; }
  if (!pagePaths.has(pathname) && !pagePaths.has(pathname.replaceAll("|", "%7C")) && pathname !== "/property-manager/landlord-1/") errors.push(`sitemap: missing page ${url}`);
  if (pathname !== "/" && !pathname.endsWith("/")) errors.push(`sitemap: redirecting URL ${url}`);
}
const canonicalPages = [...pagePaths].filter((item) => !["/404.html", "/home/", "/ols/products/"].includes(item));
for (const route of canonicalPages) if (!sitemapUrls.has("https://cleansceneinvestigators.com" + canonicalRoute(route))) errors.push(`sitemap: omits ${route}`);

console.log(JSON.stringify({ htmlFiles: html.length, canonicalPages: canonicalPages.length, sitemapUrls: sitemapUrls.size, errors }, null, 2));
if (errors.length) process.exitCode = 1;
