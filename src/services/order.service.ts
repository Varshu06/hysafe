import { AxiosError } from "axios";
import api from "./api";
import { Order } from "../types/order.types";

/**
 * Create a new order
 */
export const createOrder = async (
  orderData: Partial<Order>,
): Promise<{ success: boolean; order: Order }> => {
  try {
    console.log("Creating order with data:", orderData);
    const response = await api.post<{ success: boolean; order: Order }>(
      "/orders",
      orderData,
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to create order";
    throw new Error(errorMessage);
  }
};

/**
 * Get all orders for the current customer
 */
export const getMyOrders = async (): Promise<Order[]> => {
  try {
    const response = await api.get<Order[]>("/orders");
    // Transform backend order format to match frontend Order type
    return response.data.map((order: any) => ({
      ...order,
      driverName: order.assignedStaffId?.name || order.assignedStaff?.name,
      assignedStaff: order.assignedStaffId || order.assignedStaff,
    }));
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch orders";
    console.error("Get orders error:", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (id: string): Promise<Order> => {
  try {
    const response = await api.get<Order>(`/orders/${id}`);
    const order = response.data;
    // Transform backend order format
    return {
      ...order,
      driverName:
        order.assignedStaffId?.name ||
        order.assignedStaff?.name ||
        (order as any).assignedStaff?.name,
      assignedStaff:
        order.assignedStaffId ||
        order.assignedStaff ||
        (order as any).assignedStaff,
    };
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message || error.message || "Failed to fetch order";
    if (error.response?.status === 404) {
      throw new Error("Order not found");
    }
    throw new Error(errorMessage);
  }
};

/**
 * Cancel order (customer)
 */
export const cancelOrder = async (id: string): Promise<any> => {
  try {
    const response = await api.put(`/orders/${id}/cancel`);
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to cancel order";
    throw new Error(errorMessage);
  }
};

/**
 * Update order status (for customers to cancel - kept for backward compatibility)
 */
export const updateOrderStatus = async (
  id: string,
  status: string,
): Promise<any> => {
  if (status === "cancelled") {
    return cancelOrder(id);
  }
  // For other statuses, this would need a different endpoint
  throw new Error("Only cancellation is supported for customers");
};
