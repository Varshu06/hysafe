import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@hysafe_token';
const USER_KEY = '@hysafe_user';
const STAFF_ONLINE_KEY = '@hysafe_staff_online';
const FCM_TOKEN_KEY = '@hysafe_fcm_token';

export const storage = {
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  async setUser(user: any): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    const user = await AsyncStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, STAFF_ONLINE_KEY, FCM_TOKEN_KEY]);
  },

  async setStaffOnline(isOnline: boolean): Promise<void> {
    await AsyncStorage.setItem(STAFF_ONLINE_KEY, isOnline ? '1' : '0');
  },

  async getStaffOnline(): Promise<boolean> {
    const v = await AsyncStorage.getItem(STAFF_ONLINE_KEY);
    if (v == null) return false;
    return v === '1' || v.toLowerCase() === 'true';
  },

  async setFCMToken(token: string): Promise<void> {
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
  },

  async getFCMToken(): Promise<string | null> {
    return await AsyncStorage.getItem(FCM_TOKEN_KEY);
  },
};




