import { readFile } from "node:fs/promises";
import { initializeFirebaseAppFromEnvironment } from "./firebase-app.mjs";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from "firebase/firestore";

const db = getFirestore(initializeFirebaseAppFromEnvironment());
const products = JSON.parse(
  await readFile(new URL("../data/products.json", import.meta.url), "utf8"),
);

if (!Array.isArray(products) || products.length !== 30) {
  throw new Error("Expected exactly 30 products in data/products.json.");
}

const ids = products.map(({ id }) => id);
if (ids.some((id) => typeof id !== "string" || id.length === 0)) {
  throw new Error("Every product must have a non-empty ID.");
}
if (new Set(ids).size !== ids.length) {
  throw new Error("Product IDs in data/products.json must be unique.");
}

const recommendedProducts = products.filter(
  ({ isRecommended }) => isRecommended,
);
const popularProducts = products.filter(({ isPopular }) => isPopular);
if (recommendedProducts.length !== 5 || popularProducts.length !== 15) {
  throw new Error("Expected 5 recommended and 15 popular products.");
}
if (
  !hasSequentialOrders(recommendedProducts, "recommendedOrder") ||
  !hasSequentialOrders(popularProducts, "popularOrder")
) {
  throw new Error("Product recommendation and popularity ranks must be sequential.");
}

const existingSnapshot = await getDocs(collection(db, "products"));
const demoProducts = existingSnapshot.docs.filter(
  (document) => document.data().isDemo === true,
);
const writeCount = demoProducts.length + products.length;

if (writeCount > 500) {
  throw new Error(
    `Cannot atomically seed ${products.length} products and delete ${demoProducts.length} demos: Firestore batches are limited to 500 writes.`,
  );
}

const batch = writeBatch(db);
for (const demoProduct of demoProducts) {
  batch.delete(demoProduct.ref);
}

for (const { id, ...product } of products) {
  batch.set(doc(db, "products", id), product);
}

await batch.commit();

const verificationSnapshot = await getDocs(collection(db, "products"));
const productIds = new Set(ids);
const seededDocuments = verificationSnapshot.docs.filter((document) =>
  productIds.has(document.id),
);
const remainingDemoProducts = verificationSnapshot.docs.filter(
  (document) => document.data().isDemo === true,
);

if (
  seededDocuments.length !== products.length ||
  remainingDemoProducts.length !== 0 ||
  seededDocuments.filter((document) => document.data().isRecommended === true)
    .length !== recommendedProducts.length ||
  seededDocuments.filter((document) => document.data().isPopular === true)
    .length !== popularProducts.length
) {
  throw new Error("Product seeding verification failed.");
}

console.log(
  `Removed ${demoProducts.length} demo products and seeded ${products.length} products (${recommendedProducts.length} recommended, ${popularProducts.length} popular).`,
);

function hasSequentialOrders(products, orderField) {
  const orders = products
    .map((product) => product[orderField])
    .sort((left, right) => left - right);

  return orders.every((order, index) => order === index + 1);
}
