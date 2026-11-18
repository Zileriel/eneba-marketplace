import {
  PRODUCT_COUNTRIES,
  PRODUCT_GENRES,
  PRODUCT_OPERATING_SYSTEMS,
  PRODUCT_PLATFORMS,
  PRODUCT_REGIONS,
  PRODUCT_TYPES,
  type Product,
} from "./products";

export function parseProduct(id: string, value: unknown): Product {
  if (!isRecord(value)) {
    throw new Error(`Product "${id}" has invalid data.`);
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
    isPopular,
    popularOrder,
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
    typeof isRecommended !== "boolean" ||
    !isOptionalOrder(recommendedOrder) ||
    typeof isPopular !== "boolean" ||
    !isOptionalOrder(popularOrder)
  ) {
    throw new Error(`Product "${id}" is missing valid fields.`);
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
    ...(recommendedOrder === undefined ? {} : { recommendedOrder }),
    isPopular,
    ...(popularOrder === undefined ? {} : { popularOrder }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalOrder(value: unknown): value is number | undefined {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isInteger(value) && value > 0)
  );
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
    Array.isArray(value) && value.every((entry) => isValueFrom(entry, values))
  );
}
