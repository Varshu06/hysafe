import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { Loader } from '../../src/components/ui/Loader';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { useAuth } from '../../src/context/AuthContext';
import { acceptOrder, getAssignedOrders, rejectOrder } from '../../src/services/staff.service';
import { COLORS } from '../../src/utils/constants';

export default function NewOrdersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Placeholder state until OrderContext is fully implemented for staff
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    refreshAvailableOrders();
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
        }
      }

      // Toggle status API call here
      setIsOnline(!isOnline);
      // await toggleStatus(!staff?.isOnline, location);
      // await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setIsToggling(false);
    }
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

  const handleReject = async (orderId: string) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectOrder(orderId);
              refreshAvailableOrders();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject order');
            }
          },
        },
      ]
    );
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const id = item._id || item.id;
    const paymentLabel = String(item.paymentMethod || 'offline').toLowerCase() === 'online' ? 'UPI' : 'COD';
    const created = item.createdAt ? new Date(item.createdAt) : null;
    const time = created
      ? created.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => router.push(`/(staff)/order-details/${id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <StatusBadge status={item.status} />
            <View style={styles.paymentChip}>
              <Text style={styles.paymentChipText}>{paymentLabel}</Text>
            </View>
          </View>
          <Text style={styles.metaText}>
            #{id} {time ? `• ${time}` : ''}
          </Text>
        </View>

        <Text style={styles.orderQuantity}>{item.quantity || 1} x 20L</Text>

        <View style={styles.infoRow}>
          <Feather name="map-pin" size={16} color="#94A3B8" />
          <Text style={styles.value} numberOfLines={1}>
            {item.deliveryAddress || 'Address not available'}
          </Text>
        </View>

        {item.pickupAddress ? (
          <View style={styles.infoRow}>
            <Feather name="package" size={16} color="#94A3B8" />
            <Text style={styles.value} numberOfLines={1}>
              {item.pickupAddress}
            </Text>
          </View>
        ) : null}

        {item.notes ? (
          <View style={styles.notesRow}>
            <Feather name="message-circle" size={14} color="#94A3B8" />
            <Text style={styles.notesText} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <Button title="Reject" variant="danger" onPress={() => handleReject(id)} style={styles.actionButton} />
          <Button title="Accept" variant="success" onPress={() => handleAccept(id)} style={styles.actionButton} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>New Orders</Text>
        <View style={styles.headerRight} />
      </View>

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

      {/* Orders List */}
      {!isOnline ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Go online to receive new orders
          </Text>
        </View>
      ) : (
        <FlatList
          data={availableOrders}
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
              <Text style={styles.emptyText}>No new orders available</Text>
            </View>
          }
        />
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.accent,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: { width: 40 },
  headerRight: { width: 40 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  toggleCard: {
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
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
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  toggleOnline: {
    backgroundColor: COLORS.success,
  },
  toggleOffline: {
    backgroundColor: COLORS.textLight,
  },
  toggleDisabled: {
    opacity: 0.6,
  },
  toggleText: {
    color: COLORS.secondary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paymentChipText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  orderQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  value: {
    fontSize: 14,
    color: 'white',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 2,
    marginBottom: 12,
  },
  notesText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});



