#!/usr/bin/env node
/**
 * audit-community-investor-logos.mjs
 *
 * Pulls the chamber's "Community Investor Logos" SharePoint folder
 * into tmp/sharepoint-logos/, compares each downloaded file against
 * the current set in public/images/members/logos/, and writes a
 * triage report at tmp/community-investor-logo-audit.md.
 *
 * Read-only on the canonical paths — never overwrites anything in
 * public/. The report ends with a `tmp/promote.sh` script the user
 * can review and run by hand to swap specific logos.
 *
 * Why a separate tool from sync-sharepoint-photos.mjs:
 *   - Logo filenames in SharePoint don't slugify cleanly to
 *     chamberSlug (e.g. "Summa Health.png" → summa-health-system)
 *     — needs fuzzy matching, never auto-replace.
 *   - "Bogus logo" is a quality judgment, not a freshness one. Human
 *     reviews the side-by-side and decides per-file.
 *
 * Required env (same as nightly sync):
 *   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
 *
 * Optional env:
 *   SHAREPOINT_HOSTNAME       default: medinaohchamber.sharepoint.com
 *   SHAREPOINT_LOGO_PATH      default: "1 photos/2026 Photos/Community Investor Logos"
 *
 * Flags:
 *   --no-download             skip the SharePoint pull, just regenerate
 *                             the report from existing tmp/sharepoint-logos/
 */

import { readFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import sharp from "sharp";

const argv = process.argv.slice(2);
const NO_DOWNLOAD = argv.includes("--no-download");

const TENANT = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const HOSTNAME =
  process.env.SHAREPOINT_HOSTNAME || "medinaohchamber.sharepoint.com";
const LOGO_PATH =
  process.env.SHAREPOINT_LOGO_PATH ||
  "1 photos/2026 Photos/Community Investor Logos";

const ROOT = process.cwd();
const CURRENT_LOGOS = join(ROOT, "public", "images", "members", "logos");
const STAGE_DIR = join(ROOT, "tmp", "sharepoint-logos");
const REPORT_PATH = join(ROOT, "tmp", "community-investor-logo-audit.md");
const PROMOTE_PATH = join(ROOT, "tmp", "promote.sh");

const IMG_EXT = /\.(jpe?g|png|webp|svg|avif|gif)$/i;
const BYTES_BOGUS = 5_000; // current logos below this are likely favicon-grade
const MIN_DIM_BOGUS = 200; // max(width, height) below this looks pixelated on the marquee tile

// Noise words to strip from SharePoint filenames before tokenizing for
// match. Slug tokens are NOT filtered — slugs are canonical truth.
const NOISE = new Set([
  "logo", "logos", "color", "colour", "colors", "colour",
  "brand", "branding", "branded",
  "official", "final", "draft", "rev", "revised", "old", "new",
  "transparent", "trans",
  "hires", "highres", "lowres", "high", "low", "res",
  "small", "med", "medium", "large", "lg", "sm",
  "inc", "llc", "co", "corp", "company", "companies", "group", "ltd", "lp",
  "the", "of", "and", "a", "an", "for", "by", "or",
  "rgb", "cmyk", "pms",
  "vector", "raster",
  "white", "black", "bg", "background",
  "horizontal", "vertical", "stacked", "wide", "tall", "square",
  "primary", "secondary",
  "v1", "v2", "v3",
]);

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function need(n, v) {
  if (!v) die(`missing env var ${n}`);
  return v;
}

// ──────────────────────────────────────────────────────────────────
// Token normalization & fuzzy matching
// ──────────────────────────────────────────────────────────────────

function splitCase(s) {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2");
}

function tokenizeFilename(name) {
  return splitCase(name)
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !NOISE.has(t))
    .filter((t) => !/^\d{4}$/.test(t)); // strip year tokens
}

function tokenizeSlug(slug) {
  return slug.split("-").filter(Boolean);
}

/**
 * F1 score on token sets. Asymmetric makes us miss cases like
 * "summa-health-system" / "Summa Health.png" (recall 0.67) — F1 is
 * better balanced (~0.8). Threshold 0.5 = match, 0.3-0.5 = uncertain.
 */
function matchScore(slugTokens, fileTokens) {
  if (slugTokens.length === 0 || fileTokens.length === 0) return 0;
  const fileSet = new Set(fileTokens);
  const hits = slugTokens.filter((t) => fileSet.has(t)).length;
  if (hits === 0) return 0;
  const precision = hits / fileTokens.length;
  const recall = hits / slugTokens.length;
  return (2 * precision * recall) / (precision + recall);
}

// ──────────────────────────────────────────────────────────────────
// Graph auth + download
// ──────────────────────────────────────────────────────────────────

async function getToken() {
  need("AZURE_TENANT_ID", TENANT);
  need("AZURE_CLIENT_ID", CLIENT_ID);
  need("AZURE_CLIENT_SECRET", CLIENT_SECRET);
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );
  if (!res.ok) die(`token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function graph(path, token) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) die(`graph ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function pullSharePointLogos() {
  console.log(`→ pulling ${LOGO_PATH} from ${HOSTNAME}`);
  await mkdir(STAGE_DIR, { recursive: true });

  // Clear stage so deleted SharePoint files disappear here too
  for (const f of await readdir(STAGE_DIR)) {
    await (await import("node:fs/promises")).rm(join(STAGE_DIR, f));
  }

  const token = await getToken();
  const site = await graph(`/sites/${HOSTNAME}`, token);
  const encoded = LOGO_PATH.split("/").map(encodeURIComponent).join("/");
  const listing = await graph(
    `/sites/${site.id}/drive/root:/${encoded}:/children` +
      `?$select=name,size,file,@microsoft.graph.downloadUrl&$top=200`,
    token,
  );
  const files = (listing.value || []).filter(
    (f) => f.file && IMG_EXT.test(f.name),
  );
  console.log(`   found ${files.length} image file(s)`);

  for (const f of files) {
    const res = await fetch(f["@microsoft.graph.downloadUrl"]);
    if (!res.ok) {
      console.warn(`   ! ${f.name}: ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(join(STAGE_DIR, f.name), buf);
    console.log(`   ↓ ${f.name} (${f.size} bytes)`);
  }
}

// ──────────────────────────────────────────────────────────────────
// Inspect: read every logo's metadata + tokens
// ──────────────────────────────────────────────────────────────────

async function inspectImage(absPath) {
  const s = await stat(absPath);
  let width = null;
  let height = null;
  let format = null;
  try {
    const meta = await sharp(absPath).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
    format = meta.format ?? null;
  } catch {
    // SVG without viewBox can fail metadata read; just record as svg
    format = extname(absPath).slice(1).toLowerCase() || null;
  }
  return { bytes: s.size, width, height, format };
}

async function readDirImages(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries.filter((n) => IMG_EXT.test(n));
}

// ──────────────────────────────────────────────────────────────────
// Build report
// ──────────────────────────────────────────────────────────────────

async function loadCISlugs() {
  // Parse the overrides file directly — avoids a tsx/build step for
  // an audit script that's run by hand.
  const src = await readFile(
    join(ROOT, "src", "data", "tier-overrides.ts"),
    "utf8",
  );
  const match = src.match(
    /COMMUNITY_INVESTOR_SLUGS[^[]+\[([\s\S]*?)\]/,
  );
  if (!match) die("could not parse COMMUNITY_INVESTOR_SLUGS from tier-overrides.ts");
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function isPixelBogus(meta) {
  if (!meta) return false;
  if (meta.format === "svg") return false; // SVG is scale-free
  if (!meta.width || !meta.height) return false;
  return Math.max(meta.width, meta.height) < MIN_DIM_BOGUS;
}

function isBytesBogus(meta) {
  if (!meta) return false;
  if (meta.format === "svg") return meta.bytes < 1500; // raw <1.5KB = likely placeholder svg
  return meta.bytes < BYTES_BOGUS;
}

function formatDim(meta) {
  if (!meta) return "—";
  if (meta.format === "svg") return "vector";
  if (!meta.width) return "?";
  return `${meta.width}×${meta.height}`;
}

function formatBytes(n) {
  if (n == null) return "—";
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

async function buildReport() {
  const ciSlugs = await loadCISlugs();
  console.log(`→ analyzing ${ciSlugs.length} Community Investors`);

  // Inspect every current logo
  const currentFiles = await readDirImages(CURRENT_LOGOS);
  const currentBySlug = new Map();
  for (const filename of currentFiles) {
    const slug = filename.replace(/\.[^.]+$/, "");
    currentBySlug.set(slug, {
      filename,
      ...(await inspectImage(join(CURRENT_LOGOS, filename))),
    });
  }

  // Inspect every staged SharePoint logo, tokenize for matching
  const spFiles = await readDirImages(STAGE_DIR);
  const spCandidates = [];
  for (const filename of spFiles) {
    const meta = await inspectImage(join(STAGE_DIR, filename));
    spCandidates.push({
      filename,
      tokens: tokenizeFilename(filename),
      ...meta,
    });
  }
  console.log(
    `   ${currentBySlug.size} current logos, ${spCandidates.length} SharePoint candidates`,
  );

  // For each CI slug, find best SP candidate
  const matches = ciSlugs.map((slug) => {
    const slugTokens = tokenizeSlug(slug);
    const scored = spCandidates
      .map((c) => ({ c, score: matchScore(slugTokens, c.tokens) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    const top = scored[0];
    return {
      slug,
      current: currentBySlug.get(slug) || null,
      sp: top ? top.c : null,
      score: top ? top.score : 0,
      alternates: scored.slice(1, 3).map((x) => ({
        filename: x.c.filename,
        score: x.score,
      })),
    };
  });

  // A SharePoint file is "matched" if any CI slug picked it as its top
  // guess at any score above zero — that means it's already accounted
  // for in either the high-confidence or uncertain section. Anything
  // that NO slug picks is a true orphan.
  const matchedSpFiles = new Set();
  for (const m of matches) {
    if (m.sp) matchedSpFiles.add(m.sp.filename);
  }

  // Bucket into sections
  const bogusCurrent = matches.filter(
    (m) =>
      m.current &&
      (isBytesBogus(m.current) || isPixelBogus(m.current)),
  );
  const missingCurrent = matches.filter((m) => !m.current);
  const uncertain = matches.filter(
    (m) => m.sp && m.score < 0.5 && m.score > 0,
  );
  const noSpMatch = matches.filter((m) => !m.sp);
  const orphanSp = spCandidates.filter(
    (c) => !matchedSpFiles.has(c.filename),
  );

  // Build markdown
  const lines = [];
  lines.push(`# Community Investor Logo Audit`);
  lines.push(`_Generated ${new Date().toISOString()}_`);
  lines.push("");
  lines.push(
    `Source: \`${HOSTNAME}\` → \`${LOGO_PATH}\` → \`tmp/sharepoint-logos/\``,
  );
  lines.push("");
  lines.push(`- **${ciSlugs.length}** Community Investors expected`);
  lines.push(
    `- **${currentBySlug.size}** current logos in \`public/images/members/logos/\``,
  );
  lines.push(`- **${spCandidates.length}** SharePoint files downloaded`);
  lines.push(
    `- **${matches.filter((m) => m.sp && m.score >= 0.5).length}** high-confidence matches`,
  );
  lines.push(`- **${uncertain.length}** uncertain matches`);
  lines.push(`- **${orphanSp.length}** unmatched SharePoint files`);
  lines.push("");

  // ── BOGUS CURRENT ──
  lines.push(`## ⚠ Likely bogus current logos`);
  lines.push(
    `Current file is < ${BYTES_BOGUS} bytes raster, or max dimension ` +
      `below ${MIN_DIM_BOGUS}px, or near-empty SVG. ` +
      `These are the priorities to replace.`,
  );
  lines.push("");
  if (bogusCurrent.length === 0) {
    lines.push("_None._");
  } else {
    lines.push(
      "| Slug | Current | Format | Bytes | Dim | SP Match | SP Bytes | SP Dim | Conf |",
    );
    lines.push(
      "|------|---------|--------|-------|-----|----------|----------|--------|------|",
    );
    for (const m of bogusCurrent) {
      // Only surface SP match in this table if confidence >= 0.5 —
      // low-confidence matches in the bogus table are noisy (one
      // shared "bank" token shouldn't suggest replacement).
      const showSp = m.sp && m.score >= 0.5;
      lines.push(
        `| \`${m.slug}\` | ${m.current.filename} | ${m.current.format} ` +
          `| ${formatBytes(m.current.bytes)} | ${formatDim(m.current)} ` +
          `| ${showSp ? m.sp.filename : "—"} ` +
          `| ${showSp ? formatBytes(m.sp.bytes) : "—"} ` +
          `| ${showSp ? formatDim(m.sp) : "—"} ` +
          `| ${showSp ? m.score.toFixed(2) : "—"} |`,
      );
    }
  }
  lines.push("");

  // ── MISSING CURRENT ──
  if (missingCurrent.length > 0) {
    lines.push(`## ❌ Community Investors with NO current logo`);
    lines.push("");
    lines.push(
      "| Slug | SP Match | SP Bytes | SP Dim | Conf |",
    );
    lines.push("|------|----------|----------|--------|------|");
    for (const m of missingCurrent) {
      lines.push(
        `| \`${m.slug}\` | ${m.sp ? m.sp.filename : "—"} ` +
          `| ${m.sp ? formatBytes(m.sp.bytes) : "—"} ` +
          `| ${m.sp ? formatDim(m.sp) : "—"} ` +
          `| ${m.score ? m.score.toFixed(2) : "—"} |`,
      );
    }
    lines.push("");
  }

  // ── UPGRADES AVAILABLE ──
  const upgrades = matches.filter(
    (m) =>
      m.current &&
      m.sp &&
      m.score >= 0.5 &&
      !isBytesBogus(m.current) &&
      // Heuristic: SP version is 2x bigger (bytes) and same/better format,
      // OR SP is svg/png and current is jpg
      ((m.sp.bytes > m.current.bytes * 2) ||
        (m.current.format === "jpeg" &&
          (m.sp.format === "svg" || m.sp.format === "png"))),
  );
  if (upgrades.length > 0) {
    lines.push(`## ✨ Possible upgrades`);
    lines.push(
      `Current logo is OK but SharePoint has something bigger or in a ` +
        `better format. Open both side-by-side before swapping.`,
    );
    lines.push("");
    lines.push(
      "| Slug | Current | SP Match | Conf | Notes |",
    );
    lines.push("|------|---------|----------|------|-------|");
    for (const m of upgrades) {
      const notes = [];
      if (m.current.format === "jpeg" && m.sp.format !== "jpeg") {
        notes.push(`jpg → ${m.sp.format}`);
      }
      if (m.sp.bytes > m.current.bytes * 2) {
        notes.push(
          `${formatBytes(m.current.bytes)} → ${formatBytes(m.sp.bytes)}`,
        );
      }
      lines.push(
        `| \`${m.slug}\` | ${m.current.filename} (${formatDim(m.current)}) ` +
          `| ${m.sp.filename} (${formatDim(m.sp)}) ` +
          `| ${m.score.toFixed(2)} | ${notes.join(", ")} |`,
      );
    }
    lines.push("");
  }

  // ── UNCERTAIN ──
  if (uncertain.length > 0) {
    lines.push(`## ❓ Uncertain matches — review manually`);
    lines.push(
      `Token-overlap score below 0.5. Could be a real match the script ` +
        `missed (acronym, abbreviation) or a near-miss SP file.`,
    );
    lines.push("");
    lines.push(
      "| Slug | Best SP Guess | Conf | Other candidates |",
    );
    lines.push("|------|---------------|------|------------------|");
    for (const m of uncertain) {
      const alts = m.alternates
        .map((a) => `${a.filename} (${a.score.toFixed(2)})`)
        .join(", ");
      lines.push(
        `| \`${m.slug}\` | ${m.sp.filename} | ${m.score.toFixed(2)} | ${alts || "—"} |`,
      );
    }
    lines.push("");
  }

  // ── NO SP MATCH ──
  if (noSpMatch.length > 0) {
    lines.push(`## · Community Investors with no SharePoint candidate`);
    lines.push(
      `Either SharePoint doesn't have a file for them, or the filename ` +
        `is so unrelated that the matcher couldn't find it. Keep ` +
        `current; consider asking staff to add to the SharePoint folder.`,
    );
    lines.push("");
    for (const m of noSpMatch) {
      lines.push(
        `- \`${m.slug}\` — current: ${m.current ? m.current.filename : "(none)"}`,
      );
    }
    lines.push("");
  }

  // ── ORPHAN SP FILES ──
  if (orphanSp.length > 0) {
    lines.push(`## 📂 SharePoint files with no CI member match`);
    lines.push(
      `These are in the Community Investor Logos folder but don't ` +
        `correspond to a current CI slug. Could be: new CI member not ` +
        `yet in tier-overrides.ts, retired member, non-CI logo, or a ` +
        `filename the matcher couldn't handle.`,
    );
    lines.push("");
    for (const c of orphanSp) {
      lines.push(
        `- \`${c.filename}\` — ${formatBytes(c.bytes)}, ${formatDim(c)}, tokens: [${c.tokens.join(", ")}]`,
      );
    }
    lines.push("");
  }

  // ── PROMOTE COMMANDS ──
  lines.push(`## 🛠 Suggested promote commands`);
  lines.push(
    `Generated for **bogus current** + **missing current** rows only. ` +
      `Review each before running — the script can't tell if the ` +
      `SharePoint logo is actually for the right company. ` +
      `These commands also land in \`tmp/promote.sh\`.`,
  );
  lines.push("");
  lines.push("```bash");
  const promoteCmds = [];
  for (const m of [...bogusCurrent, ...missingCurrent]) {
    if (!m.sp || m.score < 0.5) continue;
    const ext = extname(m.sp.filename).toLowerCase();
    const target = `public/images/members/logos/${m.slug}${ext}`;
    promoteCmds.push(
      `# ${m.slug} — ${m.current ? `replace ${m.current.filename}` : "MISSING (new file)"} ` +
        `→ ${m.sp.filename} (conf ${m.score.toFixed(2)})`,
    );
    if (m.current && extname(m.current.filename).toLowerCase() !== ext) {
      promoteCmds.push(
        `rm "public/images/members/logos/${m.current.filename}"`,
      );
    }
    promoteCmds.push(
      `cp "tmp/sharepoint-logos/${m.sp.filename}" "${target}"`,
    );
    promoteCmds.push("");
  }
  if (promoteCmds.length === 0) {
    lines.push("# No high-confidence replacements suggested.");
  } else {
    lines.push(...promoteCmds);
  }
  lines.push("```");
  lines.push("");

  return { markdown: lines.join("\n"), promoteCmds };
}

// ──────────────────────────────────────────────────────────────────
// Entry
// ──────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(join(ROOT, "tmp"), { recursive: true });

  if (!NO_DOWNLOAD) {
    await pullSharePointLogos();
  } else {
    if (!existsSync(STAGE_DIR)) {
      die(`--no-download but ${STAGE_DIR} doesn't exist — drop the flag for a fresh pull`);
    }
    console.log(`→ skipping download (--no-download), using existing ${STAGE_DIR}`);
  }

  const { markdown, promoteCmds } = await buildReport();
  await writeFile(REPORT_PATH, markdown);
  await writeFile(
    PROMOTE_PATH,
    `#!/usr/bin/env bash\n` +
      `# Review each line before running. Generated by audit-community-investor-logos.mjs.\n` +
      `set -e\n\n` +
      (promoteCmds.length ? promoteCmds.join("\n") : "# No suggestions.\n"),
  );

  console.log("");
  console.log(`✓ report:  ${REPORT_PATH}`);
  console.log(`✓ promote: ${PROMOTE_PATH}`);
  console.log("");
  console.log(`Open the report, decide what to swap, then either run`);
  console.log(`bash tmp/promote.sh or cherry-pick the commands you want.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
