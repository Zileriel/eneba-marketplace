import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { data, Link } from "react-router";
import type { Route } from "./+types/pickup";
import {
  CheckoutConfigurationError,
  getStripeTestClient,
} from "../lib/checkout/checkout.server";
import {
  getProductKeys,
  savePaidOrder,
  ProductKeyConfigurationError,
  ProductKeyInventoryError,
} from "../lib/firebase/firebase-admin.server";
import { formatEuro } from "../utils/currency";
import { useCart } from "../lib/cart/cart-context";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wallet: "„Eneba“ piniginė",
  card: "Banko kortelė",
  paypal: "PayPal",
  swedbank: "Swedbank",
  seb: "SEB",
  luminor: "Luminor",
  revolut: "Revolut",
  artea: "Šiaulių bankas",
};

type ReceiptItem = {
  name: string;
  quantity: number;
  productKey: string | null;
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "Prekių atsiėmimas | Eneba" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !/^cs_test_[a-zA-Z0-9]+$/.test(sessionId)) {
    throw new Response("Neteisingas Stripe Checkout sesijos ID.", {
      status: 400,
    });
  }

  try {
    const stripe = getStripeTestClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.livemode) {
      throw new Response(
        "Šiame puslapyje rodomi tik Stripe testinio režimo mokėjimai.",
        { status: 400 },
      );
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
    });
    const isPaid =
      session.status === "complete" && session.payment_status === "paid";
    const cartItems = parseSessionCartItems(session.metadata);
    let productKeys = new Map<string, string>();
    let orderHistorySaveFailed = false;

    if (isPaid && cartItems.length > 0) {
      if (cartItems.length !== lineItems.data.length) {
        throw new ProductKeyInventoryError(
          "The paid checkout items do not match the saved order.",
        );
      }
      const firebaseUserId = session.metadata?.firebaseUserId;
      if (
        firebaseUserId &&
        session.client_reference_id === firebaseUserId &&
        session.amount_total !== null &&
        session.currency === "eur"
      ) {
        try {
          await savePaidOrder({
            id: session.id,
            userId: firebaseUserId,
            createdAt: session.created * 1000,
            amountTotal: session.amount_total,
            currency: session.currency,
            selectedPaymentMethod:
              session.metadata?.selectedPaymentMethod ?? null,
            items: lineItems.data.map((lineItem, index) => ({
              productId: cartItems[index].productId,
              name: lineItem.description || "Skaitmeninė prekė",
              quantity: cartItems[index].quantity,
            })),
          });
        } catch (cause) {
          console.error("Could not save the paid order history.", cause);
          orderHistorySaveFailed = true;
        }
      } else if (firebaseUserId || session.client_reference_id) {
        console.error(
          "The paid order could not be associated with its Firebase user.",
          { sessionId: session.id },
        );
        orderHistorySaveFailed = true;
      }
      productKeys = await getProductKeys(
        cartItems.map((item) => item.productId),
      );
    }

    const items: ReceiptItem[] = lineItems.data.map((lineItem, index) => {
      const cartItem = cartItems[index];
      return {
        name: lineItem.description || "Skaitmeninė prekė",
        quantity: cartItem?.quantity ?? lineItem.quantity ?? 1,
        productKey:
          isPaid && cartItem
            ? productKeys.get(cartItem.productId) ?? null
            : null,
      };
    });

    const selectedMethod = session.metadata?.selectedPaymentMethod;
    return {
      status: isPaid ? ("paid" as const) : ("pending" as const),
      orderHistorySaveFailed,
      total:
        session.currency === "eur" && session.amount_total !== null
          ? session.amount_total / 100
          : null,
      items,
      selectedMethod:
        selectedMethod && PAYMENT_METHOD_LABELS[selectedMethod]
          ? PAYMENT_METHOD_LABELS[selectedMethod]
          : null,
    };
  } catch (cause) {
    if (cause instanceof Response) throw cause;
    if (
      cause instanceof CheckoutConfigurationError ||
      cause instanceof ProductKeyConfigurationError
    ) {
      console.error("Could not load the paid product delivery.", cause);
      return data(
        {
          status: "error" as const,
          message:
            "Prekių atsiėmimas dar nesukonfigūruotas. Susisiekite su pagalba.",
        },
        { status: 503 },
      );
    }
    if (cause instanceof ProductKeyInventoryError) {
      console.error("Could not load the paid product delivery.", cause);
      return data(
        {
          status: "error" as const,
          message:
            "Nepavyko paruošti visų prekių kodų. Susisiekite su pagalba.",
        },
        { status: 503 },
      );
    }
    console.error("Could not verify the paid product delivery.", cause);
    return data(
      {
        status: "error" as const,
        message: "Nepavyko patikrinti mokėjimo. Bandykite dar kartą.",
      },
      { status: 502 },
    );
  }
}

export default function PickupPage({ loaderData }: Route.ComponentProps) {
  const { clearCart } = useCart();
  const isPaid = loaderData.status === "paid";

  useEffect(() => {
    if (isPaid) clearCart();
  }, [clearCart, isPaid]);

  if (loaderData.status === "error") {
    return (
      <main className="checkout-result">
        <EnebaHomeLink />
        <section className="checkout-result__card" role="alert">
          <h1>Prekių atsiėmimas negalimas</h1>
          <p>{loaderData.message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-result">
      <EnebaHomeLink />
      <section className="checkout-result__card">
        <div
          aria-hidden="true"
          className={`checkout-result__mark${isPaid ? " checkout-result__mark--success" : ""}`}
        >
          {isPaid ? <Check /> : "…"}
        </div>
        <h1>{isPaid ? "Mokėjimas patvirtintas" : "Mokėjimas nepatvirtintas"}</h1>
        <p>
          {isPaid
            ? "Jūsų skaitmeninės prekės paruoštos."
            : "Mokėjimas dar nepažymėtas kaip užbaigtas."}
        </p>
        {isPaid && loaderData.selectedMethod && (
          <p className="checkout-result__method">
            Mokėjimo būdas: {loaderData.selectedMethod}.
          </p>
        )}
        {isPaid && loaderData.orderHistorySaveFailed && (
          <p className="checkout-message checkout-message--error" role="alert">
            Mokėjimas patvirtintas, tačiau nepavyko išsaugoti užsakymo
            istorijoje. Atnaujinkite šį puslapį, kad bandytume dar kartą.
          </p>
        )}
        {loaderData.items.length > 0 && (
          <ul className="checkout-result__items">
            {loaderData.items.map((item, index) => (
              <li className="checkout-result__item" key={`${item.name}-${index}`}>
                <div className="checkout-result__item-heading">
                  <strong>{item.name}</strong>
                  <span>× {item.quantity}</span>
                </div>
                {item.productKey ? (
                  <div className="checkout-result__key">
                    <div className="checkout-result__key-value">
                      <span>Produkto kodas</span>
                      <code>{item.productKey}</code>
                    </div>
                    <CopyProductKeyButton productKey={item.productKey} />
                  </div>
                ) : (
                  isPaid && (
                    <p className="checkout-result__key-error" role="alert">
                      Šios prekės kodas dar neparuoštas. Susisiekite su pagalba.
                    </p>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
        {loaderData.total !== null && (
          <p className="checkout-result__total">
            Iš viso: <strong>{formatEuro(loaderData.total)}</strong>
          </p>
        )}
        <Link className="cart-button cart-button--primary" to="/">
          Tęsti apsipirkimą
        </Link>
      </section>
    </main>
  );
}

function EnebaHomeLink() {
  return (
    <Link aria-label="Eneba pradžia" className="checkout-header__brand" to="/">
      <img alt="Eneba" src="/logo.svg" />
    </Link>
  );
}

function CopyProductKeyButton({ productKey }: { productKey: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  async function copyProductKey() {
    try {
      await navigator.clipboard.writeText(productKey);
      setCopyState("copied");
    } catch (cause) {
      console.error("Could not copy the product key.", cause);
      setCopyState("error");
    }
  }

  return (
    <div className="checkout-result__copy">
      <button onClick={copyProductKey} type="button">
        {copyState === "copied" ? "Nukopijuota" : "Kopijuoti"}
        {copyState === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
      {copyState === "error" && (
        <span role="alert">Nepavyko nukopijuoti kodo.</span>
      )}
    </div>
  );
}

function parseSessionCartItems(metadata: Record<string, string> | null) {
  const metadataItems = Object.entries(metadata ?? {}).flatMap(
    ([key, value]) => {
      const match = /^cartItem_(\d+)$/.exec(key);
      if (!match) return [];

      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch (cause) {
        throw new ProductKeyInventoryError(
          "The paid checkout items have invalid metadata.",
          { cause },
        );
      }
      if (!isCartItem(parsed)) {
        throw new ProductKeyInventoryError(
          "The paid checkout items have invalid metadata.",
        );
      }
      return [{ index: Number(match[1]), item: parsed }];
    },
  );

  metadataItems.sort((left, right) => left.index - right.index);
  const productIds = metadataItems.map(({ item }) => item.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw new ProductKeyInventoryError(
      "The paid checkout items contain duplicate product IDs.",
    );
  }

  return metadataItems.map(({ item }) => item);
}

function isCartItem(value: unknown): value is {
  productId: string;
  quantity: number;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "productId" in value &&
    typeof value.productId === "string" &&
    value.productId.length > 0 &&
    value.productId.length <= 128 &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0 &&
    value.quantity <= 99
  );
}
