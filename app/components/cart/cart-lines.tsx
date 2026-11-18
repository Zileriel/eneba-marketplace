import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatEuro } from "../../utils/currency";
import { getProductById } from "../../lib/products/product-repository.client";
import type { ProductCatalogItem } from "../../lib/products/products";
import type { CartItem } from "../../lib/cart/cart-context";

export function useCartProducts(items: CartItem[]) {
  const [products, setProducts] = useState<Map<string, ProductCatalogItem | null>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const productIds = items.map(({ productId }) => productId).join("|");

  useEffect(() => {
    let isCurrent = true;
    const ids = productIds ? productIds.split("|") : [];

    if (ids.length === 0) {
      setProducts(new Map());
      setError(null);
      setIsLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    setIsLoading(true);
    setError(null);
    Promise.all(
      ids.map(async (id) => [id, await getProductById(id)] as const),
    )
      .then((entries) => {
        if (isCurrent) setProducts(new Map(entries));
      })
      .catch((cause: unknown) => {
        console.error("Could not load products in the shopping cart.", cause);
        if (isCurrent) setError("Nepavyko įkelti krepšelio produktų.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [productIds, retryCount]);

  return {
    products,
    isLoading,
    error,
    retry: () => setRetryCount((count) => count + 1),
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
