import api from "./api";
import { PaymentMethod } from "@/components/staff/DeliveryConfirmModal";

/**
 * Toggle staff online/offline status
 */
export const toggleStatus = async (
  isOnline: boolean,
  location?: { lat: number; lng: number },
  fcmToken?: string,
): Promise<any> => {
  try {
    const response = await api.put("/staff/status", {
      isOnline,
      location,
      fcmToken,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to update status";
    throw new Error(errorMessage);
  }
};

/**
 * Get available orders (pending, not assigned)
 */
export const getAssignedOrders = async (): Promise<any[]> => {
  try {
    const response = await api.get("/staff/available-orders");
    // Transform backend order format to match frontend expectations
    return response.data.map((order: any) => ({
      ...order,
      id: order._id,
      customer:
        order.customerId?.name || (order as any).customer?.name || "Customer",
      customerPhone:
        order.customerId?.phone || (order as any).customer?.phone || "",
      pickupAddress: "Hy-Safe Plant, 12 Industrial Rd, Chennai", // Default pickup
      pickupLocation: { lat: 13.0827, lng: 80.2707 }, // Default factory location
      location: order.location || { lat: 0, lng: 0 },
      codAmount: order.paymentMethod === "offline" ? order.totalPrice : 0,
    }));
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch orders";
    console.error("Get available orders error:", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get ongoing orders (accepted, out_for_delivery)
 */
export const getOngoingOrders = async (): Promise<any[]> => {
  try {
    const response = await api.get("/staff/ongoing-orders");
    return response.data.map((order: any) => ({
      ...order,
      id: order._id,
      customer:
        order.customerId?.name || (order as any).customer?.name || "Customer",
      customerPhone:
        order.customerId?.phone || (order as any).customer?.phone || "",
      pickupAddress: "Hy-Safe Plant, 12 Industrial Rd, Chennai",
      pickupLocation: { lat: 13.0827, lng: 80.2707 },
      location: order.location || { lat: 0, lng: 0 },
      codAmount: order.paymentMethod === "offline" ? order.totalPrice : 0,
    }));
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch ongoing orders";
    throw new Error(errorMessage);
  }
};

/**
 * Accept an order
 */
export const acceptOrder = async (orderId: string): Promise<any> => {
  try {
    console.log("Calling accept API for:", orderId);

    const response = await api.post(`/staff/accept-order/${orderId}`);

    console.log("Accept API Response:", response.data);

    return response.data;
  } catch (error: any) {
    console.log("Accept API Error:", error.response?.data);
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      "Failed to accept order"
    );
  }
};

/**
 * Reject an order
 */
export const rejectOrder = async (
  orderId: string,
  reason?: string,
): Promise<any> => {
  try {
    const response = await api.post(`/staff/reject-order/${orderId}`, {
      reason,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to reject order";
    throw new Error(errorMessage);
  }
};

/**
 * Update order status (for staff)
 */
export const updateDeliveryStatus = async (
  orderId: string,
  status: string,
  paymentMethod?: PaymentMethod,
  transactionId?: string,
  notes?: string,
): Promise<any> => {
  try {
    const response = await api.put(`/staff/update-status/${orderId}`, {
      status,
      paymentMethod,
      transactionId,
      notes,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to update order status";
    throw new Error(errorMessage);
  }
};

/**
 * Get staff profile
 */
export const getStaffProfile = async (): Promise<any> => {
  try {
    // This would typically be from auth context, but if needed from API:
    const response = await api.get("/auth/profile");
    return response.data.user;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message || error.message || "Failed to get profile";
    throw new Error(errorMessage);
  }
};

/**
 * Get inventory information (read-only for staff)
 */
export const getInventory = async (): Promise<{
  availableAtFactory: number;
  assignedToDeliveries: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}> => {
  return new Promise((resolve) => {
    console.log("getInventory called");
    setTimeout(() => {
      // Mock inventory data
      // In real implementation, this would fetch from backend API
      const availableAtFactory = 150; // cans available at factory
      const assignedToDeliveries = 45; // cans assigned to deliveries
      const lowStockThreshold = 50; // threshold for low stock warning
      const isLowStock = availableAtFactory < lowStockThreshold;

      resolve({
        availableAtFactory,
        assignedToDeliveries,
        lowStockThreshold,
        isLowStock,
      });
    }, 500);
  });
};
