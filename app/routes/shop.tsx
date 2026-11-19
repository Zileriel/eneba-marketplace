import { useEffect, useId, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/shop";
import { Header } from "../components/layout/header";
import {
  ProductCard,
  ProductCardSkeleton,
} from "../components/layout/product-card";
import {
  getProducts,
} from "../lib/products/product-repository.client";
import {
  filterProducts,
  sortProducts,
  type ProductSortField,
} from "../lib/products/product-query";
import {
  PRODUCT_COUNTRIES,
  PRODUCT_GENRES,
  PRODUCT_OPERATING_SYSTEMS,
  PRODUCT_PLATFORMS,
  PRODUCT_REGIONS,
  PRODUCT_TYPES,
  type ProductCatalogItem,
  type ProductCountry,
  type ProductGenre,
  type ProductOperatingSystem,
  type ProductPlatform,
  type ProductRegion,
  type ProductType,
} from "../lib/products/products";
import { useStaleWhileRevalidate } from "../lib/cache/swr";

const SHOP_CACHE_KEY = "products:shop:all:v1";
const PAGE_SIZE = 20;

type SortOption =
  | "price-asc"
  | "price-desc"
  | "popular"
  | "name-asc"
  | "name-desc";

type FilterOption<T extends string> = {
  value: T;
  count: number;
};

function loadShopProducts() {
  return getProducts();
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Visi produktai | Eneba" },
    {
      name: "description",
      content: "Naršykite žaidimus, dovanų korteles ir kitus produktus.",
    },
  ];
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data: products,
    isLoading,
    error,
    retry,
  } = useStaleWhileRevalidate(SHOP_CACHE_KEY, loadShopProducts);
  const [sortOption, setSortOption] = useState<SortOption>("popular");
  const [country, setCountry] = useState<ProductCountry | "">("");
  const productTypes = useMemo(
    () => searchParams.getAll("type").filter(isProductType),
    [searchParams],
  );
  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const isPopular = searchParams.get("popular") === "true";
  const isRecommended = searchParams.get("recommended") === "true";
  const [operatingSystems, setOperatingSystems] = useState<
    ProductOperatingSystem[]
  >([]);
  const [platforms, setPlatforms] = useState<ProductPlatform[]>([]);
  const [genres, setGenres] = useState<ProductGenre[]>([]);
  const [regions, setRegions] = useState<ProductRegion[]>([]);
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [areMobileFiltersOpen, setAreMobileFiltersOpen] = useState(false);

  const catalog = products ?? [];
  const parsedMinimumPrice = parsePrice(minimumPrice);
  const parsedMaximumPrice = parsePrice(maximumPrice);
  const isPriceRangeInvalid =
    parsedMinimumPrice !== undefined &&
    parsedMaximumPrice !== undefined &&
    parsedMinimumPrice > parsedMaximumPrice;
  const filteredProducts = useMemo(
    () =>
      filterProducts(catalog, {
        isPopular: isPopular ? true : undefined,
        isRecommended: isRecommended ? true : undefined,
        search: searchQuery || undefined,
        countries: country ? [country] : undefined,
        productTypes,
        operatingSystems,
        platforms,
        genres:
          productTypes.length === 0 || productTypes.includes("Žaidimai")
            ? genres
            : [],
        regions,
        minPrice: isPriceRangeInvalid ? undefined : parsedMinimumPrice,
        maxPrice: isPriceRangeInvalid ? undefined : parsedMaximumPrice,
      }),
    [
      catalog,
      country,
      genres,
      isPopular,
      isRecommended,
      isPriceRangeInvalid,
      operatingSystems,
      parsedMaximumPrice,
      parsedMinimumPrice,
      platforms,
      productTypes,
      regions,
      searchQuery,
    ],
  );
  const sortedProducts = useMemo(
    () => sortShopProducts(filteredProducts, sortOption),
    [filteredProducts, sortOption],
  );
  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE);
  const pageProducts = sortedProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const countryOptions = createFilterOptions(
    PRODUCT_COUNTRIES,
    catalog,
    (product) => [product.country],
  );
  const productTypeOptions = createFilterOptions(
    PRODUCT_TYPES,
    catalog,
    (product) => [product.productType],
  );
  const operatingSystemOptions = createFilterOptions(
    PRODUCT_OPERATING_SYSTEMS,
    catalog,
    (product) => product.operatingSystems,
  );
  const platformOptions = createFilterOptions(
    PRODUCT_PLATFORMS,
    catalog,
    (product) => [product.platform],
  );
  const genreOptions = createFilterOptions(PRODUCT_GENRES, catalog, (product) =>
    product.genres,
  );
  const regionOptions = createFilterOptions(PRODUCT_REGIONS, catalog, (product) =>
    product.regions,
  );
  const activeFilters: { label: string; clear: () => void }[] = [];
  if (searchQuery) {
    activeFilters.push({
      label: `Paieška: ${searchQuery}`,
      clear: () => updateSearchQuery(""),
    });
  }
  if (isPopular) {
    activeFilters.push({
      label: "Populiariausi",
      clear: () => updateQueryFlag("popular", false),
    });
  }
  if (isRecommended) {
    activeFilters.push({
      label: "Rekomenduojama",
      clear: () => updateQueryFlag("recommended", false),
    });
  }
  if (country) {
    activeFilters.push({ label: country, clear: () => setCountry("") });
  }
  productTypes.forEach((value) =>
    activeFilters.push({
      label: value,
      clear: () =>
        updateProductTypes(productTypes.filter((item) => item !== value)),
    }),
  );
  operatingSystems.forEach((value) =>
    activeFilters.push({
      label: value,
      clear: () =>
        setOperatingSystems((selected) =>
          selected.filter((item) => item !== value),
        ),
    }),
  );
  platforms.forEach((value) =>
    activeFilters.push({
      label: value,
      clear: () =>
        setPlatforms((selected) => selected.filter((item) => item !== value)),
    }),
  );
  genres.forEach((value) =>
    activeFilters.push({
      label: value,
      clear: () => setGenres((selected) => selected.filter((item) => item !== value)),
    }),
  );
  regions.forEach((value) =>
    activeFilters.push({
      label: value,
      clear: () =>
        setRegions((selected) => selected.filter((item) => item !== value)),
    }),
  );
  if (minimumPrice || maximumPrice) {
    activeFilters.push({
      label: `${minimumPrice || "0"} € – ${maximumPrice || "∞"} €`,
      clear: () => {
        setMinimumPrice("");
        setMaximumPrice("");
      },
    });
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [
    country,
    genres,
    maximumPrice,
    minimumPrice,
    operatingSystems,
    platforms,
    productTypes,
    regions,
    searchQuery,
    sortOption,
  ]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(1, totalPages)));
  }, [totalPages]);

  function clearFilters() {
    setCountry("");
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("popular");
        next.delete("recommended");
        next.delete("type");
        next.delete("q");
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
    setOperatingSystems([]);
    setPlatforms([]);
    setGenres([]);
    setRegions([]);
    setMinimumPrice("");
    setMaximumPrice("");
    setCurrentPage(1);
  }

  function updateQueryFlag(name: "popular" | "recommended", enabled: boolean) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (enabled) {
          next.set(name, "true");
        } else {
          next.delete(name);
        }
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }

  function updateSearchQuery(query: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (query) {
          next.set("q", query);
        } else {
          next.delete("q");
        }
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }

  function updateProductTypes(nextTypes: ProductType[]) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("type");
        nextTypes.forEach((type) => next.append("type", type));
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
    if (!nextTypes.includes("Žaidimai")) setGenres([]);
  }

  function toggleValue<T extends string>(
    selected: T[],
    value: T,
    update: (next: T[]) => void,
  ) {
    update(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  const showGenres =
    productTypes.length === 0 || productTypes.includes("Žaidimai");
  const hasActiveFilters =
    Boolean(searchQuery) ||
    isPopular ||
    isRecommended ||
    Boolean(country) ||
    productTypes.length > 0 ||
    operatingSystems.length > 0 ||
    platforms.length > 0 ||
    genres.length > 0 ||
    regions.length > 0 ||
    minimumPrice !== "" ||
    maximumPrice !== "";

  return (
    <>
      <Header />
      <main className="shop-page">
        <div className="shop-page__inner">
          <nav aria-label="Kelias" className="shop-page__breadcrumb">
            <Link to="/">Pradžia</Link>
            <span aria-hidden="true">›</span>
            <span>Parduotuvė</span>
          </nav>
          <h1 className="shop-page__title">Visi produktai</h1>

          <button
            aria-expanded={areMobileFiltersOpen}
            className="shop-page__filter-toggle"
            onClick={() => setAreMobileFiltersOpen((open) => !open)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" />
            Filtrai
            {areMobileFiltersOpen ? (
              <ChevronUp aria-hidden="true" />
            ) : (
              <ChevronDown aria-hidden="true" />
            )}
          </button>

          <div className="shop-page__layout">
            <aside
              aria-label="Produktų filtrai"
              className={`shop-page__filters${areMobileFiltersOpen ? " shop-page__filters--mobile-open" : ""}`}
            >
              <section className="shop-filter-group">
                <h2 className="shop-filter-group__heading">Kainos intervalas (EUR)</h2>
                <div className="shop-filter-group__price">
                  <label>
                    <span className="shop-page__visually-hidden">Minimali kaina</span>
                    <input
                      aria-invalid={isPriceRangeInvalid}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => setMinimumPrice(event.currentTarget.value)}
                      placeholder="Nuo"
                      step="0.01"
                      type="number"
                      value={minimumPrice}
                    />
                  </label>
                  <span aria-hidden="true">–</span>
                  <label>
                    <span className="shop-page__visually-hidden">Maksimali kaina</span>
                    <input
                      aria-invalid={isPriceRangeInvalid}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => setMaximumPrice(event.currentTarget.value)}
                      placeholder="Iki"
                      step="0.01"
                      type="number"
                      value={maximumPrice}
                    />
                  </label>
                </div>
                {isPriceRangeInvalid && (
                  <p className="shop-filter-group__error" role="alert">
                    Minimali kaina negali viršyti maksimalios.
                  </p>
                )}
              </section>

              <section className="shop-filter-group">
                <h2 className="shop-filter-group__heading">Šalis</h2>
                <label className="shop-filter-group__select">
                  <span className="shop-page__visually-hidden">Pasirinkti šalį</span>
                  <select
                    onChange={(event) =>
                      setCountry(event.currentTarget.value as ProductCountry | "")
                    }
                    value={country}
                  >
                    <option value="">Visos šalys</option>
                    {countryOptions.map(({ value, count }) => (
                      <option key={value} value={value}>
                        {value} ({count})
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <FilterGroup
                onToggle={(value) => {
                  const next = productTypes.includes(value)
                    ? productTypes.filter((item) => item !== value)
                    : [...productTypes, value];
                  updateProductTypes(next);
                }}
                options={productTypeOptions}
                selectedValues={productTypes}
                title="Produkto tipas"
              />
              <FilterGroup
                onToggle={(value) =>
                  toggleValue(operatingSystems, value, setOperatingSystems)
                }
                options={operatingSystemOptions}
                selectedValues={operatingSystems}
                title="Operacinė sistema"
              />
              <FilterGroup
                onToggle={(value) => toggleValue(platforms, value, setPlatforms)}
                options={platformOptions}
                selectedValues={platforms}
                title="Platformos"
              />
              {showGenres && (
                <FilterGroup
                  onToggle={(value) => toggleValue(genres, value, setGenres)}
                  options={genreOptions}
                  selectedValues={genres}
                  title="Žanrai"
                />
              )}
              <FilterGroup
                onToggle={(value) => toggleValue(regions, value, setRegions)}
                options={regionOptions}
                selectedValues={regions}
                title="Regionai"
              />
              {hasActiveFilters && (
                <button
                  className="shop-page__clear-filters"
                  onClick={clearFilters}
                  type="button"
                >
                  Išvalyti viską
                </button>
              )}
            </aside>

            <section
              aria-label="Produktų sąrašas"
              className="shop-page__results"
            >
              <div className="shop-page__toolbar">
                <p aria-live="polite" className="shop-page__result-count">
                  Paieškos rezultatai: <strong>{sortedProducts.length}</strong>
                </p>
                <label className="shop-page__sort">
                  <span>Rikiuoti pagal</span>
                  <select
                    onChange={(event) =>
                      setSortOption(event.currentTarget.value as SortOption)
                    }
                    value={sortOption}
                  >
                    <option value="price-asc">Kaina: nuo mažiausios</option>
                    <option value="price-desc">Kaina: nuo didžiausios</option>
                    <option value="popular">Nuo populiariausių</option>
                    <option value="name-asc">Abėcėlė: A-Z</option>
                    <option value="name-desc">Abėcėlė: Z-A</option>
                  </select>
                </label>
              </div>
              {activeFilters.length > 0 && (
                <div className="shop-page__active-filters">
                  {activeFilters.map(({ label, clear }) => (
                    <button
                      aria-label={`Pašalinti filtrą: ${label}`}
                      className="shop-page__filter-chip"
                      key={label}
                      onClick={clear}
                      type="button"
                    >
                      {label}
                      <X aria-hidden="true" />
                    </button>
                  ))}
                  <button
                    className="shop-page__clear-filters"
                    onClick={clearFilters}
                    type="button"
                  >
                    Išvalyti viską
                  </button>
                </div>
              )}

              {isLoading ? (
                <div
                  aria-label="Įkeliami produktai"
                  className="shop-page__skeleton-grid"
                  role="status"
                >
                  {Array.from({ length: 8 }, (_, index) => (
                    <ProductCardSkeleton key={index} />
                  ))}
                </div>
              ) : error && products === undefined ? (
                <div className="shop-page__message" role="alert">
                  <p>Nepavyko įkelti produktų.</p>
                  <button onClick={retry} type="button">
                    Bandykite dar kartą
                  </button>
                </div>
              ) : sortedProducts.length === 0 ? (
                <p className="shop-page__message">Produktų pagal pasirinktus filtrus nerasta.</p>
              ) : (
                <div className="shop-page__product-grid">
                  {pageProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

              {!isLoading && !error && totalPages > 1 && (
                <nav aria-label="Puslapiavimas" className="shop-pagination">
                  <button
                    aria-label="Ankstesnis puslapis"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                    (page) => (
                      <button
                        aria-current={currentPage === page ? "page" : undefined}
                        className={
                          currentPage === page
                            ? "shop-pagination__page shop-pagination__page--active"
                            : "shop-pagination__page"
                        }
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        type="button"
                      >
                        {page}
                      </button>
                    ),
                  )}
                  <button
                    aria-label="Kitas puslapis"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </nav>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function FilterGroup<T extends string>({
  title,
  options,
  selectedValues,
  onToggle,
}: {
  title: string;
  options: FilterOption<T>[];
  selectedValues: T[];
  onToggle: (value: T) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [search, setSearch] = useState("");
  const optionsId = useId();
  const matchingOptions = options.filter(({ value }) =>
    value.toLocaleLowerCase("lt-LT").includes(search.trim().toLocaleLowerCase("lt-LT")),
  );
  const visibleOptions = showAllOptions
    ? matchingOptions
    : matchingOptions.slice(0, 8);
  const hiddenOptionCount = matchingOptions.length - visibleOptions.length;

  return (
    <section className="shop-filter-group">
      <button
        aria-expanded={isExpanded}
        className="shop-filter-group__toggle"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        type="button"
      >
        <span>
          {title}
          {selectedValues.length > 0 && (
            <span className="shop-filter-group__selected-count">
              {selectedValues.length}
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp aria-hidden="true" />
        ) : (
          <ChevronDown aria-hidden="true" />
        )}
      </button>
      {isExpanded && (
        <>
          {options.length > 5 && (
            <label className="shop-filter-group__search">
              <span className="shop-page__visually-hidden">
                Ieškoti: {title}
              </span>
              <input
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Ieškoti..."
                value={search}
              />
              <Search aria-hidden="true" />
            </label>
          )}
          <ul className="shop-filter-group__options" id={optionsId}>
            {visibleOptions.map(({ value, count }) => (
              <li key={value}>
                <label>
                  <input
                    checked={selectedValues.includes(value)}
                    onChange={() => onToggle(value)}
                    type="checkbox"
                  />
                  <span>{value}</span>
                  <span className="shop-filter-group__count">{count}</span>
                </label>
              </li>
            ))}
            {visibleOptions.length === 0 && (
              <li className="shop-filter-group__empty">Nieko nerasta.</li>
            )}
          </ul>
          {matchingOptions.length > 8 && (
            <button
              aria-controls={optionsId}
              aria-expanded={showAllOptions}
              className="shop-filter-group__show-more"
              onClick={() => setShowAllOptions((showingAll) => !showingAll)}
              type="button"
            >
              {showAllOptions ? "Rodyti mažiau" : `${hiddenOptionCount} daugiau`}
              {showAllOptions ? (
                <ChevronUp aria-hidden="true" />
              ) : (
                <ChevronDown aria-hidden="true" />
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function createFilterOptions<T extends string>(
  values: readonly T[],
  products: ProductCatalogItem[],
  getValues: (product: ProductCatalogItem) => readonly T[],
): FilterOption<T>[] {
  return values.flatMap((value) => {
    const count = products.filter((product) =>
      getValues(product).includes(value),
    ).length;
    return count > 0 ? [{ value, count }] : [];
  });
}

function sortShopProducts(
  products: ProductCatalogItem[],
  option: SortOption,
) {
  const sortBy: ProductSortField =
    option === "price-asc" || option === "price-desc"
      ? "price"
      : option === "name-asc" || option === "name-desc"
        ? "name"
        : "popularity";
  const direction =
    option === "price-desc" || option === "name-desc" ? "desc" : "asc";

  return sortProducts(products, sortBy, direction);
}

function parsePrice(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function isProductType(value: string): value is ProductType {
  return PRODUCT_TYPES.some((productType) => productType === value);
}
