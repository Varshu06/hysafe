import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { getProducts } from "../services/product.service";
import { Product } from "../types/product.types";

interface ProductContextType {
  products: Product[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fetchInProgressRef = useRef(false);

  const loadProducts = async (
    page: number = 1,
    limit: number = 6,
    refresh = false,
  ) => {
    if (fetchInProgressRef.current) {
      return;
    }

    if (refresh && refreshing) {
      return;
    }
    if (!refresh && loading) {
      return;
    }

    fetchInProgressRef.current = true;
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await getProducts(page, limit);
      setProducts(response.data);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch products");
    } finally {
      fetchInProgressRef.current = false;
      if (refresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const refreshProducts = async (limit: number = 6): Promise<void> => {
    await loadProducts(1, limit, true);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        refreshing,
        error,
        refreshProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProduct must be used within ProductProvider");
  }
  return context;
};
