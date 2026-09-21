import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";

// Stripe calls this endpoint directly (not the shopper's browser), so it's
// the only place we can trust that something actually happened — a renewal,
// a cancellation, a card successfully saved. Register this URL in the Stripe
// Dashboard under Developers -> Webhooks once the app is deployed:
//   https://<your-vercel-domain>/api/webhooks/stripe
// That page gives you the signing secret for STRIPE_WEBHOOK_SECRET.
export async function POST(request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text(); // must be the raw, unparsed body

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Subscription signup or a saved card, depending on session.mode.
      console.log(
        "checkout.session.completed",
        session.mode,
        session.customer,
        session.subscription || session.setup_intent
      );
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      // Renewals, plan changes, cancellations, and payment-failure dunning
      // all show up here as status changes (active, past_due, canceled...).
      console.log(
        event.type,
        subscription.id,
        "status:",
        subscription.status
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      // A renewal (or the initial subscription invoice) failed to collect.
      // This is the event real dunning logic would hang off of — retry
      // emails, a "update your card" prompt, eventual cancellation after N
      // attempts. For now we just log it.
      console.log(
        "invoice.payment_failed",
        "customer:",
        invoice.customer,
        "subscription:",
        invoice.subscription,
        "attempt_count:",
        invoice.attempt_count
      );
      break;
    }

    case "setup_intent.succeeded": {
      const setupIntent = event.data.object;
      // The moment a Concierge card is tokenized: setupIntent.payment_method
      // is what you'd pass to a future off-session PaymentIntent to charge
      // this customer without them being present.
      console.log(
        "setup_intent.succeeded — card saved for",
        setupIntent.customer,
        "payment_method:",
        setupIntent.payment_method
      );
      break;
    }

    default:
      console.log("Unhandled Stripe event:", event.type);
  }

  // Respond fast and with 2xx — Stripe retries (with backoff) on anything
  // else, and handlers should be idempotent since the same event can arrive
  // more than once.
  return NextResponse.json({ received: true });
}
