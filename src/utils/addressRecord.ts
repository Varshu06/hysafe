export type StoredPoint = { lat: number; lng: number };

function isSelectablePoint(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    && !(latitude === 0 && longitude === 0);
}

export function storedPoint(value: unknown): StoredPoint | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as { lat?: unknown; lng?: unknown };
  const lat = Number(record.lat);
  const lng = Number(record.lng);
  return isSelectablePoint(lat, lng) ? { lat, lng } : undefined;
}

export function parseStoredAddresses<T extends { id?: unknown; location?: unknown }>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as T;
      if (typeof record.id !== 'string' || !record.id) return [];
      return [{ ...record, location: storedPoint(record.location) }];
    });
  } catch {
    return [];
  }
}

export function chooseSelectedAddressId(
  addresses: Array<{ id: string }>,
  currentId: string | null,
  storedId: string | null,
): string | null {
  if (currentId && addresses.some((address) => address.id === currentId)) return currentId;
  if (storedId && addresses.some((address) => address.id === storedId)) return storedId;
  return addresses[0]?.id || null;
}

export interface SavedAddress {
  id: string;
  type: string;
  address: string;
  fullAddress: string;
  location?: StoredPoint;
}

export const LEGACY_SAVED_ADDRESSES_KEY = '@hysafe_saved_addresses';
export const LEGACY_SELECTED_ADDRESS_KEY = '@hysafe_selected_address_id';

export interface AddressKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

function profileFields(profile: unknown): { address?: string; location?: unknown } {
  if (!profile || typeof profile !== 'object') return {};
  const record = profile as { address?: unknown; location?: unknown };
  return {
    address: typeof record.address === 'string' ? record.address : undefined,
    location: record.location,
  };
}

function usableAccountId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Prefer the normalized user.id, then _id. Email and phone are never storage identities. */
export function accountId(value: unknown): string | null {
  if (typeof value === 'string') return usableAccountId(value);
  if (!value || typeof value !== 'object') return null;
  const record = value as { id?: unknown; _id?: unknown };
  return usableAccountId(record.id) ?? usableAccountId(record._id);
}

export function savedAddressStorageKey(userId: string): string {
  return `${LEGACY_SAVED_ADDRESSES_KEY}:${userId}`;
}

export function selectedAddressStorageKey(userId: string): string {
  return `${LEGACY_SELECTED_ADDRESS_KEY}:${userId}`;
}

export function createAddressBook(storage: AddressKeyValueStore) {
  const discardLegacyKeys = async () => {
    try {
      await storage.multiRemove([LEGACY_SAVED_ADDRESSES_KEY, LEGACY_SELECTED_ADDRESS_KEY]);
    } catch {
      // Scoped keys remain the only ones that are read.
    }
  };

  const readSaved = async (id: string): Promise<SavedAddress[]> => {
    await discardLegacyKeys();
    try {
      return parseStoredAddresses<SavedAddress>(await storage.getItem(savedAddressStorageKey(id)));
    } catch (error) {
      console.error('Error getting addresses:', error);
      throw error;
    }
  };

  const book = {
    async getAddresses(user: unknown): Promise<SavedAddress[]> {
      const id = accountId(user);
      if (!id) return [];
      return readSaved(id);
    },

    async saveAddresses(user: unknown, addresses: SavedAddress[]): Promise<void> {
      const id = accountId(user);
      if (!id) return;
      const key = savedAddressStorageKey(id);
      await discardLegacyKeys();
      await storage.setItem(key, JSON.stringify(addresses));
    },

    async addAddress(user: unknown, address: SavedAddress): Promise<void> {
      const id = accountId(user);
      if (!id) return;
      const key = savedAddressStorageKey(id);
      await discardLegacyKeys();
      const location = storedPoint(address.location);
      const stored = location ? { ...address, location } : { ...address, location: undefined };
      let addresses: SavedAddress[] = [];
      try {
        addresses = parseStoredAddresses<SavedAddress>(await storage.getItem(key));
      } catch (error) {
        console.error('Error getting addresses:', error);
        throw error;
      }
      const existingIndex = addresses.findIndex((item) => item.id === stored.id);
      if (existingIndex >= 0) addresses[existingIndex] = stored;
      else addresses.push(stored);
      await storage.setItem(key, JSON.stringify(addresses));
    },

    async removeAddress(user: unknown, addressId: string): Promise<void> {
      const id = accountId(user);
      if (!id) return;
      const key = savedAddressStorageKey(id);
      await discardLegacyKeys();
      const addresses = parseStoredAddresses<SavedAddress>(await storage.getItem(key));
      await storage.setItem(key, JSON.stringify(addresses.filter((item) => item.id !== addressId)));
    },

    async getAllAddresses(user: unknown, profile?: unknown): Promise<SavedAddress[]> {
      const id = accountId(user);
      if (!id) return [];
      const savedAddresses = await readSaved(id);
      const allAddresses: SavedAddress[] = [];
      const fields = profileFields(profile);
      if (fields.address && fields.address !== 'Address not provided') {
        const fullAddress = fields.address;
        allAddresses.push({
          id: 'profile-address',
          type: 'Home',
          address: fullAddress.length > 30 ? `${fullAddress.substring(0, 30)}...` : fullAddress,
          fullAddress,
          location: storedPoint(fields.location),
        });
      }
      savedAddresses.forEach((addr) => {
        if (!allAddresses.some((item) => item.id === addr.id)) allAddresses.push(addr);
      });
      return allAddresses;
    },

    async getSelectedAddressId(user: unknown): Promise<string | null> {
      const id = accountId(user);
      if (!id) return null;
      await discardLegacyKeys();
      try {
        return await storage.getItem(selectedAddressStorageKey(id));
      } catch (error) {
        console.error('Error getting selected address ID:', error);
        return null;
      }
    },

    async setSelectedAddressId(user: unknown, addressId: string): Promise<void> {
      const id = accountId(user);
      if (!id) return;
      const key = selectedAddressStorageKey(id);
      await discardLegacyKeys();
      await storage.setItem(key, addressId);
    },

    async getSelectedAddress(user: unknown, profile?: unknown): Promise<SavedAddress | null> {
      const id = accountId(user);
      if (!id) return null;
      try {
        const selectedId = await book.getSelectedAddressId(id);
        const addresses = await book.getAllAddresses(id, profile);
        if (selectedId) {
          const selected = addresses.find((item) => item.id === selectedId);
          if (selected) return selected;
        }
        return addresses[0] ?? null;
      } catch (error) {
        console.error('Error getting selected address:', error);
        return null;
      }
    },

    async clearAll(user: unknown): Promise<void> {
      const id = accountId(user);
      if (!id) return;
      await discardLegacyKeys();
      await storage.multiRemove([savedAddressStorageKey(id), selectedAddressStorageKey(id)]);
    },
  };

  return book;
}
