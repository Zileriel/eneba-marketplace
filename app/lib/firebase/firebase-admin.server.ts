import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  FieldValue,
  getFirestore,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";
import { isCheckoutSessionId } from "../checkout/stripe.server";

const ADMIN_APP_NAME = "eneba-private-product-keys";

export class FirebaseAdminConfigurationError extends Error {}
export class FirebaseIdTokenError extends Error {}
export class ProductKeyInventoryError extends Error {}
export class OrderPersistenceError extends Error {}

export type PaidOrderItem = {
  productId: string;
  name: string;
  quantity: number;
};

export type PaidOrder = {
  id: string;
  userId: string;
  createdAt: number;
  amountTotal: number;
  currency: string;
  selectedPaymentMethod: string | null;
  items: PaidOrderItem[];
};

export type FulfilledOrderItem = PaidOrderItem & { productKeys: string[] };
export type FulfilledOrder = Omit<PaidOrder, "items"> & {
  items: FulfilledOrderItem[];
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

function getAdminFirestore() {
  try {
    return getFirestore(getAdminApp());
  } catch (cause) {
    if (cause instanceof FirebaseAdminConfigurationError) throw cause;
    throw new FirebaseAdminConfigurationError(
      "Firebase Admin Firestore is not available.",
      { cause },
    );
  }
}

function availableKeysQuery(firestore: Firestore, productId: string) {
  return firestore
    .collection("product_keys")
    .doc(productId)
    .collection("keys")
    .where("status", "==", "available");
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

export async function getAvailableKeyCounts(productIds: string[]) {
  const firestore = getAdminFirestore();
  const counts = await Promise.all(
    productIds.map(async (productId) => {
      const snapshot = await availableKeysQuery(firestore, productId)
        .count()
        .get();
      return [productId, snapshot.data().count] as const;
    }),
  );
  return new Map(counts);
}

export async function fulfilPaidOrder(
  order: PaidOrder,
): Promise<FulfilledOrder> {
  if (
    !isCheckoutSessionId(order.id) ||
    !order.userId.trim() ||
    !Number.isSafeInteger(order.createdAt) ||
    !Number.isInteger(order.amountTotal) ||
    order.amountTotal < 0 ||
    order.currency !== "eur" ||
    order.items.length === 0 ||
    order.items.some(
      ({ quantity }) => !Number.isInteger(quantity) || quantity <= 0,
    )
  ) {
    throw new OrderPersistenceError("The paid order data is invalid.");
  }

  const firestore = getAdminFirestore();
  const orderRef = firestore.collection("orders").doc(order.id);
  try {
    return await firestore.runTransaction(async (transaction) => {
      const existingOrder = await transaction.get(orderRef);
      if (existingOrder.exists) {
        if (existingOrder.get("userId") !== order.userId) {
          throw new OrderPersistenceError(
            "The order is already associated with a different user.",
          );
        }
        return parseStoredOrder(existingOrder.id, existingOrder.data() ?? {});
      }

      const claimedKeys = await Promise.all(
        order.items.map((item) =>
          transaction.get(
            availableKeysQuery(firestore, item.productId).limit(item.quantity),
          ),
        ),
      );

      const items = order.items.map((item, index) => {
        const keyDocuments = claimedKeys[index].docs;
        if (keyDocuments.length < item.quantity) {
          throw new ProductKeyInventoryError(
            `Product "${item.productId}" does not have enough keys in stock.`,
          );
        }
        const productKeys = keyDocuments.map((document) => {
          const productKey = document.get("productKey");
          if (typeof productKey !== "string" || !productKey.trim()) {
            throw new ProductKeyInventoryError(
              `Product "${item.productId}" has an invalid inventory key.`,
            );
          }
          return productKey;
        });
        return { ...item, productKeys };
      });

      for (const snapshot of claimedKeys) {
        for (const document of snapshot.docs) {
          transaction.update(document.ref, {
            status: "claimed",
            orderId: order.id,
            claimedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      const fulfilledOrder: FulfilledOrder = { ...order, items };
      transaction.create(orderRef, fulfilledOrder);
      return fulfilledOrder;
    });
  } catch (cause) {
    if (
      cause instanceof OrderPersistenceError ||
      cause instanceof ProductKeyInventoryError
    ) {
      throw cause;
    }
    throw new OrderPersistenceError("Could not fulfil the paid order.", {
      cause,
    });
  }
}

function parseStoredOrder(id: string, value: DocumentData): FulfilledOrder {
  if (!Array.isArray(value.items)) {
    throw new OrderPersistenceError(`Stored order ${id} has no items.`);
  }

  return {
    id,
    userId: value.userId,
    createdAt: value.createdAt,
    amountTotal: value.amountTotal,
    currency: value.currency,
    selectedPaymentMethod: value.selectedPaymentMethod ?? null,
    items: value.items.map((item: DocumentData) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      productKeys: Array.isArray(item.productKeys)
        ? item.productKeys.filter(
            (key: unknown): key is string => typeof key === "string",
          )
        : [],
    })),
  };
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
