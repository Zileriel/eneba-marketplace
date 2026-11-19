import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebase-admin.mjs";
import { addKeysToInventory } from "./product-key-inventory.mjs";

const [products, privateKeyDocuments] = await Promise.all([
  db.collection("products").get(),
  db.collection("product_keys").get(),
]);

const legacyKeys = new Map();
for (const document of [...products.docs, ...privateKeyDocuments.docs]) {
  const productKey = document.get("productKey");
  if (typeof productKey === "string" && productKey.trim()) {
    const keys = legacyKeys.get(document.id) ?? [];
    keys.push(productKey);
    legacyKeys.set(document.id, keys);
  }
}

let addedKeyCount = 0;
for (const [productId, keys] of legacyKeys) {
  addedKeyCount += await addKeysToInventory(db, productId, keys);
  const batch = db.batch();
  batch.set(
    db.collection("product_keys").doc(productId),
    { productId, productKey: FieldValue.delete() },
    { merge: true },
  );
  if (products.docs.some((document) => document.id === productId)) {
    batch.update(db.collection("products").doc(productId), {
      productKey: FieldValue.delete(),
    });
  }
  await batch.commit();
}

console.log(
  `Migrated legacy keys for ${legacyKeys.size} products into the key inventory (${addedKeyCount} new keys).`,
);
