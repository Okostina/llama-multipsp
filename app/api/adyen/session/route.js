import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PLAN,
  SHOPPER_COOKIE,
  adyenConfig,
  adyenRequest,
  newReference,
  newShopperReference,
} from "../../../../lib/adyen";

// Travel Advice Pro via Adyen Hosted Checkout.
//
// Unlike Stripe, Adyen has no subscription object or billing engine: the
// merchant owns the schedule. So the first payment asks Adyen to store the
// payment method as a "Subscription" token for this shopper, and renewals
// are merchant-initiated payments with that token (see /api/adyen/renew).
export async function POST(request) {
  try {
    const { merchantAccount } = adyenConfig();
    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL;

    // No accounts in this demo, so each browser gets its own opaque shopper
    // reference. It keeps reviewers' tokens separate from each other.
    const jar = cookies();
    const shopperReference =
      jar.get(SHOPPER_COOKIE)?.value || newShopperReference();

    const session = await adyenRequest("/sessions", {
      method: "POST",
      body: {
        mode: "hosted",
        merchantAccount,
        amount: PLAN,
        reference: newReference("llama-sub"),
        returnUrl: `${origin}/adyen/result`, // Adyen appends sessionId & sessionResult
        countryCode: "NL",
        shopperLocale: "en-US",
        // No `channel`: Adyen rejects it with mode "hosted" (error 14_0449),
        // a rule the OpenAPI spec doesn't state.
        shopperReference,
        shopperInteraction: "Ecommerce",
        recurringProcessingModel: "Subscription",
        storePaymentMethodMode: "enabled",
        ...(process.env.ADYEN_THEME_ID ? { themeId: process.env.ADYEN_THEME_ID } : {}),
      },
    });

    const res = NextResponse.json({ url: session.url });
    res.cookies.set(SHOPPER_COOKIE, shopperReference, {
      httpOnly: true,
      secure: true,
      sameSite: "lax", // sent on the top-level redirect back from Adyen
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (err) {
    console.error("adyen session error:", err.message, err.adyen || "");
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
