import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { ProductCard } from "./product-card";
import { getPopularProducts } from "../lib/popular-products.client";
import type { Product } from "../lib/products";

const SLIDE_COUNT = 3;
const PRODUCTS_PER_SLIDE = 5;

export function PopularGames() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  function loadProducts() {
    setIsLoading(true);
    setError(null);
    getPopularProducts()
      .then(setProducts)
      .catch((cause: unknown) => {
        console.error("Failed to load popular games.", cause);
        setError("Nepavyko įkelti populiariausių žaidimų.");
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadProducts();
    return () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  function getSlideStep() {
    const track = trackRef.current;
    const firstCard = track?.querySelector<HTMLElement>(
      ".product-card--carousel",
    );

    if (!track || !firstCard) {
      return 0;
    }

    const gap = Number.parseFloat(getComputedStyle(track).columnGap);
    return (
      (firstCard.getBoundingClientRect().width +
        (Number.isFinite(gap) ? gap : 0)) *
      PRODUCTS_PER_SLIDE
    );
  }

  function goToSlide(slide: number) {
    const nextSlide = Math.max(0, Math.min(slide, SLIDE_COUNT - 1));
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    setCurrentSlide(nextSlide);
    viewportRef.current?.scrollTo({
      left: getSlideStep() * nextSlide,
    });
  }

  function handleScroll() {
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      scrollTimeoutRef.current = null;
      const viewport = viewportRef.current;
      const step = getSlideStep();

      if (!viewport || step === 0) {
        return;
      }

      setCurrentSlide(
        Math.max(
          0,
          Math.min(
            SLIDE_COUNT - 1,
            Math.round(viewport.scrollLeft / step),
          ),
        ),
      );
    }, 120);
  }

  return (
    <section
      aria-labelledby="popular-games-title"
      className="popular-products"
    >
      <div className="popular-products__inner">
        <h2 className="popular-products__title" id="popular-games-title">
          Populiariausi žaidimai
          <Info aria-hidden="true" />
        </h2>
        {isLoading ? (
          <p className="recommended-products__message" role="status">
            Įkeliami populiariausi žaidimai...
          </p>
        ) : error ? (
          <div className="recommended-products__message" role="alert">
            <span>{error}</span>
            <button onClick={loadProducts} type="button">
              Bandykite dar kartą
            </button>
          </div>
        ) : products ? (
          <>
            <div
              aria-label="Populiariausių žaidimų karuselė"
              aria-roledescription="karuselė"
              className="popular-products__carousel"
              role="region"
            >
              <button
                aria-label="Ankstesnė skaidrė"
                className="popular-products__arrow popular-products__arrow--previous"
                disabled={currentSlide === 0}
                onClick={() => goToSlide(currentSlide - 1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <div
                className="popular-products__viewport"
                onScroll={handleScroll}
                ref={viewportRef}
              >
                <div className="popular-products__track" ref={trackRef}>
                  {products.map((product) => (
                    <ProductCard
                      carousel
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>
              </div>
              <button
                aria-label="Kita skaidrė"
                className="popular-products__arrow popular-products__arrow--next"
                disabled={currentSlide === SLIDE_COUNT - 1}
                onClick={() => goToSlide(currentSlide + 1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
            <div
              aria-label="Skaidrės"
              className="popular-products__progress"
              data-current-slide={currentSlide}
              role="group"
            >
              {Array.from({ length: SLIDE_COUNT }, (_, index) => (
                <button
                  aria-label={`Skaidrė ${index + 1}`}
                  aria-pressed={currentSlide === index}
                  className="popular-products__progress-item"
                  key={index}
                  onClick={() => goToSlide(index)}
                  type="button"
                />
              ))}
            </div>
          </>
        ) : null}
        <button className="recommended-products__view-all" type="button">
          Peržiūrėti viską
        </button>
      </div>
    </section>
  );
}
