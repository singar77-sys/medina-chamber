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
