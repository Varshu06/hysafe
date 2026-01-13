import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Loader } from '../../src/components/ui/Loader';
import { useAuth } from '../../src/context/AuthContext';
import { acceptOrder, getAssignedOrders, rejectOrder } from '../../src/services/staff.service';
import { COLORS } from '../../src/utils/constants';
import { StaffHeader } from '../../src/components/staff/StaffHeader';
import { StaffOrderCard } from '../../src/components/staff/StaffOrderCard';
import { Chip, ChipRow } from '../../src/components/staff/StaffChips';
import { ReasonModal } from '../../src/components/staff/ReasonModal';
import { haversineKm, etaMinutes } from '../../src/utils/geo';
import { storage } from '../../src/utils/storage';

export default function NewOrdersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  // Placeholder state until OrderContext is fully implemented for staff
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'nearest' | 'quantity'>('newest');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [staffLocation, setStaffLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      const online = await storage.getStaffOnline();
      setIsOnline(online);
      refreshAvailableOrders();
    };
    load();
  }, []);

  const refreshAvailableOrders = async () => {
    setIsLoading(true);
    try {
      // Mock fetching available orders
      const orders = await getAssignedOrders();
      setAvailableOrders(orders.filter((o: any) => String(o.status).toLowerCase() === 'pending'));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setIsToggling(true);
      let location = undefined;
      
      if (!isOnline) {
        // Get location when going online
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          location = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          };
          setStaffLocation(location);
        }
      }

      // Toggle status API call here
      const next = !isOnline;
      setIsOnline(next);
      await storage.setStaffOnline(next);
      // await toggleStatus(!staff?.isOnline, location);
      // await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setIsToggling(false);
    }
  };

  const handleCallCustomer = async (phone?: string) => {
    if (!phone) return Alert.alert('No phone number', 'Customer phone number is not available.');
    const url = `tel:${phone}`;
    const can = await Linking.canOpenURL(url);
    if (!can) return Alert.alert('Not supported', 'Calling is not supported on this device.');
    await Linking.openURL(url);
  };

  const handleNavigate = async (coords?: { lat: number; lng: number }) => {
    if (!coords) return Alert.alert('No location', 'Delivery location is not available.');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`;
    const can = await Linking.canOpenURL(url);
    if (!can) return Alert.alert('Not supported', 'Maps is not supported on this device.');
    await Linking.openURL(url);
  };

  const handleAccept = async (orderId: string) => {
    try {
      await acceptOrder(orderId);
      Alert.alert('Success', 'Order accepted!');
      refreshAvailableOrders();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept order');
    }
  };

  const handleReject = async (orderId: string, reason: string) => {
    try {
      await rejectOrder(orderId);
      console.log('reject reason:', reason);
      refreshAvailableOrders();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject order');
    }
  };

  const sortedOrders = (() => {
    const list = [...availableOrders];
    if (sortBy === 'quantity') {
      list.sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
      return list;
    }
    if (sortBy === 'nearest') {
      list.sort((a, b) => {
        const da = haversineKm(staffLocation || undefined, a.location);
        const db = haversineKm(staffLocation || undefined, b.location);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
      return list;
    }
    // newest
    list.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return list;
  })();

  const renderOrderCard = ({ item }: { item: any }) => {
    const id = item._id || item.id;
    const paymentLabel = String(item.paymentMethod || 'offline').toLowerCase() === 'online' ? 'UPI' : 'COD';
    const dist = haversineKm(staffLocation || undefined, item.location);
    const eta = etaMinutes(dist);

    return (
      <StaffOrderCard
        status={item.status}
        id={String(id)}
        createdAt={item.createdAt}
        quantity={item.quantity || 1}
        deliveryAddress={item.deliveryAddress}
        customer={item.customer}
        paymentLabel={paymentLabel}
        distanceKm={dist}
        etaMin={eta}
        compact
        compactShowAddress
        onPress={() => router.push(`/(staff)/order-details/${id}`)}
        quickActions={
          <>
            <TouchableOpacity style={styles.quickBtn} onPress={() => handleCallCustomer(item.customerPhone)} activeOpacity={0.85}>
              <Feather name="phone" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => handleNavigate(item.location)} activeOpacity={0.85}>
              <Feather name="map" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push(`/(staff)/order-details/${id}`)} activeOpacity={0.85}>
              <Feather name="file-text" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Details</Text>
            </TouchableOpacity>
          </>
        }
        actions={
          <View style={styles.buttonRow}>
            <Button title="Reject" variant="outline" onPress={() => setRejectingId(String(id))} style={styles.actionButton} />
            <Button title="Accept" variant="primary" onPress={() => handleAccept(String(id))} style={styles.actionButton} />
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader title="New Orders" />

      {/* Online/Offline Toggle */}
      <View style={styles.content}>
        <View style={styles.toggleCard}>
          <View>
            <Text style={styles.toggleLabel}>Status</Text>
            <Text style={styles.toggleValue}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              isOnline ? styles.toggleOnline : styles.toggleOffline,
              isToggling && styles.toggleDisabled,
            ]}
            onPress={handleToggleStatus}
            disabled={isToggling}
            activeOpacity={0.85}
          >
            {isToggling ? (
              <Loader size="small" color={COLORS.secondary} />
            ) : (
              <Text style={styles.toggleText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {isOnline ? (
          <View style={styles.sortCard}>
            <Text style={styles.sortTitle}>Sort</Text>
            <ChipRow>
              <Chip label="Newest" active={sortBy === 'newest'} onPress={() => setSortBy('newest')} />
              <Chip label="Nearest" active={sortBy === 'nearest'} onPress={() => setSortBy('nearest')} />
              <Chip label="Quantity" active={sortBy === 'quantity'} onPress={() => setSortBy('quantity')} />
            </ChipRow>
          </View>
        ) : null}

      {/* Orders List */}
      {!isOnline ? (
        <View style={styles.emptyContainer}>
          <Feather name="wifi-off" size={28} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>You’re offline</Text>
          <Text style={styles.emptyText}>Go online to receive new orders.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshAvailableOrders}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={28} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No new orders</Text>
              <Text style={styles.emptyText}>Pull to refresh.</Text>
            </View>
          }
        />
      )}
      </View>

      <ReasonModal
        visible={!!rejectingId}
        title="Reject order"
        placeholder="Reason (e.g., too far / busy / out of stock)"
        confirmText="Reject"
        onClose={() => setRejectingId(null)}
        onConfirm={(reason) => {
          if (!rejectingId) return;
          handleReject(rejectingId, reason);
          setRejectingId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  toggleCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  toggleValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleOnline: {
    backgroundColor: '#FEE2E2',
  },
  toggleOffline: {
    backgroundColor: '#D1FAE5',
  },
  toggleDisabled: {
    opacity: 0.6,
  },
  toggleText: {
    color: COLORS.text,
    fontWeight: '800',
  },
  sortCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  quickBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '600',
  },
});



