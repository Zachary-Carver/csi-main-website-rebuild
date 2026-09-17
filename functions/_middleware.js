const SITE_ORIGIN = "https://cleansceneinvestigators.com";

const LEGACY_ROUTE_MAP = new Map([
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

function withoutTrailingSlash(pathname) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

function decodePath(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function cleanPathname(pathname) {
  const decoded = withoutTrailingSlash(decodePath(pathname));
  return LEGACY_ROUTE_MAP.get(decoded) || pathname;
}

function cleanInternalUrl(value, requestUrl) {
  if (!value || /^(?:mailto:|tel:|sms:|javascript:|data:)/i.test(value)) return value;
  try {
    const url = new URL(value, requestUrl);
    if (url.origin !== SITE_ORIGIN) return value;
    const cleaned = cleanPathname(url.pathname);
    if (cleaned === url.pathname) return value;
    url.pathname = cleaned;
    if (/^https?:/i.test(value)) return url.toString();
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

class HrefCleaner {
  constructor(requestUrl) {
    this.requestUrl = requestUrl;
  }
  element(element) {
    const href = element.getAttribute("href");
    const cleaned = cleanInternalUrl(href, this.requestUrl);
    if (cleaned && cleaned !== href) element.setAttribute("href", cleaned);
  }
}

class ContentUrlCleaner {
  constructor(requestUrl) {
    this.requestUrl = requestUrl;
  }
  element(element) {
    const content = element.getAttribute("content");
    const cleaned = cleanInternalUrl(content, this.requestUrl);
    if (cleaned && cleaned !== content) element.setAttribute("content", cleaned);
  }
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const cleanedPath = cleanPathname(requestUrl.pathname);

  if (cleanedPath !== requestUrl.pathname) {
    requestUrl.pathname = cleanedPath;
    return Response.redirect(requestUrl.toString(), 301);
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return response;

  return new HTMLRewriter()
    .on("a[href]", new HrefCleaner(context.request.url))
    .on('link[rel="canonical"][href]', new HrefCleaner(context.request.url))
    .on('meta[property="og:url"][content]', new ContentUrlCleaner(context.request.url))
    .transform(response);
}
