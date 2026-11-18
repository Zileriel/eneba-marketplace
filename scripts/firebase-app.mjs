import { getApp, getApps, initializeApp } from "firebase/app";

const requiredVariables = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

export function initializeFirebaseAppFromEnvironment() {
  const missingVariables = requiredVariables.filter(
    (key) => !process.env[key],
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing Firebase configuration: ${missingVariables.join(", ")}`,
    );
  }

  if (getApps().length > 0) return getApp();

  return initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  });
}
