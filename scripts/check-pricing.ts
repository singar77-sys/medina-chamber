import { getRedis } from "@/lib/upstash";
import { DEFAULT_PRICING, setCmsPricing } from "@/lib/cms-store";

void (async () => {
  const r = getRedis();
  if (!r) { console.log("No Redis configured"); process.exit(0); }

  const current = await r.get<object>("cms:pricing");
  console.log("Current cms:pricing in Redis:");
  console.log(JSON.stringify(current, null, 2));

  if (!current) {
    console.log("\n→ No override stored — DEFAULT_PRICING is live. Nothing to fix.");
    process.exit(0);
  }

  // Push the canonical defaults so prices are correct
  console.log("\nOverwriting with DEFAULT_PRICING...");
  await setCmsPricing({ ...DEFAULT_PRICING, updatedAt: new Date().toISOString() });
  console.log("✅  Done. Prices updated to $345 / $575 / $1,145.");
  process.exit(0);
})();
