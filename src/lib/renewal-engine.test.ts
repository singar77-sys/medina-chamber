import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The RENEWALS_ENABLED kill switch is the last code-level guard on the dormant
// billing backend. When this cron ran unguarded against production it moved 23
// memberships to past_due and generated 1477 invoices; removing it from
// vercel.json is an ops fix, this switch is the code fix. Pin it so a refactor
// that drops or inverts the check fails here instead of on the next deploy.

const { execute, insert, update, select, send } = vi.hoisted(() => {
  const insertValues = vi.fn(async () => undefined);
  return {
    execute: vi.fn(async () => [] as unknown[]),
    insertValues,
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(),
    select: vi.fn(),
    send: vi.fn(async () => ({ error: null })),
  };
});
vi.mock("@/lib/db", () => ({ db: { execute, insert, update, select } }));
vi.mock("@/lib/email", () => ({ resend: { emails: { send } } }));

import { runRenewalEngine } from "./renewal-engine";

beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const noDbCalls = () => {
  expect(execute).not.toHaveBeenCalled();
  expect(insert).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
  expect(select).not.toHaveBeenCalled();
};

describe("runRenewalEngine kill switch", () => {
  for (const [label, value] of [
    ["unset", undefined],
    ["empty", ""],
    ["'false'", "false"],
    ["'TRUE' (only exact 'true' enables)", "TRUE"],
    ["'1'", "1"],
  ] as const) {
    it(`does nothing when RENEWALS_ENABLED is ${label}`, async () => {
      if (value === undefined) vi.stubEnv("RENEWALS_ENABLED", undefined as unknown as string);
      else vi.stubEnv("RENEWALS_ENABLED", value);

      const res = await runRenewalEngine();

      expect(res).toEqual({
        invoicesCreated: 0,
        notices30Sent: 0,
        notices7Sent: 0,
        markedPastDue: 0,
        markedLapsed: 0,
        errors: 0,
        errorDetails: [],
        durationMs: 0,
      });
      noDbCalls();
      expect(send).not.toHaveBeenCalled();
    });
  }

  it("runs every phase when RENEWALS_ENABLED is exactly 'true'", async () => {
    vi.stubEnv("RENEWALS_ENABLED", "true");

    const res = await runRenewalEngine();

    // 5 phases, each opening with a db.execute: invoice candidates, the two
    // notice sweeps, past-due, lapsed. Anything less means a phase was skipped.
    expect(execute.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(res.errors).toBe(0);
  });
});
