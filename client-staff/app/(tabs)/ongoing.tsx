import { useEffect } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useOrders } from '../../src/context/OrderContext';
import { updateOrderStatus } from '../../src/services/staff.service';
import { Order } from '../../src/types/order.types';
import { COLORS } from '../../src/utils/constants';

export default function OngoingOrdersScreen() {
  const { ongoingOrders, isLoading, refreshOngoingOrders } = useOrders();

  useEffect(() => {
    refreshOngoingOrders();
  }, []);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      Alert.alert('Success', 'Order status updated!');
      refreshOngoingOrders();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const getStatusButton = (order: Order) => {
    switch (order.status) {
      case 'accepted':
        return (
          <TouchableOpacity
            style={[styles.statusButton, styles.pickedButton]}
            onPress={() => handleStatusUpdate(order._id, 'picked')}
          >
            <Text style={styles.statusButtonText}>Order Picked</Text>
          </TouchableOpacity>
        );
      case 'picked':
        return (
          <TouchableOpacity
            style={[styles.statusButton, styles.transitButton]}
            onPress={() => handleStatusUpdate(order._id, 'transit')}
          >
            <Text style={styles.statusButtonText}>In Transit</Text>
          </TouchableOpacity>
        );
      case 'transit':
        return (
          <TouchableOpacity
            style={[styles.statusButton, styles.deliveredButton]}
            onPress={() => handleStatusUpdate(order._id, 'delivered')}
          >
            <Text style={styles.statusButtonText}>Mark Delivered</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderQuantity}>{item.quantity} x 20L</Text>
        <Text style={[styles.orderStatus, getStatusColor(item.status)]}>
          {item.status.toUpperCase()}
        </Text>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.label}>Delivery Address:</Text>
        <Text style={styles.value}>{item.deliveryAddress}</Text>
      </View>

      {item.price && (
        <View style={styles.orderInfo}>
          <Text style={styles.label}>Price:</Text>
          <Text style={styles.value}>₹{item.price}</Text>
        </View>
      )}

      <View style={styles.orderInfo}>
        <Text style={styles.label}>Payment:</Text>
        <Text style={styles.value}>{item.paymentMethod.toUpperCase()}</Text>
      </View>

      {getStatusButton(item)}
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return { color: COLORS.primary };
      case 'picked':
        return { color: COLORS.warning };
      case 'transit':
        return { color: COLORS.primaryLight };
      case 'delivered':
        return { color: COLORS.success };
      default:
        return { color: COLORS.textLight };
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={ongoingOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item._id}
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
  orderStatus: {
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickedButton: {
    backgroundColor: COLORS.warning,
  },
  transitButton: {
    backgroundColor: COLORS.primaryLight,
  },
  deliveredButton: {
    backgroundColor: COLORS.success,
  },
  statusButtonText: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 16,
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

