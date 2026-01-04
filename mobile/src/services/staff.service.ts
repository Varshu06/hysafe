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
          paymentMethod: 'offline',
          notes: 'Call on arrival',
          createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
          customer: 'John Doe',
        },
        {
          _id: '102',
          id: '102',
          status: 'accepted',
          quantity: 1,
          pickupAddress: 'Hy-Safe Plant, 12 Industrial Rd, Chennai',
          deliveryAddress: '24/11, 3rd Main Rd, Anna Nagar, Chennai',
          paymentMethod: 'online',
          notes: '',
          createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
          customer: 'Jane Smith',
        },
        {
          _id: '103',
          id: '103',
          status: 'picked',
          quantity: 3,
          pickupAddress: 'Hy-Safe Plant, 12 Industrial Rd, Chennai',
          deliveryAddress: '18/2, OMR, Sholinganallur, Chennai',
          paymentMethod: 'offline',
          notes: 'Leave with guard if not reachable',
          createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          customer: 'Arun Kumar',
        },
        {
          _id: '104',
          id: '104',
          status: 'transit',
          quantity: 1,
          pickupAddress: 'Hy-Safe Plant, 12 Industrial Rd, Chennai',
          deliveryAddress: '5/77, Velachery, Chennai',
          paymentMethod: 'online',
          notes: '',
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          customer: 'Meera',
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



