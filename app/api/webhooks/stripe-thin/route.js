import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";

// Handles Stripe's newer "thin" event payloads (the v2 Events system).
// Thin events don't embed the full object like classic webhooks do — you
// just get a reference in `related_object` (id, type, url) and fetch the
// details separately if you need them. Signature verification uses the same
// HMAC scheme either way, so constructEvent works here too; only the shape
// of the parsed event differs from the snapshot handler.
//
// Nothing in Llama Inc.'s current flows (the €5/mo subscription, the saved
// card) actually emits v2/thin events yet — this endpoint exists because
// Stripe requires snapshot and thin destinations to be registered
// separately, not because we have thin events to handle today. It's wired
// up and ready if that changes.
export async function POST(request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET_THIN || process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Thin webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(
    "Thin event received:",
    event.type,
    "related_object:",
    event.related_object
  );

  return NextResponse.json({ received: true });
}
