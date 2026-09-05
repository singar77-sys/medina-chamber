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

/**
 * Ceiling for signed webhook bodies (Stripe, Resend). Deliberately far above the
 * form default: a Stripe event is a whole API object plus its nested expansions,
 * and metadata alone can be 50 keys x 500 chars on several nested objects, while
 * a Resend `email.sent` event carries the rendered HTML of the message. Real
 * events measured in tens of KB, so 256 KB is roughly an order of magnitude of
 * headroom — generous enough that legitimate traffic can never be choked, small
 * enough that a body handed to the signature verifier stays bounded.
 *
 * "256 KB" is shorthand: like the default cap above, the check counts UTF-16
 * code units, so on multibyte content the true byte ceiling is up to ~3x this.
 * Immaterial for an order-of-magnitude ceiling, but don't read it as a byte
 * guarantee. See readTextBounded for what this does and does not stop.
 */
export const WEBHOOK_MAX_CHARS = 256 * 1024;

type BoundedText = { text: string } | { response: Response };
type Bounded = { body: unknown } | { response: Response };

/**
 * Bounded RAW body reader. Use this — not readJsonBounded — wherever the exact
 * bytes matter after the read, i.e. a webhook whose signature is computed over
 * the raw payload (parsing first and re-serializing would break verification).
 *
 * WHAT THIS ACTUALLY GUARANTEES — read before relying on it as a DoS control:
 *
 *   • A caller that declares an oversized Content-Length is rejected BEFORE the
 *     body is read. That is the only pre-read rejection here.
 *   • Everything else is buffered in full by `req.text()` and measured
 *     afterwards. The stream is not aborted, so an oversized chunked request
 *     (no Content-Length — `Number(null)` is 0, which passes the fast path) is
 *     read to completion before it gets its 413.
 *   • What that still buys: nothing oversized is ever handed to the signature
 *     verifier or to JSON.parse, and honest oversized clients are rejected
 *     cheaply. It is a correctness/cost bound on downstream work, NOT a bound
 *     on what a hostile caller can make the isolate buffer.
 *
 * The real backstop against a hostile buffer is the platform: Vercel caps a
 * function request body at ~4.5 MB and rejects past it before our code runs.
 * If that ever stops being true, the fix here is to read `req.body` and cancel
 * the reader once the running byte total crosses the cap — but note the raw
 * bytes must stay byte-identical for signature verification, so that change
 * needs the webhook byte-identity tests to hold.
 */
export async function readTextBounded(
  req: Request,
  maxChars: number = DEFAULT_MAX_CHARS,
): Promise<BoundedText> {
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

  return { text };
}

export async function readJsonBounded(
  req: Request,
  maxChars: number = DEFAULT_MAX_CHARS,
): Promise<Bounded> {
  // Same ceiling logic, one copy: readTextBounded owns the Content-Length fast
  // path and the post-read length check; this only adds the parse step.
  const bounded = await readTextBounded(req, maxChars);
  if ("response" in bounded) return bounded;

  try {
    return { body: JSON.parse(bounded.text) };
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
