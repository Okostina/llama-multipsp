import styles from "../status.module.css";

const BARCODE_BARS = [6, 12, 8, 16, 5, 14, 9, 12, 6, 16, 8, 10, 5, 13, 7];

export default function Cancel() {
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
            Checkout cancelled <span className={styles.pspTagStripe}>Stripe</span>
          </span>
          <span className={styles.barcode} aria-hidden="true">
            {BARCODE_BARS.map((h, i) => (
              <span key={i} style={{ height: h }} />
            ))}
          </span>
        </div>

        <div className={styles.divider} />

        <div className={styles.stubBody}>
          <div className={`${styles.stamp} ${styles.neutral}`}>Cancelled</div>

          <h1 className={styles.heading}>No worries</h1>
          <p className={styles.body}>
            You didn't get charged — checkout was cancelled. Your plan is still
            waiting whenever you want to pick it back up.
          </p>
        </div>
      </div>

      <div className={styles.footer}>
        <a className={styles.backLink} href="/">
          &larr; Back to Llama Inc.
        </a>
      </div>
    </main>
  );
}
