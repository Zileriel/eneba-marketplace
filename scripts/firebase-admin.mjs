import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
if (!projectId) {
  throw new Error("Missing Firebase project ID in VITE_FIREBASE_PROJECT_ID.");
}

const appName = "eneba-admin-scripts";
const app =
  getApps().find((candidate) => candidate.name === appName) ??
  initializeApp(
    { credential: applicationDefault(), projectId },
    appName,
  );

export const db = getFirestore(app);
