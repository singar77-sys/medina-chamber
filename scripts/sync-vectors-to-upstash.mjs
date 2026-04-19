/**
 * Sync member vectors to Upstash Vector
 * --------------------------------------
 * For each chamber member, builds a semantic document from all available
 * signals (name, categories, chamber description, scraped website content)
 * and upserts it to Upstash Vector. Upstash's managed hybrid index
 * (BAAI/bge-large-en-v1.5 dense + BM25 sparse) handles all vectorization
 * server-side — we just send raw text.
 *
 * This replaces the old generate-member-embeddings.mjs workflow:
 *   - No OpenAI calls (Upstash hosts the embedding model)
 *   - No JSON file output (Upstash IS the source of truth)
 *   - Hand-rolled keyword scoring goes away (BM25 sparse handles it)
 *
 * Run manually:
 *   node scripts/sync-vectors-to-upstash.mjs              # full sync (511 members)
 *   node scripts/sync-vectors-to-upstash.mjs --limit=10   # test with first 10
 *   node scripts/sync-vectors-to-upstash.mjs --reset      # delete all vectors first
 *
 * Env vars (loaded from .env.local automatically):
 *   UPSTASH_VECTOR_REST_URL
 *   UPSTASH_VECTOR_REST_TOKEN
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Index } from "@upstash/vector";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const MEMBERS_FILE = join(ROOT, "src", "data", "members.json");
const WEBSITES_FILE = join(ROOT, "src", "data", "member-websites.json");

// Upstash recommends batches of <=100 for upsert.
const BATCH_SIZE = 50;

// ── Load .env.local for local runs ─────────────────────────────────
const envPath = join(ROOT, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
  console.error("FATAL: UPSTASH_VECTOR_REST_URL / TOKEN missing. Set in .env.local or shell env.");
  process.exit(1);
}

const args = process.argv.slice(2);
const LIMIT = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10);
const RESET = args.includes("--reset");

// ── Document builder (mirrors old embeddings script) ───────────────
function extractCity(address) {
  if (!address) return "";
  const parts = address.split(",");
  return parts.length >= 2 ? parts[1].trim() : "";
}

function cleanText(t, maxLen = 600) {
  if (!t) return "";
  return String(t).replace(/\s+/g, " ").trim().slice(0, maxLen);
}

// Service-intent synonym map. Real chamber visitors search by the word
// they'd say out loud ("haircut", "plumber", "mechanic"), but most member
// docs only contain the category label ("Beauty Salons", "Plumbing
// Contractor"). Without this enrichment, a query like "haircut downtown"
// scored Wichert Insurance above Hair Haven Salon. Each rule appends a
// "Also known as / commonly searched as" line if any of the member's
// categories matches the substring (case-insensitive).
const SYNONYM_RULES = [
  { match: ["beauty salon", "hair salon"],     terms: "haircut hairstyle salon stylist makeover" },
  { match: ["barbershop", "barber shop"],      terms: "haircut barber shave mens haircut" },
  { match: ["plumb"],                          terms: "plumber drain leak pipe water heater clog" },
  { match: ["heating", "hvac"],                terms: "furnace air conditioning ac hvac heat pump cooling" },
  { match: ["pet grooming"],                   terms: "pet groomer dog grooming cat grooming" },
  { match: ["veterin"],                        terms: "vet veterinarian animal hospital pet doctor" },
  { match: ["lawn", "landscape"],              terms: "landscaper lawn care mowing yard work tree service" },
  { match: ["fitness", "gym"],                 terms: "gym workout training exercise personal trainer" },
  { match: ["cleaning service"],               terms: "cleaner housekeeping maid janitorial" },
  { match: ["automobile repair", "auto repair"], terms: "mechanic car repair auto repair fix car" },
  { match: ["auto detailing"],                 terms: "car wash detailing waxing" },
  { match: ["photograph"],                     terms: "photographer photos headshots portraits family pictures" },
  { match: ["print"],                          terms: "printing signs banners business cards flyers" },
  { match: ["caterer", "catering"],            terms: "catering food service event food" },
  { match: ["restaurant"],                     terms: "restaurant food dining lunch dinner takeout" },
  { match: ["insurance"],                      terms: "insurance coverage policy auto home life health insurance" },
  { match: ["dentist", "dental"],              terms: "dentist dental teeth oral hygiene" },
  { match: ["physician", "surgeon", "medical center"], terms: "doctor physician medical clinic primary care" },
  { match: ["construction", "general contractor"], terms: "contractor builder construction remodel renovation" },
  { match: ["roofing"],                        terms: "roofer roof repair roof replacement gutters" },
  { match: ["real estate"],                    terms: "realtor real estate agent home buying home selling listing" },
  { match: ["bank"],                           terms: "bank banking loan mortgage checking savings credit" },
  { match: ["accountant", "cpa"],              terms: "accountant cpa tax taxes bookkeeper bookkeeping" },
  { match: ["counsel", "therap"],              terms: "therapist counselor mental health therapy" },
  { match: ["marketing", "advertising"],       terms: "marketing advertising branding promotion design agency" },
  { match: ["telecom"],                        terms: "phone internet wifi cellular telecom" },
  { match: ["attorney", "lawyer", "law firm"], terms: "attorney lawyer legal counsel law firm" },
  { match: ["chiropract"],                     terms: "chiropractor back pain neck adjustment spine" },
  { match: ["massage"],                        terms: "massage therapist spa relaxation deep tissue" },
  { match: ["nursing home", "assisted living"], terms: "nursing home assisted living senior care elderly" },
  { match: ["funeral"],                        terms: "funeral home cremation burial memorial" },
  { match: ["daycare", "preschool", "childcare"], terms: "daycare childcare preschool kids early childhood" },
  { match: ["bakery"],                         terms: "bakery cake bread pastries cookies wedding cake" },
];

function expandSynonyms(categories) {
  if (!categories?.length) return "";
  const haystack = categories.join(" ").toLowerCase();
  const hits = [];
  for (const rule of SYNONYM_RULES) {
    if (rule.match.some((m) => haystack.includes(m))) hits.push(rule.terms);
  }
  if (!hits.length) return "";
  return "Also commonly searched as: " + hits.join(" ");
}

function buildDocument(member, scraped) {
  const lines = [];

  // 1. Name (highest weight — first line)
  lines.push(member.name);

  // 2. Authoritative taxonomy
  if (member.categories?.length) {
    lines.push("Business categories: " + member.categories.join(", "));
  }

  // 2b. Service-intent synonyms keyed off categories — boosts BM25 match
  //     for the words real users type vs the category labels in the data.
  const synonyms = expandSynonyms(member.categories);
  if (synonyms) lines.push(synonyms);

  // 3. Chamber-curated description
  if (member.description?.trim().length > 5) {
    lines.push(cleanText(member.description, 500));
  }

  // 4–7. Scraped website signals
  if (scraped) {
    if (scraped.metaDescription?.trim().length > 10) {
      lines.push(cleanText(scraped.metaDescription, 300));
    } else if (scraped.title?.length > 5 && scraped.title !== member.name) {
      lines.push(cleanText(scraped.title, 150));
    }
    if (Array.isArray(scraped.services) && scraped.services.length) {
      const clean = scraped.services
        .map((s) => String(s).trim())
        .filter((s) => s.length > 3 && s.length < 120 && !/^(home|menu|about|contact|services)$/i.test(s))
        .slice(0, 10);
      if (clean.length) lines.push("Services offered: " + clean.join("; "));
    }
    if (Array.isArray(scraped.h1) && scraped.h1.length) {
      const clean = scraped.h1
        .map((h) => String(h).trim())
        .filter((h) => h.length > 5 && h.length < 150)
        .slice(0, 3);
      if (clean.length) lines.push(clean.join(" "));
    }
    if (scraped.aboutText) {
      const cleaned = cleanText(scraped.aboutText, 600);
      if (cleaned.length > 30) lines.push(cleaned);
    }
  }

  // 8. Location keyword for local-intent queries ("plumber brunswick")
  const city = extractCity(member.address);
  if (city) lines.push(`Located in ${city}, Medina County, Ohio`);

  return lines.join("\n");
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const index = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  });

  // Sanity-check the index info before doing anything destructive.
  const info = await index.info();
  console.log("Index info:", JSON.stringify(info, null, 2));
  console.log("");

  if (RESET) {
    console.log("--reset specified → resetting index...");
    await index.reset();
    console.log("Index cleared.");
    console.log("");
  }

  // Load members + scraped website data
  const members = JSON.parse(readFileSync(MEMBERS_FILE, "utf8")).members;
  const scrapedData = existsSync(WEBSITES_FILE)
    ? JSON.parse(readFileSync(WEBSITES_FILE, "utf8")).members
    : [];
  const scrapedBySlug = new Map(scrapedData.map((s) => [s.chamberSlug, s]));

  let targets = members;
  if (LIMIT > 0) targets = members.slice(0, LIMIT);

  console.log(`Building documents for ${targets.length} members...`);

  const records = targets.map((m) => {
    const doc = buildDocument(m, scrapedBySlug.get(m.chamberSlug));
    return {
      id: m.chamberSlug,
      data: doc, // managed embedding model on the index will vectorize this
      metadata: {
        name: m.name,
        slug: m.chamberSlug,
        categories: m.categories ?? [],
      },
    };
  });

  // Stats
  const empty = records.filter((r) => !r.data || r.data.length < 20);
  if (empty.length) {
    console.warn(`WARNING: ${empty.length} members produced very short documents:`);
    for (const e of empty.slice(0, 5)) console.warn(`  ${e.id}: "${e.data}"`);
  }
  const avgLen = Math.round(records.reduce((s, r) => s + r.data.length, 0) / records.length);
  console.log(`Avg document length: ${avgLen} chars`);
  console.log("");

  // Batch upsert
  let upserted = 0;
  const t0 = Date.now();
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    process.stdout.write(
      `Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)} (${batch.length} records)... `
    );
    const tBatch = Date.now();
    await index.upsert(batch);
    upserted += batch.length;
    console.log(`${Date.now() - tBatch}ms`);
  }

  console.log("");
  console.log(`✓ Upserted ${upserted} members in ${Date.now() - t0}ms total.`);

  // Verify by re-fetching index info
  const finalInfo = await index.info();
  console.log("");
  console.log(`Index now reports: ${finalInfo.vectorCount} vectors total, ${finalInfo.pendingVectorCount} pending.`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
