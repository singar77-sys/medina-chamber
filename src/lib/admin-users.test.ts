import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseAdminUsers, authenticateAdmin } from "@/lib/admin-users";

const SHARED = "shared-admin-secret-min16chars";

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

  describe("parseAdminUsers", () => {
    it("parses comma-separated Name:token pairs (trimming whitespace)", () => {
      process.env.ADMIN_USERS = "Stephanie:aaa111, Jaclyn:bbb222";
      expect(parseAdminUsers()).toEqual([
        { name: "Stephanie", token: "aaa111" },
        { name: "Jaclyn", token: "bbb222" },
      ]);
    });

    it("returns [] when unset or blank", () => {
      delete process.env.ADMIN_USERS;
      expect(parseAdminUsers()).toEqual([]);
      process.env.ADMIN_USERS = "   ";
      expect(parseAdminUsers()).toEqual([]);
    });

    it("skips malformed entries (no colon / empty name)", () => {
      process.env.ADMIN_USERS = "nocolon, :tokenonly, Good:tok";
      expect(parseAdminUsers()).toEqual([{ name: "Good", token: "tok" }]);
    });

    it("splits only on the first colon (token may contain colons)", () => {
      process.env.ADMIN_USERS = "Name:tok:extra";
      expect(parseAdminUsers()).toEqual([{ name: "Name", token: "tok:extra" }]);
    });
  });

  describe("authenticateAdmin", () => {
    it("returns the admin name for a valid per-admin token", async () => {
      process.env.ADMIN_USERS = "Stephanie:aaa111,Jaclyn:bbb222";
      expect(await authenticateAdmin("bbb222")).toBe("Jaclyn");
    });

    it("returns null for a wrong token when ADMIN_USERS is set", async () => {
      process.env.ADMIN_USERS = "Stephanie:aaa111";
      expect(await authenticateAdmin("nope")).toBeNull();
    });

    it("does NOT accept the shared secret once ADMIN_USERS is configured", async () => {
      process.env.ADMIN_USERS = "Stephanie:aaa111";
      expect(await authenticateAdmin(SHARED)).toBeNull();
    });

    it("falls back to the shared secret (name 'Admin') when ADMIN_USERS is unset", async () => {
      expect(await authenticateAdmin(SHARED)).toBe("Admin");
      expect(await authenticateAdmin("wrong")).toBeNull();
    });

    it("falls back to shared when ADMIN_USERS is malformed (never locks out)", async () => {
      process.env.ADMIN_USERS = "garbage-no-colon";
      expect(await authenticateAdmin(SHARED)).toBe("Admin");
    });

    it("returns null for empty input", async () => {
      expect(await authenticateAdmin("")).toBeNull();
    });
  });
});
