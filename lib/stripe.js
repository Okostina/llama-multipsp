import Stripe from "stripe";

// Instantiated lazily, inside each request handler — never at module load —
// so the app can still build and deploy before real Stripe keys are set.
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it in Vercel: Settings -> Environment Variables."
    );
  }
  return new Stripe(key, { apiVersion: "2024-06-20" });
}
