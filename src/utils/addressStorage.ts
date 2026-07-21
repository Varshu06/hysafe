import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedAddress {
  id: string;
  type: string; // Home/Office/Work/etc.
  address: string; // short
  fullAddress: string;
  location?: {
    lat: number;
    lng: number;
  };
}

const ADDRESSES_KEY = '@hysafe_saved_addresses';
const SELECTED_ADDRESS_ID_KEY = '@hysafe_selected_address_id';

export const addressStorage = {
  /**
   * Get all saved addresses from storage
   */
  async getAddresses(): Promise<SavedAddress[]> {
    try {
      const addressesJson = await AsyncStorage.getItem(ADDRESSES_KEY);
      if (addressesJson) {
        return JSON.parse(addressesJson);
      }
      return [];
    } catch (error) {
      console.error('Error getting addresses:', error);
      return [];
    }
  },

  /**
   * Save addresses to storage
   */
  async saveAddresses(addresses: SavedAddress[]): Promise<void> {
    try {
      await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
    } catch (error) {
      console.error('Error saving addresses:', error);
    }
  },

  /**
   * Add a new address
   */
  async addAddress(address: SavedAddress): Promise<void> {
    const addresses = await this.getAddresses();
    // Check if address with same ID exists
    const existingIndex = addresses.findIndex(a => a.id === address.id);
    if (existingIndex >= 0) {
      addresses[existingIndex] = address; // Update existing
    } else {
      addresses.push(address); // Add new
    }
    await this.saveAddresses(addresses);
  },

  /**
   * Remove an address
   */
  async removeAddress(addressId: string): Promise<void> {
    const addresses = await this.getAddresses();
    const filtered = addresses.filter(a => a.id !== addressId);
    await this.saveAddresses(filtered);
  },

  /**
   * Get addresses including user's profile address
   */
  async getAllAddresses(user?: any): Promise<SavedAddress[]> {
    const savedAddresses = await this.getAddresses();
    const allAddresses: SavedAddress[] = [];

    // Add user's profile address if available
    if (user?.address && user.address !== 'Address not provided') {
      const profileAddress: SavedAddress = {
        id: 'profile-address',
        type: 'Home',
        address: user.address.length > 30 ? user.address.substring(0, 30) + '...' : user.address,
        fullAddress: user.address,
        location: user.location,
      };
      allAddresses.push(profileAddress);
    }

    // Add saved addresses (avoid duplicates)
    savedAddresses.forEach(addr => {
      if (!allAddresses.find(a => a.id === addr.id)) {
        allAddresses.push(addr);
      }
    });

    return allAddresses;
  },

  /**
   * Get selected address ID
   */
  async getSelectedAddressId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(SELECTED_ADDRESS_ID_KEY);
    } catch (error) {
      console.error('Error getting selected address ID:', error);
      return null;
    }
  },

  /**
   * Set selected address ID
   */
  async setSelectedAddressId(addressId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SELECTED_ADDRESS_ID_KEY, addressId);
    } catch (error) {
      console.error('Error setting selected address ID:', error);
    }
  },

  /**
   * Get selected address
   */
  async getSelectedAddress(user?: any): Promise<SavedAddress | null> {
    try {
      const selectedId = await this.getSelectedAddressId();
      const addresses = await this.getAllAddresses(user);
      if (selectedId) {
        const selected = addresses.find(a => a.id === selectedId);
        if (selected) return selected;
      }
      // Return first address if no selection or selected not found
      return addresses.length > 0 ? addresses[0] : null;
    } catch (error) {
      console.error('Error getting selected address:', error);
      return null;
    }
  },

  /**
   * Clear all addresses
   */
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([ADDRESSES_KEY, SELECTED_ADDRESS_ID_KEY]);
  },
};

