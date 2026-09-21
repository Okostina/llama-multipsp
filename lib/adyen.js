import crypto from "crypto";

// Thin wrapper around Adyen's Checkout API (v71). Plain fetch rather than the
// SDK so every request in this demo is visible and easy to compare with the
// Stripe side.
const CHECKOUT_URL =
  process.env.ADYEN_CHECKOUT_URL || "https://checkout-test.adyen.com/v71";

export const SHOPPER_COOKIE = "llama_shopper_ref";

// Travel Advice Pro — the same plan as on the Stripe side.
export const PLAN = { currency: "EUR", value: 500 }; // minor units: €5.00

export function adyenConfig() {
  const apiKey = process.env.ADYEN_API_KEY;
  const merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT;
  if (!apiKey || !merchantAccount) {
    throw new Error(
      "ADYEN_API_KEY and ADYEN_MERCHANT_ACCOUNT must be set. Add them in Vercel: Settings -> Environment Variables."
    );
  }
  return { apiKey, merchantAccount };
}

export async function adyenRequest(path, { method = "GET", body, idempotencyKey } = {}) {
  const { apiKey } = adyenConfig();
  const headers = { "X-API-Key": apiKey, "Content-Type": "application/json" };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${CHECKOUT_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store", // never let Next's data cache serve a stale payment state
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data.message ? `Adyen ${data.errorCode || res.status}: ${data.message}` : `Adyen request failed (${res.status})`
    );
    err.status = res.status;
    err.adyen = data;
    throw err;
  }
  return data;
}

export function newReference(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

export function newShopperReference() {
  // Not PII — Adyen asks that shopperReference never contain name/email.
  return `llama-shopper-${crypto.randomUUID()}`;
}

// Standard webhook HMAC: HMAC-SHA256 over the colon-joined fields below, keyed
// with the hex-decoded HMAC key from the Customer Area, base64-encoded.
export function isValidWebhookHmac(item, hmacKeyHex) {
  const received = item?.additionalData?.hmacSignature;
  if (!received || !hmacKeyHex) return false;

  const signingString = [
    item.pspReference ?? "",
    item.originalReference ?? "",
    item.merchantAccountCode ?? "",
    item.merchantReference ?? "",
    item.amount?.value ?? "",
    item.amount?.currency ?? "",
    item.eventCode ?? "",
    item.success ?? "",
  ].join(":");

  const expected = crypto
    .createHmac("sha256", Buffer.from(hmacKeyHex, "hex"))
    .update(signingString, "utf8")
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Adyen returns payment method codes ("mc", "sepadirectdebit"); show names.
const METHOD_NAMES = {
  scheme: "Card",
  visa: "Visa",
  mc: "Mastercard",
  amex: "Amex",
  maestro: "Maestro",
  cartebancaire: "Cartes Bancaires",
  sepadirectdebit: "SEPA Direct Debit",
  ideal: "iDEAL",
  klarna: "Klarna",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  paypal: "PayPal",
};

export function methodName(code) {
  if (!code) return null;
  return METHOD_NAMES[code] || code.charAt(0).toUpperCase() + code.slice(1);
}
