import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "eneba-private-product-keys";

export class ProductKeyConfigurationError extends Error {}
export class ProductKeyInventoryError extends Error {}

export async function getProductKeys(productIds: string[]) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new ProductKeyConfigurationError(
      "Firebase project configuration is missing.",
    );
  }

  let firestore;
  try {
    const app =
      getApps().find((candidate) => candidate.name === ADMIN_APP_NAME) ??
      initializeApp(
        { credential: applicationDefault(), projectId },
        ADMIN_APP_NAME,
      );
    firestore = getFirestore(app);
  } catch (cause) {
    throw new ProductKeyConfigurationError(
      "Firebase Admin credentials are not configured.",
      { cause },
    );
  }

  let documents;
  try {
    documents = await firestore.getAll(
      ...productIds.map((id) => firestore.collection("product_keys").doc(id)),
    );
  } catch (cause) {
    throw new ProductKeyConfigurationError(
      "Could not access the private product-key inventory.",
      { cause },
    );
  }

  const keys = new Map<string, string>();
  for (const document of documents) {
    const productKey = document.get("productKey");
    if (!document.exists || typeof productKey !== "string" || !productKey.trim()) {
      throw new ProductKeyInventoryError(
        "A purchased product does not have a deliverable key.",
      );
    }
    keys.set(document.id, productKey);
  }

  return keys;
}
