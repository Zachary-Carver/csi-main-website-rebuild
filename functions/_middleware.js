const SITE_ORIGIN = "https://cleansceneinvestigators.com";

const LEGACY_ROUTE_MAP = new Map([
  ["/insurance-&-payment-help", "/insurance-payment-help/"],
  ["/media,-speaking-&-press", "/media-speaking-press/"],
  ["/property-manager/landlord-1", "/property-manager/landlord/"],
  ["/follow-us/f/247-crime-scene-biohazard-cleanup-in-dfw-|-csi-clean-scene-in", "/follow-us/f/247-crime-scene-biohazard-cleanup-dfw/"],
  ["/follow-us/f/some-people-think-“cleaning”-is-just-wiping-surfaces…", "/follow-us/f/some-people-think-cleaning-is-just-wiping-surfaces/"],
  ["/follow-us/f/spring-cleaning-isn’t-enough-here’s-what-your-home-actually-need", "/follow-us/f/spring-cleaning-isnt-enough-heres-what-your-home-actually-needs/"],
  ["/follow-us/f/unattended-death-cleanup-denton-tx-|-csi-clean-scene-investigator", "/follow-us/f/unattended-death-cleanup-denton-tx/"],
  ["/follow-us/f/when-the-crime-scene-is-over-the-biohazard-risk-isn’t", "/follow-us/f/when-the-crime-scene-is-over-the-biohazard-risk-isnt/"],
  ["/follow-us/f/who-cleans-up-after-a-crime-scene-in-texas-|-csi", "/follow-us/f/who-cleans-up-after-a-crime-scene-in-texas/"],
  ["/follow-us/f/🚨-this-is-why-you-don’t-clean-it-yourself-🚨", "/follow-us/f/this-is-why-you-dont-clean-it-yourself/"]
]);

const RAW_ROUTE_REPLACEMENTS = [
  ["/insurance-%26-payment-help", "/insurance-payment-help/"],
  ["/insurance-&amp;-payment-help", "/insurance-payment-help/"],
  ["/insurance-&-payment-help", "/insurance-payment-help/"],
  ["/media%2C-speaking-%26-press", "/media-speaking-press/"],
  ["/media,-speaking-&amp;-press", "/media-speaking-press/"],
  ["/media,-speaking-&-press", "/media-speaking-press/"],
  ["/property-manager%2Flandlord-1", "/property-manager/landlord/"],
  ["/property-manager%2flandlord-1", "/property-manager/landlord/"],
  ["/property-manager/landlord-1", "/property-manager/landlord/"],
  ["/follow-us/f/247-crime-scene-biohazard-cleanup-in-dfw-%7C-csi-clean-scene-in", "/follow-us/f/247-crime-scene-biohazard-cleanup-dfw/"],
  ["/follow-us/f/247-crime-scene-biohazard-cleanup-in-dfw-|-csi-clean-scene-in", "/follow-us/f/247-crime-scene-biohazard-cleanup-dfw/"],
  ["/follow-us/f/some-people-think-“cleaning”-is-just-wiping-surfaces…", "/follow-us/f/some-people-think-cleaning-is-just-wiping-surfaces/"],
  ["/follow-us/f/spring-cleaning-isn’t-enough-here’s-what-your-home-actually-need", "/follow-us/f/spring-cleaning-isnt-enough-heres-what-your-home-actually-needs/"],
  ["/follow-us/f/unattended-death-cleanup-denton-tx-%7C-csi-clean-scene-investigator", "/follow-us/f/unattended-death-cleanup-denton-tx/"],
  ["/follow-us/f/unattended-death-cleanup-denton-tx-|-csi-clean-scene-investigator", "/follow-us/f/unattended-death-cleanup-denton-tx/"],
  ["/follow-us/f/when-the-crime-scene-is-over-the-biohazard-risk-isn’t", "/follow-us/f/when-the-crime-scene-is-over-the-biohazard-risk-isnt/"],
  ["/follow-us/f/who-cleans-up-after-a-crime-scene-in-texas-%7C-csi", "/follow-us/f/who-cleans-up-after-a-crime-scene-in-texas/"],
  ["/follow-us/f/who-cleans-up-after-a-crime-scene-in-texas-|-csi", "/follow-us/f/who-cleans-up-after-a-crime-scene-in-texas/"],
  ["/follow-us/f/🚨-this-is-why-you-don’t-clean-it-yourself-🚨", "/follow-us/f/this-is-why-you-dont-clean-it-yourself/"]
];

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
  const slashDecoded = pathname.replace(/%2f/ig, "/").replace(/\/{2,}/g, "/");
  const decoded = withoutTrailingSlash(decodePath(slashDecoded));
  const mapped = LEGACY_ROUTE_MAP.get(decoded);
  if (mapped) return mapped;
  if (slashDecoded !== pathname) return slashDecoded;
  return pathname;
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

function replaceLegacyRoutes(text) {
  let output = text;
  for (const [legacy, clean] of RAW_ROUTE_REPLACEMENTS) {
    output = output.split(legacy).join(clean);
    if (clean.endsWith("/")) output = output.split(clean + "/").join(clean);
  }
  return output;
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

class BodyScriptInjector {
  element(element) {
    element.append('<script src="/assets/csi-link-normalizer.js" defer></script>', { html: true });
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
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const isHtml = contentType.includes("text/html");
  const isXml = contentType.includes("xml") || requestUrl.pathname.endsWith(".xml");
  if (!isHtml && !isXml) return response;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  const cleanedBody = replaceLegacyRoutes(await response.text());
  const cleanedResponse = new Response(cleanedBody, {
    status: response.status,
    statusText: response.statusText,
    headers
  });

  if (!isHtml) return cleanedResponse;

  return new HTMLRewriter()
    .on("a[href]", new HrefCleaner(context.request.url))
    .on('link[rel="canonical"][href]', new HrefCleaner(context.request.url))
    .on('meta[property="og:url"][content]', new ContentUrlCleaner(context.request.url))
    .on("body", new BodyScriptInjector())
    .transform(cleanedResponse);
}
