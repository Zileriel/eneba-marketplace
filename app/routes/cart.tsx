import { Link } from "react-router";
import type { Route } from "./+types/cart";
import { CartLineItem, getCartSummary, useCartProducts } from "../components/cart/cart-lines";
import { CheckoutHeader } from "../components/layout/checkout-header";
import { formatEuro } from "../utils/currency";
import { useCart } from "../lib/cart/cart-context";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Krepšelis | Eneba" }];
}

export default function CartPage() {
  const { items, removeFromCart, setQuantity, isHydrated } = useCart();
  const { products, isLoading, error, retry } = useCartProducts(items);
  const { total, hasUnavailableProduct } = getCartSummary(items, products);
  const canCheckout =
    isHydrated &&
    items.length > 0 &&
    !isLoading &&
    !error &&
    !hasUnavailableProduct;

  return (
    <>
      <CheckoutHeader activeStep="cart" />
      <main className="cart-page">
        <div className="cart-page__layout">
          <section aria-labelledby="cart-page-title" className="cart-page__items">
            <h1 id="cart-page-title">Mano krepšelis</h1>
            {!isHydrated || isLoading ? (
              <p className="cart-message" role="status">Įkeliamas krepšelis...</p>
            ) : error ? (
              <div className="cart-message" role="alert">
                <p>{error}</p>
                <button onClick={retry} type="button">Bandykite dar kartą</button>
              </div>
            ) : items.length === 0 ? (
              <div className="cart-message">
                <p>Krepšelis tuščias.</p>
                <Link to="/">Tęsti apsipirkimą</Link>
              </div>
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
          </section>
          <aside aria-labelledby="cart-summary-title" className="cart-page__summary">
            <h2 id="cart-summary-title">Suvestinė</h2>
            <Link
              aria-disabled={!canCheckout}
              className="cart-button cart-button--primary"
              onClick={(event) => {
                if (!canCheckout) event.preventDefault();
              }}
              to="/checkout"
            >
              Pereiti prie apmokėjimo
            </Link>
            <p className="cart-page__summary-total">
              <span>Iš viso</span>
              <strong>{formatEuro(total)}</strong>
            </p>
            {hasUnavailableProduct && (
              <p className="cart-message" role="alert">
                Pašalinkite nepasiekiamus produktus prieš atsiskaitydami.
              </p>
            )}
            {items.length > 0 && (
              <p className="cart-page__summary-count">
                {items.reduce((count, item) => count + item.quantity, 0)} prekės
              </p>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
