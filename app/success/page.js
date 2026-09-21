import { getStripe } from "../../lib/stripe";
import styles from "../status.module.css";

// The redirect back here only means the shopper submitted the Checkout
// form — for some payment methods (bank debits, some redirect methods) the
// payment is still "processing" at this point, not actually confirmed.
// So rather than always saying "you're subscribed," we look up the real
// status server-side and show one of three honest states. The webhook
// handler remains the actual source of truth for any real fulfillment
// logic; this is purely about what we tell the shopper right now.
async function getOutcome(sessionId, type) {
  if (!sessionId) return { status: "unknown" };

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription.latest_invoice.payment_intent", "setup_intent"],
    });

    if (type === "concierge") {
      return {
        status:
          session.setup_intent?.status === "succeeded"
            ? "confirmed"
            : "processing",
      };
    }

    // Subscription mode
    const subscription = session.subscription;
    const paymentIntentStatus =
      subscription?.latest_invoice?.payment_intent?.status;
    const price = subscription?.items?.data?.[0]?.price;

    const plan = {
      amount:
        price?.unit_amount != null
          ? new Intl.NumberFormat("en-IE", {
              style: "currency",
              currency: (price.currency || "eur").toUpperCase(),
            }).format(price.unit_amount / 100)
          : null,
      interval: price?.recurring?.interval || null,
      method: session.payment_method_types?.[0] || null,
    };

    if (
      subscription?.status === "active" &&
      (!paymentIntentStatus || paymentIntentStatus === "succeeded")
    ) {
      return { status: "confirmed", plan };
    }
    if (
      paymentIntentStatus === "requires_payment_method" ||
      subscription?.status === "incomplete_expired" ||
      subscription?.status === "canceled"
    ) {
      return { status: "failed", plan };
    }
    // Covers "processing" (e.g. SEPA Direct Debit, 3-min settlement) and
    // "incomplete" (subscription created, first invoice not settled yet) —
    // anything in between confirmed and failed, treat as still in flight.
    return { status: "processing", plan };
  } catch (err) {
    console.error("success page: couldn't retrieve session status", err);
    return { status: "unknown" };
  }
}

const COPY = {
  confirmed: {
    stamp: "Confirmed",
    tone: "confirmed",
    heading: "You're all set",
    subscription: "Travel Advice Pro is active — welcome aboard.",
    concierge:
      "Your card is saved. We'll only charge it when you actually use a concierge service.",
  },
  processing: {
    stamp: "Processing",
    tone: "processing",
    heading: "Almost there",
    subscription:
      "We're processing your payment — this can take a few minutes depending on your payment method. We'll finalize your Travel Advice Pro subscription as soon as it clears, no need to do anything else.",
    concierge:
      "We're finishing setup on your saved card. This usually only takes a moment.",
  },
  failed: {
    stamp: "Not completed",
    tone: "failed",
    heading: "That didn't go through",
    subscription:
      "Your payment couldn't be completed, so Travel Advice Pro hasn't started. No charge was made — feel free to try again.",
    concierge:
      "We couldn't save your card. No charge was made — feel free to try again.",
  },
  unknown: {
    stamp: "Confirming",
    tone: "neutral",
    heading: "Thanks",
    subscription: "We're confirming your order now.",
    concierge: "We're confirming your order now.",
  },
};

const BARCODE_BARS = [6, 12, 8, 16, 5, 14, 9, 12, 6, 16, 8, 10, 5, 13, 7];

export default async function Success({ searchParams }) {
  const sessionId = searchParams?.session_id;
  const type = searchParams?.type === "concierge" ? "concierge" : "subscription";
  const { status, plan } = await getOutcome(sessionId, type);
  const copy = COPY[status];

  return (
    <main className={styles.page}>
      <a className={styles.brandRow} href="/">
        <span className={styles.brandMark} aria-hidden="true">
          🦙
        </span>
        <span className={styles.eyebrow}>Llama Inc. · AI travel assistant</span>
      </a>

      <div className={styles.stub}>
        <div className={styles.stubHeader}>
          <span className={styles.stubLabel}>
            {type === "concierge" ? "Card on file" : "Subscription receipt"}{" "}
            <span className={styles.pspTagStripe}>Stripe</span>
          </span>
          <span className={styles.barcode} aria-hidden="true">
            {BARCODE_BARS.map((h, i) => (
              <span key={i} style={{ height: h }} />
            ))}
          </span>
        </div>

        <div className={styles.divider} />

        <div className={styles.stubBody}>
          <div className={`${styles.stamp} ${styles[copy.tone]}`}>
            {copy.stamp}
          </div>

          <h1 className={styles.heading}>{copy.heading}</h1>
          <p className={styles.body}>{copy[type]}</p>

          {plan && (plan.amount || plan.method) && (
            <div className={styles.details}>
              <div className={styles.detail}>
                <label>Plan</label>
                <span className={styles.detailValue}>Pro</span>
              </div>
              {plan.amount && (
                <div className={styles.detail}>
                  <label>Amount</label>
                  <span className={styles.detailValue}>
                    {plan.amount}
                    {plan.interval ? ` / ${plan.interval}` : ""}
                  </span>
                </div>
              )}
              {plan.method && (
                <div className={styles.detail}>
                  <label>Paid with</label>
                  <span className={styles.detailValue}>{plan.method}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <a className={styles.backLink} href="/">
          &larr; Back to Llama Inc.
        </a>
        {sessionId && <p className={styles.reference}>Reference: {sessionId}</p>}
      </div>
    </main>
  );
}
