export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id?: string;
  _id?: string;
  email?: string;
  phone: string;
  role: UserRole;
  name?: string;
  customerType?: 'home' | 'shop' | 'hotel' | 'bank' | 'event';
}

export interface CustomerProfile {
  id: string;
  userId: string;
  name: string;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
  customerType: 'home' | 'shop' | 'hotel' | 'bank' | 'event';
  paymentTerms: 'one-time' | 'monthly' | 'weekly';
  defaultPaymentMethod: 'online' | 'offline';
}

export interface Staff {
  id: string;
  userId: string;
  name: string;
  phone: string;
  isOnline: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  vehicleType?: string;
}




