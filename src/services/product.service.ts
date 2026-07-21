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
