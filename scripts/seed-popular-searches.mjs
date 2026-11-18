import popularSearches from "../data/popular-searches.json" with { type: "json" };
import { initializeFirebaseAppFromEnvironment } from "./firebase-app.mjs";
import { doc, getFirestore, writeBatch } from "firebase/firestore";

const firebaseApp = initializeFirebaseAppFromEnvironment();
const db = getFirestore(firebaseApp);
const batch = writeBatch(db);

for (const { id, ...search } of popularSearches) {
  batch.set(doc(db, "popular_searches", id), search);
}

await batch.commit();
console.log(`Seeded ${popularSearches.length} popular searches.`);
