import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";

// On-Demand Concierge — no charge today. Checkout mode "setup" just tokenizes
// the shopper's card (creates a Customer + saved PaymentMethod) so Llama Inc.
// can charge off-session later, only when the shopper actually uses a
// concierge service (emergency rebooking, visa expediting, etc).
export async function POST(request) {
  try {
    const stripe = getStripe();
    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL;

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      currency: "eur",
      payment_method_types: ["card"],
      success_url: `${origin}/success?type=concierge&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("concierge checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
