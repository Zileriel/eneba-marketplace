import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { ProductCard } from "./product-card";
import { getRecommendedProducts } from "../lib/products/recommended-products.client";
import type { Product } from "../lib/products/products";

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
      <h2
        className="recommended-products__title"
        id="recommended-products-title"
      >
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
