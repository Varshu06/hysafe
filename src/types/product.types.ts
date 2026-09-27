import { ProductImageSource } from "../utils/image";

export interface Product {
  availabilityState?: "available" | "coming_soon" | "unavailable";
  id: string;
  name: string;
  volume: string;
  quantity: number;
  price: number;
  deliveryCharge: number;
  image?: ProductImageSource;
  available: boolean;
  comingSoon?: boolean;
}

export interface ProductResponse {
  data: Product[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}
