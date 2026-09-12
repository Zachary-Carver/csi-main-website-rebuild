import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const htmlFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "output", "outputs"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.name.endsWith(".html")) htmlFiles.push(absolute);
  }
}
walk(root);

const pages = new Set(htmlFiles.map((file) => {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (relative === "index.html") return "/";
  if (relative === "404.html") return "/404.html";
  return "/" + relative.replace(/\/index\.html$/, "");
}));

function normalized(value) {
  const match = value.match(/^(https:\/\/cleansceneinvestigators\.com)?([^?#]*)([?#].*)?$/);
  if (!match) return value;
  const [, host = "", pathname, suffix = ""] = match;
  if (/\.[a-z0-9]{2,5}\/?$/i.test(pathname)) return value;
  let decoded = pathname;
  try { decoded = decodeURIComponent(pathname); } catch {}
  const known = pages.has(pathname) || pages.has(decoded);
  if (!known || pathname === "/" || pathname.endsWith("/")) return value;
  return host + pathname + "/" + suffix;
}

for (const file of htmlFiles) {
  let source = fs.readFileSync(file, "utf8");
  source = source.replace(/https:\/\/cleansceneinvestigators\.com\/[^"'<>\s]*/g, normalized);
  source = source.replace(/((?:href|action|content|src)=["'])(\/[^"']*)(["'])/gi, (_, before, value, after) => before + normalized(value) + after);
  fs.writeFileSync(file, source);
}

for (const sitemap of ["sitemap.website.xml", "sitemap.blog.xml", "sitemap.ols.xml", "sitemap.ola.xml"]) {
  const file = path.join(root, sitemap);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8").replace(/https:\/\/cleansceneinvestigators\.com\/[^<\s]*/g, normalized);
  fs.writeFileSync(file, source);
}

const homepage = path.join(root, "index.html");
let home = fs.readFileSync(homepage, "utf8");
home = home.replace('"url":"https://cleansceneinvestigators.com/","telephone"', '"url":"https://cleansceneinvestigators.com/","logo":{"@type":"ImageObject","url":"https://cleansceneinvestigators.com/assets/local/dce997b862bdca765a11.png","width":180,"height":180},"telephone"');
fs.writeFileSync(homepage, home);

const notFound = path.join(root, "404.html");
fs.writeFileSync(notFound, fs.readFileSync(notFound, "utf8").replaceAll("/404.html/", "/404.html"));

const privacyFile = path.join(root, "privacy-policy", "index.html");
let privacy = fs.readFileSync(privacyFile, "utf8");
const marker = "CSI or its website providers may use analytics, security,\n          performance, and diagnostic tools to understand visits,\n          traffic sources, device types, page performance, and errors.\n        </p>";
const disclosure = marker + `\n\n        <p>\n          The confidential inquiry form is protected by Cloudflare Turnstile.\n          Form details are processed by Cloudflare and delivered to CSI through\n          Resend. Google Analytics loads only after a visitor accepts analytics\n          cookies through the site consent banner.\n        </p>`;
if (!privacy.includes("protected by Cloudflare Turnstile")) privacy = privacy.replace(marker, disclosure);
fs.writeFileSync(privacyFile, privacy);

console.log(`Normalized ${htmlFiles.length} HTML files and sitemap URL sets.`);
