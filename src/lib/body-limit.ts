/**
 * Bounded JSON body reader for small public endpoints (contact, apply,
 * sponsorship, chat handoff, …).
 *
 * The per-field caps in those routes only run AFTER the whole body has been
 * buffered and JSON.parse'd — a multi-megabyte document still pays full parse
 * cost first. This rejects oversized bodies up front: fast 413 on a declared
 * Content-Length over the cap, and a post-read length check for bodies that
 * arrive without one.
 *
 * The default cap is ~10x the largest legitimate form submission (5,000-char
 * comments plus a dozen short fields). The length check counts UTF-16 code
 * units, not bytes — within 4x of the byte count in the worst case, which is
 * fine for an order-of-magnitude ceiling.
 */

const DEFAULT_MAX_CHARS = 64 * 1024;

type Bounded = { body: unknown } | { response: Response };

export async function readJsonBounded(
  req: Request,
  maxChars: number = DEFAULT_MAX_CHARS,
): Promise<Bounded> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxChars * 4) {
    return { response: tooLarge() };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { response: badBody("Invalid request body.") };
  }
  if (text.length > maxChars) return { response: tooLarge() };

  try {
    return { body: JSON.parse(text) };
  } catch {
    return { response: badBody("Invalid JSON body.") };
  }
}

function tooLarge(): Response {
  return Response.json({ error: "Request body too large." }, { status: 413 });
}

function badBody(error: string): Response {
  return Response.json({ error }, { status: 400 });
}
