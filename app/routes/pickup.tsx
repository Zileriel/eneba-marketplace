import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  data,
  Link,
  useFetcher,
  useNavigate,
  useSearchParams,
} from "react-router";
import type { Route } from "./+types/pickup";
import {
  CheckoutSessionError,
  getCheckoutSessionDetails,
  StripeConfigurationError,
} from "../lib/checkout/stripe.server";
import {
  FirebaseAdminConfigurationError,
  FirebaseIdTokenError,
  fulfilPaidOrder,
  ProductKeyInventoryError,
  verifyFirebaseIdToken,
} from "../lib/firebase/firebase-admin.server";
import { isCheckoutSessionId } from "../lib/checkout/stripe-utils";
import { authPageUrl } from "../lib/auth/redirect";
import { useAuthUser } from "../lib/auth/use-auth-user";
import { useCart } from "../lib/cart/cart-context";
import { formatEuro } from "../utils/currency";

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
  productKeys: string[];
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "Prekių atsiėmimas | Eneba" }];
}

function pickupError(message: string, status: number) {
  return data({ status: "error" as const, message }, { status });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const sessionId = formData.get("sessionId");
  if (!isCheckoutSessionId(sessionId)) {
    return pickupError("Neteisingas mokėjimo sesijos ID.", 400);
  }

  const idToken = formData.get("firebaseIdToken");
  if (typeof idToken !== "string" || !idToken.trim()) {
    return pickupError("Prisijunkite, kad atsiimtumėte prekes.", 401);
  }

  let userId: string;
  try {
    userId = await verifyFirebaseIdToken(idToken);
  } catch (cause) {
    if (cause instanceof FirebaseIdTokenError) {
      return pickupError(
        "Prisijungimo sesija nebegalioja. Prisijunkite dar kartą.",
        401,
      );
    }
    console.error("Could not verify the pickup user's identity.", cause);
    return pickupError(
      "Nepavyko patvirtinti paskyros. Bandykite dar kartą.",
      503,
    );
  }

  try {
    const checkout = await getCheckoutSessionDetails(sessionId);
    if (!checkout.userId || checkout.userId !== userId) {
      return pickupError(
        "Šis užsakymas priklauso kitai paskyrai. Prisijunkite su paskyra, kuria apmokėjote.",
        403,
      );
    }

    const selectedMethod =
      checkout.selectedPaymentMethod &&
      PAYMENT_METHOD_LABELS[checkout.selectedPaymentMethod]
        ? PAYMENT_METHOD_LABELS[checkout.selectedPaymentMethod]
        : null;
    const total =
      checkout.currency === "eur" && checkout.amountTotal !== null
        ? checkout.amountTotal / 100
        : null;

    if (!checkout.isPaid) {
      return {
        status: "pending" as const,
        selectedMethod,
        total,
        items: checkout.items.map<ReceiptItem>(({ name, quantity }) => ({
          name,
          quantity,
          productKeys: [],
        })),
      };
    }

    if (checkout.amountTotal === null || checkout.currency === null) {
      throw new CheckoutSessionError("The paid session has no total.");
    }
    const order = await fulfilPaidOrder({
      id: checkout.id,
      userId,
      createdAt: checkout.createdAt,
      amountTotal: checkout.amountTotal,
      currency: checkout.currency,
      selectedPaymentMethod: checkout.selectedPaymentMethod,
      items: checkout.items,
    });

    return {
      status: "paid" as const,
      selectedMethod,
      total,
      items: order.items.map<ReceiptItem>(
        ({ name, quantity, productKeys }) => ({
          name,
          quantity,
          productKeys,
        }),
      ),
    };
  } catch (cause) {
    console.error("Could not load the paid product delivery.", cause);
    if (
      cause instanceof StripeConfigurationError ||
      cause instanceof FirebaseAdminConfigurationError
    ) {
      return pickupError(
        "Prekių atsiėmimas laikinai nepasiekiamas. Bandykite vėliau.",
        503,
      );
    }
    if (cause instanceof ProductKeyInventoryError) {
      return pickupError(
        "Mokėjimas gautas, tačiau trūksta prekių kodų sandėlyje. Susisiekite su pagalba.",
        409,
      );
    }
    return pickupError(
      "Nepavyko patikrinti mokėjimo. Bandykite dar kartą.",
      502,
    );
  }
}

export default function PickupPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const hasValidSessionId = isCheckoutSessionId(sessionId);
  const authState = useAuthUser();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const { clearCart } = useCart();
  const [retryCount, setRetryCount] = useState(0);
  const [tokenError, setTokenError] = useState(false);
  const user = authState.status === "authenticated" ? authState.user : null;
  const result = fetcher.data;
  const isPaid = result?.status === "paid";

  useEffect(() => {
    if (authState.status === "unauthenticated" && sessionId) {
      void navigate(
        authPageUrl(
          "/login",
          `/pickup?session_id=${encodeURIComponent(sessionId)}`,
        ),
        { replace: true },
      );
    }
  }, [authState.status, navigate, sessionId]);

  useEffect(() => {
    if (!user || !sessionId || !hasValidSessionId) return;

    let isCurrent = true;
    setTokenError(false);
    user
      .getIdToken()
      .then((firebaseIdToken) => {
        if (!isCurrent) return;
        void fetcher.submit({ sessionId, firebaseIdToken }, { method: "post" });
      })
      .catch((cause: unknown) => {
        console.error("Could not prepare the authenticated pickup.", cause);
        if (isCurrent) setTokenError(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [hasValidSessionId, retryCount, sessionId, user]);

  useEffect(() => {
    if (isPaid) clearCart();
  }, [clearCart, isPaid]);

  const errorMessage = !hasValidSessionId
    ? "Neteisingas mokėjimo sesijos ID."
    : authState.status === "error"
      ? "Nepavyko patikrinti paskyros. Atnaujinkite puslapį."
      : tokenError
        ? "Nepavyko patvirtinti prisijungimo. Bandykite dar kartą."
        : fetcher.state === "idle" && result?.status === "error"
          ? result.message
          : null;

  if (errorMessage) {
    return (
      <main className="checkout-result">
        <EnebaHomeLink />
        <section className="checkout-result__card" role="alert">
          <h1>Prekių atsiėmimas negalimas</h1>
          <p>{errorMessage}</p>
          {hasValidSessionId && authState.status === "authenticated" && (
            <button
              className="cart-button cart-button--primary"
              onClick={() => setRetryCount((count) => count + 1)}
              type="button"
            >
              Bandykite dar kartą
            </button>
          )}
        </section>
      </main>
    );
  }

  if (!result || result.status === "error" || fetcher.state !== "idle") {
    return (
      <main className="checkout-result">
        <EnebaHomeLink />
        <section className="checkout-result__card" role="status">
          <div aria-hidden="true" className="checkout-result__mark">
            …
          </div>
          <h1>
            {authState.status === "authenticated"
              ? "Tikrinamas mokėjimas..."
              : "Tikrinama paskyra..."}
          </h1>
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
        <h1>
          {isPaid ? "Mokėjimas patvirtintas" : "Mokėjimas nepatvirtintas"}
        </h1>
        <p>
          {isPaid
            ? "Jūsų skaitmeninės prekės paruoštos."
            : "Mokėjimas dar nepažymėtas kaip užbaigtas."}
        </p>
        {isPaid && result.selectedMethod && (
          <p className="checkout-result__method">
            Mokėjimo būdas: {result.selectedMethod}.
          </p>
        )}
        {result.items.length > 0 && (
          <ul className="checkout-result__items">
            {result.items.map((item, index) => (
              <li
                className="checkout-result__item"
                key={`${item.name}-${index}`}
              >
                <div className="checkout-result__item-heading">
                  <strong>{item.name}</strong>
                  <span>× {item.quantity}</span>
                </div>
                {item.productKeys.map((productKey, keyIndex) => (
                  <div className="checkout-result__key" key={keyIndex}>
                    <div className="checkout-result__key-value">
                      <span>
                        Produkto kodas
                        {item.productKeys.length > 1 ? ` ${keyIndex + 1}` : ""}
                      </span>
                      <code>{productKey}</code>
                    </div>
                    <CopyProductKeyButton productKey={productKey} />
                  </div>
                ))}
                {isPaid && item.productKeys.length < item.quantity && (
                  <p className="checkout-result__key-error" role="alert">
                    Šios prekės kodas dar neparuoštas. Susisiekite su pagalba.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {result.total !== null && (
          <p className="checkout-result__total">
            Iš viso: <strong>{formatEuro(result.total)}</strong>
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
        {copyState === "copied" ? (
          <Check aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
      </button>
      {copyState === "error" && (
        <span role="alert">Nepavyko nukopijuoti kodo.</span>
      )}
    </div>
  );
}
