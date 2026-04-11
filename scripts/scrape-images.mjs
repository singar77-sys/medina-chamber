/**
 * scrape-images.mjs
 *
 * Scrapes images from the existing medinachamber.com Squarespace site.
 * Downloads, renames with SEO-friendly names, and organizes into:
 *   public/images/people/staff/
 *   public/images/people/hall-of-fame/
 *   public/images/people/board/
 *   public/images/people/ambassadors/
 *   public/images/events/
 *   public/images/programs/
 *
 * Also writes a catalog to scripts/image-catalog.json
 */

import { parse } from "node-html-parser";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC_IMAGES = path.join(ROOT, "public", "images");

// ── Pages to scrape ───────────────────────────────────────────
const PAGES = [
  {
    url: "https://medinachamber.com/about-us",
    category: "people/staff",
    label: "staff",
  },
  {
    url: "https://medinachamber.com/hall-of-fame",
    category: "people/hall-of-fame",
    label: "hall-of-fame",
  },
  {
    url: "https://medinachamber.com/chamber-ambassadors",
    category: "people/ambassadors",
    label: "ambassadors",
  },
  {
    url: "https://medinachamber.com/athena-awards",
    category: "events/athena-awards",
    label: "athena-awards",
  },
  {
    url: "https://medinachamber.com/golfouting2026",
    category: "events/golf-outing",
    label: "golf-outing",
  },
  {
    url: "https://medinachamber.com/compass-program",
    category: "programs/compass",
    label: "compass",
  },
  {
    url: "https://medinachamber.com/social-connect",
    category: "events/social-connect",
    label: "social-connect",
  },
  {
    url: "https://medinachamber.com/medina-safety-council",
    category: "programs/safety-council",
    label: "safety-council",
  },
  {
    url: "https://medinachamber.com/rental-space",
    category: "programs/rental-space",
    label: "rental-space",
  },
  {
    url: "https://medinachamber.com/advocacy",
    category: "about/advocacy",
    label: "advocacy",
  },
  {
    url: "https://medinachamber.com/pricing",
    category: "membership",
    label: "pricing",
  },
  {
    url: "https://medinachamber.com/member-benefits",
    category: "membership",
    label: "member-benefits",
  },
];

// ── Helpers ───────────────────────────────────────────────────

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/['"''"",()]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

/** Strip Squarespace size params and request a large version */
function bestQualityUrl(url) {
  if (!url) return null;
  // Skip data URIs and SVGs
  if (url.startsWith("data:") || url.endsWith(".svg")) return null;
  // Squarespace CDN — strip existing params and ask for 2500w
  if (
    url.includes("squarespace-cdn.com") ||
    url.includes("squarespace.com/static")
  ) {
    const base = url.split("?")[0];
    return `${base}?format=2500w`;
  }
  return url;
}

function extFromUrl(url) {
  const clean = url.split("?")[0].split("#")[0];
  const ext = path.extname(clean).toLowerCase();
  // Squarespace often serves JPEGs without extension
  return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)
    ? ext
    : ".jpg";
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MedinaChamberBot/1.0; +https://medinachamber.com)",
          Accept: "text/html,application/xhtml+xml",
        },
        timeout: 15000,
      },
      (res) => {
        // Follow redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return fetchHtml(res.headers.location).then(resolve).catch(reject);
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MedinaChamberBot/1.0)",
          Referer: "https://medinachamber.com/",
        },
        timeout: 30000,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          file.close();
          fs.unlinkSync(dest);
          return downloadFile(res.headers.location, dest)
            .then(resolve)
            .catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", (err) => {
          fs.unlinkSync(dest);
          reject(err);
        });
      }
    );
    req.on("error", (err) => {
      try { fs.unlinkSync(dest); } catch {}
      reject(err);
    });
    req.on("timeout", () => {
      req.destroy();
      try { fs.unlinkSync(dest); } catch {}
      reject(new Error(`Download timeout: ${url}`));
    });
  });
}

/** Try to get a descriptive name from an img element's context */
function getImageName(imgEl, index, label) {
  const alt = (imgEl.getAttribute("alt") || "").trim();
  const title = (imgEl.getAttribute("title") || "").trim();

  // Look for a nearby figcaption, h2, h3, h4
  let contextText = "";
  let parent = imgEl.parentNode;
  for (let depth = 0; depth < 5 && parent; depth++) {
    const caption = parent.querySelector("figcaption");
    if (caption) {
      contextText = caption.text.trim();
      break;
    }
    const heading = parent.querySelector("h2, h3, h4");
    if (heading) {
      contextText = heading.text.trim();
      break;
    }
    // Check next sibling for a name/caption
    const sibling = parent.nextElementSibling;
    if (sibling) {
      const siblingText = sibling.text.trim();
      if (siblingText && siblingText.length < 80) {
        contextText = siblingText;
        break;
      }
    }
    parent = parent.parentNode;
  }

  // Pick best available text
  const nameText = alt || contextText || title;

  if (nameText && nameText.length > 2 && nameText.length < 120) {
    const slug = slugify(nameText);
    if (slug.length > 2) {
      return `${slug}-medina-chamber`;
    }
  }

  // Fallback: label + index
  return `${label}-image-${String(index).padStart(2, "0")}-medina-chamber`;
}

/** Skip decorative / tiny / irrelevant images */
function shouldSkip(src) {
  if (!src) return true;
  const lower = src.toLowerCase();
  // Skip logos, icons, social media pixels, tracking
  if (lower.includes("logo") && !lower.includes("squarespace")) return true;
  if (lower.includes("favicon")) return true;
  if (lower.includes("icon-") && lower.endsWith(".png")) return true;
  if (lower.includes("pixel") || lower.includes("tracker")) return true;
  if (lower.includes("google") || lower.includes("facebook.com/tr")) return true;
  if (lower.includes("squarespace.com/universal/")) return true;
  if (lower.includes(".gif") && lower.includes("spacer")) return true;
  return false;
}

// ── Main ──────────────────────────────────────────────────────

const catalog = [];
const seen = new Set(); // avoid re-downloading the same URL

async function scrapePage({ url, category, label }) {
  console.log(`\n📄 Scraping: ${url} → ${category}`);

  let html;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err.message}`);
    return;
  }

  const root = parse(html);
  const imgs = root.querySelectorAll("img");
  console.log(`  Found ${imgs.length} <img> elements`);

  const dir = path.join(PUBLIC_IMAGES, category);
  fs.mkdirSync(dir, { recursive: true });

  let downloaded = 0;
  let skipped = 0;

  for (let i = 0; i < imgs.length; i++) {
    const imgEl = imgs[i];
    const rawSrc =
      imgEl.getAttribute("src") ||
      imgEl.getAttribute("data-src") ||
      imgEl.getAttribute("data-image");

    const src = bestQualityUrl(rawSrc);
    if (!src || shouldSkip(rawSrc) || shouldSkip(src)) {
      skipped++;
      continue;
    }

    // Deduplicate by base URL (without size params)
    const baseUrl = rawSrc ? rawSrc.split("?")[0] : src.split("?")[0];
    if (seen.has(baseUrl)) {
      skipped++;
      continue;
    }
    seen.add(baseUrl);

    const name = getImageName(imgEl, i + 1, label);
    const ext = extFromUrl(src);
    const filename = `${name}${ext}`;
    const destPath = path.join(dir, filename);
    const publicPath = `/images/${category}/${filename}`;

    // Skip if already downloaded
    if (fs.existsSync(destPath)) {
      console.log(`  ✓ Already exists: ${filename}`);
      catalog.push({ file: publicPath, category, label, source: baseUrl, alt: imgEl.getAttribute("alt") || "" });
      downloaded++;
      continue;
    }

    try {
      await downloadFile(src, destPath);
      const bytes = fs.statSync(destPath).size;

      // Skip files that are suspiciously small (< 2 KB = probably a pixel/spacer)
      if (bytes < 2048) {
        fs.unlinkSync(destPath);
        skipped++;
        continue;
      }

      console.log(`  ✅ ${filename} (${(bytes / 1024).toFixed(0)} KB)`);
      catalog.push({
        file: publicPath,
        category,
        label,
        source: baseUrl,
        alt: imgEl.getAttribute("alt") || "",
        bytes,
      });
      downloaded++;
    } catch (err) {
      console.warn(`  ⚠️  Failed to download ${src}: ${err.message}`);
      skipped++;
    }

    // Polite delay
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`  → ${downloaded} downloaded, ${skipped} skipped`);
}

async function main() {
  console.log("🖼️  Medina Chamber Image Scraper");
  console.log("=================================");
  console.log(`Output: ${PUBLIC_IMAGES}`);

  for (const page of PAGES) {
    await scrapePage(page);
  }

  // Write catalog
  const catalogPath = path.join(__dirname, "image-catalog.json");
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

  console.log(`\n✅ Done! ${catalog.length} images cataloged.`);
  console.log(`📋 Catalog written to: ${catalogPath}`);

  // Summary by category
  const byCategory = {};
  for (const item of catalog) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  }
  console.log("\nBy category:");
  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
