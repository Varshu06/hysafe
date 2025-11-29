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
import { Button } from '../../src/components/ui/Button';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { useAuth } from '../../src/context/AuthContext';
import { useOrder } from '../../src/context/OrderContext';
import { Order } from '../../src/types/order.types';
import { COLORS } from '../../src/utils/constants';

export default function OrdersScreen() {
  const { isAuthenticated } = useAuth();
  const { orders, isLoading, refreshOrders } = useOrder();
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
        <Button
          title="Login"
          onPress={() => router.push('/(auth)/login')}
          style={styles.loginButton}
        />
      </View>
    );
  }

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/(customer)/order-details/${item._id}`)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderQuantity}>{item.quantity} x 20L</Text>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.label}>Delivery Address:</Text>
        <Text style={styles.value}>{item.deliveryAddress}</Text>
      </View>

      {(item.price || item.totalPrice) && (
        <View style={styles.orderInfo}>
          <Text style={styles.label}>Price:</Text>
          <Text style={styles.value}>₹{item.price || item.totalPrice}</Text>
        </View>
      )}

      <View style={styles.orderInfo}>
        <Text style={styles.label}>Payment:</Text>
        <Text style={styles.value}>{item.paymentMethod?.toUpperCase() || 'N/A'}</Text>
      </View>

      <Text style={styles.dateText}>
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
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
    marginTop: 20,
    minWidth: 120,
  },
});



