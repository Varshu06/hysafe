import React, { createContext, ReactNode, useContext, useState } from 'react';
import { ImageSourcePropType } from 'react-native';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: ImageSourcePropType;
  volume: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: { id: string; name: string; price: number; image: ImageSourcePropType; volume: string }) => void;
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

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (product: { id: string; name: string; price: number; image: ImageSourcePropType; volume: string }) => {
    setItems(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const incrementQuantity = (productId: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decrementQuantity = (productId: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === productId);
      if (item && item.quantity <= 1) {
        return prev.filter(i => i.id !== productId);
      }
      return prev.map(i =>
        i.id === productId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const getQuantity = (productId: string): number => {
    const item = items.find(i => i.id === productId);
    return item ? item.quantity : 0;
  };

  const clearCart = () => {
    setItems([]);
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
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

