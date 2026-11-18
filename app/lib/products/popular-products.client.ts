import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Product } from "./products";
import { parseProduct } from "./products.client";

const POPULAR_PRODUCT_COUNT = 15;

let popularProductsCache: Promise<Product[]> | null = null;

export function getPopularProducts() {
  if (!popularProductsCache) {
    const request = loadPopularProducts();
    popularProductsCache = request;
    request.catch(() => {
      if (popularProductsCache === request) {
        popularProductsCache = null;
      }
    });
  }

  return popularProductsCache;
}

async function loadPopularProducts(): Promise<Product[]> {
  const popularQuery = query(
    collection(db, "products"),
    where("isPopular", "==", true),
    limit(POPULAR_PRODUCT_COUNT),
  );
  const snapshot = await getDocs(popularQuery);

  if (snapshot.size !== POPULAR_PRODUCT_COUNT) {
    throw new Error(
      `Expected ${POPULAR_PRODUCT_COUNT} popular products, received ${snapshot.size}.`,
    );
  }

  const products = snapshot.docs.map((document) =>
    parseProduct(document.id, document.data()),
  );

  if (
    products.some(
      (product) => !product.isPopular || product.popularOrder === undefined,
    )
  ) {
    throw new Error("Popular products have invalid ordering data.");
  }

  const orderedProducts = products.sort(
    (left, right) => left.popularOrder! - right.popularOrder!,
  );

  if (
    orderedProducts.some((product, index) => product.popularOrder !== index + 1)
  ) {
    throw new Error("Popular products must have unique ordered ranks.");
  }

  return orderedProducts;
}
