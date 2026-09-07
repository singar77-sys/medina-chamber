import { describe, expect, it } from "vitest";
import {
  MAX_SOURCE_BYTES,
  PLATFORM_REQUEST_LIMIT_BYTES,
  REQUEST_BUDGET_BYTES,
  checkSourceFile,
  formatBytes,
  uploadErrorFromResponse,
} from "./upload-limits";

const MB = 1024 * 1024;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("the budget itself", () => {
  it("stays under the platform's request-body cap", () => {
    // The whole point of the change: what we promise must be carryable.
    expect(REQUEST_BUDGET_BYTES).toBeLessThan(PLATFORM_REQUEST_LIMIT_BYTES);
    // With real headroom for multipart boundaries and the other form fields,
    // not a byte-shaving margin.
    expect(PLATFORM_REQUEST_LIMIT_BYTES - REQUEST_BUDGET_BYTES).toBeGreaterThan(256 * 1024);
  });
});

describe("checkSourceFile", () => {
  it("accepts a normal phone photo that will be downscaled", () => {
    expect(checkSourceFile({ type: "image/jpeg", size: 9 * MB })).toBeNull();
  });

  it("accepts a file already under the request budget", () => {
    expect(checkSourceFile({ type: "image/png", size: 1 * MB })).toBeNull();
  });

  it("rejects a non-image before anything is uploaded", () => {
    expect(checkSourceFile({ type: "application/pdf", size: 100 })).toMatch(/JPEG, PNG/);
  });

  it("rejects an image too large to decode in the browser, naming its size", () => {
    const problem = checkSourceFile({ type: "image/jpeg", size: MAX_SOURCE_BYTES + 1 });
    expect(problem).toContain(formatBytes(MAX_SOURCE_BYTES));
    expect(problem).toContain("40.0 MB");
  });
});

describe("uploadErrorFromResponse", () => {
  it("uses the route's own message when the body is JSON", async () => {
    const res = jsonResponse(400, { error: "eventSlug must be a lowercase-hyphen slug." });
    await expect(uploadErrorFromResponse(res)).resolves.toBe(
      "eventSlug must be a lowercase-hyphen slug.",
    );
  });

  it("explains a platform 413 instead of throwing a JSON parse error", async () => {
    // This is the failure the uploaders used to surface as
    // "Unexpected token '<'": the platform answers with HTML, not our route.
    const res = new Response("<html>Request Entity Too Large</html>", {
      status: 413,
      headers: { "content-type": "text/html" },
    });
    await expect(uploadErrorFromResponse(res)).resolves.toContain("upload limit");
  });

  it("names an expired admin session rather than a bare status code", async () => {
    const res = new Response("", { status: 401 });
    await expect(uploadErrorFromResponse(res)).resolves.toMatch(/session expired/i);
  });

  it("falls back to the status code for an unrecognised HTML failure", async () => {
    const res = new Response("<html>bad gateway</html>", {
      status: 502,
      headers: { "content-type": "text/html" },
    });
    await expect(uploadErrorFromResponse(res)).resolves.toBe("Upload failed (HTTP 502).");
  });

  it("survives a JSON content type carrying malformed JSON", async () => {
    const res = new Response("{not json", {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    await expect(uploadErrorFromResponse(res)).resolves.toBe("Upload failed (HTTP 500).");
  });
});

describe("formatBytes", () => {
  it("renders whole megabytes without a decimal", () => {
    expect(formatBytes(4 * MB)).toBe("4 MB");
  });

  it("keeps one decimal for the platform's 4.5 MB cap", () => {
    expect(formatBytes(PLATFORM_REQUEST_LIMIT_BYTES)).toBe("4.5 MB");
  });
});
