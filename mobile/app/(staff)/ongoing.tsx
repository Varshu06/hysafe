import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { getAssignedOrders, updateDeliveryStatus } from '../../src/services/staff.service';
import { COLORS } from '../../src/utils/constants';

export default function OngoingOrdersScreen() {
  const [ongoingOrders, setOngoingOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    refreshOngoingOrders();
  }, []);

  const refreshOngoingOrders = async () => {
    setIsLoading(true);
    try {
      const orders = await getAssignedOrders();
      setOngoingOrders(orders.filter((o: any) => o.status !== 'pending'));
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
    switch (order.status) {
      case 'accepted':
        return (
          <Button
            title="Order Picked"
            variant="warning" // Changed to match style (warning color)
            onPress={() => handleStatusUpdate(order.id, 'picked')}
            style={styles.statusButton}
          />
        );
      case 'picked':
        return (
          <Button
            title="In Transit"
            variant="primary"
            onPress={() => handleStatusUpdate(order.id, 'transit')}
            style={styles.statusButton}
          />
        );
      case 'transit':
      case 'in-transit':
        return (
          <Button
            title="Mark Delivered"
            variant="success"
            onPress={() => handleStatusUpdate(order.id, 'delivered')}
            style={styles.statusButton}
          />
        );
      default:
        return null;
    }
  };

  const renderOrderCard = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderQuantity}>{item.quantity || 1} x 20L</Text>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.label}>Delivery Address:</Text>
        <Text style={styles.value}>{item.deliveryAddress || 'Address not available'}</Text>
      </View>

      {item.price && (
        <View style={styles.orderInfo}>
          <Text style={styles.label}>Price:</Text>
          <Text style={styles.value}>₹{item.price}</Text>
        </View>
      )}

      <View style={styles.orderInfo}>
        <Text style={styles.label}>Payment:</Text>
        <Text style={styles.value}>{item.paymentMethod?.toUpperCase() || 'OFFLINE'}</Text>
      </View>

      {getStatusButton(item)}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={ongoingOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshOngoingOrders}
          />
        }
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
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  orderInfo: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: COLORS.text,
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



