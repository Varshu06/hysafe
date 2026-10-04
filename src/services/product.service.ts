import api from "./api";
import { Product, ProductResponse } from "../types/product.types";

export const getProducts = async (
  page: number = 1,
  limit: number = 6,
): Promise<ProductResponse> => {
  try {
    const response = await api.get<ProductResponse>("/inventory/products", {
      params: {
        page,
        limit,
      },
    });
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch products";
    console.error("Get products error:", errorMessage);
    throw new Error(errorMessage);
  }
};

export const getProductsByIds = async (
  ids: string[],
  pageSize: number = 50,
): Promise<Map<string, Product>> => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const foundProducts = new Map<string, Product>();

  if (uniqueIds.length === 0) {
    return foundProducts;
  }

  const pendingIds = new Set(uniqueIds);
  let page = 1;

  while (true) {
    const response = await getProducts(page, pageSize);

    for (const product of response.data) {
      if (pendingIds.has(product.id)) {
        foundProducts.set(product.id, product);
        pendingIds.delete(product.id);
      }
    }

    if (pendingIds.size === 0 || !response.hasNext) {
      break;
    }

    page += 1;
  }

  return foundProducts;
};
