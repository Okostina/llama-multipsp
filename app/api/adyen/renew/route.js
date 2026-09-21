import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PLAN,
  SHOPPER_COOKIE,
  adyenConfig,
  adyenRequest,
  newReference,
  methodName,
} from "../../../../lib/adyen";

// Simulates next month's renewal: a merchant-initiated (ContAuth) payment
// using the Subscription token stored during the first Hosted Checkout
// payment. In production this would run from a scheduler, not a button.
export async function POST() {
  try {
    const { merchantAccount } = adyenConfig();
    const shopperReference = cookies().get(SHOPPER_COOKIE)?.value;

    if (!shopperReference) {
      return NextResponse.json(
        { error: "No Adyen subscription found in this browser. Subscribe with Adyen first." },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({ merchantAccount, shopperReference });
    const { storedPaymentMethods = [] } = await adyenRequest(
      `/storedPaymentMethods?${params}`
    );

    const token = [...storedPaymentMethods]
      .reverse()
      .find((m) => m.supportedRecurringProcessingModels?.includes("Subscription"));

    if (!token) {
      return NextResponse.json(
        {
          error:
            "No Subscription token yet. Adyen creates it asynchronously after the first payment — try again in a few seconds.",
        },
        { status: 409 }
      );
    }

    const payment = await adyenRequest("/payments", {
      method: "POST",
      idempotencyKey: crypto.randomUUID(),
      body: {
        merchantAccount,
        amount: PLAN,
        reference: newReference("llama-renewal"),
        shopperReference,
        paymentMethod: { type: token.type, storedPaymentMethodId: token.id },
        shopperInteraction: "ContAuth",
        recurringProcessingModel: "Subscription",
      },
    });

    return NextResponse.json({
      resultCode: payment.resultCode,
      pspReference: payment.pspReference,
      refusalReason: payment.refusalReason || null,
      method: [methodName(token.brand || token.type), token.lastFour ? `•••• ${token.lastFour}` : null]
        .filter(Boolean)
        .join(" "),
    });
  } catch (err) {
    console.error("adyen renewal error:", err.message, err.adyen || "");
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
