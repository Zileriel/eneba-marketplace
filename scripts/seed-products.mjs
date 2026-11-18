import { demoProducts } from "../data/products.mjs";
import { initializeFirebaseAppFromEnvironment } from "./firebase-app.mjs";
import { doc, getFirestore, writeBatch } from "firebase/firestore";

const db = getFirestore(initializeFirebaseAppFromEnvironment());
const batch = writeBatch(db);

for (const { id, ...product } of demoProducts) {
  batch.set(doc(db, "products", id), product);
}

await batch.commit();
console.log(`Seeded ${demoProducts.length} demo products.`);
