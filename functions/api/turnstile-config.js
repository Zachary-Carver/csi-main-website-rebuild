export function onRequestGet({ env }) {
  if (!env.TURNSTILE_SITE_KEY) {
    return new Response(JSON.stringify({ error: "Security verification is unavailable." }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }
  return new Response(JSON.stringify({ siteKey: env.TURNSTILE_SITE_KEY }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" }
  });
}
