// Placeholder Staff Service
// This service will interact with the backend Staff API

export const getAssignedOrders = async (): Promise<any[]> => {
  return new Promise((resolve) => {
    console.log('getAssignedOrders called');
    setTimeout(() => {
      resolve([
        {
          _id: '101',
          id: '101',
          status: 'pending',
          quantity: 2,
          pickupAddress: 'Hy-Safe Plant, 12 Industrial Rd, Chennai',
          deliveryAddress: '9/482, Btype, 50th street, Sidco Nagar, Chennai',
          pickupLocation: { lat: 13.0827, lng: 80.2707 },
          location: { lat: 13.0953, lng: 80.2671 }, // delivery
          paymentMethod: 'offline',
          totalPrice: 200,
          codAmount: 200,
          notes: 'Call on arrival',
          createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
          customer: 'John Doe',
          customerPhone: '9876543210',
          deliverySlot: 'Today • 30-45 mins',
        },
        {
          _id: '102',
          id: '102',
          status: 'accepted',
          quantity: 1,
          pickupAddress: 'Hy-Safe Plant, 12 Industrial Rd, Chennai',
          deliveryAddress: '24/11, 3rd Main Rd, Anna Nagar, Chennai',
          pickupLocation: { lat: 13.0827, lng: 80.2707 },
          location: { lat: 13.0878, lng: 80.2102 }, // delivery
          paymentMethod: 'online',
          totalPrice: 100,
          codAmount: 0,
          notes: '',
          createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
          customer: 'Jane Smith',
          customerPhone: '9123456780',
          deliverySlot: 'Today • 60-90 mins',
        },
        {
          _id: '103',
          id: '103',
          status: 'picked',
          quantity: 3,
          pickupAddress: 'Hy-Safe Plant, 12 Industrial Rd, Chennai',
          deliveryAddress: '18/2, OMR, Sholinganallur, Chennai',
          pickupLocation: { lat: 13.0827, lng: 80.2707 },
          location: { lat: 12.8996, lng: 80.2209 }, // delivery
          paymentMethod: 'offline',
          totalPrice: 300,
          codAmount: 300,
          notes: 'Leave with guard if not reachable',
          createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          customer: 'Arun Kumar',
          customerPhone: '9000000001',
          deliverySlot: 'Today • 2:00 PM',
        },
        {
          _id: '104',
          id: '104',
          status: 'transit',
          quantity: 1,
          pickupAddress: 'Hy-Safe Plant, 12 Industrial Rd, Chennai',
          deliveryAddress: '5/77, Velachery, Chennai',
          pickupLocation: { lat: 13.0827, lng: 80.2707 },
          location: { lat: 12.9784, lng: 80.2180 }, // delivery
          paymentMethod: 'online',
          totalPrice: 100,
          codAmount: 0,
          notes: '',
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          customer: 'Meera',
          customerPhone: '9000000002',
          deliverySlot: 'Today • 4:00 PM',
        },
      ]);
    }, 500);
  });
};

export const updateDeliveryStatus = async (orderId: string, status: string): Promise<any> => {
  return new Promise((resolve) => {
    console.log('updateDeliveryStatus called with:', orderId, status);
    setTimeout(() => {
      resolve({ orderId, status, success: true });
    }, 500);
  });
};

export const getStaffProfile = async (): Promise<any> => {
  return new Promise((resolve) => {
    console.log('getStaffProfile called');
    setTimeout(() => {
      resolve({ id: 'staff-1', name: 'Staff Member', role: 'staff' });
    }, 500);
  });
};

export const acceptOrder = async (orderId: string): Promise<any> => {
  return new Promise((resolve) => {
    console.log('acceptOrder called with:', orderId);
    setTimeout(() => {
      resolve({ orderId, status: 'accepted', success: true });
    }, 500);
  });
};

export const rejectOrder = async (orderId: string): Promise<any> => {
  return new Promise((resolve) => {
    console.log('rejectOrder called with:', orderId);
    setTimeout(() => {
      resolve({ orderId, status: 'rejected', success: true });
    }, 500);
  });
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
    console.log('getInventory called');
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



