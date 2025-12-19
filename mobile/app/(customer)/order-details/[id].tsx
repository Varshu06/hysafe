import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
  TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loader } from '../../../src/components/ui/Loader';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { useOrder } from '../../../src/context/OrderContext';
import { getOrderById } from '../../../src/services/order.service';
import { Order } from '../../../src/types/order.types';
import { COLORS } from '../../../src/utils/constants';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orders } = useOrder();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return 'N/A';
    const methodLower = method.toLowerCase();
    if (methodLower === 'online') return 'Card';
    if (methodLower === 'offline') return 'Cash';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

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
    return <Loader fullScreen />;
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.push('/(customer)/orders')} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <TouchableOpacity onPress={() => router.push('/(customer)')} style={styles.homeButton}>
          <Feather name="home" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
      <View style={styles.statusContainer}>
        <StatusBadge status={order.status} style={styles.statusBadge} />
      </View>

        {/* Order Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Information</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="water" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Quantity</Text>
              <Text style={styles.infoValue}>{order.quantity} x 20L cans</Text>
        </View>
          </View>

        {(order.price || order.totalPrice) && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Feather name="dollar-sign" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Total Amount</Text>
                <Text style={styles.infoValue}>₹{order.price || order.totalPrice}</Text>
              </View>
          </View>
        )}

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Feather name="credit-card" size={20} color={COLORS.primary} />
        </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Payment Method</Text>
              <Text style={styles.infoValue}>Paid with {getPaymentMethodLabel(order.paymentMethod)}</Text>
        </View>
      </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Feather name={order.paymentStatus === 'paid' ? 'check-circle' : 'clock'} size={20} color={order.paymentStatus === 'paid' ? COLORS.success : COLORS.warning} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Payment Status</Text>
              <Text style={[styles.infoValue, { color: order.paymentStatus === 'paid' ? COLORS.success : COLORS.warning }]}>
                {order.paymentStatus?.charAt(0).toUpperCase() + order.paymentStatus?.slice(1) || 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Information</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Delivery Address</Text>
              <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
            </View>
        </View>

        {order.deliverySlot && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Feather name="calendar" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Delivery Slot</Text>
                <Text style={styles.infoValue}>
                  {new Date(order.deliverySlot).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
            </Text>
              </View>
          </View>
        )}
      </View>

        {/* Notes Card */}
      {order.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Special Instructions</Text>
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}

        {/* Timeline Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Timeline</Text>
          
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Order Placed</Text>
              <Text style={styles.timelineValue}>
                {order.createdAt ? new Date(order.createdAt).toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: 'numeric', 
                  minute: '2-digit' 
                }) : 'N/A'}
          </Text>
        </View>
          </View>

        {order.acceptedAt && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Order Accepted</Text>
                <Text style={styles.timelineValue}>
                  {new Date(order.acceptedAt).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
            </Text>
              </View>
          </View>
        )}

        {order.deliveredAt && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Delivered</Text>
                <Text style={styles.timelineValue}>
                  {new Date(order.deliveredAt).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
            </Text>
              </View>
          </View>
        )}
      </View>

        <View style={{ height: 20 }} />
    </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: 'white',
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 22,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    marginTop: 4,
    marginRight: 16,
  },
  timelineDotCompleted: {
    backgroundColor: COLORS.success,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 13,
    color: '#94A3B8',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 40,
  },
});



