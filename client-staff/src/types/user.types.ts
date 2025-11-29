export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
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
  fcmToken?: string;
}

