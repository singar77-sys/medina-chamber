import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getAdminUsersConfig,
  authenticateAdmin,
  isCurrentAdmin,
  getAdminAuthStatus,
  MIN_ADMIN_USER_TOKEN_LEN,
} from "@/lib/admin-users";

const SHARED = "shared-admin-secret-min16chars";

// Named tokens must clear the 32-char floor — realistic hex-ish values.
const TOK_A = "a1".repeat(MIN_ADMIN_USER_TOKEN_LEN / 2);
const TOK_B = "b2".repeat(MIN_ADMIN_USER_TOKEN_LEN / 2);

describe("admin-users", () => {
  const orig = {
    users: process.env.ADMIN_USERS,
    secret: process.env.CHAT_ADMIN_TOKEN,
  };

  beforeEach(() => {
    process.env.CHAT_ADMIN_TOKEN = SHARED;
    delete process.env.ADMIN_USERS;
  });

  afterEach(() => {
    if (orig.users === undefined) delete process.env.ADMIN_USERS;
    else process.env.ADMIN_USERS = orig.users;
    if (orig.secret === undefined) delete process.env.CHAT_ADMIN_TOKEN;
    else process.env.CHAT_ADMIN_TOKEN = orig.secret;
  });

  describe("getAdminUsersConfig", () => {
    it("parses comma-separated Name:token pairs (trimming whitespace)", () => {
      process.env.ADMIN_USERS = `Stephanie:${TOK_A}, Jaclyn:${TOK_B}`;
      expect(getAdminUsersConfig()).toEqual({
        mode: "named",
        users: [
          { name: "Stephanie", token: TOK_A },
          { name: "Jaclyn", token: TOK_B },
        ],
      });
    });

    it("is shared mode when unset or blank", () => {
      delete process.env.ADMIN_USERS;
      expect(getAdminUsersConfig()).toEqual({ mode: "shared" });
      process.env.ADMIN_USERS = "   ";
      expect(getAdminUsersConfig()).toEqual({ mode: "shared" });
    });

    it("tolerates a trailing comma", () => {
      process.env.ADMIN_USERS = `Stephanie:${TOK_A},`;
      expect(getAdminUsersConfig()).toMatchObject({ mode: "named" });
    });

    it("splits only on the first colon (token may contain colons)", () => {
      const colonToken = `tok:${"x".repeat(MIN_ADMIN_USER_TOKEN_LEN)}`;
      process.env.ADMIN_USERS = `Name:${colonToken}`;
      expect(getAdminUsersConfig()).toEqual({
        mode: "named",
        users: [{ name: "Name", token: colonToken }],
      });
    });

    it("is INVALID (not skip-and-continue) when any entry is malformed", () => {
      process.env.ADMIN_USERS = `nocolon, Good:${TOK_A}`;
      expect(getAdminUsersConfig()).toMatchObject({ mode: "invalid" });
      process.env.ADMIN_USERS = `:tokenonly, Good:${TOK_A}`;
      expect(getAdminUsersConfig()).toMatchObject({ mode: "invalid" });
    });

    it("is INVALID when any token is below the strength floor", () => {
      process.env.ADMIN_USERS = `Alice:x, Good:${TOK_A}`;
      const cfg = getAdminUsersConfig();
      expect(cfg).toMatchObject({ mode: "invalid" });
      // The reason names the offending admin but never leaks token material.
      if (cfg.mode === "invalid") {
        expect(cfg.reason).toContain("Alice");
        expect(cfg.reason).not.toContain(":x");
      }
    });
  });

  describe("authenticateAdmin", () => {
    it("returns the admin name for a valid per-admin token", async () => {
      process.env.ADMIN_USERS = `Stephanie:${TOK_A},Jaclyn:${TOK_B}`;
      expect(await authenticateAdmin(TOK_B)).toBe("Jaclyn");
    });

    it("returns null for a wrong token when ADMIN_USERS is set", async () => {
      process.env.ADMIN_USERS = `Stephanie:${TOK_A}`;
      expect(await authenticateAdmin("nope")).toBeNull();
    });

    it("does NOT accept the shared secret once ADMIN_USERS is configured", async () => {
      process.env.ADMIN_USERS = `Stephanie:${TOK_A}`;
      expect(await authenticateAdmin(SHARED)).toBeNull();
    });

    it("falls back to the shared secret (name 'Admin') when ADMIN_USERS is unset", async () => {
      expect(await authenticateAdmin(SHARED)).toBe("Admin");
      expect(await authenticateAdmin("wrong")).toBeNull();
    });

    it("FAILS CLOSED when ADMIN_USERS is malformed — no shared-token fallback", async () => {
      process.env.ADMIN_USERS = "garbage-no-colon";
      expect(await authenticateAdmin(SHARED)).toBeNull();
    });

    it("FAILS CLOSED when a named token is too weak — even that token is refused", async () => {
      process.env.ADMIN_USERS = "Alice:x";
      expect(await authenticateAdmin("x")).toBeNull();
      expect(await authenticateAdmin(SHARED)).toBeNull();
    });

    it("returns null for empty input", async () => {
      expect(await authenticateAdmin("")).toBeNull();
    });
  });

  describe("isCurrentAdmin", () => {
    it("accepts any subject in shared-token mode (nothing to revoke)", () => {
      expect(isCurrentAdmin("Admin")).toBe(true);
      expect(isCurrentAdmin(undefined)).toBe(true);
    });

    it("accepts only current named admins in named mode", () => {
      process.env.ADMIN_USERS = `Stephanie:${TOK_A}`;
      expect(isCurrentAdmin("Stephanie")).toBe(true);
      expect(isCurrentAdmin("Removed")).toBe(false);
      expect(isCurrentAdmin(undefined)).toBe(false);
    });

    it("rejects everyone when ADMIN_USERS is invalid — a typo must not un-revoke sessions", () => {
      process.env.ADMIN_USERS = "garbage-no-colon";
      expect(isCurrentAdmin("Stephanie")).toBe(false);
      expect(isCurrentAdmin("Admin")).toBe(false);
    });
  });

  describe("getAdminAuthStatus", () => {
    it("is ok in shared mode with a valid CHAT_ADMIN_TOKEN", () => {
      expect(getAdminAuthStatus()).toBe("ok");
    });

    it("is unconfigured in shared mode without CHAT_ADMIN_TOKEN", () => {
      delete process.env.CHAT_ADMIN_TOKEN;
      expect(getAdminAuthStatus()).toBe("unconfigured");
    });

    it("is ok in named mode WITHOUT CHAT_ADMIN_TOKEN — no legacy coupling", () => {
      delete process.env.CHAT_ADMIN_TOKEN;
      process.env.ADMIN_USERS = `Stephanie:${TOK_A}`;
      expect(getAdminAuthStatus()).toBe("ok");
    });

    it("is misconfigured when ADMIN_USERS is invalid", () => {
      process.env.ADMIN_USERS = "garbage-no-colon";
      expect(getAdminAuthStatus()).toBe("misconfigured");
    });
  });
});
