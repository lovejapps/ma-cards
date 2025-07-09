import * as SecureStore from 'expo-secure-store';

// --- Storage abstraction for cross-platform persistence ---
export const storage = {
  async getItem(key: string) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {}
  },
  async removeItem(key: string) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {}
  },
};