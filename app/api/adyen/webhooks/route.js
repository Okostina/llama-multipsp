import { NextResponse } from "next/server";
import { isValidWebhookHmac } from "../../../../lib/adyen";

// Adyen Standard webhooks. Register in Customer Area -> Developers ->
// Webhooks -> Standard webhook:
//   https://<your-vercel-domain>/api/adyen/webhooks
// and generate the HMAC key there (ADYEN_HMAC_KEY).
//
// The session result the shopper sees is a snapshot; this is where the final
// outcome arrives (AUTHORISATION), and where the stored token is announced
// (RECURRING_CONTRACT).
export async function POST(request) {
  const hmacKey = process.env.ADYEN_HMAC_KEY;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = (body?.notificationItems || []).map((n) => n.NotificationRequestItem);

  for (const item of items) {
    if (!isValidWebhookHmac(item, hmacKey)) {
      console.error("Adyen webhook: invalid HMAC for", item?.pspReference);
      return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
    }
  }

  for (const item of items) {
    switch (item.eventCode) {
      case "AUTHORISATION":
        console.log(
          "AUTHORISATION",
          item.merchantReference,
          item.pspReference,
          "success:",
          item.success,
          item.success === "true" ? "" : `reason: ${item.reason}`
        );
        break;
      case "RECURRING_CONTRACT":
        console.log(
          "RECURRING_CONTRACT token stored for",
          // Webhooks spec names this "shopperReference"; Adyen's own sample
          // reads "recurring.shopperReference", so accept either.
          item.additionalData?.shopperReference ??
            item.additionalData?.["recurring.shopperReference"],
          "method:",
          item.paymentMethod
        );
        break;
      default:
        console.log("Unhandled Adyen event:", item.eventCode, item.pspReference);
    }
  }

  // Webhooks spec: 200, no content. Adyen accepts on status code alone and
  // retries anything that isn't 2xx.
  return new NextResponse(null, { status: 200 });
}
