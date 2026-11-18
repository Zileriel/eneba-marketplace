import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { ProductCard } from "./product-card";
import type { Product } from "../../lib/products/products";

const PRODUCTS_PER_SLIDE = 5;
const MOBILE_PRODUCT_LIMIT = 10;

type ProductSectionProps = {
  title: string;
  loadProducts: () => Promise<Product[]>;
  loadingMessage?: string;
  errorMessage?: string;
  variant: "primary" | "secondary";
};

export function ProductSection({
  title,
  loadProducts: fetchProducts,
  loadingMessage = "Įkeliami produktai...",
  errorMessage = "Nepavyko įkelti produktų.",
  variant,
}: ProductSectionProps) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [slideOffsets, setSlideOffsets] = useState<number[]>([0]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sectionTitleId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  const retryLoadingProducts = useCallback(() => {
    setIsLoading(true);
    setError(null);
    void fetchProducts()
      .then(setProducts)
      .catch((cause: unknown) => {
        console.error(`Failed to load products for "${title}".`, cause);
        setError(errorMessage);
      })
      .finally(() => setIsLoading(false));
  }, [errorMessage, fetchProducts, title]);

  useEffect(() => {
    retryLoadingProducts();
  }, [retryLoadingProducts]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 740px)");
    const updateIsMobile = () => setIsMobile(mobileQuery.matches);
    updateIsMobile();
    mobileQuery.addEventListener("change", updateIsMobile);
    window.addEventListener("resize", updateIsMobile);

    return () => {
      mobileQuery.removeEventListener("change", updateIsMobile);
      window.removeEventListener("resize", updateIsMobile);
    };
  }, []);

  useEffect(
    () => () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    },
    [],
  );

  const visibleProducts =
    products && isMobile ? products.slice(0, MOBILE_PRODUCT_LIMIT) : products;
  const isCarousel =
    !isMobile && visibleProducts !== null && visibleProducts.length > 5;

  const getSlideOffsets = useCallback((itemCount: number) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const firstCard = track?.querySelector<HTMLElement>(
      ".product-card--carousel",
    );

    if (!viewport || !track || !firstCard) {
      return [0];
    }

    const gap = Number.parseFloat(getComputedStyle(track).columnGap);
    const step =
      (firstCard.getBoundingClientRect().width +
        (Number.isFinite(gap) ? gap : 0)) *
      PRODUCTS_PER_SLIDE;
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);

    if (step === 0 || maxScroll === 0) {
      return [0];
    }

    const slideCount = Math.max(
      Math.ceil(itemCount / PRODUCTS_PER_SLIDE),
      Math.ceil(maxScroll / step) + 1,
    );
    return Array.from({ length: slideCount }, (_, index) =>
      Math.min(index * step, maxScroll),
    );
  }, []);

  useEffect(() => {
    if (!isCarousel) {
      setSlideOffsets([0]);
      setCurrentSlide(0);
      return;
    }

    const updateSlideOffsets = () => {
      const offsets = getSlideOffsets(visibleProducts.length);
      setSlideOffsets(offsets);
      const scrollLeft = viewportRef.current?.scrollLeft ?? 0;
      const nearestSlide = offsets.reduce(
        (nearest, offset, index) =>
          Math.abs(offset - scrollLeft) <
          Math.abs(offsets[nearest] - scrollLeft)
            ? index
            : nearest,
        0,
      );
      setCurrentSlide(nearestSlide);
    };

    updateSlideOffsets();
    const resizeObserver = new ResizeObserver(updateSlideOffsets);
    if (viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }
    if (trackRef.current) {
      resizeObserver.observe(trackRef.current);
    }
    window.addEventListener("resize", updateSlideOffsets);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSlideOffsets);
    };
  }, [getSlideOffsets, isCarousel, visibleProducts?.length]);

  function goToSlide(slide: number) {
    const offsets = getSlideOffsets(visibleProducts?.length ?? 0);
    const nextSlide = Math.max(0, Math.min(slide, offsets.length - 1));
    setSlideOffsets(offsets);
    setCurrentSlide(nextSlide);
    viewportRef.current?.scrollTo({ left: offsets[nextSlide] });
  }

  function handleScroll() {
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      scrollTimeoutRef.current = null;
      const viewport = viewportRef.current;
      const offsets = getSlideOffsets(visibleProducts?.length ?? 0);

      if (!viewport) {
        return;
      }

      const nearestSlide = offsets.reduce(
        (nearest, offset, index) =>
          Math.abs(offset - viewport.scrollLeft) <
          Math.abs(offsets[nearest] - viewport.scrollLeft)
            ? index
            : nearest,
        0,
      );
      setCurrentSlide(nearestSlide);
    }, 120);
  }

  return (
    <section
      aria-labelledby={sectionTitleId}
      className={`product-section product-section--${variant}`}
    >
      <div className="product-section__inner">
        <h2 className="product-section__title" id={sectionTitleId}>
          {title}
          <Info aria-hidden="true" />
        </h2>
        {isLoading ? (
          <p className="product-section__message" role="status">
            {loadingMessage}
          </p>
        ) : error ? (
          <div className="product-section__message" role="alert">
            <span>{error}</span>
            <button onClick={retryLoadingProducts} type="button">
              Bandykite dar kartą
            </button>
          </div>
        ) : visibleProducts ? (
          isCarousel ? (
            <>
              <div
                aria-label={`${title} karuselė`}
                aria-roledescription="karuselė"
                className="product-section__carousel"
                role="region"
              >
                <button
                  aria-label="Ankstesnė skaidrė"
                  className="product-section__arrow product-section__arrow--previous"
                  disabled={currentSlide === 0}
                  onClick={() => goToSlide(currentSlide - 1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <div
                  className="product-section__viewport"
                  onScroll={handleScroll}
                  ref={viewportRef}
                >
                  <div className="product-section__track" ref={trackRef}>
                    {visibleProducts.map((product) => (
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
                  className="product-section__arrow product-section__arrow--next"
                  disabled={currentSlide === slideOffsets.length - 1}
                  onClick={() => goToSlide(currentSlide + 1)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
              <div
                aria-label="Skaidrės"
                className="product-section__progress"
                role="group"
              >
                <span
                  aria-hidden="true"
                  className="product-section__progress-indicator"
                  style={{
                    width: `${100 / slideOffsets.length}%`,
                    transform: `translateX(${currentSlide * 100}%)`,
                  }}
                />
                {slideOffsets.map((_, index) => (
                  <button
                    aria-label={`Skaidrė ${index + 1}`}
                    aria-pressed={currentSlide === index}
                    className="product-section__progress-item"
                    key={index}
                    onClick={() => goToSlide(index)}
                    type="button"
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="product-section__grid">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )
        ) : null}
        <button className="product-section__view-all" type="button">
          Peržiūrėti viską
        </button>
      </div>
    </section>
  );
}
