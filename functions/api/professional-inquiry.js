const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra }
});
const labels = new Map([
  ["feedback", "Private client feedback"],
  ["recommendation", "Professional recommendation"],
  ["media", "Media, speaking, or press inquiry"],
  ["privacy-request", "Privacy request"],
  ["privacy-question", "Privacy question"],
  ["general", "General inquiry"],
  ["vendor", "Vendor information request"],
  ["documentation", "Company documentation request"]
]);
const text = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 4;
function memoryLimited(key, now = Date.now()) {
  const recent = (attempts.get(key) || []).filter((value) => now - value < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 1000) {
    for (const [candidate, times] of attempts) {
      if (!times.some((value) => now - value < WINDOW_MS)) attempts.delete(candidate);
    }
  }
  return recent.length > MAX_ATTEMPTS;
}

export async function onRequestPost({ request, env }) {
  try {
    const origin = request.headers.get("origin");
    if (origin && !/^https:\/\/(?:www\.)?(?:cleansceneinvestigators\.com|[a-z0-9-]+\.csi-main-website-rebuild\.pages\.dev)$/i.test(origin)) {
      return json({ error: "Request origin was not accepted." }, 403);
    }
    if (Number(request.headers.get("content-length") || 0) > 25000) return json({ error: "Request is too large." }, 413);
    const contentType = request.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) data = await request.json();
    else if (contentType.includes("form")) data = Object.fromEntries(await request.formData());
    else return json({ error: "Unsupported request format." }, 415);
    if (text(data.company_website, 200)) return json({ ok: true });

    const inquiry = {
      name: text(data.name, 100),
      email: text(data.email, 254),
      phone: text(data.phone, 30),
      organization: text(data.organization, 160),
      request_type: text(data.request_type, 40),
      message: text(data.message, 4000)
    };
    if (!inquiry.name || !inquiry.email || !labels.has(inquiry.request_type) || !inquiry.message) {
      return json({ error: "Please complete every required field." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email) || (inquiry.phone && !/^[+()\d .-]{7,30}$/.test(inquiry.phone))) {
      return json({ error: "Please enter valid contact information." }, 400);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (memoryLimited(ip)) {
      return json({ error: "Too many inquiries were submitted. Please wait a few minutes or call 940-654-6334." }, 429, { "retry-after": "600" });
    }
    if (!env.TURNSTILE_SECRET_KEY) return json({ error: "Online security verification is temporarily unavailable. Please call 940-654-6334." }, 503);
    const token = text(data["cf-turnstile-response"], 2048);
    if (!token) return json({ error: "Please complete the security check." }, 400);
    const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip })
    }).then((response) => response.json());
    if (!check.success || (check.action && check.action !== "professional-inquiry")) {
      return json({ error: "Security verification failed. Please try again." }, 400);
    }
    if (!env.RESEND_API_KEY || !env.CONTACT_FROM_EMAIL) {
      return json({ error: "Online inquiries are temporarily unavailable. Please call 940-654-6334." }, 503);
    }

    const requestLabel = labels.get(inquiry.request_type);
    const body = [
      "New general or professional website inquiry",
      "",
      "REQUEST TYPE: " + requestLabel,
      "NAME: " + inquiry.name,
      "EMAIL: " + inquiry.email,
      "PHONE: " + (inquiry.phone || "Not provided"),
      "ORGANIZATION: " + (inquiry.organization || "Not provided"),
      "MESSAGE: " + inquiry.message
    ].join("\n");
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [env.CONTACT_TO_EMAIL || "dfw.csi.info@gmail.com"],
        reply_to: inquiry.email,
        subject: "New CSI professional inquiry - " + requestLabel,
        text: body
      })
    });
    if (!sent.ok) return json({ error: "We could not send your inquiry. Please call 940-654-6334." }, 502);
    return json({ ok: true });
  } catch {
    return json({ error: "We could not process your inquiry. Please call 940-654-6334." }, 500);
  }
}

export const onRequestGet = () => json({ error: "Method not allowed." }, 405);
