import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  isCartOpen: boolean;
  addedProductId: string | null;
  isHydrated: boolean;
  cartButtonRef: RefObject<HTMLButtonElement | null>;
  addToCart: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  closeAddedDialog: () => void;
};

const STORAGE_KEY = "eneba-cart-v1";
const MAX_QUANTITY = 99;
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const serializedCart = window.localStorage.getItem(STORAGE_KEY);
      if (serializedCart) {
        const parsedCart: unknown = JSON.parse(serializedCart);
        if (!isCartItems(parsedCart)) {
          throw new Error("The saved cart has an invalid format.");
        }
        setItems(parsedCart);
      }
    } catch (cause) {
      console.error("Could not restore the saved shopping cart.", cause);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (storageError) {
        console.error(
          "Could not clear the invalid saved shopping cart.",
          storageError,
        );
      }
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (cause) {
      console.error("Could not save the shopping cart.", cause);
    }
  }, [isHydrated, items]);

  const addToCart = useCallback((productId: string) => {
    setItems((currentItems) => {
      const existing = currentItems.find((item) => item.productId === productId);
      if (!existing) {
        return [...currentItems, { productId, quantity: 1 }];
      }

      return currentItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) }
          : item,
      );
    });
    setIsCartOpen(false);
    setAddedProductId(productId);
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setItems((currentItems) =>
        currentItems.filter((item) => item.productId !== productId),
      );
      return;
    }

    const safeQuantity = Math.min(Math.floor(quantity), MAX_QUANTITY);
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: safeQuantity }
          : item,
      ),
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.productId !== productId),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => {
    setAddedProductId(null);
    setIsCartOpen(true);
  }, []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const closeAddedDialog = useCallback(() => setAddedProductId(null), []);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const value = useMemo(
    () => ({
      items,
      itemCount,
      isCartOpen,
      addedProductId,
      isHydrated,
      cartButtonRef,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      openCart,
      closeCart,
      closeAddedDialog,
    }),
    [
      items,
      itemCount,
      isCartOpen,
      addedProductId,
      isHydrated,
      cartButtonRef,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      openCart,
      closeCart,
      closeAddedDialog,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) {
    throw new Error("useCart must be used inside CartProvider.");
  }
  return cart;
}

function isCartItems(value: unknown): value is CartItem[] {
  return (
    Array.isArray(value) &&
    value.length <= 30 &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "productId" in item &&
        typeof item.productId === "string" &&
        item.productId.length > 0 &&
        "quantity" in item &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= MAX_QUANTITY,
    )
  );
}
