import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebase-admin.mjs";

const products = await db.collection("products").get();
const migrations = [];

for (const product of products.docs) {
  const productKey = product.get("productKey");
  if (typeof productKey === "string" && productKey.trim()) {
    const privateRef = db.collection("product_keys").doc(product.id);
    const privateDocument = await privateRef.get();
    const existingKey = privateDocument.get("productKey");
    if (
      privateDocument.exists &&
      typeof existingKey === "string" &&
      existingKey !== productKey
    ) {
      throw new Error(
        "A product has conflicting public and private inventory keys. Resolve the inventory conflict before migrating.",
      );
    }
    migrations.push({ product, privateRef, productKey });
  }
}

for (let offset = 0; offset < migrations.length; offset += 200) {
  const batch = db.batch();
  for (const { product, privateRef, productKey } of migrations.slice(
    offset,
    offset + 200,
  )) {
    batch.set(privateRef, { productId: product.id, productKey });
    batch.update(product.ref, { productKey: FieldValue.delete() });
  }
  await batch.commit();
}

console.log(`Migrated ${migrations.length} product keys to private inventory.`);
