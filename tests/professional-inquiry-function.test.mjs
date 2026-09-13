import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/professional-inquiry.js";

const valid = {
  name: "QA Test",
  email: "qa@example.com",
  phone: "9406546334",
  organization: "CSI QA",
  request_type: "media",
  message: "Production-safe automated test."
};
const request = (body, ip = "198.51.100.10") => new Request("https://cleansceneinvestigators.com/api/professional-inquiry", {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://cleansceneinvestigators.com", "CF-Connecting-IP": ip },
  body: JSON.stringify(body)
});

test("rejects incomplete requests", async () => {
  assert.equal((await onRequestPost({ request: request({}), env: {} })).status, 400);
});
test("honeypot silently accepts", async () => {
  assert.equal((await onRequestPost({ request: request({ ...valid, company_website: "bot" }), env: {} })).status, 200);
});
test("rejects an unsupported request type", async () => {
  assert.equal((await onRequestPost({ request: request({ ...valid, request_type: "cleanup" }), env: {} })).status, 400);
});
test("requires Turnstile", async () => {
  assert.equal((await onRequestPost({ request: request(valid), env: { TURNSTILE_SECRET_KEY: "secret" } })).status, 400);
});
test("sends through Resend after a matching Turnstile action", async () => {
  const prior = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1 ? Response.json({ success: true, action: "professional-inquiry" }) : new Response("{}", { status: 200 });
  };
  try {
    const response = await onRequestPost({
      request: request({ ...valid, "cf-turnstile-response": "verified-token" }),
      env: { RESEND_API_KEY: "secret", CONTACT_FROM_EMAIL: "CSI <forms@example.com>", TURNSTILE_SECRET_KEY: "turnstile-secret" }
    });
    assert.equal(response.status, 200);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = prior;
  }
});
