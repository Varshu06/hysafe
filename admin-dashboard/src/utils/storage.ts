import { STORAGE_KEYS } from './constants';

export const storage = {
  getToken: () => localStorage.getItem(STORAGE_KEYS.TOKEN),
  setToken: (token: string) => localStorage.setItem(STORAGE_KEYS.TOKEN, token),
  removeToken: () => localStorage.removeItem(STORAGE_KEYS.TOKEN),

  getUser: () => {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: unknown) =>
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(STORAGE_KEYS.USER),

  getSidebarState: () => {
    const state = localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN);
    return state !== 'false';
  },
  setSidebarState: (open: boolean) =>
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, String(open)),

  clearAll: () => localStorage.clear(),
};
