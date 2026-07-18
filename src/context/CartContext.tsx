import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ImageSourcePropType } from "react-native";
import { PRODUCTS } from "../data/dummy";

const CART_STORAGE_KEY = "@hysafe_cart";

// Product images map for reconstruction
const ProductImages: Record<string, ImageSourcePropType> = {
  "1l": require("../assets/1l.png"),
  "2l": require("../assets/2l.png"),
  "20l": require("../assets/20l.png"),
  "250ml": require("../assets/250.png"),
  "300ml": require("../assets/300ml.png"),
  "500ml": require("../assets/500ml.png"),
};

export interface CartItem {
  deliveryCharge: number;
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: ImageSourcePropType;
}

// Storage-friendly cart item (without ImageSourcePropType)
interface StoredCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: {
    id: string;
    name: string;
    price: number;
    image: string;
    deliveryCharge: number;
  }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  getQuantity: (productId: string) => number;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from storage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const cartJson = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (cartJson) {
          const storedItems: StoredCartItem[] = JSON.parse(cartJson);
          // Reconstruct cart items and attach image from product lookup when possible
          const restoredItems: CartItem[] = storedItems.map((storedItem) => {
            const product = PRODUCTS.find((p) => p.id === storedItem.id);
            const image = product ? product.image : ProductImages["20l"];
            return {
              ...storedItem,
              image,
            } as CartItem;
          });
          setItems(restoredItems);
        }
      } catch (error) {
        console.error("Error loading cart from storage:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadCart();
  }, []);

  // Save cart to storage whenever items change
  useEffect(() => {
    if (!isLoaded) return; // Don't save on initial load

    const saveCart = async () => {
      try {
        // Convert to storage-friendly format (remove ImageSourcePropType)
        const storedItems: StoredCartItem[] = items.map(
          ({ image, ...rest }) => rest,
        );
        await AsyncStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify(storedItems),
        );
      } catch (error) {
        console.error("Error saving cart to storage:", error);
      }
    };
    saveCart();
  }, [items, isLoaded]);

  const addToCart = (product: {
    id: string;
    name: string;
    price: number;
    image: string;
    deliveryCharge: number;
  }) => {
    setItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id);
      if (existingItem) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { ...product, quantity: 1 } as CartItem];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const incrementQuantity = (productId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decrementQuantity = (productId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === productId);
      if (item && item.quantity <= 1) {
        return prev.filter((i) => i.id !== productId);
      }
      return prev.map((i) =>
        i.id === productId ? { ...i, quantity: i.quantity - 1 } : i,
      );
    });
  };

  const getQuantity = (productId: string): number => {
    const item = items.find((i) => i.id === productId);
    return item ? item.quantity : 0;
  };

  const clearCart = async () => {
    setItems([]);
    try {
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing cart from storage:", error);
    }
  };

  const getTotalItems = (): number => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = (): number => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        incrementQuantity,
        decrementQuantity,
        getQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
