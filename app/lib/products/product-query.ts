import type {
  ProductCatalogItem,
  ProductCountry,
  ProductGenre,
  ProductOperatingSystem,
  ProductPlatform,
  ProductRegion,
  ProductType,
} from "./products";

export type ProductFilters = {
  isPopular?: boolean;
  isRecommended?: boolean;
  platforms?: ProductPlatform[];
  productTypes?: ProductType[];
  regions?: ProductRegion[];
  operatingSystems?: ProductOperatingSystem[];
  genres?: ProductGenre[];
  countries?: ProductCountry[];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
};

export type ProductSortField =
  | "name"
  | "price"
  | "moneyBackPercent"
  | "popularity"
  | "popularOrder"
  | "recommendedOrder";

export type ProductQueryOptions = {
  filters?: ProductFilters;
  sortBy?: ProductSortField;
  sortDirection?: "asc" | "desc";
  limit?: number;
};

export function filterProducts(
  products: ProductCatalogItem[],
  filters: ProductFilters = {},
) {
  const search = filters.search?.trim().toLocaleLowerCase();

  return products.filter(
    (product) =>
      (filters.isPopular === undefined ||
        product.isPopular === filters.isPopular) &&
      (filters.isRecommended === undefined ||
        product.isRecommended === filters.isRecommended) &&
      (!filters.platforms ||
        filters.platforms.length === 0 ||
        filters.platforms.includes(product.platform)) &&
      (!filters.productTypes ||
        filters.productTypes.length === 0 ||
        filters.productTypes.includes(product.productType)) &&
      (!filters.regions ||
        filters.regions.length === 0 ||
        product.regions.some((region) => filters.regions?.includes(region))) &&
      (!filters.operatingSystems ||
        filters.operatingSystems.length === 0 ||
        product.operatingSystems.some((system) =>
          filters.operatingSystems?.includes(system),
        )) &&
      (!filters.genres ||
        filters.genres.length === 0 ||
        product.genres.some((genre) => filters.genres?.includes(genre))) &&
      (!filters.countries ||
        filters.countries.length === 0 ||
        filters.countries.includes(product.country)) &&
      (filters.minPrice === undefined || product.price >= filters.minPrice) &&
      (filters.maxPrice === undefined || product.price <= filters.maxPrice) &&
      (!search ||
        product.name.toLocaleLowerCase().includes(search) ||
        product.platform.toLocaleLowerCase().includes(search)),
  );
}

export function sortProducts(
  products: ProductCatalogItem[],
  sortBy: ProductSortField,
  direction: "asc" | "desc" = "asc",
) {
  return [...products].sort((left, right) => {
    let comparison: number;
    switch (sortBy) {
      case "name":
        comparison = left.name.localeCompare(right.name);
        break;
      case "price":
        comparison = left.price - right.price;
        break;
      case "moneyBackPercent":
        comparison = left.moneyBackPercent - right.moneyBackPercent;
        break;
      case "popularity":
        comparison =
          left.isPopular === right.isPopular
            ? (left.popularOrder ?? Number.MAX_SAFE_INTEGER) -
              (right.popularOrder ?? Number.MAX_SAFE_INTEGER)
            : left.isPopular
              ? -1
              : 1;
        break;
      case "popularOrder":
        comparison = (left.popularOrder ?? 0) - (right.popularOrder ?? 0);
        break;
      case "recommendedOrder":
        comparison =
          (left.recommendedOrder ?? 0) - (right.recommendedOrder ?? 0);
        break;
    }

    return comparison === 0
      ? left.id.localeCompare(right.id)
      : direction === "asc"
        ? comparison
        : -comparison;
  });
}
