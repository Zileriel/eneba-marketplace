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
import type { ProductCatalogItem } from "./products";
import { parseProductCatalog } from "./product-parser";
import {
  filterProducts,
  sortProducts,
  type ProductFilters,
  type ProductQueryOptions,
} from "./product-query";
export {
  filterProducts,
  sortProducts,
  type ProductFilters,
  type ProductQueryOptions,
  type ProductSortField,
} from "./product-query";

const queryRequests = new Map<string, Promise<ProductCatalogItem[]>>();
const productRequests = new Map<string, Promise<ProductCatalogItem | null>>();

export function getProducts(options: ProductQueryOptions = {}) {
  validateOptions(options);
  const cacheKey = createCacheKey(options);
  const cachedProducts = queryRequests.get(cacheKey);

  if (cachedProducts) {
    return cachedProducts;
  }

  const request = loadProducts(options);
  queryRequests.set(cacheKey, request);
  void request.then(
    () => {
      if (queryRequests.get(cacheKey) === request) {
        queryRequests.delete(cacheKey);
      }
    },
    () => {
      if (queryRequests.get(cacheKey) === request) {
        queryRequests.delete(cacheKey);
      }
    },
  );
  return request;
}

export function getProductById(id: string) {
  if (id.trim() === "") {
    throw new Error("A product ID is required.");
  }

  const cachedProduct = productRequests.get(id);

  if (cachedProduct) {
    return cachedProduct;
  }

  const request = loadProductById(id);
  productRequests.set(id, request);
  void request.then(
    () => {
      if (productRequests.get(id) === request) {
        productRequests.delete(id);
      }
    },
    () => {
      if (productRequests.get(id) === request) {
        productRequests.delete(id);
      }
    },
  );
  return request;
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
      parseProductCatalog(product.id, product.data()),
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
    ? parseProductCatalog(snapshot.id, snapshot.data())
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

export function getProductCacheKey(id: string) {
  if (id.trim() === "") {
    throw new Error("A product ID is required.");
  }

  return `product:${id}`;
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
