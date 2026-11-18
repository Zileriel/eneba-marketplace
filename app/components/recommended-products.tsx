import { useEffect, useState } from "react";
import { CirclePlus, Gamepad2, Info, ShoppingCart } from "lucide-react";
import { getRecommendedProducts } from "../lib/recommended-products.client";
import type { Product } from "../lib/products";

const formatEuro = new Intl.NumberFormat("lt-LT", {
  style: "currency",
  currency: "EUR",
});

export function RecommendedProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadProducts() {
    setIsLoading(true);
    setError(null);
    getRecommendedProducts()
      .then(setProducts)
      .catch((cause: unknown) => {
        console.error("Failed to load recommended products.", cause);
        setError("Nepavyko įkelti rekomenduojamų produktų.");
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <section
      aria-labelledby="recommended-products-title"
      className="recommended-products"
    >
      <h2 className="recommended-products__title" id="recommended-products-title">
        Rekomenduojama tau
        <Info aria-hidden="true" />
      </h2>
      {isLoading ? (
        <p className="recommended-products__message" role="status">
          Įkeliami rekomenduojami produktai...
        </p>
      ) : error ? (
        <div className="recommended-products__message" role="alert">
          <span>{error}</span>
          <button onClick={loadProducts} type="button">
            Bandykite dar kartą
          </button>
        </div>
      ) : products ? (
        <div className="recommended-products__grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
      <button className="recommended-products__view-all" type="button">
        Peržiūrėti viską
      </button>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const moneyBack = (product.price * product.moneyBackPercent) / 100;
  const region = product.regions[0];
  const regionStyle =
    region === "Europa" ? "europe" : region === "JAV" ? "usa" : "global";
  const platformLabel =
    product.platform === "PlayStation Network" ? "PSN" : product.platform;

  return (
    <article className="product-card">
      <div className="product-card__cover">
        <img alt={product.name} src={product.coverImage} />
        <span className="product-card__cashback-badge">
          <CirclePlus aria-hidden="true" />
          <span>GRĮŽTA</span>
        </span>
        <div className="product-card__platform">
          <Gamepad2 aria-hidden="true" />
          <span>{platformLabel}</span>
        </div>
      </div>
      <div className="product-card__body">
        <div className="product-card__details">
          <h3>{product.name}</h3>
          <p className={`product-card__region product-card__region--${regionStyle}`}>
            {region.toLocaleUpperCase("lt-LT")}
          </p>
          <p className="product-card__from">Nuo</p>
          <p className="product-card__price">
            {formatEuro.format(product.price)}
            <Info aria-hidden="true" />
          </p>
          <p className="product-card__money-back">
            grįžta: {formatEuro.format(moneyBack)}
          </p>
        </div>
        <button
          aria-label="Pridėti į krepšelį"
          className="product-card__add-button"
          type="button"
        >
          <ShoppingCart aria-hidden="true" />
          <span className="product-card__add-label">Pridėti į krepšelį</span>
        </button>
      </div>
    </article>
  );
}
