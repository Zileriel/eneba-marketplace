import popularSearches from "../data/popular-searches.json" with { type: "json" };
import { db } from "./firebase-admin.mjs";

const batch = db.batch();

for (const { id, ...search } of popularSearches) {
  batch.set(db.collection("popular_searches").doc(id), search);
}

await batch.commit();
console.log(`Seeded ${popularSearches.length} popular searches.`);
