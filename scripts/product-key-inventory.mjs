import { createHash } from "node:crypto";

export function keyDocumentId(productKey) {
  return createHash("sha256").update(productKey).digest("hex").slice(0, 40);
}

export async function addKeysToInventory(db, productId, productKeys) {
  const keysRef = db
    .collection("product_keys")
    .doc(productId)
    .collection("keys");
  const uniqueKeys = [...new Set(productKeys.map((key) => key.trim()))].filter(
    Boolean,
  );
  const existing = new Set(
    (await keysRef.select().get()).docs.map((document) => document.id),
  );
  const newKeys = uniqueKeys.filter((key) => !existing.has(keyDocumentId(key)));

  for (let offset = 0; offset < newKeys.length; offset += 400) {
    const batch = db.batch();
    for (const productKey of newKeys.slice(offset, offset + 400)) {
      batch.create(keysRef.doc(keyDocumentId(productKey)), {
        productKey,
        status: "available",
      });
    }
    await batch.commit();
  }

  return newKeys.length;
}

export async function countAvailableKeys(db, productId) {
  const snapshot = await db
    .collection("product_keys")
    .doc(productId)
    .collection("keys")
    .where("status", "==", "available")
    .count()
    .get();
  return snapshot.data().count;
}
