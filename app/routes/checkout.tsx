import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { data, redirect } from "react-router";
import { CreditCard, Landmark, WalletCards } from "lucide-react";
import type { Route } from "./+types/checkout";
import { getCartSummary, useCartProducts } from "../components/cart/cart-lines";
import { CheckoutHeader } from "../components/layout/checkout-header";
import { formatEuro } from "../utils/currency";
import { useCart, type CartItem } from "../lib/cart/cart-context";
import {
  CheckoutCatalogError,
  CheckoutConfigurationError,
  getCheckoutOrigin,
  getStripeTestClient,
  loadCheckoutProducts,
} from "../lib/checkout/checkout.server";

const MAX_CART_QUANTITY = 99;
const PAYMENT_METHODS = [
  {
    id: "card",
    label: "Banko kortelė",
    description: "Visa, Mastercard",
    icon: CreditCard,
    isDemo: false,
  },
  {
    id: "paypal",
    label: "PayPal",
    description: "Demonstracinis pasirinkimas",
    icon: WalletCards,
    isDemo: true,
  },
  {
    id: "swedbank",
    label: "Swedbank",
    description: "Demonstracinis pasirinkimas",
    icon: Landmark,
    isDemo: true,
  },
  {
    id: "seb",
    label: "SEB",
    description: "Demonstracinis pasirinkimas",
    icon: Landmark,
    isDemo: true,
  },
  {
    id: "luminor",
    label: "Luminor",
    description: "Demonstracinis pasirinkimas",
    icon: Landmark,
    isDemo: true,
  },
] as const;
type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export function meta({}: Route.MetaArgs) {
  return [{ title: "Apmokėjimas | Eneba" }];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawItems = formData.get("items");
  const items = parseCheckoutItems(rawItems);
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
  let stripe;
  let origin;
  try {
    products = await loadCheckoutProducts(items);
    if (products.some((product) => product === null)) {
      return data(
        { error: "Vienas ar daugiau produktų nebepasiekiami. Atnaujinkite krepšelį." },
        { status: 400 },
      );
    }
    stripe = getStripeTestClient();
    origin = getCheckoutOrigin(request.url);
  } catch (cause) {
    if (cause instanceof CheckoutConfigurationError) {
      console.error("Checkout configuration is incomplete.", cause);
      return data({ error: cause.message }, { status: 503 });
    }
    if (cause instanceof CheckoutCatalogError) {
      console.error("Could not validate checkout products.", cause);
      return data(
        { error: "Nepavyko patvirtinti produktų kainų. Bandykite dar kartą." },
        { status: 502 },
      );
    }
    console.error("Could not load products for checkout.", cause);
    return data(
      { error: "Nepavyko patvirtinti krepšelio. Bandykite dar kartą." },
      { status: 502 },
    );
  }

  try {
    const metadata: Record<string, string> = {
      selectedPaymentMethod: paymentMethod,
    };
    items.forEach((item, index) => {
      metadata[`cartItem_${index}`] = JSON.stringify(item);
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      managed_payments: { enabled: false },
      metadata,
      line_items: items.map((item, index) => {
        const product = products[index];
        if (!product) {
          throw new Error("Validated checkout product is missing.");
        }
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

export default function CheckoutPage({
  actionData,
}: Route.ComponentProps) {
  const { items, isHydrated } = useCart();
  const { products, isLoading, error, retry } = useCartProducts(items);
  const { total, hasUnavailableProduct } = getCartSummary(items, products);
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";
  const canPay =
    isHydrated &&
    items.length > 0 &&
    !isLoading &&
    !error &&
    !hasUnavailableProduct;

  return (
    <main className="checkout-page">
      <CheckoutHeader activeStep="payment" />
      <div className="checkout-page__content">
        <h1>Apmokėjimas</h1>
        {searchParams.get("payment") === "cancelled" && (
          <p className="checkout-message" role="status">
            Mokėjimas atšauktas. Krepšelis liko išsaugotas.
          </p>
        )}
        {actionData?.error && (
          <p className="checkout-message checkout-message--error" role="alert">
            {actionData.error}
          </p>
        )}
        <Form className="checkout-page__layout" method="post">
          <input name="items" type="hidden" value={JSON.stringify(items)} />
          <section
            aria-labelledby="checkout-methods-title"
            className="checkout-page__items checkout-page__methods"
          >
            <h2 id="checkout-methods-title">Mokėjimo būdas</h2>
            {!isHydrated || isLoading ? (
              <p className="cart-message" role="status">Įkeliama...</p>
            ) : error ? (
              <div className="cart-message" role="alert">
                <p>{error}</p>
                <button onClick={retry} type="button">Bandykite dar kartą</button>
              </div>
            ) : (
              <fieldset className="payment-methods">
                <legend>Pasirinkite mokėjimo būdą</legend>
                {PAYMENT_METHODS.map((method, index) => {
                  const Icon = method.icon;
                  return (
                    <label className="payment-method" key={method.id}>
                      <input
                        defaultChecked={index === 0}
                        name="paymentMethod"
                        required
                        type="radio"
                        value={method.id}
                      />
                      <span aria-hidden="true" className="payment-method__icon">
                        <Icon />
                      </span>
                      <span className="payment-method__details">
                        <span className="payment-method__name">{method.label}</span>
                        <span className="payment-method__description">
                          {method.description}
                        </span>
                      </span>
                      {method.isDemo && (
                        <span className="payment-method__badge">DEMO</span>
                      )}
                    </label>
                  );
                })}
              </fieldset>
            )}
          </section>
          <aside aria-labelledby="checkout-summary-title" className="checkout-page__summary">
            <h2 id="checkout-summary-title">Suvestinė</h2>
            <p className="checkout-page__total">
              <span>Iš viso</span>
              <strong>{formatEuro(total)}</strong>
            </p>
            <p className="checkout-page__payment-note">
              Testavimo metu visi pasirinkimai tęsiami per Stripe kortelės formą.
              PayPal ir bankų pasirinkimai yra demonstraciniai.
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
              {isSubmitting
                ? "Jungiama prie Stripe..."
                : `Mokėti ${formatEuro(total)}`}
            </button>
            <Link className="checkout-page__back" to="/cart">
              Grįžti į krepšelį
            </Link>
          </aside>
        </Form>
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
