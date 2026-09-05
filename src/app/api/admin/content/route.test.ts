import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Three contracts nothing pinned on the CMS Content editor, all of which have
// a live public-page consequence:
//   1. Every verb is admin-gated. This route rewrites copy on public pages.
//   2. A blank submission RESETS the field. Storing "" instead would blank the
//      live office-hours line / hero eyebrow with no way to tell from the UI
//      that the page had gone empty rather than reverted.
//   3. maxLength is enforced server-side. The editor's textarea is a hint, not
//      a gate, and the store is Redis with no schema of its own.

const {
  requireAdminSession,
  getContentField,
  setContentField,
  clearContentField,
  revalidateTag,
} = vi.hoisted(() => ({
  requireAdminSession: vi.fn(async () => null as Response | null),
  getContentField: vi.fn(async () => null as string | null),
  setContentField: vi.fn(async () => {}),
  clearContentField: vi.fn(async () => {}),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));
// revalidateTag needs Next's request store, absent under vitest. cms-content
// (pulled in for CMS_CONTENT_TAG) also calls unstable_cache at module load, so
// the mock has to cover both exports or the import itself throws.
vi.mock("next/cache", () => ({
  revalidateTag,
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
vi.mock("@/lib/cms-store", () => ({
  getContentField,
  setContentField,
  clearContentField,
  CONTENT_FIELD_DEFS: [
    {
      page: "contact",
      field: "officeHours",
      label: "Office hours",
      defaultValue: "Mon-Fri, 9am-5pm",
      maxLength: 60,
    },
  ],
}));

const URL_BASE = "https://medinaohchamber.com/api/admin/content";

let GET: (req: Request) => Promise<Response>;
let PUT: (req: Request) => Promise<Response>;
let DELETE: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("./route");
  GET = mod.GET;
  PUT = mod.PUT;
  DELETE = mod.DELETE;
});

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminSession.mockResolvedValue(null);
  getContentField.mockResolvedValue(null);
});

afterEach(() => vi.restoreAllMocks());

const put = (body: unknown) =>
  PUT(new Request(URL_BASE, { method: "PUT", body: JSON.stringify(body) }));

describe("admin content route — auth", () => {
  it("refuses every verb when the admin session check fails, without touching the store", async () => {
    requireAdminSession.mockResolvedValue(
      new Response("nope", { status: 401 }) as Response,
    );

    expect((await GET(new Request(`${URL_BASE}?page=contact&field=officeHours`))).status).toBe(401);
    expect((await put({ page: "contact", field: "officeHours", value: "x" })).status).toBe(401);
    expect(
      (await DELETE(new Request(`${URL_BASE}?page=contact&field=officeHours`, { method: "DELETE" })))
        .status,
    ).toBe(401);

    expect(getContentField).not.toHaveBeenCalled();
    expect(setContentField).not.toHaveBeenCalled();
    expect(clearContentField).not.toHaveBeenCalled();
  });
});

describe("PUT /api/admin/content", () => {
  it("saves a trimmed value and busts the public cache tag", async () => {
    const res = await put({ page: "contact", field: "officeHours", value: "  Mon-Thu, 8-4  " });

    expect(res.status).toBe(200);
    expect(setContentField).toHaveBeenCalledWith("contact", "officeHours", "Mon-Thu, 8-4");
    // Without this the edit saves but the public page keeps serving the old
    // copy until the cache happens to expire.
    expect(revalidateTag).toHaveBeenCalledWith("cms-content", "max");
  });

  it("treats a blank submission as a reset, never as an empty publish", async () => {
    for (const value of ["", "   ", "\n\t "]) {
      vi.clearAllMocks();
      const res = await put({ page: "contact", field: "officeHours", value });

      expect(res.status, `value ${JSON.stringify(value)}`).toBe(200);
      expect(clearContentField).toHaveBeenCalledWith("contact", "officeHours");
      expect(setContentField).not.toHaveBeenCalled();
      expect(revalidateTag).toHaveBeenCalledWith("cms-content", "max");
    }
  });

  it("enforces maxLength server-side and stores nothing when it trips", async () => {
    const res = await put({
      page: "contact",
      field: "officeHours",
      value: "x".repeat(61), // def.maxLength is 60
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("60") });
    expect(setContentField).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("404s an unknown page/field pair rather than creating an orphan key", async () => {
    const res = await put({ page: "contact", field: "notAField", value: "hi" });

    expect(res.status).toBe(404);
    expect(setContentField).not.toHaveBeenCalled();
  });

  it("400s on malformed JSON and on a non-string value", async () => {
    const bad = await PUT(new Request(URL_BASE, { method: "PUT", body: "{not json" }));
    expect(bad.status).toBe(400);

    // A number would stringify into live page copy as "42".
    expect((await put({ page: "contact", field: "officeHours", value: 42 })).status).toBe(400);
    expect((await put({ page: "contact", field: "officeHours" })).status).toBe(400);
    expect(setContentField).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/content", () => {
  it("falls back to the static default when no override is stored", async () => {
    const res = await GET(new Request(`${URL_BASE}?page=contact&field=officeHours`));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      page: "contact",
      field: "officeHours",
      value: "Mon-Fri, 9am-5pm",
      isOverridden: false,
    });
  });

  it("reports a stored override as overridden", async () => {
    getContentField.mockResolvedValue("Mon-Thu, 8-4");
    const res = await GET(new Request(`${URL_BASE}?page=contact&field=officeHours`));

    expect(await res.json()).toMatchObject({ value: "Mon-Thu, 8-4", isOverridden: true });
  });

  it("lists every field with its current value when no page/field is given", async () => {
    const res = await GET(new Request(URL_BASE));
    const body = (await res.json()) as { fields: Array<Record<string, unknown>> };

    expect(res.status).toBe(200);
    expect(body.fields).toHaveLength(1);
    expect(body.fields[0]).toMatchObject({
      page: "contact",
      field: "officeHours",
      currentValue: "Mon-Fri, 9am-5pm",
      isOverridden: false,
    });
  });

  it("404s an unknown field", async () => {
    const res = await GET(new Request(`${URL_BASE}?page=contact&field=nope`));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/content", () => {
  it("clears the override and busts the cache tag", async () => {
    const res = await DELETE(
      new Request(`${URL_BASE}?page=contact&field=officeHours`, { method: "DELETE" }),
    );

    expect(res.status).toBe(200);
    expect(clearContentField).toHaveBeenCalledWith("contact", "officeHours");
    expect(revalidateTag).toHaveBeenCalledWith("cms-content", "max");
  });

  it("400s without page and field rather than clearing something arbitrary", async () => {
    const res = await DELETE(new Request(URL_BASE, { method: "DELETE" }));

    expect(res.status).toBe(400);
    expect(clearContentField).not.toHaveBeenCalled();
  });
});
