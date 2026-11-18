import { ProductSection } from "./product-section";
import { getRecommendedProducts } from "../lib/products/recommended-products.client";

export function RecommendedProducts() {
  return (
    <ProductSection
      errorMessage="Nepavyko įkelti rekomenduojamų produktų."
      loadProducts={getRecommendedProducts}
      loadingMessage="Įkeliami rekomenduojami produktai..."
      title="Rekomenduojama tau"
      variant="primary"
    />
  );
}
