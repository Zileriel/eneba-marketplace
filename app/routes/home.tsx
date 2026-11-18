import type { Route } from "./+types/home";
import { Header } from "../components/layout/header";
import { HomeBannerRow } from "../components/layout/home-banner-row";
import { ProductSection } from "~/components/layout/product-section";
import { getProducts } from "~/lib/products/product-repository.client";

function loadRecommendedProducts() {
  return getProducts({
    filters: { isRecommended: true },
    sortBy: "recommendedOrder",
    limit: 5,
  });
}

function loadPopularProducts() {
  return getProducts({
    filters: { isPopular: true },
    sortBy: "popularOrder",
    limit: 15,
  });
}

function loadPopularGiftCards() {
  return getProducts({
    filters: { productTypes: ["E. Kortelės"] },
    sortBy: "name",
  });
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Eneba" },
    { name: "description", content: "Welcome to Eneba!" },
  ];
}

export default function Home() {
  return (
    <>
      <Header />
      <main className="home-content">
        <HomeBannerRow />
        <ProductSection
          title="Rekomenduojama tau"
          errorMessage="Nepavyko įkelti rekomenduojamų produktų."
          loadProducts={loadRecommendedProducts}
          loadingMessage="Įkeliami rekomenduojami produktai..."
          variant="primary"
        />
        <ProductSection
          title="Populiariausi žaidimai"
          errorMessage="Nepavyko įkelti populiariausių žaidimų."
          loadProducts={loadPopularProducts}
          loadingMessage="Įkeliami populiariausi žaidimai..."
          variant="secondary"
        />
        <ProductSection
          title="Populiariausios el. dovanų kortelės"
          errorMessage="Nepavyko įkelti populiariausių dovanų kortelių."
          loadProducts={loadPopularGiftCards}
          loadingMessage="Įkeliamos populiariausios dovanų kortelės..."
          variant="primary"
        />
      </main>
    </>
  );
}
