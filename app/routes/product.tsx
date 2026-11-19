import { CirclePlus, ShoppingCart } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/product";
import { Header } from "../components/layout/header";
import { formatEuro } from "../utils/currency";
import { useCart } from "../lib/cart/cart-context";
import {
  getProductById,
  getProductCacheKey,
} from "../lib/products/product-repository.client";
import type { ProductCatalogItem } from "../lib/products/products";
import {
  getCachedValue,
  revalidateCachedValue,
  useCachedValue,
} from "../lib/cache/swr";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Produktas | Eneba" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const cacheKey = getProductCacheKey(params.productId);
  const cachedProduct = getCachedValue<ProductCatalogItem | null>(cacheKey);

  if (cachedProduct !== undefined) {
    void revalidateCachedValue(cacheKey, () =>
      getProductById(params.productId),
    ).catch((cause: unknown) => {
      console.error(`Failed to refresh product "${params.productId}".`, cause);
    });
    return cachedProduct;
  }

  return revalidateCachedValue(cacheKey, () =>
    getProductById(params.productId),
  );
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return (
    <>
      <Header />
      <main className="product-detail-page">
        <p className="product-detail-page__message" role="status">
          Įkeliamas produktas...
        </p>
      </main>
    </>
  );
}

export default function ProductDetail({
  loaderData,
}: Route.ComponentProps) {
  const productId = useParams<"productId">().productId ?? "";
  const cacheKey = productId ? getProductCacheKey(productId) : "product:missing";
  const product = useCachedValue(cacheKey, loaderData);

  return (
    <>
      <Header />
      {product ? (
        <ProductDetailContent product={product} />
      ) : (
        <main className="product-detail-page">
          <section className="product-detail-page__message">
            <h1>Produktas nerastas</h1>
            <Link to="/">Grįžti į pradžią</Link>
          </section>
        </main>
      )}
    </>
  );
}

function ProductDetailContent({ product }: { product: ProductCatalogItem }) {
  const { addToCart, closeAddedDialog } = useCart();
  const navigate = useNavigate();
  const moneyBack = (product.price * product.moneyBackPercent) / 100;

  function buyNow() {
    addToCart(product.id);
    closeAddedDialog();
    void navigate("/checkout");
  }

  return (
    <main className="product-detail-page">
      <div className="product-detail-page__breadcrumb">
        <Link to="/">Pradžia</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </div>
      <div className="product-detail">
        <div className="product-detail__main">
          <div className="product-detail__cover">
            <img alt={product.name} src={product.coverImage} />
          </div>
          <section
            aria-labelledby="product-detail-title"
            className="product-detail__information"
          >
            {product.moneyBackPercent > 0 && (
              <p className="product-detail__cashback">
                <CirclePlus aria-hidden="true" />
                Pinigai grįžta {product.moneyBackPercent}%
              </p>
            )}
            <h1 id="product-detail-title">{product.name}</h1>
            <dl className="product-detail__facts">
              <div>
                <dt>Platforma</dt>
                <dd>{product.platform}</dd>
              </div>
              <div>
                <dt>Produkto tipas</dt>
                <dd>{product.productType}</dd>
              </div>
              <div>
                <dt>Regionas</dt>
                <dd>{product.regions.join(", ")}</dd>
              </div>
              {product.operatingSystems.length > 0 && (
                <div>
                  <dt>Operacinės sistemos</dt>
                  <dd>{product.operatingSystems.join(", ")}</dd>
                </div>
              )}
              {product.genres.length > 0 && (
                <div>
                  <dt>Žanrai</dt>
                  <dd>{product.genres.join(", ")}</dd>
                </div>
              )}
              <div>
                <dt>Šalis</dt>
                <dd>{product.country}</dd>
              </div>
            </dl>
          </section>
        </div>
        <aside
          aria-label="Produkto pirkimas"
          className="product-detail__purchase"
        >
          <p className="product-detail__price-label">Kaina</p>
          <p className="product-detail__price">{formatEuro(product.price)}</p>
          {product.moneyBackPercent > 0 && (
            <p className="product-detail__money-back">
              <CirclePlus aria-hidden="true" />
              Grįžta {formatEuro(moneyBack)}
            </p>
          )}
          <button
            className="product-detail__buy"
            onClick={buyNow}
            type="button"
          >
            Pirkti
          </button>
          <button
            className="product-detail__add"
            onClick={() => addToCart(product.id)}
            type="button"
          >
            <ShoppingCart aria-hidden="true" />
            Pridėti į krepšelį
          </button>
          <p className="product-detail__test-note">
            Mokėjimas vykdomas Stripe testų aplinkoje.
          </p>
        </aside>
      </div>
    </main>
  );
}
