#!/usr/bin/env node
/**
 * sync-sharepoint-photos.mjs
 *
 * Mirror the chamber's "2026 Photos" SharePoint folder
 * (medinaohchamber.sharepoint.com → Shared Documents → 1 photos →
 * 2026 Photos) into public/images/photos/ as resized WebP files,
 * one subfolder per event type. The exact mapping lives in
 * scripts/sharepoint-sync.config.json — edit that file (not this
 * script) to add folders, retire the year, or repoint destinations.
 *
 * Runs nightly from .github/workflows/sync-sharepoint-photos.yml.
 * Whatever changed gets committed; the commit triggers a Vercel
 * rebuild and the new photos go live.
 *
 * Auth — Microsoft Graph app-only (client credentials). The chamber's
 * M365 admin needs to register an Azure AD app, grant it
 * Sites.Selected on https://medinaohchamber.sharepoint.com, and put
 * the tenant ID, client ID, and client secret into GitHub Actions
 * secrets. Full setup is documented in the workflow YAML header.
 *
 * Required env:
 *   AZURE_TENANT_ID
 *   AZURE_CLIENT_ID
 *   AZURE_CLIENT_SECRET
 *
 * Optional env:
 *   SHAREPOINT_CONFIG_PATH    default: scripts/sharepoint-sync.config.json
 *
 * Flags:
 *   --dry-run                 list source files for each sync; write nothing
 *   --only <label-substring>  only sync entries whose label contains this string
 *
 * Image pipeline: sharp .rotate() (EXIF), resize to max 1600w (no
 * upscaling), WebP @ q80. HEIC / RAW files are skipped with a warning
 * since sharp's prebuilt binary can't decode them.
 *
 * Failure semantics: token error or per-folder permission failure
 * fails the whole sync (exit 1). Per-folder 404 or empty folder logs
 * a warning and continues — staff may legitimately empty or rename
 * folders, and one missing folder shouldn't block the others.
 */

import { createHash } from "node:crypto";
import { readFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const ONLY_IDX = argv.indexOf("--only");
const ONLY = ONLY_IDX !== -1 ? argv[ONLY_IDX + 1]?.toLowerCase() : null;

const TENANT = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const CONFIG_PATH =
  process.env.SHAREPOINT_CONFIG_PATH ||
  join(process.cwd(), "scripts", "sharepoint-sync.config.json");

const PUBLIC_IMAGES = join(process.cwd(), "public", "images");
const SAFE_EXT = /\.(jpe?g|png|webp)$/i;
const SKIP_EXT = /\.(heic|heif|tiff?|raw|cr2|nef|arw)$/i;

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function need(name, val) {
  if (!val) die(`missing required env var ${name}`);
  return val;
}

async function loadConfig() {
  let raw;
  try {
    raw = await readFile(CONFIG_PATH, "utf8");
  } catch (e) {
    die(`config not found at ${CONFIG_PATH}: ${e.message}`);
  }
  const cfg = JSON.parse(raw);
  if (!cfg.hostname) die("config missing 'hostname'");
  if (!cfg.sourceRoot) die("config missing 'sourceRoot'");
  if (!Array.isArray(cfg.syncs) || cfg.syncs.length === 0) {
    die("config missing 'syncs' array");
  }
  return cfg;
}

async function getToken() {
  need("AZURE_TENANT_ID", TENANT);
  need("AZURE_CLIENT_ID", CLIENT_ID);
  need("AZURE_CLIENT_SECRET", CLIENT_SECRET);

  const url = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) {
    die(`token request failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()).access_token;
}

/**
 * Low-level Graph fetch that distinguishes 404 (caller decides) from
 * everything else (always fatal). Returns null on 404.
 */
async function graph(path, token, { allow404 = false } = {}) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 404 && allow404) return null;
  if (!res.ok) {
    die(`graph ${path} → ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function getSiteId(hostname, token) {
  const site = await graph(`/sites/${hostname}`, token);
  return site.id;
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function listChildren(siteId, folderPath, token) {
  return graph(
    `/sites/${siteId}/drive/root:/${encodePath(folderPath)}:/children` +
      `?$select=name,id,size,lastModifiedDateTime,file,@microsoft.graph.downloadUrl` +
      `&$top=200`,
    token,
    { allow404: true },
  );
}

async function downloadAndConvert(file, sync, index) {
  const downloadUrl = file["@microsoft.graph.downloadUrl"];
  if (!downloadUrl) die(`no downloadUrl for ${file.name}`);
  const res = await fetch(downloadUrl);
  if (!res.ok) die(`download ${file.name} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const num = String(index + 1).padStart(2, "0");
  const outName = `${sync.slug}-${num}.webp`;
  const outPath = join(PUBLIC_IMAGES, sync.dest, outName);

  await sharp(buf)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outPath);

  return {
    outName,
    sourceName: file.name,
    sourceId: file.id,
    sourceSize: file.size,
    sourceModified: file.lastModifiedDateTime,
    hash: createHash("sha256").update(buf).digest("hex").slice(0, 16),
  };
}

async function resetDir(absDir) {
  try {
    const entries = await readdir(absDir);
    for (const name of entries) await rm(join(absDir, name));
  } catch {
    // Doesn't exist yet
  }
  await mkdir(absDir, { recursive: true });
}

async function runSync(sync, sourceRoot, siteId, token) {
  const sourceFolder = `${sourceRoot}/${sync.folder}`;
  console.log(`\n── ${sync.label} ──`);
  console.log(`   source: ${sourceFolder}`);
  console.log(`   dest:   public/images/${sync.dest}/`);

  const listing = await listChildren(siteId, sourceFolder, token);
  if (listing === null) {
    console.warn(`   ! folder not found in SharePoint — skipping`);
    return { synced: 0, skipped: 0, missing: true };
  }
  const all = listing.value || [];
  const skipped = all.filter((f) => f.file && SKIP_EXT.test(f.name));
  if (skipped.length) {
    console.warn(
      `   ! skipping ${skipped.length} non-decodable file(s) ` +
        `(HEIC/RAW/TIFF): ${skipped.map((f) => f.name).join(", ")}`,
    );
  }

  const images = all
    .filter((f) => f.file && SAFE_EXT.test(f.name))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "en", {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .slice(0, sync.limit ?? 24);

  if (images.length === 0) {
    console.warn(`   ! no usable images — leaving dest dir untouched`);
    return { synced: 0, skipped: skipped.length, missing: false };
  }
  console.log(`   found ${images.length} image(s)`);

  if (DRY) {
    images.forEach((f, i) => console.log(`     ${i + 1}. ${f.name}`));
    return { synced: images.length, skipped: skipped.length, dryRun: true };
  }

  const absDir = join(PUBLIC_IMAGES, sync.dest);
  await resetDir(absDir);
  const results = [];
  for (let i = 0; i < images.length; i++) {
    const r = await downloadAndConvert(images[i], sync, i);
    results.push(r);
    console.log(`     ↓ ${r.sourceName} → ${r.outName}`);
  }

  const manifest = {
    syncedAt: new Date().toISOString(),
    label: sync.label,
    alt: sync.alt,
    source: { folder: sourceFolder },
    files: results,
  };
  await writeFile(
    join(absDir, ".manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  return { synced: results.length, skipped: skipped.length };
}

async function main() {
  const cfg = await loadConfig();
  console.log(
    `SharePoint sync — host=${cfg.hostname} root="${cfg.sourceRoot}"` +
      (ONLY ? ` only=${ONLY}` : "") +
      (DRY ? "  [DRY RUN]" : ""),
  );

  const syncs = ONLY
    ? cfg.syncs.filter((s) => s.label.toLowerCase().includes(ONLY))
    : cfg.syncs;
  if (syncs.length === 0) die(`no syncs match --only "${ONLY}"`);

  const token = await getToken();
  const siteId = await getSiteId(cfg.hostname, token);

  let totalSynced = 0;
  let totalSkipped = 0;
  let foldersMissing = 0;
  for (const sync of syncs) {
    const r = await runSync(sync, cfg.sourceRoot, siteId, token);
    totalSynced += r.synced || 0;
    totalSkipped += r.skipped || 0;
    if (r.missing) foldersMissing += 1;
  }

  console.log(
    `\n✓ done — ${totalSynced} photo(s) ${DRY ? "would be " : ""}synced` +
      (totalSkipped ? `, ${totalSkipped} skipped` : "") +
      (foldersMissing ? `, ${foldersMissing} folder(s) missing` : ""),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
