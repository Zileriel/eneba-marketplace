import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  data,
  redirect,
  useFetcher,
  useNavigate,
  useSearchParams,
} from "react-router";
import type { Route } from "./+types/checkout";
import {
  CartLineItem,
  CartLineSkeleton,
  getCartSummary,
  useCartProducts,
} from "../components/cart/cart-lines";
import { CheckoutHeader } from "../components/layout/checkout-header";
import { formatEuro } from "../utils/currency";
import { useCart, type CartItem } from "../lib/cart/cart-context";
import {
  CheckoutCatalogError,
  CheckoutConfigurationError,
  getCheckoutOrigin,
  loadCheckoutProducts,
} from "../lib/checkout/checkout.server";
import {
  getStripeClient,
  StripeConfigurationError,
} from "../lib/checkout/stripe.server";
import {
  FirebaseAdminConfigurationError,
  FirebaseIdTokenError,
  getAvailableKeyCounts,
  verifyFirebaseIdToken,
} from "../lib/firebase/firebase-admin.server";
import { authPageUrl } from "../lib/auth/redirect";
import { useAuthUser } from "../lib/auth/use-auth-user";

const MAX_CART_QUANTITY = 99;
const PAYMENT_METHODS = [
  {
    id: "wallet",
    label: "„Eneba“ piniginė",
    logo: "eneba",
    description: "Bendras likutis: 0,00 €",
  },
  {
    id: "card",
    label: "Credit or debit card",
    logo: "card",
    description: "Pay via Visa, Mastercard, or Maestro debit or credit card",
  },
  {
    id: "paypal",
    label: "PayPal",
    logo: "PayPal",
    description: "",
  },
  {
    id: "swedbank",
    label: "Swedbank",
    logo: "Swedbank",
    description: "",
  },
  {
    id: "seb",
    label: "SEB",
    logo: "SEB",
    description: "",
  },
  {
    id: "luminor",
    label: "Luminor",
    logo: "Luminor",
    description: "",
  },
  {
    id: "revolut",
    label: "Revolut",
    logo: "Revolut",
    description: "",
  },
  {
    id: "artea",
    label: "Šiaulių bankas",
    logo: "Artea",
    description: "",
  },
] as const;
type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export function meta({}: Route.MetaArgs) {
  return [{ title: "Apmokėjimas | Eneba" }];
}

const CHECKOUT_UNAVAILABLE_ERROR =
  "Apmokėjimas laikinai nepasiekiamas. Bandykite vėliau.";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawIdToken = formData.get("firebaseIdToken");
  if (typeof rawIdToken !== "string" || !rawIdToken.trim()) {
    return data(
      { error: "Prisijunkite prie paskyros prieš tęsdami apmokėjimą." },
      { status: 401 },
    );
  }

  let firebaseUserId: string;
  try {
    firebaseUserId = await verifyFirebaseIdToken(rawIdToken);
  } catch (cause) {
    if (cause instanceof FirebaseIdTokenError) {
      return data(
        { error: "Prisijungimo sesija nebegalioja. Prisijunkite dar kartą." },
        { status: 401 },
      );
    }
    console.error("Could not verify the checkout user's identity.", cause);
    return data(
      { error: "Nepavyko patvirtinti paskyros. Bandykite dar kartą." },
      { status: 503 },
    );
  }

  const items = parseCheckoutItems(formData.get("items"));
  const paymentMethod = formData.get("paymentMethod");
  if (!items) {
    return data(
      { error: "Krepšelio duomenys netinkami. Grįžkite į krepšelį ir bandykite dar kartą." },
      { status: 400 },
    );
  }
  if (!isPaymentMethodId(paymentMethod)) {
    return data(
      { error: "Pasirinkite galiojantį mokėjimo būdą." },
      { status: 400 },
    );
  }

  let products;
  let keyCounts;
  let stripe;
  let origin;
  try {
    stripe = getStripeClient();
    origin = getCheckoutOrigin(request.url);
    [products, keyCounts] = await Promise.all([
      loadCheckoutProducts(items),
      getAvailableKeyCounts(items.map(({ productId }) => productId)),
    ]);
  } catch (cause) {
    if (
      cause instanceof CheckoutConfigurationError ||
      cause instanceof StripeConfigurationError ||
      cause instanceof FirebaseAdminConfigurationError
    ) {
      console.error("Checkout configuration is incomplete.", cause);
      return data({ error: CHECKOUT_UNAVAILABLE_ERROR }, { status: 503 });
    }
    console.error("Could not validate the checkout cart.", cause);
    return data(
      {
        error:
          cause instanceof CheckoutCatalogError
            ? "Nepavyko patvirtinti produktų kainų. Bandykite dar kartą."
            : "Nepavyko patvirtinti krepšelio. Bandykite dar kartą.",
      },
      { status: 502 },
    );
  }

  const checkoutProducts = products.filter((product) => product !== null);
  if (checkoutProducts.length !== items.length) {
    return data(
      { error: "Vienas ar daugiau produktų nebepasiekiami. Atnaujinkite krepšelį." },
      { status: 400 },
    );
  }
  const outOfStockIndex = items.findIndex(
    ({ productId, quantity }) => (keyCounts.get(productId) ?? 0) < quantity,
  );
  if (outOfStockIndex !== -1) {
    const available = keyCounts.get(items[outOfStockIndex].productId) ?? 0;
    const name = checkoutProducts[outOfStockIndex].name;
    return data(
      {
        error:
          available === 0
            ? `Prekės „${name}“ šiuo metu nėra sandėlyje.`
            : `Prekės „${name}“ sandėlyje liko tik ${available} vnt. Sumažinkite kiekį.`,
      },
      { status: 409 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      managed_payments: { enabled: false },
      client_reference_id: firebaseUserId,
      metadata: { selectedPaymentMethod: paymentMethod },
      line_items: items.map((item, index) => {
        const product = checkoutProducts[index];
        return {
          quantity: item.quantity,
          price_data: {
            currency: product.currency.toLowerCase(),
            unit_amount: Math.round(product.price * 100),
            product_data: {
              name: product.name,
              description: `${product.productType} · ${product.platform}`,
              metadata: { productId: product.id },
            },
          },
        };
      }),
      success_url: `${origin}/pickup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?payment=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }
    return redirect(session.url);
  } catch (cause) {
    console.error("Could not create a Stripe test Checkout session.", cause);
    return data(
      { error: "Nepavyko pradėti mokėjimo. Patikrinkite krepšelį ir bandykite dar kartą." },
      { status: 502 },
    );
  }
}

export default function CheckoutPage() {
  const { items, isHydrated, removeFromCart, setQuantity } = useCart();
  const { products, isLoading, error, retry } = useCartProducts(items);
  const authState = useAuthUser();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const { total, hasUnavailableProduct } = getCartSummary(items, products);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [authSubmitError, setAuthSubmitError] = useState<string | null>(null);
  const cashback = items.reduce((amount, item) => {
    const product = products.get(item.productId);
    return (
      amount +
      (product
        ? (product.price * item.quantity * product.moneyBackPercent) / 100
        : 0)
    );
  }, 0);
  const [searchParams] = useSearchParams();
  const isSubmitting = fetcher.state !== "idle" || isPreparingPayment;
  const canPay =
    isHydrated &&
    items.length > 0 &&
    !isLoading &&
    !error &&
    !hasUnavailableProduct;

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      void navigate(authPageUrl("/login", "/checkout"), { replace: true });
    }
  }, [authState.status, navigate]);

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authState.status !== "authenticated") return;

    const formData = new FormData(event.currentTarget);
    setIsPreparingPayment(true);
    setAuthSubmitError(null);
    try {
      formData.set("firebaseIdToken", await authState.user.getIdToken());
      fetcher.submit(formData, { method: "post" });
    } catch (cause) {
      console.error("Could not prepare authenticated checkout.", cause);
      setAuthSubmitError(
        "Nepavyko patvirtinti prisijungimo. Bandykite dar kartą.",
      );
    } finally {
      setIsPreparingPayment(false);
    }
  }

  if (authState.status === "loading" || authState.status === "unauthenticated") {
    return (
      <main className="checkout-page">
        <CheckoutHeader activeStep="payment" />
        <p className="checkout-message" role="status">
          Tikrinama paskyra...
        </p>
      </main>
    );
  }

  if (authState.status === "error") {
    return (
      <main className="checkout-page">
        <CheckoutHeader activeStep="payment" />
        <p className="checkout-message checkout-message--error" role="alert">
          Nepavyko patikrinti paskyros. Atnaujinkite puslapį arba{" "}
          <Link to="/login">prisijunkite iš naujo</Link>.
        </p>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <CheckoutHeader activeStep="payment" />
      <div className="checkout-page__content">
        <h1 className="checkout-page__visually-hidden">Apmokėjimas</h1>
        {searchParams.get("payment") === "cancelled" && (
          <p className="checkout-message" role="status">
            Mokėjimas atšauktas. Krepšelis liko išsaugotas.
          </p>
        )}
        {fetcher.data?.error && (
          <p className="checkout-message checkout-message--error" role="alert">
            {fetcher.data.error}
          </p>
        )}
        {authSubmitError && (
          <p className="checkout-message checkout-message--error" role="alert">
            {authSubmitError}
          </p>
        )}
        <fetcher.Form
          className="checkout-page__layout"
          method="post"
          onSubmit={submitCheckout}
        >
          <input name="items" type="hidden" value={JSON.stringify(items)} />
          <section
            aria-labelledby="checkout-methods-title"
            className="checkout-page__items checkout-page__methods"
          >
            <h2 className="checkout-page__visually-hidden" id="checkout-methods-title">
              Mokėjimo būdas
            </h2>
            <fieldset className="payment-methods">
              <legend className="checkout-page__visually-hidden">
                Pasirinkite mokėjimo būdą
              </legend>
              {PAYMENT_METHODS.map((method) => (
                <label className="payment-method" key={method.id}>
                  <input
                    name="paymentMethod"
                    required
                    type="radio"
                    value={method.id}
                  />
                  <span
                    aria-hidden="true"
                    className={`payment-method__icon payment-method__icon--${method.id}`}
                  >
                    {method.id === "card" ? (
                      <>
                        <strong>VISA</strong>
                        <span className="payment-method__mastercard">
                          <i />
                          <i />
                        </span>
                      </>
                    ) : (
                      <strong>{method.logo}</strong>
                    )}
                  </span>
                  <span className="payment-method__details">
                    <span className="payment-method__name">{method.label}</span>
                    {method.description && (
                      <span className="payment-method__description">
                        {method.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
          </section>
          <aside
            aria-labelledby="checkout-summary-title"
            className="checkout-page__summary"
          >
            <h2 className="checkout-page__visually-hidden" id="checkout-summary-title">
              Pirkinių suvestinė
            </h2>
            <div className="checkout-page__product-list">
              {!isHydrated || isLoading ? (
                <div aria-label="Įkeliamas krepšelis" role="status">
                  {Array.from(
                    { length: Math.max(1, Math.min(items.length, 2)) },
                    (_, index) => (
                      <CartLineSkeleton key={index} variant="page" />
                    ),
                  )}
                </div>
              ) : error ? (
                <div className="cart-message" role="alert">
                  <p>{error}</p>
                  <button onClick={retry} type="button">
                    Bandykite dar kartą
                  </button>
                </div>
              ) : items.length === 0 ? (
                <p className="cart-message">Krepšelis tuščias.</p>
              ) : (
                items.map((item) => (
                  <CartLineItem
                    key={item.productId}
                    onChangeQuantity={(quantity) =>
                      setQuantity(item.productId, quantity)
                    }
                    onRemove={() => removeFromCart(item.productId)}
                    product={products.get(item.productId)}
                    quantity={item.quantity}
                    variant="page"
                  />
                ))
              )}
            </div>
            <p className="checkout-page__total">
              <span>Prekių suma</span>
              <strong>{formatEuro(total)}</strong>
            </p>
            {cashback > 0 && (
              <p className="checkout-page__cashback">
                Grįžta: {formatEuro(cashback)}
              </p>
            )}
            <p className="checkout-page__grand-total">
              <span>Iš viso</span>
              <strong>{formatEuro(total)}</strong>
            </p>
            {hasUnavailableProduct && (
              <p className="checkout-message checkout-message--error" role="alert">
                Pašalinkite nepasiekiamus produktus iš krepšelio.
              </p>
            )}
            <button
              className="cart-button cart-button--primary"
              disabled={!canPay || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Tęsiama..." : "Tęsti"}
            </button>
            <p className="checkout-page__terms">
              Paspaudę „Tęsti“ sutinkate su mūsų{" "}
              <a
                href="https://www.eneba.com/lt/terms-and-conditions"
                rel="noreferrer"
                target="_blank"
              >
                Taisyklėmis ir Sąlygomis
              </a>{" "}
              bei{" "}
              <a
                href="https://www.eneba.com/lt/privacy-policy"
                rel="noreferrer"
                target="_blank"
              >
                Privatumo Pranešimu
              </a>
              .
            </p>
          </aside>
        </fetcher.Form>
      </div>
    </main>
  );
}

function parseCheckoutItems(value: FormDataEntryValue | null): CartItem[] | null {
  if (typeof value !== "string" || value.length > 10_000) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      parsed.length > 30 ||
      !parsed.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "productId" in item &&
          typeof item.productId === "string" &&
          item.productId.length > 0 &&
          item.productId.length <= 128 &&
          "quantity" in item &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= MAX_CART_QUANTITY,
      )
    ) {
      return null;
    }

    const items = parsed.filter(isCartItem);
    return items.length === parsed.length &&
      new Set(items.map(({ productId }) => productId)).size === items.length
      ? items
      : null;
  } catch {
    return null;
  }
}

function isCartItem(value: unknown): value is CartItem {
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
    value.quantity <= MAX_CART_QUANTITY
  );
}

function isPaymentMethodId(
  value: FormDataEntryValue | null,
): value is PaymentMethodId {
  return (
    typeof value === "string" &&
    PAYMENT_METHODS.some((method) => method.id === value)
  );
}
