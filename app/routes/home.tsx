import type { Route } from "./+types/home";
import { Header } from "../components/header";
import { HomeBannerRow } from "../components/home-banner-row";
import { RecommendedProducts } from "../components/recommended-products";

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
        <RecommendedProducts />
      </main>
    </>
  );
}
