import type { Route } from "./+types/home";
import { Header } from "../components/layout/header";
import { HomeBannerRow } from "../components/layout/home-banner-row";
import { ProductSection } from "~/components/layout/product-section";
import { getProducts } from "~/lib/products/product-repository.client";
import type { ProductQueryOptions } from "~/lib/products/product-repository.client";

const RECOMMENDED_CACHE_KEY = "products:home:recommended:v1";
const POPULAR_CACHE_KEY = "products:home:popular-games:v2";
const GIFT_CARDS_CACHE_KEY = "products:home:gift-cards:v1";

const recommendedProductQuery = {
  filters: { isRecommended: true },
  sortBy: "recommendedOrder",
  limit: 5,
} satisfies ProductQueryOptions;

const popularProductQuery = {
  filters: { isPopular: true, productTypes: ["Žaidimai"] },
  sortBy: "popularOrder",
  limit: 15,
} satisfies ProductQueryOptions;

const giftCardProductQuery = {
  filters: { productTypes: ["E. Kortelės"] },
  sortBy: "name",
} satisfies ProductQueryOptions;

const recommendedStoreLink = `/products?${new URLSearchParams({
  recommended: "true",
})}`;
const popularGamesStoreLink = `/products?${new URLSearchParams({
  popular: "true",
  type: "Žaidimai",
})}`;
const giftCardsStoreLink = `/products?${new URLSearchParams({
  type: "E. Kortelės",
})}`;

function loadRecommendedProducts() {
  return getProducts(recommendedProductQuery);
}

function loadPopularProducts() {
  return getProducts(popularProductQuery);
}

function loadPopularGiftCards() {
  return getProducts(giftCardProductQuery);
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
          cacheKey={RECOMMENDED_CACHE_KEY}
          viewAllTo={recommendedStoreLink}
          errorMessage="Nepavyko įkelti rekomenduojamų produktų."
          loadProducts={loadRecommendedProducts}
          loadingMessage="Įkeliami rekomenduojami produktai..."
          variant="primary"
        />
        <ProductSection
          title="Populiariausi žaidimai"
          cacheKey={POPULAR_CACHE_KEY}
          viewAllTo={popularGamesStoreLink}
          errorMessage="Nepavyko įkelti populiariausių žaidimų."
          loadProducts={loadPopularProducts}
          loadingMessage="Įkeliami populiariausi žaidimai..."
          variant="secondary"
        />
        <ProductSection
          title="Populiariausios el. dovanų kortelės"
          cacheKey={GIFT_CARDS_CACHE_KEY}
          viewAllTo={giftCardsStoreLink}
          errorMessage="Nepavyko įkelti populiariausių dovanų kortelių."
          loadProducts={loadPopularGiftCards}
          loadingMessage="Įkeliamos populiariausios dovanų kortelės..."
          variant="primary"
        />
      </main>
    </>
  );
}
