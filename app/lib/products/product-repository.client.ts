import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type {
  Product,
  ProductCountry,
  ProductGenre,
  ProductOperatingSystem,
  ProductPlatform,
  ProductRegion,
  ProductType,
} from "./products";
import { parseProduct } from "./products.client";

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
  | "popularOrder"
  | "recommendedOrder";

export type ProductQueryOptions = {
  filters?: ProductFilters;
  sortBy?: ProductSortField;
  sortDirection?: "asc" | "desc";
  limit?: number;
};

const queryCache = new Map<string, Promise<Product[]>>();
const productCache = new Map<string, Promise<Product | null>>();

export function getProducts(options: ProductQueryOptions = {}) {
  validateOptions(options);
  const cacheKey = createCacheKey(options);
  const cachedProducts = queryCache.get(cacheKey);

  if (cachedProducts) {
    return cachedProducts;
  }

  const request = loadProducts(options);
  queryCache.set(cacheKey, request);
  request.catch(() => {
    if (queryCache.get(cacheKey) === request) {
      queryCache.delete(cacheKey);
    }
  });
  return request;
}

export function getProductById(id: string) {
  if (id.trim() === "") {
    throw new Error("A product ID is required.");
  }

  const cachedProduct = productCache.get(id);
  if (cachedProduct) {
    return cachedProduct;
  }

  const request = loadProductById(id);
  productCache.set(id, request);
  request.catch(() => {
    if (productCache.get(id) === request) {
      productCache.delete(id);
    }
  });
  return request;
}

export function filterProducts(
  products: Product[],
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
  products: Product[],
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

async function loadProducts(options: ProductQueryOptions) {
  const filters = options.filters ?? {};
  const constraints: QueryConstraint[] = [];

  if (filters.isPopular !== undefined) {
    constraints.push(where("isPopular", "==", filters.isPopular));
  }
  if (filters.isRecommended !== undefined) {
    constraints.push(where("isRecommended", "==", filters.isRecommended));
  }

  const productsCollection = collection(db, "products");
  const snapshot =
    constraints.length > 0
      ? await getDocs(query(productsCollection, ...constraints))
      : await getDocs(productsCollection);
  let products = filterProducts(
    snapshot.docs.map((product) =>
      parseProduct(product.id, product.data()),
    ),
    filters,
  );

  if (options.sortBy) {
    products = sortProducts(
      products,
      options.sortBy,
      options.sortDirection,
    );
  }

  return options.limit === undefined
    ? products
    : products.slice(0, options.limit);
}

async function loadProductById(id: string) {
  const snapshot = await getDoc(doc(db, "products", id));
  return snapshot.exists()
    ? parseProduct(snapshot.id, snapshot.data())
    : null;
}

function createCacheKey(options: ProductQueryOptions) {
  const filters = options.filters ?? {};

  return JSON.stringify({
    filters: {
      isPopular: filters.isPopular,
      isRecommended: filters.isRecommended,
      platforms: [...(filters.platforms ?? [])].sort(),
      productTypes: [...(filters.productTypes ?? [])].sort(),
      regions: [...(filters.regions ?? [])].sort(),
      operatingSystems: [...(filters.operatingSystems ?? [])].sort(),
      genres: [...(filters.genres ?? [])].sort(),
      countries: [...(filters.countries ?? [])].sort(),
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      search: filters.search?.trim().toLocaleLowerCase(),
    },
    sortBy: options.sortBy,
    sortDirection: options.sortDirection ?? "asc",
    limit: options.limit,
  });
}

function validateOptions({ filters, limit }: ProductQueryOptions) {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error("Product query limit must be a positive integer.");
  }

  if (
    (filters?.minPrice !== undefined &&
      (!Number.isFinite(filters.minPrice) || filters.minPrice < 0)) ||
    (filters?.maxPrice !== undefined &&
      (!Number.isFinite(filters.maxPrice) || filters.maxPrice < 0)) ||
    (filters?.minPrice !== undefined &&
      filters.maxPrice !== undefined &&
      filters.minPrice > filters.maxPrice)
  ) {
    throw new Error("Product price filters are invalid.");
  }
}
