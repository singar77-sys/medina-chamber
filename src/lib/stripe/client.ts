import Stripe from "stripe";

/**
 * Lazily-constructed Stripe client.
 *
 * Constructing `new Stripe(key)` (and throwing on a missing key) at module load
 * broke `next build`: during "Collecting page data" Next imports the webhook and
 * checkout route modules, which import this one, so the eager throw aborted the
 * production build whenever STRIPE_SECRET_KEY wasn't in the build environment.
 *
 * The Proxy defers both construction and the missing-key error until the client
 * is actually USED at request time. Importing this module is now side-effect-free,
 * so it never affects the build; only a real call (e.g. stripe.checkout...) errors
 * if the key is absent. The exported name + shape are unchanged for callers/tests.
 */
let instance: Stripe | null = null;

function client(): Stripe {
  if (instance) return instance;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  instance = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
  return instance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
