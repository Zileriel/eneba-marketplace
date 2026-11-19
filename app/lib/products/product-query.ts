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

export function searchProducts(
  products: ProductCatalogItem[],
  searchText: string,
) {
  const query = normalizeSearchText(searchText);
  if (!query) return [];

  return products
    .map((product, index) => ({
      product,
      index,
      score: getProductSearchScore(product, query),
    }))
    .filter(
      (
        result,
      ): result is {
        product: ProductCatalogItem;
        index: number;
        score: number;
      } => result.score !== null,
    )
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ product }) => product);
}

export function matchesSearchText(value: string, searchText: string) {
  const query = normalizeSearchText(searchText);
  return query !== "" && getTextSearchScore(value, query) !== null;
}

export function filterProducts(
  products: ProductCatalogItem[],
  filters: ProductFilters = {},
) {
  const search = filters.search?.trim();

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
      (!search || getProductSearchScore(product, search) !== null),
  );
}

function getProductSearchScore(
  product: ProductCatalogItem,
  searchText: string,
) {
  return getTextSearchScore(
    `${product.name} ${product.platform} ${product.productType}`,
    searchText,
  );
}

function getTextSearchScore(value: string, searchText: string) {
  const text = normalizeSearchText(value);
  const query = normalizeSearchText(searchText);
  if (!query) return null;
  if (text.includes(query)) return 0;

  const textWords = text.split(" ").filter(Boolean);
  const queryWords = query.split(" ").filter(Boolean);
  let score = 0;

  for (const queryWord of queryWords) {
    let bestScore = Number.POSITIVE_INFINITY;
    for (const textWord of textWords) {
      if (textWord.includes(queryWord)) {
        bestScore = 0;
        break;
      }

      if (queryWord.length < 3) continue;

      const distance = getEditDistance(queryWord, textWord);
      const maxDistance = Math.min(
        2,
        Math.max(1, Math.floor(queryWord.length / 4)),
      );
      if (distance <= maxDistance) {
        bestScore = Math.min(bestScore, distance + 1);
      }
    }

    if (!Number.isFinite(bestScore)) return null;
    score += bestScore;
  }

  return score;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("lt-LT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getEditDistance(left: string, right: string) {
  if (left === right) return 0;

  if (left.length === right.length) {
    const mismatches: number[] = [];
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) mismatches.push(index);
    }

    if (
      mismatches.length === 2 &&
      mismatches[1] === mismatches[0] + 1 &&
      left[mismatches[0]] === right[mismatches[1]] &&
      left[mismatches[1]] === right[mismatches[0]]
    ) {
      return 1;
    }
  }

  let previousRow = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const currentRow = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      currentRow.push(
        Math.min(
          currentRow[rightIndex] + 1,
          previousRow[rightIndex + 1] + 1,
          previousRow[rightIndex] +
            (left[leftIndex] === right[rightIndex] ? 0 : 1),
        ),
      );
    }
    previousRow = currentRow;
  }

  return previousRow[right.length];
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
