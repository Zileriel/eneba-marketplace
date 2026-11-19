import { parseProductCatalog } from "../products/product-parser";
import type { ProductCatalogItem } from "../products/products";
import type { CartItem } from "../cart/cart-context";

export class CheckoutConfigurationError extends Error {}
export class CheckoutCatalogError extends Error {}

type FirestoreValue = Record<string, unknown>;

export async function loadCheckoutProducts(items: CartItem[]) {
  return Promise.all(items.map(({ productId }) => loadCheckoutProduct(productId)));
}

export function getCheckoutOrigin(requestUrl: string) {
  const configuredOrigin = process.env.APP_BASE_URL?.trim();
  const requestOrigin = new URL(requestUrl);
  const requestIsLocal = ["localhost", "127.0.0.1", "::1"].includes(
    requestOrigin.hostname,
  );
  if (!configuredOrigin && (process.env.NODE_ENV === "production" || !requestIsLocal)) {
    throw new CheckoutConfigurationError(
      "Set APP_BASE_URL to the public site URL before enabling checkout.",
    );
  }

  let origin: URL;
  try {
    origin = new URL(configuredOrigin || requestOrigin.origin);
  } catch {
    throw new CheckoutConfigurationError(
      "APP_BASE_URL must be a valid absolute URL.",
    );
  }

  const localHost = ["localhost", "127.0.0.1", "::1"].includes(origin.hostname);
  if (
    origin.username ||
    origin.password ||
    (origin.protocol !== "https:" &&
      !(origin.protocol === "http:" && localHost))
  ) {
    throw new CheckoutConfigurationError(
      "APP_BASE_URL must use HTTPS, except for local development.",
    );
  }

  return origin.origin;
}

async function loadCheckoutProduct(
  id: string,
): Promise<ProductCatalogItem | null> {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!projectId || !apiKey) {
    throw new CheckoutConfigurationError(
      "Firebase project configuration is missing on the server.",
    );
  }

  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/products/${encodeURIComponent(id)}`,
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new CheckoutCatalogError(
      `Could not validate product "${id}" in Firestore (HTTP ${response.status}).`,
    );
  }

  const document: unknown = await response.json();
  if (!isRecord(document) || !isRecord(document.fields)) {
    throw new CheckoutCatalogError(`Product "${id}" has an invalid Firestore document.`);
  }

  const values = Object.fromEntries(
    Object.entries(document.fields).map(([key, value]) => [
      key,
      decodeFirestoreValue(value),
    ]),
  );
  return parseProductCatalog(id, values);
}

function decodeFirestoreValue(value: unknown): unknown {
  if (!isRecord(value)) return undefined;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (typeof value.doubleValue === "number") return value.doubleValue;
  if (
    typeof value.integerValue === "string" &&
    Number.isSafeInteger(Number(value.integerValue))
  ) {
    return Number(value.integerValue);
  }
  if (typeof value.booleanValue === "boolean") return value.booleanValue;
  if (isRecord(value.arrayValue)) {
    const values = value.arrayValue.values;
    return Array.isArray(values) ? values.map(decodeFirestoreValue) : [];
  }
  if (isRecord(value.mapValue)) {
    const fields = value.mapValue.fields;
    return isRecord(fields)
      ? Object.fromEntries(
          Object.entries(fields).map(([key, entry]) => [
            key,
            decodeFirestoreValue(entry),
          ]),
        )
      : {};
  }
  if ("nullValue" in value) return null;
  return undefined;
}

function isRecord(value: unknown): value is Record<string, FirestoreValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
