import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "eneba-private-product-keys";

export class ProductKeyConfigurationError extends Error {}
export class ProductKeyInventoryError extends Error {}
export class FirebaseAdminConfigurationError extends Error {}
export class FirebaseIdTokenError extends Error {}
export class OrderPersistenceError extends Error {}

export type PaidOrder = {
  id: string;
  userId: string;
  createdAt: number;
  amountTotal: number;
  currency: string;
  selectedPaymentMethod: string | null;
  items: {
    productId: string;
    name: string;
    quantity: number;
  }[];
};

function getAdminApp() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new FirebaseAdminConfigurationError(
      "Firebase project configuration is missing.",
    );
  }

  try {
    return (
      getApps().find((candidate) => candidate.name === ADMIN_APP_NAME) ??
      initializeApp(
        { credential: applicationDefault(), projectId },
        ADMIN_APP_NAME,
      )
    );
  } catch (cause) {
    throw new FirebaseAdminConfigurationError(
      "Firebase Admin credentials are not configured.",
      { cause },
    );
  }
}

export async function verifyFirebaseIdToken(idToken: string) {
  if (!idToken.trim() || idToken.length > 10_000) {
    throw new FirebaseIdTokenError("The Firebase ID token is invalid.");
  }

  let decodedToken;
  try {
    decodedToken = await getAuth(getAdminApp()).verifyIdToken(idToken, true);
  } catch (cause) {
    if (isFirebaseIdTokenError(cause)) {
      throw new FirebaseIdTokenError("The Firebase ID token is invalid.", {
        cause,
      });
    }
    if (cause instanceof FirebaseAdminConfigurationError) throw cause;
    throw new FirebaseAdminConfigurationError(
      "Firebase Admin could not verify the ID token.",
      { cause },
    );
  }

  return decodedToken.uid;
}

export async function getProductKeys(productIds: string[]) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new ProductKeyConfigurationError(
      "Firebase project configuration is missing.",
    );
  }

  let firestore;
  try {
    firestore = getFirestore(getAdminApp());
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

export async function savePaidOrder(order: PaidOrder) {
  if (
    !/^cs_test_[a-zA-Z0-9]+$/.test(order.id) ||
    !order.userId.trim() ||
    !Number.isSafeInteger(order.createdAt) ||
    !Number.isInteger(order.amountTotal) ||
    order.amountTotal < 0 ||
    order.currency !== "eur" ||
    order.items.length === 0
  ) {
    throw new OrderPersistenceError("The paid order data is invalid.");
  }

  try {
    const firestore = getFirestore(getAdminApp());
    const orderRef = firestore.collection("orders").doc(order.id);
    await firestore.runTransaction(async (transaction) => {
      const existingOrder = await transaction.get(orderRef);
      if (existingOrder.exists) {
        if (existingOrder.get("userId") !== order.userId) {
          throw new OrderPersistenceError(
            "The order is already associated with a different user.",
          );
        }
        return;
      }

      transaction.create(orderRef, order);
    });
  } catch (cause) {
    if (cause instanceof OrderPersistenceError) throw cause;
    throw new OrderPersistenceError("Could not save the paid order.", {
      cause,
    });
  }
}

function isFirebaseIdTokenError(cause: unknown) {
  if (
    typeof cause !== "object" ||
    cause === null ||
    !("code" in cause) ||
    typeof cause.code !== "string"
  ) {
    return false;
  }

  return [
    "auth/argument-error",
    "auth/id-token-expired",
    "auth/id-token-revoked",
    "auth/invalid-id-token",
    "auth/user-disabled",
  ].includes(cause.code);
}
