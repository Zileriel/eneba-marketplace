import Stripe from "stripe";
import { isCheckoutSessionId } from "./stripe-utils";

export class StripeConfigurationError extends Error {}
export class CheckoutSessionError extends Error {}

let stripeClient: Stripe | undefined;

export type CheckoutSessionItem = {
  productId: string;
  name: string;
  quantity: number;
};

export type CheckoutSessionDetails = {
  id: string;
  userId: string | null;
  isPaid: boolean;
  createdAt: number;
  amountTotal: number | null;
  currency: string | null;
  selectedPaymentMethod: string | null;
  items: CheckoutSessionItem[];
};

export function getStripeClient() {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new StripeConfigurationError(
      "Stripe test mode is not configured. Set STRIPE_SECRET_KEY to a test key.",
    );
  }
  if (!secretKey.startsWith("sk_test_")) {
    throw new StripeConfigurationError(
      "Checkout only accepts Stripe test-mode secret keys (sk_test_).",
    );
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export async function getCheckoutSessionDetails(
  sessionId: string,
): Promise<CheckoutSessionDetails> {
  if (!isCheckoutSessionId(sessionId)) {
    throw new CheckoutSessionError("The Checkout session ID is invalid.");
  }

  const stripe = getStripeClient();
  const [session, lineItems] = await Promise.all([
    stripe.checkout.sessions.retrieve(sessionId),
    stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ["data.price.product"],
    }),
  ]);
  if (session.livemode) {
    throw new CheckoutSessionError("Live-mode Checkout sessions are rejected.");
  }
  if (lineItems.has_more) {
    throw new CheckoutSessionError("The Checkout session has too many items.");
  }

  const items = lineItems.data.map((lineItem) => {
    const product = lineItem.price?.product;
    const productId =
      typeof product === "object" && !product.deleted
        ? product.metadata.productId
        : undefined;
    if (
      !productId ||
      !Number.isInteger(lineItem.quantity) ||
      (lineItem.quantity ?? 0) <= 0
    ) {
      throw new CheckoutSessionError(
        "A Checkout line item is missing its product ID or quantity.",
      );
    }
    return {
      productId,
      name: lineItem.description || "Skaitmeninė prekė",
      quantity: lineItem.quantity as number,
    };
  });
  const productIds = items.map(({ productId }) => productId);
  if (items.length === 0 || new Set(productIds).size !== productIds.length) {
    throw new CheckoutSessionError(
      "The Checkout session has missing or duplicate products.",
    );
  }

  return {
    id: session.id,
    userId: session.client_reference_id,
    isPaid: session.status === "complete" && session.payment_status === "paid",
    createdAt: session.created * 1000,
    amountTotal: session.amount_total,
    currency: session.currency,
    selectedPaymentMethod: session.metadata?.selectedPaymentMethod ?? null,
    items,
  };
}
