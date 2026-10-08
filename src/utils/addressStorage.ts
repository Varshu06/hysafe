import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAddressBook, type SavedAddress } from './addressRecord';

export type { SavedAddress };

export const addressStorage = createAddressBook(AsyncStorage);
