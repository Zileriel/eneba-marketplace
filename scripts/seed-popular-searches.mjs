import popularSearches from "../data/popular-searches.json" with { type: "json" };
import { initializeApp } from "firebase/app";
import { doc, getFirestore, writeBatch } from "firebase/firestore";

const requiredVariables = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];
const missingVariables = requiredVariables.filter(
  (key) => !process.env[key],
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing Firebase configuration: ${missingVariables.join(", ")}`,
  );
}

const firebaseApp = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(firebaseApp);
const batch = writeBatch(db);

for (const { id, ...search } of popularSearches) {
  batch.set(doc(db, "popular_searches", id), search);
}

await batch.commit();
console.log(`Seeded ${popularSearches.length} popular searches.`);
