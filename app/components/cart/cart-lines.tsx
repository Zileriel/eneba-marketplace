import { Minus, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect } from "react";
import { formatEuro } from "../../utils/currency";
import { getProductById } from "../../lib/products/product-repository.client";
import type { ProductCatalogItem } from "../../lib/products/products";
import type { CartItem } from "../../lib/cart/cart-context";
import { useStaleWhileRevalidate } from "../../lib/cache/swr";

export function useCartProducts(items: CartItem[]) {
  const productIds = items
    .map(({ productId }) => productId)
    .sort()
    .join("|");
  const ids = productIds ? productIds.split("|") : [];

  const loadProducts = useCallback(
    () =>
      Promise.all(
        ids.map(async (id) => [id, await getProductById(id)] as const),
      ),
    [productIds],
  );
  const resource = useStaleWhileRevalidate(
    `cart-products:${productIds}`,
    loadProducts,
    ids.length > 0,
  );
  const products = new Map(resource.data ?? []);
  const error =
    resource.error && resource.data === undefined
      ? "Nepavyko įkelti krepšelio produktų."
      : null;

  useEffect(() => {
    if (resource.error) {
      console.error(
        "Could not load products in the shopping cart.",
        resource.error,
      );
    }
  }, [resource.error]);

  return {
    products,
    isLoading: ids.length > 0 && resource.isLoading,
    error,
    retry: resource.retry,
  };
}

export function getCartSummary(
  items: CartItem[],
  products: Map<string, ProductCatalogItem | null>,
) {
  let total = 0;
  let hasUnavailableProduct = false;

  for (const item of items) {
    const product = products.get(item.productId);
    if (!product) {
      hasUnavailableProduct = true;
      continue;
    }
    total += product.price * item.quantity;
  }

  return { total, hasUnavailableProduct };
}

export function CartLineItem({
  product,
  quantity,
  onChangeQuantity,
  onRemove,
  variant,
}: {
  product: ProductCatalogItem | null | undefined;
  quantity: number;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
  variant: "drawer" | "page" | "checkout";
}) {
  if (!product) {
    return (
      <article className={`cart-line cart-line--${variant}`}>
        <div className="cart-line__missing">
          <strong>Produktas nepasiekiamas</strong>
          <p>Šis produktas šiuo metu nerastas kataloge.</p>
        </div>
        <button
          aria-label="Pašalinti nepasiekiamą produktą"
          className="cart-line__remove"
          onClick={onRemove}
          type="button"
        >
          <Trash2 aria-hidden="true" />
        </button>
      </article>
    );
  }

  const total = product.price * quantity;
  const moneyBack = (total * product.moneyBackPercent) / 100;

  return (
    <article className={`cart-line cart-line--${variant}`}>
      <img alt={product.name} className="cart-line__image" src={product.coverImage} />
      <div className="cart-line__details">
        <p className="cart-line__product-type">
          {product.productType} · {product.platform}
        </p>
        <h3>{product.name}</h3>
        <p className="cart-line__metadata">{product.regions.join(", ")}</p>
        <div className="cart-line__controls">
          {variant !== "checkout" && (
            <div aria-label={`Kiekis: ${quantity}`} className="cart-line__quantity">
              <button
                aria-label={`Sumažinti ${product.name} kiekį`}
                disabled={quantity <= 1}
                onClick={() => onChangeQuantity(quantity - 1)}
                type="button"
              >
                <Minus aria-hidden="true" />
              </button>
              <span>{quantity}</span>
              <button
                aria-label={`Padidinti ${product.name} kiekį`}
                disabled={quantity >= 99}
                onClick={() => onChangeQuantity(quantity + 1)}
                type="button"
              >
                <Plus aria-hidden="true" />
              </button>
            </div>
          )}
          <p className="cart-line__price">{formatEuro(total)}</p>
          {variant !== "checkout" && (
            <button
              aria-label={`Pašalinti ${product.name} iš krepšelio`}
              className="cart-line__remove"
              onClick={onRemove}
              type="button"
            >
              <Trash2 aria-hidden="true" />
            </button>
          )}
        </div>
        {product.moneyBackPercent > 0 && (
          <p className="cart-line__cashback">grįžta: {formatEuro(moneyBack)}</p>
        )}
      </div>
    </article>
  );
}

export function CartLineSkeleton({
  variant,
}: {
  variant: "drawer" | "page" | "checkout";
}) {
  return (
    <article
      aria-hidden="true"
      className={`cart-line cart-line--${variant} cart-line--skeleton`}
    >
      <div className="cart-line-skeleton__image" />
      <div className="cart-line__details cart-line-skeleton__details">
        <span className="cart-line-skeleton__line cart-line-skeleton__line--type" />
        <span className="cart-line-skeleton__line cart-line-skeleton__line--name" />
        <span className="cart-line-skeleton__line cart-line-skeleton__line--metadata" />
        <span className="cart-line-skeleton__line cart-line-skeleton__line--price" />
      </div>
    </article>
  );
}
