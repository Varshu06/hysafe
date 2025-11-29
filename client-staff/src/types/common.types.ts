export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
}

export interface Location {
  lat: number;
  lng: number;
}

