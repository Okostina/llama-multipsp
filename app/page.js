"use client";

import { useState } from "react";
import styles from "./page.module.css";

const subscriptionPerks = [
  "Unlimited AI itinerary planning",
  "Personalized destination recommendations",
  "Real-time price-drop alerts",
  "Priority chat support",
];

const FEATURES = [
  {
    heading: "Instant itineraries",
    body: "Enter your dates and destination and get a full plan in seconds — flights, stays, and things to do, all balanced against your time.",
    example:
      "Planning a week in Lisbon? Travel Advice Pro drafts a 7-day route balancing must-sees like Belém with quieter spots like Alfama, timing and rough budget included.",
  },
  {
    heading: "Personalized to your style",
    body: "Tell it who's traveling and how you like to move, and it adjusts pacing and picks accordingly — not a generic top-10 list.",
    example:
      "Traveling with toddlers, or planning a long weekend for two? It reshapes the plan around that, not just the destination.",
  },
  {
    heading: "Price alerts & priority support",
    body: "We keep watching fares after you book, and a real answer is always a message away — not a support ticket queue.",
    example:
      "Ask “is now a good time to book Tokyo in March?” and get a straight answer, plus a nudge later if fares drop.",
  },
];

const STRIPE_TEST_DATA = [
  {
    label: "Card — succeeds",
    value: "4242 4242 4242 4242",
    note: "Any future expiry, any CVC, any postal code.",
  },
  {
    label: "Card — requires 3D Secure",
    value: "4000 0025 0000 3155",
    note: "Forces an authentication challenge before it succeeds.",
  },
  {
    label: "Card — declined",
    value: "4000 0000 0000 9995",
    note: "Fails with an insufficient_funds decline.",
  },
  {
    label: "SEPA — succeeds after ~3 min",
    value: "AT32 1904 3002 3547 3204",
    note: "Shows the “processing” page, then resolves to confirmed.",
  },
  {
    label: "SEPA — fails",
    value: "AT86 1904 3002 3547 3202",
    note: "Moves from processing to requires_payment_method.",
  },
];

const ADYEN_TEST_DATA = [
  {
    label: "Visa — authorises",
    value: "4111 1111 4555 1142",
    note: "Expiry 03/30, CVC 737.",
  },
  {
    label: "Mastercard — authorises",
    value: "5555 3412 4444 1115",
    note: "Expiry 03/30, CVC 737.",
  },
  {
    label: "Visa — 3D Secure 2 challenge",
    value: "4917 6100 0000 0000",
    note: "Expiry 03/30, CVC 737.",
  },
  {
    label: "Any card — refused",
    value: "Holder name: DECLINED",
    note: "Adyen returns resultCode Refused.",
  },
  {
    label: "SEPA Direct Debit",
    value: "NL13 TEST 0123 4567 89",
    note: "Account holder: A. Klaassen.",
  },
];

// Decorative only — a handful of bars of varying height, like a ticket barcode.
const BARCODE_BARS = [6, 12, 8, 16, 5, 14, 9, 12, 6, 16, 8, 10, 5, 13, 7];

function FeatureRow({ heading, body, example }) {
  return (
    <div className={styles.stop}>
      <div className={styles.stopMarker} aria-hidden="true">
        <span className={styles.stopDot} />
        <span className={styles.stopDash} />
      </div>
      <h3 className={styles.stopHeading}>{heading}</h3>
      <p className={styles.stopBody}>{body}</p>
      <p className={styles.stopExample}>
        <strong>Example: </strong>
        {example}
      </p>
    </div>
  );
}

function BoardingPass({ loadingProvider, onSubscribe }) {
  return (
    <div className={styles.boardingPass}>
      <div className={styles.bpHeader}>
        <span className={styles.bpHeaderLabel}>Boarding pass</span>
        <span className={styles.barcode} aria-hidden="true">
          {BARCODE_BARS.map((h, i) => (
            <span key={i} style={{ height: h }} />
          ))}
        </span>
      </div>

      <div className={styles.bpPriceRow}>
        <span className={styles.bpAmount}>€5</span>
        <span className={styles.bpCadence}>/ month</span>
      </div>
      <p className={styles.bpTitle}>Travel Advice Pro</p>

      <div className={styles.bpDivider} />

      <div className={styles.bpFields}>
        <div className={styles.bpField}>
          <label>Passenger</label>
          <span className={styles.bpFieldValue}>You</span>
        </div>
        <div className={styles.bpField}>
          <label>Fare class</label>
          <span className={styles.bpFieldValue}>Pro</span>
        </div>
        <div className={styles.bpField}>
          <label>Cycle</label>
          <span className={styles.bpFieldValue}>Monthly</span>
        </div>
        <div className={styles.bpField}>
          <label>Access</label>
          <span className={styles.bpFieldValue}>Instant</span>
        </div>
      </div>

      <div className={styles.bpPerks}>
        <p className={styles.bpPerksLabel}>Included</p>
        <ul>
          {subscriptionPerks.map((perk) => (
            <li key={perk}>
              <span>✓</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.pspBar}>
        <p className={styles.pspBarLabel}>Choose your checkout</p>
        <div className={styles.pspButtons}>
          <button
            className={`${styles.pspButton} ${styles.pspStripe}`}
            onClick={() => onSubscribe("stripe")}
            disabled={Boolean(loadingProvider)}
          >
            <span className={styles.pspButtonMain}>
              {loadingProvider === "stripe" ? "Redirecting…" : "Pay with Stripe"}
            </span>
            <span className={styles.pspButtonSub}>Stripe Checkout</span>
          </button>
          <button
            className={`${styles.pspButton} ${styles.pspAdyen}`}
            onClick={() => onSubscribe("adyen")}
            disabled={Boolean(loadingProvider)}
          >
            <span className={styles.pspButtonMain}>
              {loadingProvider === "adyen" ? "Redirecting…" : "Pay with Adyen"}
            </span>
            <span className={styles.pspButtonSub}>Adyen Hosted Checkout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TestGroup({ title, tagClass, items }) {
  return (
    <div className={styles.noticeGroup}>
      <p className={styles.noticeGroupTitle}>
        <span className={tagClass}>{title}</span>
      </p>
      {items.map((c) => (
        <div key={c.value} className={styles.noticeItem}>
          <div className={styles.noticeItemLabel}>{c.label}</div>
          <code className={styles.noticeCode}>{c.value}</code>
          <div className={styles.noticeNote}>{c.note}</div>
        </div>
      ))}
    </div>
  );
}

function TestNotice() {
  return (
    <div className={styles.notice}>
      <p className={styles.noticeLabel}>Test mode — sample payment details</p>
      <TestGroup title="Stripe" tagClass={styles.tagStripe} items={STRIPE_TEST_DATA} />
      <TestGroup title="Adyen" tagClass={styles.tagAdyen} items={ADYEN_TEST_DATA} />
    </div>
  );
}

export default function Home() {
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Both PSPs follow the same shape: our server creates a hosted-checkout
  // session and returns its URL, and we redirect the shopper there.
  const ENDPOINTS = {
    stripe: "/api/checkout/subscription",
    adyen: "/api/adyen/session",
  };

  async function handleSubscribe(provider) {
    setErrorMessage("");
    setLoadingProvider(provider);
    try {
      const res = await fetch(ENDPOINTS[provider], { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Something went wrong");
      }
      window.location.href = data.url;
    } catch (err) {
      setErrorMessage(err.message);
      setLoadingProvider(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.brandRow}>
          <span className={styles.brandMark} aria-hidden="true">
            🦙
          </span>
          <p className={styles.eyebrow}>Llama Inc. · AI travel assistant</p>
        </div>
        <h1>Travel plans that don't fall apart when reality does.</h1>
        <p>
          AI itinerary planning that adapts to you, plus a real answer the
          moment something goes wrong — no ticket queue.
        </p>
      </header>

      <div className={styles.route}>
        {FEATURES.map((feature) => (
          <FeatureRow key={feature.heading} {...feature} />
        ))}
      </div>

      <div className={styles.ticketRow}>
        <div className={styles.ticketCol}>
          <BoardingPass loadingProvider={loadingProvider} onSubscribe={handleSubscribe} />
          {errorMessage && <p className={styles.errorMsg}>{errorMessage}</p>}
        </div>

        <TestNotice />
      </div>
    </div>
  );
}
