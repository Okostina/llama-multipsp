import { adyenRequest, methodName } from "../../../lib/adyen";
import RenewButton from "./RenewButton";
import styles from "../../status.module.css";

// Adyen sends the shopper back here with ?sessionId=...&sessionResult=...
// GET /sessions/{id}?sessionResult= gives a one-time snapshot of the outcome.
// Like the Stripe page, we say "processing" rather than "success" when the
// payment hasn't settled; the webhook remains the source of truth.
async function getOutcome(sessionId, sessionResult) {
  if (!sessionId || !sessionResult) return { status: "unknown" };

  try {
    const params = new URLSearchParams({ sessionResult });
    const result = await adyenRequest(
      `/sessions/${encodeURIComponent(sessionId)}?${params}`
    );
    const payment = result.payments?.[0];

    const details = payment
      ? {
          amount:
            payment.amount?.value != null
              ? new Intl.NumberFormat("en-IE", {
                  style: "currency",
                  currency: payment.amount.currency,
                }).format(payment.amount.value / 100)
              : null,
          method: methodName(payment.paymentMethod?.brand || payment.paymentMethod?.type),
          pspReference: payment.pspReference || null,
        }
      : null;

    switch (result.status) {
      case "completed":
        return {
          status: ["Received", "Pending"].includes(payment?.resultCode)
            ? "processing"
            : "confirmed",
          details,
        };
      case "paymentPending":
        return { status: "processing", details };
      case "refused":
      case "expired":
        return { status: "failed", details };
      case "canceled":
        return { status: "cancelled", details };
      default: // "active": the shopper came back without finishing
        return { status: "unfinished", details };
    }
  } catch (err) {
    console.error("adyen result page: couldn't retrieve session", err.message);
    return { status: "unknown" };
  }
}

const COPY = {
  confirmed: {
    stamp: "Confirmed",
    tone: "confirmed",
    heading: "You're all set",
    body: "Travel Advice Pro is active — welcome aboard. Your payment method is saved for next month's renewal.",
  },
  processing: {
    stamp: "Processing",
    tone: "processing",
    heading: "Almost there",
    body: "We're processing your payment — this can take a moment depending on your payment method. We'll finalize your Travel Advice Pro subscription as soon as it clears, no need to do anything else.",
  },
  failed: {
    stamp: "Not completed",
    tone: "failed",
    heading: "That didn't go through",
    body: "Your payment couldn't be completed, so Travel Advice Pro hasn't started. No charge was made — feel free to try again.",
  },
  cancelled: {
    stamp: "Cancelled",
    tone: "neutral",
    heading: "No worries",
    body: "You didn't get charged — checkout was cancelled. Your plan is still waiting whenever you want to pick it back up.",
  },
  unfinished: {
    stamp: "Not finished",
    tone: "neutral",
    heading: "Checkout isn't finished",
    body: "It looks like you left the payment page before paying. Nothing was charged.",
  },
  unknown: {
    stamp: "Confirming",
    tone: "neutral",
    heading: "Thanks",
    body: "We're confirming your order now.",
  },
};

const BARCODE_BARS = [6, 12, 8, 16, 5, 14, 9, 12, 6, 16, 8, 10, 5, 13, 7];

export default async function AdyenResult({ searchParams }) {
  const { status, details } = await getOutcome(
    searchParams?.sessionId,
    searchParams?.sessionResult
  );
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
            Subscription receipt <span className={styles.pspTag}>Adyen</span>
          </span>
          <span className={styles.barcode} aria-hidden="true">
            {BARCODE_BARS.map((h, i) => (
              <span key={i} style={{ height: h }} />
            ))}
          </span>
        </div>

        <div className={styles.divider} />

        <div className={styles.stubBody}>
          <div className={`${styles.stamp} ${styles[copy.tone]}`}>{copy.stamp}</div>

          <h1 className={styles.heading}>{copy.heading}</h1>
          <p className={styles.body}>{copy.body}</p>

          {details && (details.amount || details.method) && (
            <div className={styles.details}>
              <div className={styles.detail}>
                <label>Plan</label>
                <span className={styles.detailValue}>Pro</span>
              </div>
              {details.amount && (
                <div className={styles.detail}>
                  <label>Amount</label>
                  <span className={styles.detailValue}>{details.amount} / month</span>
                </div>
              )}
              {details.method && (
                <div className={styles.detail}>
                  <label>Paid with</label>
                  <span className={styles.detailValue}>{details.method}</span>
                </div>
              )}
            </div>
          )}

          {status === "confirmed" && <RenewButton />}
        </div>
      </div>

      <div className={styles.footer}>
        <a className={styles.backLink} href="/">
          &larr; Back to Llama Inc.
        </a>
        {details?.pspReference && (
          <p className={styles.reference}>Adyen PSP reference: {details.pspReference}</p>
        )}
      </div>
    </main>
  );
}
