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
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { getAssignedOrders, updateDeliveryStatus } from '../../src/services/staff.service';
import { COLORS } from '../../src/utils/constants';

export default function OngoingOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ongoingOrders, setOngoingOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    refreshOngoingOrders();
  }, []);

  const refreshOngoingOrders = async () => {
    setIsLoading(true);
    try {
      const orders = await getAssignedOrders();
      setOngoingOrders(orders.filter((o: any) => String(o.status).toLowerCase() !== 'pending'));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateDeliveryStatus(orderId, status);
      Alert.alert('Success', 'Order status updated!');
      refreshOngoingOrders();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const getStatusButton = (order: any) => {
    const id = order._id || order.id;
    switch (order.status) {
      case 'accepted':
        return (
          <Button
            title="Order Picked"
            variant="primary"
            onPress={() => handleStatusUpdate(id, 'picked')}
            style={styles.statusButton}
          />
        );
      case 'picked':
        return (
          <Button
            title="In Transit"
            variant="primary"
            onPress={() => handleStatusUpdate(id, 'transit')}
            style={styles.statusButton}
          />
        );
      case 'transit':
      case 'in-transit':
        return (
          <Button
            title="Mark Delivered"
            variant="success"
            onPress={() => handleStatusUpdate(id, 'delivered')}
            style={styles.statusButton}
          />
        );
      default:
        return null;
    }
  };

  const renderOrderCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.orderCard}
      activeOpacity={0.85}
      onPress={() => router.push(`/(staff)/order-details/${item._id || item.id}`)}
    >
      <View style={styles.cardHeader}>
        <StatusBadge status={item.status} />
        <Text style={styles.metaText}>#{item._id || item.id}</Text>
      </View>

      <Text style={styles.orderQuantity}>{item.quantity || 1} x 20L</Text>

      <View style={styles.infoRow}>
        <Feather name="map-pin" size={16} color="#94A3B8" />
        <Text style={styles.value} numberOfLines={1}>
          {item.deliveryAddress || 'Address not available'}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Feather name="credit-card" size={16} color="#94A3B8" />
        <Text style={styles.value}>
          {String(item.paymentMethod || 'offline').toLowerCase() === 'online' ? 'UPI' : 'COD'}
        </Text>
      </View>

      {getStatusButton(item)}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Ongoing</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={ongoingOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => String(item._id || item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshOngoingOrders} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ongoing orders</Text>
          </View>
        }
      />
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
  listContent: {
    padding: 20,
    paddingBottom: 40,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  statusButton: {
    marginTop: 12,
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



