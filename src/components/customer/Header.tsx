import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { addressStorage, SavedAddress } from '../../utils/addressStorage';
import { COLORS } from '../../utils/constants';
import { NotificationCenter } from '../ui/NotificationCenter';

export const CustomerHeader = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  const { t } = useTranslation();
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  
  const cartCount = getTotalItems();
  // Fetch current location
  const fetchCurrentLocation = useCallback(async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsFetchingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const fullAddress = [
        address?.name,
        address?.street,
        address?.city,
        address?.region,
      ].filter(Boolean).join(', ');

      setCurrentLocation(fullAddress || 'Current Location');
    } catch (error) {
      // Silently fail - will fallback to saved address
      console.warn('Failed to fetch current location:', error);
    } finally {
      setIsFetchingLocation(false);
    }
  }, []);

  // Load selected address
  const loadSelectedAddress = useCallback(async () => {
    const selected = await addressStorage.getSelectedAddress(user);
    setSelectedAddress(selected);
  }, [user]);

  useEffect(() => {
    loadSelectedAddress();
    fetchCurrentLocation();
  }, [loadSelectedAddress, fetchCurrentLocation]);

  // Refresh address when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSelectedAddress();
      fetchCurrentLocation();
    }, [loadSelectedAddress, fetchCurrentLocation])
  );

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
    <View style={styles.container}>
      <TouchableOpacity style={styles.addressContainer} onPress={() => router.push('/(customer)/address/search')}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>
              {isFetchingLocation ? 'Fetching...' : currentLocation ? 'Current Location' : (selectedAddress?.type || 'Home')}
            </Text>
            {isFetchingLocation ? (
              <ActivityIndicator size="small" color={COLORS.text} style={styles.chevron} />
            ) : (
              <Feather name="chevron-down" size={16} color={COLORS.text} style={styles.chevron} />
            )}
          </View>
        <Text style={styles.address} numberOfLines={2}>
          {isFetchingLocation 
            ? 'Getting your location...' 
            : currentLocation || selectedAddress?.address || selectedAddress?.fullAddress || 'Select delivery address'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.actions}>
           <NotificationCenter topInset={insets.top} onNotificationPress={(item) => {
             if (item.orderId) router.push({ pathname: '/(customer)/order-details/[id]', params: { id: item.orderId } });
             else if (item.recurringDeliveryId) router.push('/(customer)/recurring-deliveries');
             else if (item.billId) router.push({ pathname: '/(customer)/recurring-deliveries/bill', params: { billId: item.billId } });
           }} />
           <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/(customer)/checkout')}>
              <Feather name="shopping-cart" size={18} color="#FFFFFF" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
         </TouchableOpacity>
        </View>
      </View>
      <View style={styles.divider} />

    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  addressContainer: {
    flex: 1,
    marginRight: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: 18,
  },
  chevron: {
    marginLeft: 4,
  },
  address: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {
    fontSize: 18,
  },
  cartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#102841',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4EFFA',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  notificationModal: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 16,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: 24,
  },
  emptyNotification: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyNotificationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    lineHeight: 22,
  },
  emptyNotificationSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationList: { maxHeight: 330 },
  notificationItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  notificationItemText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  notificationDate: { fontSize: 12, color: '#64748B', marginTop: 5 },
  notificationRetry: { color: '#0284C7', fontSize: 14, fontWeight: '600', paddingTop: 10 },
});

