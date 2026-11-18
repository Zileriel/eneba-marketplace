import { Check, ShoppingCart, X } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { CartLineItem, getCartSummary, useCartProducts } from "./cart-lines";
import { formatEuro } from "../../utils/currency";
import { useCart } from "../../lib/cart/cart-context";

export function CartOverlays() {
  const {
    addedProductId,
    isCartOpen,
    closeCart,
    closeAddedDialog,
  } = useCart();

  useEffect(() => {
    if (!addedProductId && !isCartOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
        closeAddedDialog();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [addedProductId, isCartOpen, closeCart, closeAddedDialog]);

  return (
    <>
      {addedProductId && <CartAddedDialog />}
      {isCartOpen && <CartDrawer />}
    </>
  );
}

function CartAddedDialog() {
  const { closeAddedDialog, itemCount } = useCart();

  return (
    <div className="cart-overlay cart-overlay--added">
      <button
        aria-label="Uždaryti patvirtinimą"
        className="cart-overlay__backdrop"
        onClick={closeAddedDialog}
        type="button"
      />
      <section
        aria-labelledby="cart-added-title"
        aria-modal="true"
        className="cart-added-dialog"
        role="dialog"
      >
        <div aria-hidden="true" className="cart-added-dialog__icon">
          <ShoppingCart />
          <Check />
        </div>
        <h2 id="cart-added-title">Pridėta į krepšelį</h2>
        <p>
          Krepšelyje yra <strong>{itemCount} {pluralizeItems(itemCount)}</strong>
        </p>
        <div className="cart-added-dialog__actions">
          <button
            className="cart-button cart-button--primary"
            onClick={closeAddedDialog}
            type="button"
          >
            Tęsti apsipirkimą
          </button>
          <Link
            className="cart-button cart-button--secondary"
            onClick={closeAddedDialog}
            to="/cart"
          >
            Peržiūrėti krepšelį
          </Link>
        </div>
      </section>
    </div>
  );
}

function CartDrawer() {
  const {
    cartButtonRef,
    items,
    closeCart,
    removeFromCart,
    setQuantity,
  } = useCart();
  const { products, isLoading, error, retry } = useCartProducts(items);
  const { total, hasUnavailableProduct } = getCartSummary(items, products);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(
    null,
  );

  useEffect(() => {
    const button = cartButtonRef.current;
    if (!button) return;

    const updatePosition = () => {
      const bounds = button.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const drawerWidth = Math.min(390, viewportWidth - 24);
      setPosition({
        top: Math.min(
          bounds.bottom + 8,
          Math.max(8, window.innerHeight - 180),
        ),
        right: Math.max(
          12,
          Math.min(
            viewportWidth - bounds.right,
            viewportWidth - drawerWidth - 12,
          ),
        ),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [cartButtonRef]);

  return (
    <div className="cart-overlay cart-overlay--drawer">
      <button
        aria-label="Uždaryti krepšelį"
        className="cart-overlay__backdrop"
        onClick={closeCart}
        type="button"
      />
      <section
        aria-labelledby="cart-drawer-title"
        aria-modal="true"
        className="cart-drawer"
        role="dialog"
        style={{
          top: position?.top,
          right: position?.right,
          height: position
            ? `min(620px, calc(100dvh - ${position.top + 12}px))`
            : undefined,
          visibility: position ? "visible" : "hidden",
        }}
      >
        <header className="cart-drawer__header">
          <h2 id="cart-drawer-title">Mano pirkinių krepšelis</h2>
          <button aria-label="Uždaryti" onClick={closeCart} type="button">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="cart-drawer__items">
          {isLoading ? (
            <p className="cart-message" role="status">Įkeliamas krepšelis...</p>
          ) : error ? (
            <div className="cart-message" role="alert">
              <p>{error}</p>
              <button onClick={retry} type="button">Bandykite dar kartą</button>
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
                variant="drawer"
              />
            ))
          )}
        </div>
        <div className="cart-drawer__summary">
          <div className="cart-drawer__total">
            <span>Iš viso</span>
            <strong>{formatEuro(total)}</strong>
          </div>
          {hasUnavailableProduct && (
            <p className="cart-message" role="alert">
              Pašalinkite nepasiekiamus produktus prieš atsiskaitydami.
            </p>
          )}
          <Link
            className="cart-button cart-button--primary"
            onClick={closeCart}
            to="/cart"
          >
            Peržiūrėti krepšelį
          </Link>
          <Link
            aria-disabled={
              items.length === 0 ||
              isLoading ||
              Boolean(error) ||
              hasUnavailableProduct
            }
            className="cart-button cart-button--secondary"
            onClick={(event) => {
              if (
                items.length === 0 ||
                isLoading ||
                error ||
                hasUnavailableProduct
              ) {
                event.preventDefault();
                return;
              }
              closeCart();
            }}
            to="/checkout"
          >
            Atsiskaityti dabar
          </Link>
        </div>
      </section>
    </div>
  );
}

function pluralizeItems(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return "prekių";
  if (lastDigit === 1) return "prekė";
  if (lastDigit >= 2 && lastDigit <= 9) return "prekės";
  return "prekių";
}
