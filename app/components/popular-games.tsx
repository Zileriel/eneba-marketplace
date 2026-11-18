import { ProductSection } from "./product-section";
import { getPopularProducts } from "../lib/products/popular-products.client";

export function PopularGames() {
  return (
    <ProductSection
      errorMessage="Nepavyko įkelti populiariausių žaidimų."
      loadProducts={getPopularProducts}
      loadingMessage="Įkeliami populiariausi žaidimai..."
      title="Populiariausi žaidimai"
      variant="secondary"
    />
  );
}
