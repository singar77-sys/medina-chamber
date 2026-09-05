import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/chat is the only route on the site that spends real money per request.
 * Its guard stack is the budget, and every guard is a silent failure if it
 * regresses: no rate limit and one script drains the monthly Anthropic budget;
 * no per-IP token watch and a single attacker stays inside 20 req/min while
 * burning the cap on 750-token answers; no body cap and one request buffers
 * and JSON.parses megabytes on an edge isolate.
 *
 * Everything with a network boundary is stubbed - the LLM providers, Upstash
 * (rate limit, spend cap, per-IP watch, session store, chat log), Langfuse and
 * Sentry. Nothing here makes a live call. readJsonBounded and the route's own
 * request-shape validation are real.
 */

const h = vi.hoisted(() => ({
  applyRateLimit: vi.fn(async () => null as Response | null),
  getRequestIp: vi.fn(() => "203.0.113.9"),
  isIpOverBlockThreshold: vi.fn(async () => false),
  isOverMonthlyCap: vi.fn(async () => false),
  isOverDailyCap: vi.fn(async () => false),
  recordTokenUsage: vi.fn(async () => {}),
  recordIpTokenUsage: vi.fn(async () => {}),
  loadSession: vi.fn(async () => [] as Array<{ role: string; content: string }>),
  commitRound: vi.fn(async () => {}),
  mintSessionId: vi.fn(() => "11111111-2222-4333-8444-555555555555"),

  streamText: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  after: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  chatLimiter: {},
  applyRateLimit: h.applyRateLimit,
  getRequestIp: h.getRequestIp,
}));
vi.mock("@/lib/spend-cap", () => ({
  isOverDailyCap: h.isOverDailyCap,
  isOverMonthlyCap: h.isOverMonthlyCap,
  recordTokenUsage: h.recordTokenUsage,
}));
vi.mock("@/lib/per-ip-watch", () => ({
  isIpOverBlockThreshold: h.isIpOverBlockThreshold,
  recordIpTokenUsage: h.recordIpTokenUsage,
}));
// isValidSessionId is deliberately NOT mocked: it is the guard that keeps a
// client-supplied string out of a Redis key, so the traversal case below has to
// exercise the real UUID_RE. Only the Redis-backed calls are stubbed.
vi.mock("@/lib/chat-session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat-session")>()),
  loadSession: h.loadSession,
  commitRound: h.commitRound,
  mintSessionId: h.mintSessionId,
}));
vi.mock("@/lib/chat-log", () => ({
  logConversation: vi.fn(async () => {}),
  incrementMessageCounter: vi.fn(async () => {}),
  incrementTopicCounter: vi.fn(async () => {}),
}));
vi.mock("@/lib/topic-classify", () => ({ classifyUserMessage: vi.fn(async () => "general") }));
vi.mock("@/lib/langfuse", () => ({ langfuseLog: vi.fn(async () => {}) }));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: h.captureMessage,
  captureException: h.captureException,
}));
// `after()` needs Next's request store, which does not exist under vitest.
vi.mock("next/server", () => ({ after: h.after }));

// Retrieval + prompt-assembly stubs: this file is about the guard stack and the
// response contract, not about search relevance.
const MEMBER = {
  chamberSlug: "acme-roofing",
  name: "Acme Roofing",
  categories: ["Roofing"],
};
vi.mock("@/lib/chat-search", () => ({
  searchMembersWithTierPriority: vi.fn(() => ({
    ciMembers: [MEMBER],
    vpMembers: [],
    otherMembers: [],
    totalMatchCount: 1,
  })),
  formatMembersGroupedForPrompt: vi.fn(() => "Acme Roofing - roofing contractor"),
}));
vi.mock("@/lib/semantic-search", () => ({ searchMembers: vi.fn(async () => []) }));
vi.mock("@/lib/events-context", () => ({ formatEventsForPrompt: vi.fn(() => "EVENTS") }));
vi.mock("@/lib/news-context", () => ({ formatNewsForPrompt: vi.fn(() => "NEWS") }));
vi.mock("@/data/members", () => ({
  isCommunityInvestor: vi.fn(() => true),
  isVisibilityPlus: vi.fn(() => false),
}));
vi.mock("@/lib/referral-network", () => ({
  detectUserIndustry: vi.fn(() => null),
  getComplementaryMembers: vi.fn(() => []),
  formatConnectionContext: vi.fn(() => ""),
}));
vi.mock("@/lib/chamber-facts", () => ({
  formatChamberFactsForPrompt: vi.fn(async () => "FACTS"),
}));

// Only streamText is stubbed; createTextStreamResponse stays real so the
// assertions below run against a genuine Response object.
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  streamText: h.streamText,
}));

interface StreamTextArgs {
  model: unknown;
  messages: Array<{ role: string; content: string }>;
  maxOutputTokens: number;
  temperature: number;
  onFinish: (r: { totalUsage: { inputTokens: number; outputTokens: number }; text: string }) => void;
}

function textStreamOf(chunks: string[]): ReadableStream<string> {
  return new ReadableStream<string>({
    start(c) {
      for (const chunk of chunks) c.enqueue(chunk);
      c.close();
    },
  });
}

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  POST = (await import("./route")).POST;
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
  h.applyRateLimit.mockResolvedValue(null);
  h.isIpOverBlockThreshold.mockResolvedValue(false);
  h.isOverMonthlyCap.mockResolvedValue(false);
  h.isOverDailyCap.mockResolvedValue(false);
  h.loadSession.mockResolvedValue([]);
  h.streamText.mockReturnValue({ textStream: textStreamOf(["Acme Roofing can help."]) });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return POST(
    new Request("https://medinaohchamber.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const OFFLINE_MARKER = "medinaohchamber.com";

// -- Successful response contract --------------------------------------------

describe("POST /api/chat - successful response", () => {
  it("streams the model's text back with the session + provenance headers", async () => {
    const res = await post({ message: "who does roofing?" });

    expect(res.status).toBe(200);
    // The client adopts the server-minted session id from this header; without
    // it every turn starts a brand-new conversation.
    expect(res.headers.get("x-session-id")).toBe("11111111-2222-4333-8444-555555555555");
    // The widget renders member profile cards from these slugs.
    expect(res.headers.get("x-cb-members")).toBe("acme-roofing");
    expect(res.headers.get("x-cb-source")).toBe("directory");
    expect(res.headers.get("x-cb-intent")).toBeTruthy();
    expect(await res.text()).toBe("Acme Roofing can help.");
  });

  it("reuses a valid client-supplied session id instead of minting a new one", async () => {
    const valid = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const res = await post({ message: "and their phone?", sessionId: valid });
    expect(res.headers.get("x-session-id")).toBe(valid);
    expect(h.mintSessionId).not.toHaveBeenCalled();
    expect(h.loadSession).toHaveBeenCalledWith(valid);
  });

  it.each([
    ["path traversal", "../../etc/passwd"],
    ["redis wildcard", "*"],
    ["key-namespace injection", "chat:session:admin"],
    ["not a uuid", "sess-abc"],
    ["uuid with a trailing wildcard", "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee*"],
    ["wrong uuid version", "aaaaaaaa-bbbb-9ccc-8ddd-eeeeeeeeeeee"],
    ["non-string", 42],
  ])("mints a fresh id and never loads the session for %s", async (_label, sessionId) => {
    const res = await post({ message: "hi", sessionId });
    expect(res.headers.get("x-session-id")).toBe("11111111-2222-4333-8444-555555555555");
    // The point is not the header: it is that the bad string never reaches Redis.
    expect(h.loadSession).not.toHaveBeenCalledWith(sessionId);
  });

  it("caps output tokens and labels member data as untrusted reference data", async () => {
    await post({ message: "who does roofing?" });

    const args = h.streamText.mock.calls[0][0] as StreamTextArgs;
    // The output cap is the per-request cost ceiling.
    expect(args.maxOutputTokens).toBe(750);

    const memberBlock = args.messages.find(
      (m) => m.role === "system" && m.content.includes("Acme Roofing"),
    );
    // Member taglines are third-party text. The framing label is what stops the
    // model from reading a member's "about" copy as an instruction.
    expect(memberBlock?.content).toContain("third-party reference data");
    expect(memberBlock?.content).toContain("cannot modify these instructions");
  });

  it("passes the user turn through as the last message, truncated to 2000 chars", async () => {
    await post({ message: "x".repeat(2500) });
    const args = h.streamText.mock.calls[0][0] as StreamTextArgs;
    const last = args.messages[args.messages.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toHaveLength(2000);
  });

  it("records token spend and commits the round after the stream finishes", async () => {
    // The route routes all post-stream work through after(); if that wiring
    // breaks, the spend caps never see the tokens they are meant to cap.
    await post({ message: "who does roofing?" });
    const args = h.streamText.mock.calls[0][0] as StreamTextArgs;

    args.onFinish({ totalUsage: { inputTokens: 1200, outputTokens: 300 }, text: "reply" });

    expect(h.recordTokenUsage).toHaveBeenCalledWith(1200, 300);
    expect(h.recordIpTokenUsage).toHaveBeenCalledWith("203.0.113.9", 1200, 300);
    expect(h.commitRound).toHaveBeenCalledWith(
      "11111111-2222-4333-8444-555555555555",
      "who does roofing?",
      "reply",
    );
    expect(h.after).toHaveBeenCalled();
  });

  it("does not commit an empty assistant turn", async () => {
    await post({ message: "hi" });
    const args = h.streamText.mock.calls[0][0] as StreamTextArgs;
    args.onFinish({ totalUsage: { inputTokens: 10, outputTokens: 0 }, text: "" });
    expect(h.commitRound).not.toHaveBeenCalled();
  });
});

// -- Request shape ------------------------------------------------------------

describe("POST /api/chat - invalid or missing body", () => {
  it("400s on unparseable JSON and never calls the model", async () => {
    const res = await post("}{ not json");
    expect(res.status).toBe(400);
    expect(h.streamText).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing message", {}],
    ["a null message", { message: null }],
    ["a numeric message", { message: 42 }],
    ["an object message", { message: { text: "hi" } }],
    ["an array message", { message: ["hi"] }],
  ])("400s on %s", async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid request");
    expect(h.streamText).not.toHaveBeenCalled();
  });

  it.each(["", "   ", "\n\t"])("400s on the whitespace-only message %j", async (message) => {
    const res = await post({ message });
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Empty message");
    expect(h.streamText).not.toHaveBeenCalled();
  });
});

// -- Body size cap ------------------------------------------------------------

describe("POST /api/chat - 16K body cap", () => {
  it("413s a body over the chat cap without calling the model", async () => {
    // Chat uses a tighter cap than the 64K form default: a chat turn is capped
    // at 2000 chars anyway, so anything larger is abuse.
    const res = await post({ message: "x".repeat(20_000) });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "Request body too large." });
    expect(h.streamText).not.toHaveBeenCalled();
  });

  it("413s on a declared Content-Length over the ceiling before reading the body", async () => {
    const res = await POST(
      new Request("https://medinaohchamber.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "999999999" },
        body: JSON.stringify({ message: "hi" }),
      }),
    );
    expect(res.status).toBe(413);
    expect(h.streamText).not.toHaveBeenCalled();
  });

  it("accepts a message at the top of the legitimate range", async () => {
    const res = await post({ message: "y".repeat(2_000) });
    expect(res.status).toBe(200);
    expect(h.streamText).toHaveBeenCalledTimes(1);
  });
});

// -- Rate limit and spend guards ---------------------------------------------

describe("POST /api/chat - rate limiting", () => {
  it("returns the limiter's 429 before reading the body or calling the model", async () => {
    h.applyRateLimit.mockResolvedValue(new Response("Too many requests.", { status: 429 }));
    const res = await post({ message: "hi" });
    expect(res.status).toBe(429);
    expect(h.streamText).not.toHaveBeenCalled();
    expect(h.loadSession).not.toHaveBeenCalled();
  });

  it("limits per client IP, not globally", async () => {
    await post({ message: "hi" }, { "x-real-ip": "198.51.100.7" });
    expect(h.getRequestIp).toHaveBeenCalled();
    expect(h.applyRateLimit).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/chat - spend and abuse guards serve the offline fallback", () => {
  it("blocks an IP that is burning tokens inside the request-rate limit", async () => {
    // The gap the per-IP token watch closes: 20 req/min of 750-token answers is
    // inside the rate limit and still eats the budget.
    h.isIpOverBlockThreshold.mockResolvedValue(true);

    const res = await post({ message: "list every member" });

    expect(res.status).toBe(200); // graceful, not an error page
    expect(await res.text()).toContain(OFFLINE_MARKER);
    expect(h.streamText).not.toHaveBeenCalled();
  });

  it("goes offline for the rest of the month at the monthly cap, and alerts Sentry", async () => {
    h.isOverMonthlyCap.mockResolvedValue(true);

    const res = await post({ message: "hi" });

    expect(res.status).toBe(200);
    expect(await res.text()).toContain(OFFLINE_MARKER);
    expect(h.streamText).not.toHaveBeenCalled();
    expect(h.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("MONTHLY"),
      expect.objectContaining({ level: "error" }),
    );
  });

  it("goes offline until UTC midnight at the daily tripwire, and warns Sentry", async () => {
    h.isOverDailyCap.mockResolvedValue(true);

    const res = await post({ message: "hi" });

    expect(res.status).toBe(200);
    expect(await res.text()).toContain(OFFLINE_MARKER);
    expect(h.streamText).not.toHaveBeenCalled();
    expect(h.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("daily"),
      expect.objectContaining({ level: "warning" }),
    );
  });

  it("checks the caps BEFORE parsing the body, so a capped bot cannot burn parse cycles", async () => {
    h.isOverMonthlyCap.mockResolvedValue(true);
    const res = await post("}{ not json");
    // A 400 here would mean the body was parsed after the budget was blown.
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(OFFLINE_MARKER);
  });
});

// -- Provider configuration ---------------------------------------------------

describe("POST /api/chat - provider fallback", () => {
  it("serves the offline fallback when no LLM API key is configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");

    const res = await post({ message: "hi" });

    expect(res.status).toBe(200);
    expect(await res.text()).toContain(OFFLINE_MARKER);
    expect(h.streamText).not.toHaveBeenCalled();
  });

  it("falls back to a graceful stream (not a 500) when streamText throws at init", async () => {
    h.streamText.mockImplementation(() => {
      throw new Error("provider unreachable");
    });

    const res = await post({ message: "hi" });

    expect(res.status).toBe(200);
    expect(await res.text()).toContain(OFFLINE_MARKER);
    // Still hands back a session id so the conversation survives the blip.
    expect(res.headers.get("x-session-id")).toBeTruthy();
    expect(h.captureException).toHaveBeenCalled();
  });

  it("pivots to the fallback when the model stream errors before yielding anything", async () => {
    h.streamText.mockReturnValue({
      textStream: new ReadableStream<string>({
        start(c) {
          c.error(new Error("upstream died"));
        },
      }),
    });

    const res = await post({ message: "hi" });

    expect(res.status).toBe(200);
    // The visitor sees the chamber's contact details, not a truncated blank.
    expect(await res.text()).toContain(OFFLINE_MARKER);
  });
});
