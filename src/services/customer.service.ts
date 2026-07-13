import api from './api';

export interface UpdateProfileData {
  name?: string;
  email?: string;
  customerType?: 'home' | 'shop' | 'hotel' | 'bank' | 'event';
  paymentTerms?: 'one-time' | 'weekly' | 'monthly';
}

export interface UpdateProfileResponse {
  message: string;
  user: any;
}

export interface LoginActivity {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  location: string;
  loginAt: string;
}

export interface LoginActivityResponse {
  activities: LoginActivity[];
}

/**
 * Update customer profile
 */
export const updateProfile = async (data: UpdateProfileData): Promise<UpdateProfileResponse> => {
  try {
    const response = await api.put<UpdateProfileResponse>('/customers/profile', data);
    return response.data;
  } catch (error: any) {
    console.error('Update profile error:', error);
    
    // Handle HTTP status errors
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.message || 'Invalid request. Please check your input.';
      throw new Error(errorMessage);
    }
    
    if (error.response?.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to update this profile.');
    }
    
    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    // Generic error message
    const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile. Please try again.';
    throw new Error(errorMessage);
  }
};

/**
 * Get login activity history
 */
export const getLoginActivity = async (): Promise<LoginActivityResponse> => {
  try {
    const response = await api.get<LoginActivityResponse>('/customers/login-activity');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching login activity:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch login activity');
  }
};

