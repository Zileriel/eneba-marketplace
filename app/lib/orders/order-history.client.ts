import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export type OrderHistoryItem = {
  productId: string;
  name: string;
  quantity: number;
};

export type OrderHistoryEntry = {
  id: string;
  createdAt: number;
  amountTotal: number;
  currency: "eur";
  selectedPaymentMethod: string | null;
  items: OrderHistoryItem[];
};

export async function getOrderHistory(userId: string) {
  if (!userId.trim()) {
    throw new Error("A signed-in user is required to load order history.");
  }

  const orders = await getDocs(
    query(collection(db, "orders"), where("userId", "==", userId)),
  );
  return orders.docs
    .map((order) => parseOrder(order.id, order.data()))
    .sort((left, right) => right.createdAt - left.createdAt);
}

function parseOrder(id: string, value: DocumentData): OrderHistoryEntry {
  if (
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt) ||
    typeof value.amountTotal !== "number" ||
    !Number.isInteger(value.amountTotal) ||
    value.currency !== "eur" ||
    !Array.isArray(value.items) ||
    !value.items.every(isOrderHistoryItem) ||
    (value.selectedPaymentMethod !== null &&
      typeof value.selectedPaymentMethod !== "string")
  ) {
    throw new Error(`Order ${id} has an invalid format.`);
  }

  return {
    id,
    createdAt: value.createdAt,
    amountTotal: value.amountTotal,
    currency: value.currency,
    selectedPaymentMethod: value.selectedPaymentMethod,
    items: value.items,
  };
}

function isOrderHistoryItem(value: unknown): value is OrderHistoryItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "productId" in value &&
    typeof value.productId === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0
  );
}
