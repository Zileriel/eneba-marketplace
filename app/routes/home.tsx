import type { Route } from "./+types/home";
import { Header } from "../components/layout/header";
import { HomeBannerRow } from "../components/layout/home-banner-row";
import { ProductSection } from "~/components/layout/product-section";
import { getRecommendedProducts } from "~/lib/products/recommended-products.client";
import { getPopularProducts } from "~/lib/products/popular-products.client";

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
          loadProducts={getRecommendedProducts}
          loadingMessage="Įkeliami rekomenduojami produktai..."
          variant="primary"
        />
        <ProductSection
          title="Populiariausi žaidimai"
          errorMessage="Nepavyko įkelti populiariausių žaidimų."
          loadProducts={getPopularProducts}
          loadingMessage="Įkeliami populiariausi žaidimai..."
          variant="secondary"
        />
      </main>
    </>
  );
}
