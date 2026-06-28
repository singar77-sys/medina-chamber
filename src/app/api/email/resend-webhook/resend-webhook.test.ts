import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { applyRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/rate-limit", () => ({
  applyRateLimit: vi.fn(async () => null),
  resendWebhookLimiter: {},
}));
const mockedApplyRateLimit = vi.mocked(applyRateLimit);

const verifyResendSignature = vi.fn(() => true);
vi.mock("@/lib/email/resend-signature", () => ({ verifyResendSignature }));

const recordResendEvent = vi.fn(async () => undefined);
vi.mock("@/lib/email/track-resend-event", () => ({ recordResendEvent }));

vi.mock("@/lib/db", () => ({ db: {} }));

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  ({ POST } = await import("./route"));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  verifyResendSignature.mockReturnValue(true);
  recordResendEvent.mockResolvedValue(undefined);
});

const EVENT = JSON.stringify({ type: "email.delivered", data: { email_id: "email-1" } });

function req(body: string): Request {
  return new Request("http://localhost/api/email/resend-webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": "msg_1",
      "svix-timestamp": "1700000000",
      "svix-signature": "v1,sig",
    },
    body,
  });
}

describe("POST /api/email/resend-webhook", () => {
  it("429s when rate limited — before the secret check, raw-body read, or signature verification", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_dummy");
    mockedApplyRateLimit.mockResolvedValueOnce(
      new Response("Too many requests, please slow down.", { status: 429 }),
    );
    const res = await POST(req(EVENT));
    expect(res.status).toBe(429);
    expect(verifyResendSignature).not.toHaveBeenCalled();
    expect(recordResendEvent).not.toHaveBeenCalled();
  });

  it("still 503s (fail-closed) when the secret is unset and the request is allowed", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(req(EVENT));
    expect(res.status).toBe(503);
    expect(verifyResendSignature).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it("still 401s (fail-closed) on an invalid signature", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_dummy");
    verifyResendSignature.mockReturnValue(false);
    const res = await POST(req(EVENT));
    expect(res.status).toBe(401);
    expect(recordResendEvent).not.toHaveBeenCalled();
  });

  it("records a verified event and returns 200", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_dummy");
    const res = await POST(req(EVENT));
    expect(res.status).toBe(200);
    expect(recordResendEvent).toHaveBeenCalledWith(expect.anything(), "email.delivered", "email-1", null);
  });

  it("extracts data.bounce.type and passes it through", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_dummy");
    const body = JSON.stringify({ type: "email.bounced", data: { email_id: "email-2", bounce: { type: "Permanent" } } });
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(recordResendEvent).toHaveBeenCalledWith(expect.anything(), "email.bounced", "email-2", "Permanent");
  });
});
