import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useOrders } from '../../../src/context/OrderContext';
import { getOrderById } from '../../../src/services/order.service';
import { Order } from '../../../src/types/order.types';
import { COLORS } from '../../../src/utils/constants';

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
      return 'Order Pending';
    case 'accepted':
      return 'Order Accepted';
    case 'picked':
      return 'Order Picked Up';
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

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders } = useOrders();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      // Try to find in context first
      const orderFromContext = orders.find((o) => o._id === id);
      if (orderFromContext) {
        setOrder(orderFromContext);
        setIsLoading(false);
        return;
      }

      // Otherwise fetch from API
      const orderData = await getOrderById(id);
      setOrder(orderData);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View
        style={[
          styles.statusBanner,
          { backgroundColor: getStatusColor(order.status) },
        ]}
      >
        <Text style={styles.statusBannerText}>{getStatusText(order.status)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <Text style={styles.detailValue}>{order.quantity} x 20L cans</Text>
        </View>
        {order.price && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>₹{order.price}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method:</Text>
          <Text style={styles.detailValue}>{order.paymentMethod.toUpperCase()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Status:</Text>
          <Text style={styles.detailValue}>{order.paymentStatus.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Information</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pickup Address:</Text>
          <Text style={styles.detailValue}>{order.pickupAddress}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Delivery Address:</Text>
          <Text style={styles.detailValue}>{order.deliveryAddress}</Text>
        </View>
        {order.deliverySlot && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery Slot:</Text>
            <Text style={styles.detailValue}>
              {new Date(order.deliverySlot).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {order.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Placed:</Text>
          <Text style={styles.detailValue}>
            {new Date(order.createdAt).toLocaleString()}
          </Text>
        </View>
        {order.acceptedAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Accepted:</Text>
            <Text style={styles.detailValue}>
              {new Date(order.acceptedAt).toLocaleString()}
            </Text>
          </View>
        )}
        {order.deliveredAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivered:</Text>
            <Text style={styles.detailValue}>
              {new Date(order.deliveredAt).toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBanner: {
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusBannerText: {
    color: COLORS.secondary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 40,
  },
});

