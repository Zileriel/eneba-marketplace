import { readFile } from "node:fs/promises";
import { db } from "./firebase-admin.mjs";

const products = JSON.parse(
  await readFile(new URL("../data/products.json", import.meta.url), "utf8"),
);
const productKeys = JSON.parse(
  await readFile(
    new URL("../data/product-keys.local.json", import.meta.url),
    "utf8",
  ),
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
if (
  products.some(
    ({ id }) =>
      typeof productKeys[id] !== "string" || !productKeys[id].trim(),
  )
) {
  throw new Error(
    "Every product needs a non-empty key in data/product-keys.local.json.",
  );
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

const existingSnapshot = await db.collection("products").get();
const demoProducts = existingSnapshot.docs.filter(
  (document) => document.get("isDemo") === true,
);
const writeCount = demoProducts.length * 2 + products.length * 2;
if (writeCount > 500) {
  throw new Error(
    `Cannot atomically seed ${products.length} products and delete ${demoProducts.length} demos: Firestore batches are limited to 500 writes.`,
  );
}

const batch = db.batch();
for (const demoProduct of demoProducts) {
  batch.delete(demoProduct.ref);
  batch.delete(db.collection("product_keys").doc(demoProduct.id));
}

for (const { id, ...product } of products) {
  batch.set(db.collection("products").doc(id), product);
  batch.set(db.collection("product_keys").doc(id), {
    productId: id,
    productKey: productKeys[id],
  });
}

await batch.commit();

const [verificationSnapshot, keySnapshot] = await Promise.all([
  db.collection("products").get(),
  db.collection("product_keys").get(),
]);
const productIds = new Set(ids);
const seededDocuments = verificationSnapshot.docs.filter((document) =>
  productIds.has(document.id),
);
const seededKeys = keySnapshot.docs.filter((document) =>
  productIds.has(document.id),
);
const remainingDemoProducts = verificationSnapshot.docs.filter(
  (document) => document.get("isDemo") === true,
);
const publicKeyLeak = seededDocuments.some((document) =>
  Object.hasOwn(document.data(), "productKey"),
);

if (
  seededDocuments.length !== products.length ||
  seededKeys.length !== products.length ||
  publicKeyLeak ||
  remainingDemoProducts.length !== 0 ||
  seededDocuments.filter((document) => document.get("isRecommended") === true)
    .length !== recommendedProducts.length ||
  seededDocuments.filter((document) => document.get("isPopular") === true)
    .length !== popularProducts.length
) {
  throw new Error("Product seeding verification failed.");
}

console.log(
  `Removed ${demoProducts.length} demo products and seeded ${products.length} catalog products with private keys (${recommendedProducts.length} recommended, ${popularProducts.length} popular).`,
);

function hasSequentialOrders(products, orderField) {
  const orders = products
    .map((product) => product[orderField])
    .sort((left, right) => left - right);

  return orders.every((order, index) => order === index + 1);
}
