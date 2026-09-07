import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * One route accepts admin image uploads; every screen that posts to it must be
 * fixed the same way, and there must be no fourth screen nobody remembered.
 *
 * The history: two of the three uploaders were given the shared treatment
 * (browser downscale, pre-flight validation, status-before-body error reading)
 * and the media library was missed. Because the route's cap dropped from 15 MB
 * to the platform's real 4 MB at the same time, the missed screen got WORSE
 * than before the fix — a 4.2 MB file that used to upload now 400s, under a
 * label still promising 15 MB, and the failure surfaced as
 * "Unexpected token '<'" because it read the body before the status.
 *
 * These uploaders have no component test harness in this project, so this gates
 * their SOURCE. It is a coarse test on purpose: what it actually enforces is
 * "nobody added an upload path that skips the shared helpers", which is exactly
 * the mistake that happened.
 */

const ROOT = process.cwd();
const UPLOAD_ROUTE = "/api/admin/media/upload";

const KNOWN_UPLOADERS = [
  "src/app/admin/(dashboard)/media/MediaLibraryClient.tsx",
  "src/components/admin/EventGraphicUploader.tsx",
  "src/components/admin/EventPhotoUploader.tsx",
];

const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/**
 * Every source file that posts to the upload route.
 *
 * Walks the filesystem rather than asking git: a brand-new uploader is the
 * thing this is looking for, and a brand-new file is not tracked yet.
 */
function findUploadCallers(dir = join(ROOT, "src"), found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findUploadCallers(full, found);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue;
    const rel = relative(ROOT, full).split(sep).join("/");
    // The route itself is the destination, not a caller.
    if (rel.startsWith("src/app/api/")) continue;
    // Comments name the route too (upload-limits.ts explains it); only real
    // code counts.
    const body = readFileSync(full, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    if (body.includes(UPLOAD_ROUTE)) found.push(rel);
  }
  return found.sort();
}

describe("admin upload entry points", () => {
  it("there are exactly three, and they are the ones treated below", () => {
    expect(
      findUploadCallers(),
      "a new screen posts to the admin upload route. Give it the same three " +
        "fixes the others have (prepareImageForUpload, checkSourceFile, " +
        "uploadErrorFromResponse) and add it to KNOWN_UPLOADERS.",
    ).toEqual([...KNOWN_UPLOADERS].sort());
  });

  for (const file of KNOWN_UPLOADERS) {
    describe(file, () => {
      const source = read(file);
      // Comments deliberately quote the old behaviour; assert on code only.
      const code = source.replace(/^\s*\/\/.*$/gm, "");

      it("downscales in the browser before posting", () => {
        // Vercel caps a function request body at 4.5 MB. Without this, an
        // ordinary phone photo is rejected by the platform before the route
        // runs, so the route's own message can never be the one you see.
        expect(code).toContain("prepareImageForUpload");
        expect(code).toMatch(/fd\.append\("file", prepared\)/);
      });

      it("validates the source file up front instead of dropping it silently", () => {
        expect(code).toContain("checkSourceFile");
      });

      it("reads the STATUS before the body", () => {
        // res.json() on a platform 413 or an auth redirect is HTML: the parse
        // error replaces the real message with "Unexpected token '<'".
        const guard = source.indexOf("uploadErrorFromResponse(res)");
        expect(guard, "must use the shared error reader").toBeGreaterThan(-1);

        for (const match of source.matchAll(/await res\.json\(\)(?!\s*\.catch)/g)) {
          expect(
            match.index,
            `res.json() at ${match.index} is read before the status check at ${guard}`,
          ).toBeGreaterThan(guard);
        }
      });

      it("quotes a limit the upload can actually honour", () => {
        // The advertised number is derived from the shared constant, never
        // typed in — "15 MB" outlived two changes to the real cap.
        expect(code).not.toMatch(/\b15 MB\b/);
        expect(code).toMatch(/format\w*\(MAX_SOURCE_BYTES\)/);
      });

      it("accepts exactly the types the route and checkSourceFile accept", () => {
        expect(code).toContain(
          'accept="image/jpeg,image/png,image/webp,image/gif,image/avif"',
        );
      });
    });
  }
});
