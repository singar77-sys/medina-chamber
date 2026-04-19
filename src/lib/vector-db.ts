/**
 * Upstash Vector client — single shared instance.
 *
 * Edge-runtime safe (no Node built-ins). Reads URL + token from env vars
 * configured in Vercel project settings:
 *   UPSTASH_VECTOR_REST_URL
 *   UPSTASH_VECTOR_REST_TOKEN
 *
 * The index is configured as HYBRID (dense + sparse) at index-creation
 * time in the Upstash console — that's not a runtime concern. We just
 * upsert and query through the same client.
 */

import { Index } from "@upstash/vector";

let _index: Index | null = null;

export function getVectorIndex(): Index {
  if (_index) return _index;
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Upstash Vector env vars missing. Set UPSTASH_VECTOR_REST_URL and " +
      "UPSTASH_VECTOR_REST_TOKEN in Vercel project settings."
    );
  }
  _index = new Index({ url, token });
  return _index;
}

/**
 * Returns true if the Upstash index has a managed embedding model
 * configured (we send raw text). False = we provide vectors ourselves.
 *
 * Result is cached for the lifetime of the isolate.
 */
let _isManaged: boolean | null = null;
export async function isManagedEmbedding(): Promise<boolean> {
  if (_isManaged !== null) return _isManaged;
  const info = await getVectorIndex().info();
  // Upstash sets denseIndex.embeddingModel to a model name when managed,
  // and to "Custom" when we provide vectors ourselves.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (info as any)?.denseIndex?.embeddingModel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ?? (info as any)?.embeddingModel;
  _isManaged = typeof model === "string" && model.toLowerCase() !== "custom";
  return _isManaged;
}
