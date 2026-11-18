import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Product } from "./products";
import { parseProduct } from "./products.client";

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

  const products = snapshot.docs.map((document) =>
    parseProduct(document.id, document.data()),
  );

  if (
    products.some(
      (product) =>
        !product.isRecommended || product.recommendedOrder === undefined,
    )
  ) {
    throw new Error("Recommended products have invalid ordering data.");
  }

  return products.sort(
      (left, right) =>
        (left.recommendedOrder ?? 0) - (right.recommendedOrder ?? 0),
  );
}
