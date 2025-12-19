import { Feather } from '@expo/vector-icons';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { useAuth } from '../../src/context/AuthContext';
import { useOrder } from '../../src/context/OrderContext';
import { Order } from '../../src/types/order.types';
import { COLORS } from '../../src/utils/constants';

export default function OrdersScreen() {
  const { isAuthenticated } = useAuth();
  const { orders, isLoading, refreshOrders } = useOrder();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return 'N/A';
    const methodLower = method.toLowerCase();
    if (methodLower === 'online') return 'Card';
    if (methodLower === 'offline') return 'Cash';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const getDriverName = (order: Order): string => {
    // Priority: driverName > assignedStaff.name > default placeholder
    if (order.driverName) return order.driverName;
    if (order.assignedStaff?.name) return order.assignedStaff.name;
    // For pending orders, show "Not Assigned", otherwise show a default name
    if (order.status === 'pending') return 'Not Assigned';
    return 'Delivery Partner'; // Fallback for assigned orders without name
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/(customer)/order-details/${item._id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.statusText}>{item.status}</Text>
      </View>
        <Text style={styles.date}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
        </Text>
        <Text style={styles.price}>₹ {item.price || item.totalPrice || '0'}</Text>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.driverLabel}>{getDriverName(item)}</Text>
          <Text style={styles.addressText} numberOfLines={1}>{item.deliveryAddress}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.viewDetailsBtn}
        onPress={() => router.push(`/(customer)/order-details/${item._id}`)}
      >
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Feather name="chevron-right" size={16} color="#0F172A" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity onPress={() => router.push('/(customer)')} style={styles.homeButton}>
          <Feather name="home" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.accent,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  homeButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
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
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  check: {
    fontSize: 12,
    color: COLORS.primary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  date: {
    color: 'white',
    fontSize: 12,
    flex: 1,
    marginLeft: 12,
  },
  price: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  driverLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 16,
    flexShrink: 0,
  },
  addressText: {
    color: '#94A3B8',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
  },
  viewDetailsBtn: {
    backgroundColor: 'white',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
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



