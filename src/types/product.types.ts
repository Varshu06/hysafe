export interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  deliveryCharge: number;
  image: string;
  available: boolean;
}

export interface ProductResponse {
  data: Product[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}
