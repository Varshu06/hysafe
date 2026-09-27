export type ProductAvailabilityState = 'available' | 'coming_soon' | 'unavailable';

interface ProductAvailabilityInput {
  available?: boolean;
  comingSoon?: boolean;
  quantity?: number;
}

export const getProductAvailabilityState = (
  product: ProductAvailabilityInput | null | undefined,
  requestedQuantity = 1,
): ProductAvailabilityState => {
  if (product?.comingSoon === true) return 'coming_soon';
  const stock = Number(product?.quantity);
  if (
    !product ||
    product.available !== true ||
    !Number.isFinite(requestedQuantity) ||
    requestedQuantity < 1 ||
    !Number.isFinite(stock) ||
    stock < requestedQuantity
  ) return 'unavailable';
  return 'available';
};
