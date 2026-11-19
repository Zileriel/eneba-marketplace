import { readFile } from "node:fs/promises";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebase-admin.mjs";
import {
  addKeysToInventory,
  countAvailableKeys,
} from "./product-key-inventory.mjs";

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

const keysByProduct = new Map(
  ids.map((id) => {
    const value = productKeys[id];
    const keys = (Array.isArray(value) ? value : [value]).filter(
      (key) => typeof key === "string" && key.trim(),
    );
    return [id, keys];
  }),
);
if ([...keysByProduct.values()].some((keys) => keys.length === 0)) {
  throw new Error(
    "Every product needs at least one non-empty key in data/product-keys.local.json.",
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
  throw new Error(
    "Product recommendation and popularity ranks must be sequential.",
  );
}

const existingSnapshot = await db.collection("products").get();
const demoProducts = existingSnapshot.docs.filter(
  (document) => document.get("isDemo") === true,
);
const writeCount = demoProducts.length + products.length * 2;
if (writeCount > 500) {
  throw new Error(
    `Cannot atomically seed ${products.length} products and delete ${demoProducts.length} demos: Firestore batches are limited to 500 writes.`,
  );
}

const batch = db.batch();
for (const demoProduct of demoProducts) {
  batch.delete(demoProduct.ref);
}

for (const { id, ...product } of products) {
  batch.set(db.collection("products").doc(id), product);
  batch.set(
    db.collection("product_keys").doc(id),
    { productId: id, productKey: FieldValue.delete() },
    { merge: true },
  );
}

await batch.commit();

for (const demoProduct of demoProducts) {
  await db.recursiveDelete(db.collection("product_keys").doc(demoProduct.id));
}

let addedKeyCount = 0;
for (const [id, keys] of keysByProduct) {
  addedKeyCount += await addKeysToInventory(db, id, keys);
}
const availableCounts = await Promise.all(
  ids.map((id) => countAvailableKeys(db, id)),
);

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
  availableCounts.some((count) => count === 0) ||
  remainingDemoProducts.length !== 0 ||
  seededDocuments.filter((document) => document.get("isRecommended") === true)
    .length !== recommendedProducts.length ||
  seededDocuments.filter((document) => document.get("isPopular") === true)
    .length !== popularProducts.length
) {
  throw new Error("Product seeding verification failed.");
}

console.log(
  `Removed ${demoProducts.length} demo products and seeded ${products.length} catalog products (${recommendedProducts.length} recommended, ${popularProducts.length} popular). Added ${addedKeyCount} new keys; ${availableCounts.reduce((total, count) => total + count, 0)} keys are available.`,
);

function hasSequentialOrders(products, orderField) {
  const orders = products
    .map((product) => product[orderField])
    .sort((left, right) => left - right);

  return orders.every((order, index) => order === index + 1);
}
