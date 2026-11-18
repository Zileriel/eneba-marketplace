import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  PRODUCT_COUNTRIES,
  PRODUCT_GENRES,
  PRODUCT_OPERATING_SYSTEMS,
  PRODUCT_PLATFORMS,
  PRODUCT_REGIONS,
  PRODUCT_TYPES,
  type Product,
} from "./products";

let recommendedProductsCache: Promise<Product[]> | null = null;

export function getRecommendedProducts() {
  if (!recommendedProductsCache) {
    const request = loadRecommendedProducts();
    recommendedProductsCache = request;
    request.catch(() => {
      if (recommendedProductsCache === request) {
        recommendedProductsCache = null;
      }
    });
  }

  return recommendedProductsCache;
}

async function loadRecommendedProducts(): Promise<Product[]> {
  const recommendedQuery = query(
    collection(db, "products"),
    where("isRecommended", "==", true),
    limit(5),
  );
  const snapshot = await getDocs(recommendedQuery);

  if (snapshot.size !== 5) {
    throw new Error(
      `Expected 5 recommended products, received ${snapshot.size}.`,
    );
  }

  return snapshot.docs
    .map((document) => parseProduct(document.id, document.data()))
    .sort(
      (left, right) =>
        (left.recommendedOrder ?? 0) - (right.recommendedOrder ?? 0),
    );
}

function parseProduct(id: string, value: unknown): Product {
  if (!isRecord(value)) {
    throw new Error(`Recommended product "${id}" has invalid data.`);
  }

  const {
    coverImage,
    name,
    regions,
    price,
    currency,
    moneyBackPercent,
    platform,
    productType,
    operatingSystems,
    genres,
    country,
    productKey,
    isDemo,
    isRecommended,
    recommendedOrder,
  } = value;

  if (
    typeof coverImage !== "string" ||
    typeof name !== "string" ||
    !isValuesFrom(regions, PRODUCT_REGIONS) ||
    regions.length === 0 ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    typeof moneyBackPercent !== "number" ||
    !Number.isFinite(moneyBackPercent) ||
    moneyBackPercent < 0 ||
    moneyBackPercent > 100 ||
    !isValueFrom(platform, PRODUCT_PLATFORMS) ||
    !isValueFrom(productType, PRODUCT_TYPES) ||
    !isValuesFrom(operatingSystems, PRODUCT_OPERATING_SYSTEMS) ||
    !isValuesFrom(genres, PRODUCT_GENRES) ||
    !isValueFrom(country, PRODUCT_COUNTRIES) ||
    currency !== "EUR" ||
    typeof productKey !== "string" ||
    isDemo !== true ||
    isRecommended !== true ||
    typeof recommendedOrder !== "number"
  ) {
    throw new Error(`Recommended product "${id}" is missing valid fields.`);
  }

  return {
    id,
    coverImage,
    name,
    regions,
    price,
    currency,
    moneyBackPercent,
    platform,
    productType,
    operatingSystems,
    genres,
    country,
    productKey,
    isDemo,
    isRecommended,
    recommendedOrder,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValueFrom<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
): value is Values[number] {
  return typeof value === "string" && values.some((entry) => entry === value);
}

function isValuesFrom<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
): value is Values[number][] {
  return (
    Array.isArray(value) &&
    value.every((entry) => isValueFrom(entry, values))
  );
}
