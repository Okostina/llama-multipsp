"use client";

import { useState } from "react";
import styles from "../../status.module.css";

// Demo control: fires next month's charge now, as the merchant would from a
// scheduler. The shopper isn't involved — that's the point of ContAuth.
export default function RenewButton() {
  const [state, setState] = useState({ loading: false, result: null, error: "" });

  async function renew() {
    setState({ loading: true, result: null, error: "" });
    try {
      const res = await fetch("/api/adyen/renew", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Renewal failed");
      setState({ loading: false, result: data, error: "" });
    } catch (err) {
      setState({ loading: false, result: null, error: err.message });
    }
  }

  const { loading, result, error } = state;
  const authorised = result?.resultCode === "Authorised";

  return (
    <div className={styles.renewal}>
      <p className={styles.renewalLabel}>Merchant-initiated renewal</p>
      <p className={styles.renewalBody}>
        Adyen stored your payment method as a Subscription token. Charge
        next month's €5 now, the way a billing scheduler would — no shopper
        present.
      </p>
      <button className={styles.renewalButton} onClick={renew} disabled={loading}>
        {loading ? "Charging…" : "Charge next month's €5"}
      </button>

      {result && (
        <p className={`${styles.renewalResult} ${authorised ? styles.confirmed : styles.failed}`}>
          {result.resultCode}
          {result.method ? ` · ${result.method}` : ""}
          {result.refusalReason ? ` · ${result.refusalReason}` : ""}
          <br />
          <span className={styles.renewalRef}>PSP reference: {result.pspReference}</span>
        </p>
      )}
      {error && <p className={`${styles.renewalResult} ${styles.failed}`}>{error}</p>}
    </div>
  );
}
