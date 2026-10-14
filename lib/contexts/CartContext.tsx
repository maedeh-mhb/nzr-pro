"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export interface ProductInventoryStatus {
  quantity: number;
  badge: string | null;
  available: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  nameFa: string | null;
  price: string;
  image: string | null;
  quantity: number;
  slug: string | null;
  category: string | null;
  minOrderQuantity: number | null;
  maxOrderQuantity: number | null;
}

interface GuestCart {
  items: CartItem[];
  updatedAt: number;
}

interface CartContextType {
  items: CartItem[];
  inventoryStatuses: Record<string, ProductInventoryStatus>;
  registerProductForInventory: (productId: string) => () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isLoading: boolean;
  selectedItems: Set<string>; // Frontend-only selection state
  toggleItemSelection: (itemId: string) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
  getSelectedItems: () => CartItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_CART_KEY = "guest_cart";
const GUEST_SESSION_ID_KEY = "guestSessionId";
const GUEST_CART_EXPIRY_DAYS = 7;
const GUEST_CART_EXPIRY_MS = GUEST_CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [inventoryStatuses, setInventoryStatuses] = useState<Record<string, ProductInventoryStatus>>({});
  const [trackedProductIds, setTrackedProductIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [hasMergedGuestCart, setHasMergedGuestCart] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const pathname = usePathname();
  const trackedProductCounts = useRef(new Map<string, number>());
  const isRefreshingInventory = useRef(false);

  const getGuestSessionId = useCallback(() => {
    let sessionId = localStorage.getItem(GUEST_SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(GUEST_SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  }, []);

  const syncGuestCartReservations = useCallback(async (guestItems: CartItem[]) => {
    const response = await fetch("/api/cart/guest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getGuestSessionId(),
      },
      body: JSON.stringify({
        items: guestItems.map(({ productId, quantity }) => ({ productId, quantity })),
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Failed to reserve guest cart inventory");
    }
  }, [getGuestSessionId]);

  const registerProductForInventory = useCallback((productId: string) => {
    const count = trackedProductCounts.current.get(productId) || 0;
    trackedProductCounts.current.set(productId, count + 1);
    setTrackedProductIds(new Set(trackedProductCounts.current.keys()));

    return () => {
      const currentCount = trackedProductCounts.current.get(productId) || 0;
      if (currentCount <= 1) {
        trackedProductCounts.current.delete(productId);
      } else {
        trackedProductCounts.current.set(productId, currentCount - 1);
      }
      setTrackedProductIds(new Set(trackedProductCounts.current.keys()));
    };
  }, []);

  // Save guest cart to localStorage
  const saveGuestCart = useCallback((items: CartItem[]) => {
    try {
      const guestCart: GuestCart = {
        items,
        updatedAt: Date.now(),
      };
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestCart));
    } catch (error) {
      console.error("Error saving guest cart:", error);
    }
  }, []);

  // Validate guest cart items by checking if products exist and are available
  const validateGuestCartItems = useCallback(async (items: CartItem[]): Promise<CartItem[]> => {
    if (items.length === 0) return [];

    try {
      // Fetch product details for all items in cart
      const productIds = items.map((item) => item.productId);
      const response = await fetch(`/api/products/validate?ids=${productIds.join(",")}`);

      if (response.ok) {
        const data = await response.json();
        const validProductIds = new Set(data.validProductIds || []);

        // Filter out invalid items (deleted or unavailable products)
        const validItems = items.filter((item) => {
          return validProductIds.has(item.productId);
        });

        // If any items were removed, update localStorage
        if (validItems.length < items.length) {
          saveGuestCart(validItems);
        }

        return validItems;
      }
    } catch (error) {
      console.error("Error validating guest cart items:", error);
      // Return original items if validation fails (fail gracefully)
    }

    return items;
  }, [saveGuestCart]);

  // Load guest cart from localStorage
  const loadGuestCart = useCallback(async (): Promise<CartItem[]> => {
    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (!stored) return [];

      const guestCart: GuestCart = JSON.parse(stored);
      const now = Date.now();

      // Check expiration
      if (now - guestCart.updatedAt > GUEST_CART_EXPIRY_MS) {
        await syncGuestCartReservations([]);
        localStorage.removeItem(GUEST_CART_KEY);
        return [];
      }

      const items = guestCart.items || [];

      // Validate items (remove deleted/unavailable products)
      const validItems = await validateGuestCartItems(items);

      return validItems;
    } catch (error) {
      console.error("Error loading guest cart:", error);
      localStorage.removeItem(GUEST_CART_KEY);
      return [];
    }
  }, [syncGuestCartReservations, validateGuestCartItems]);

  // Load cart from database for logged-in users
  const loadCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/cart");
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        // Select all items by default
        setSelectedItems(new Set((data.items || []).map((item: CartItem) => item.id)));
      } else {
        setItems([]);
        setSelectedItems(new Set());
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      setItems([]);
      setSelectedItems(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Merge guest cart into DB cart (one-time on login)
  const mergeGuestCart = useCallback(async () => {
    if (hasMergedGuestCart || !session?.user?.id) return;

    const guestItems = await loadGuestCart();
    if (guestItems.length === 0) {
      setHasMergedGuestCart(true);
      return;
    }

    try {
      const response = await fetch("/api/cart/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: guestItems }),
      });

      if (response.ok) {
        await syncGuestCartReservations([]);
        // Clear guest cart
        localStorage.removeItem(GUEST_CART_KEY);
        setHasMergedGuestCart(true);
        // Reload cart from DB
        await loadCart();
      }
    } catch (error) {
      console.error("Error merging guest cart:", error);
    }
  }, [session, hasMergedGuestCart, loadGuestCart, loadCart, syncGuestCartReservations]);

  // Load cart on mount or when session changes
  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (session?.user?.id) {
      // User is logged in
      if (!hasMergedGuestCart) {
        // Merge guest cart first, then load DB cart
        mergeGuestCart();
      } else {
        // Just load DB cart
        loadCart();
      }
    } else {
      // Guest user - load from localStorage and validate
      loadGuestCart()
        .then(async (guestItems) => {
          if (guestItems.length > 0 && !pathname.startsWith("/checkout")) {
            await syncGuestCartReservations(guestItems);
          }
          setItems(guestItems);
          // Select all items by default
          setSelectedItems(new Set(guestItems.map((item) => item.id)));
        })
        .catch((error) => {
          console.error("Error restoring guest cart reservations:", error);
          setItems([]);
          setSelectedItems(new Set());
        });
    }
  }, [
    session,
    sessionStatus,
    hasMergedGuestCart,
    loadCart,
    loadGuestCart,
    mergeGuestCart,
    pathname,
    syncGuestCartReservations,
  ]);

  const refreshInventory = useCallback(async () => {
    const productIds = Array.from(new Set([
      ...trackedProductIds,
      ...items.map((item) => item.productId),
    ]));
    if (productIds.length === 0 || isRefreshingInventory.current) return;

    isRefreshingInventory.current = true;
    try {
      const response = await fetch(`/api/products/validate?ids=${productIds.join(",")}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Inventory refresh failed with status ${response.status}`);
      }

      const data = await response.json();
      const statuses = (data.productStatuses || []) as Array<{
        id: string;
        quantity: number;
        badge: string | null;
        available: boolean;
      }>;
      setInventoryStatuses((current) => ({
        ...current,
        ...Object.fromEntries(statuses.map((status) => [status.id, status])),
      }));

      const validProductIds = new Set<string>(data.validProductIds || []);
      const availableItems = items.filter((item) => validProductIds.has(item.productId));
      if (availableItems.length !== items.length) {
        setItems(availableItems);
        if (session?.user?.id) {
          const syncResponse = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: availableItems }),
          });
          if (!syncResponse.ok) {
            throw new Error(`Failed to remove unavailable items from cart (${syncResponse.status})`);
          }
          await loadCart();
        } else {
          if (!pathname.startsWith("/checkout")) {
            await syncGuestCartReservations(availableItems);
          }
          saveGuestCart(availableItems);
        }
      }
    } catch (error) {
      console.error("Error refreshing product inventory:", error);
    } finally {
      isRefreshingInventory.current = false;
    }
  }, [
    trackedProductIds,
    items,
    session?.user?.id,
    loadCart,
    saveGuestCart,
    syncGuestCartReservations,
    pathname,
  ]);

  useEffect(() => {
    void refreshInventory();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshInventory();
      }
    }, 15000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshInventory();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshInventory]);

  // Sync cart changes to DB (for logged-in users) or localStorage (for guests)
  const syncCart = async (newItems: CartItem[]) => {
    try {
      if (session?.user?.id) {
        // Logged-in user - sync to DB
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: newItems }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Failed to sync cart");
        }
        // Reload cart from DB to get proper IDs
        await loadCart();
      } else {
        if (!pathname.startsWith("/checkout")) {
          await syncGuestCartReservations(newItems);
        }
        saveGuestCart(newItems);
      }
    } catch (error) {
      console.error("Error syncing cart:", error);
      throw error;
    }
  };

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const addItem = async (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
    const inventoryStatus = inventoryStatuses[item.productId];
    if (inventoryStatus && !inventoryStatus.available) {
      throw new Error("Product is out of stock");
    }

    const newItems = [...items];
    const existingIndex = newItems.findIndex((i) => i.productId === item.productId);

    let newItem: CartItem;
    if (existingIndex >= 0) {
      const existingItem = newItems[existingIndex];
      const newQuantity = existingItem.quantity + quantity;

      // Use existing item's limits (they should match, but use existing to be safe)
      const minOrderQuantity = existingItem.minOrderQuantity !== null && existingItem.minOrderQuantity !== undefined
        ? existingItem.minOrderQuantity
        : item.minOrderQuantity;
      const maxOrderQuantity = existingItem.maxOrderQuantity !== null && existingItem.maxOrderQuantity !== undefined
        ? existingItem.maxOrderQuantity
        : item.maxOrderQuantity;

      // Validate min order quantity
      if (minOrderQuantity !== null && minOrderQuantity !== undefined && newQuantity < minOrderQuantity) {
        throw new Error(`Minimum order quantity is ${minOrderQuantity}`);
      }

      // Validate max order quantity
      if (maxOrderQuantity !== null && maxOrderQuantity !== undefined && newQuantity > maxOrderQuantity) {
        throw new Error(`Maximum order quantity is ${maxOrderQuantity}`);
      }

      newItems[existingIndex].quantity = newQuantity;
      // Update limits in case they changed (use the newer values from item parameter)
      if (item.minOrderQuantity !== null && item.minOrderQuantity !== undefined) {
        newItems[existingIndex].minOrderQuantity = item.minOrderQuantity;
      }
      if (item.maxOrderQuantity !== null && item.maxOrderQuantity !== undefined) {
        newItems[existingIndex].maxOrderQuantity = item.maxOrderQuantity;
      }
      newItem = newItems[existingIndex];
    } else {
      // Validate min order quantity for new item
      if (item.minOrderQuantity !== null && item.minOrderQuantity !== undefined && quantity < item.minOrderQuantity) {
        throw new Error(`Minimum order quantity is ${item.minOrderQuantity}`);
      }

      // Validate max order quantity for new item
      if (item.maxOrderQuantity !== null && item.maxOrderQuantity !== undefined && quantity > item.maxOrderQuantity) {
        throw new Error(`Maximum order quantity is ${item.maxOrderQuantity}`);
      }

      newItem = { ...item, quantity, id: `${item.productId}-${Date.now()}` };
      newItems.push(newItem);
    }

    await syncCart(newItems);

    if (!session?.user?.id) {
      setItems(newItems);
      setSelectedItems((prev) => new Set([...prev, newItem.id]));
    }
  };

  const removeItem = async (productId: string) => {
    const itemToRemove = items.find((item) => item.productId === productId);
    const newItems = items.filter((item) => item.productId !== productId);
    await syncCart(newItems);
    setItems(newItems);
    if (itemToRemove) {
      setSelectedItems((prev) => {
        const next = new Set(prev);
        next.delete(itemToRemove.id);
        return next;
      });
    }
  };

  const updateQuantity = async (productId: string, quantity: number, skipValidation: boolean = false) => {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }

    // Find the item to validate limits
    const item = items.find((i) => i.productId === productId);
    if (item && !skipValidation) {
      // Validate min order quantity
      if (item.minOrderQuantity !== null && item.minOrderQuantity !== undefined && quantity < item.minOrderQuantity) {
        throw new Error(`Minimum order quantity is ${item.minOrderQuantity}`);
      }

      // Validate max order quantity - check both null/undefined and actual value
      const hasMaxLimit = item.maxOrderQuantity !== null && item.maxOrderQuantity !== undefined && item.maxOrderQuantity > 0;
      if (hasMaxLimit && quantity > item.maxOrderQuantity!) {
        throw new Error(`Maximum order quantity is ${item.maxOrderQuantity}`);
      }
    }

    const newItems = items.map((item) =>
      item.productId === productId ? { ...item, quantity } : item
    );
    setItems(newItems);
    try {
      await syncCart(newItems);
    } catch (error) {
      setItems(items);
      throw error;
    }
  };

  const clearCart = async () => {
    await syncCart([]);
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      return total + price * item.quantity;
    }, 0);
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(items.map((item) => item.id)));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const getSelectedItems = () => {
    return items.filter((item) => selectedItems.has(item.id));
  };

  // Update selection when items change
  useEffect(() => {
    // If items are removed, clean up selection
    const itemIds = new Set(items.map((item) => item.id));
    setSelectedItems((prev) => {
      const next = new Set(prev);
      let changed = false;
      prev.forEach((id) => {
        if (!itemIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        inventoryStatuses,
        registerProductForInventory,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        isLoading,
        selectedItems,
        toggleItemSelection,
        selectAllItems,
        deselectAllItems,
        getSelectedItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
