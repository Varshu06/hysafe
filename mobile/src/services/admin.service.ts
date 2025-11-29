
// Placeholder Admin Service
// This service will interact with the backend Admin API

export interface CreateUserData {
  name: string;
  email?: string;
  phone: string;
  password: string;
  role: 'staff' | 'admin';
  vehicleType?: string;
}

export const createUser = async (userData: CreateUserData): Promise<any> => {
  // If using real backend:
  // const response = await api.post('/admin/users', userData);
  // return response.data;

  return new Promise((resolve) => {
    console.log('createUser called with:', userData);
    setTimeout(() => {
      resolve({ success: true, message: 'User created successfully' });
    }, 1000);
  });
};

export const getAllOrders = async (): Promise<any[]> => {
  return new Promise((resolve) => {
    console.log('getAllOrders called');
    setTimeout(() => {
      resolve([
        { id: '1', customer: 'User A', status: 'pending' },
        { id: '2', customer: 'User B', status: 'completed' },
      ]);
    }, 500);
  });
};

export const getAllStaff = async (): Promise<any[]> => {
  return new Promise((resolve) => {
    console.log('getAllStaff called');
    setTimeout(() => {
      resolve([
        { id: 's1', name: 'Staff 1', status: 'active' },
        { id: 's2', name: 'Staff 2', status: 'inactive' },
      ]);
    }, 500);
  });
};

export const getDashboardStats = async (): Promise<any> => {
  return new Promise((resolve) => {
    console.log('getDashboardStats called');
    setTimeout(() => {
      resolve({
        totalOrders: 150,
        activeOrders: 12,
        totalRevenue: 5000,
      });
    }, 500);
  });
};

export const assignOrderToStaff = async (orderId: string, staffId: string): Promise<any> => {
  return new Promise((resolve) => {
    console.log('assignOrderToStaff called with:', orderId, staffId);
    setTimeout(() => {
      resolve({ success: true, orderId, staffId });
    }, 500);
  });
};



