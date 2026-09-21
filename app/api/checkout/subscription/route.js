import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";

// Travel Advice Pro — €5/month recurring subscription.
// Checkout mode "subscription": the shopper enters card details on Stripe's
// hosted page, Stripe creates the Customer + Subscription, and charges renew
// automatically. We just need a recurring Price ID from the Stripe Dashboard.
export async function POST(request) {
  try {
    const stripe = getStripe();
    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL;
    const priceId = process.env.STRIPE_PRICE_TRAVEL_ADVICE;

    if (!priceId) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_TRAVEL_ADVICE is not set" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?type=subscription&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("subscription checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
