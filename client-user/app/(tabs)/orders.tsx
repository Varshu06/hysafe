import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useOrders } from '../../src/context/OrderContext';
import { Order } from '../../src/types/order.types';
import { COLORS } from '../../src/utils/constants';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return COLORS.warning;
    case 'accepted':
      return COLORS.primary;
    case 'picked':
      return COLORS.primaryLight;
    case 'transit':
      return COLORS.primaryLight;
    case 'delivered':
      return COLORS.success;
    case 'cancelled':
      return COLORS.error;
    default:
      return COLORS.textLight;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Accepted';
    case 'picked':
      return 'Picked Up';
    case 'transit':
      return 'On The Way';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

export default function OrdersScreen() {
  const { isAuthenticated } = useAuth();
  const { orders, isLoading, refreshOrders } = useOrders();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      refreshOrders();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Please login to view your orders</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/(tabs)/order-details/${item._id}`)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderQuantity}>{item.quantity} x 20L</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
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

      <Text style={styles.dateText}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshOrders} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>
              Place your first order from the Home tab
            </Text>
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
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
  dateText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    minWidth: 120,
  },
  loginButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

