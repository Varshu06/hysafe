import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../src/components/ui/Button';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { acceptOrder, getAssignedOrders, rejectOrder, updateDeliveryStatus } from '../../../src/services/staff.service';
import { COLORS } from '../../../src/utils/constants';

export default function StaffOrderDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const orders = await getAssignedOrders();
        const found = orders.find((o: any) => String(o._id || o.id) === String(id));
        setOrder(found || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const paymentLabel = useMemo(() => {
    if (!order) return '';
    return String(order.paymentMethod || 'offline').toLowerCase() === 'online' ? 'UPI' : 'COD';
  }, [order]);

  const handleAccept = async () => {
    if (!order) return;
    try {
      await acceptOrder(order._id || order.id);
      Alert.alert('Success', 'Order accepted!');
      setOrder({ ...order, status: 'accepted' });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to accept order');
    }
  };

  const handleReject = async () => {
    if (!order) return;
    Alert.alert('Reject Order', 'Are you sure you want to reject this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectOrder(order._id || order.id);
            Alert.alert('Rejected', 'Order rejected.');
            router.replace('/(staff)');
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to reject order');
          }
        },
      },
    ]);
  };

  const handleStatusUpdate = async (next: string) => {
    if (!order) return;
    try {
      await updateDeliveryStatus(order._id || order.id, next);
      Alert.alert('Updated', `Status updated to ${next}`);
      setOrder({ ...order, status: next });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update status');
    }
  };

  const canAcceptReject = order && String(order.status).toLowerCase() === 'pending';
  const canPick = order && String(order.status).toLowerCase() === 'accepted';
  const canTransit = order && String(order.status).toLowerCase() === 'picked';
  const canDeliver =
    order &&
    (String(order.status).toLowerCase() === 'transit' ||
      String(order.status).toLowerCase() === 'in-transit');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.replace('/(staff)')} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {!order && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Order not found</Text>
            <Text style={styles.emptyText}>Please go back and try again.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <StatusBadge status={order?.status || 'pending'} />
                <Text style={styles.meta}>#{order?._id || order?.id}</Text>
              </View>

              <Text style={styles.qty}>{order?.quantity || 1} x 20L</Text>

              <View style={styles.infoRow}>
                <Feather name="user" size={16} color="#94A3B8" />
                <Text style={styles.infoText}>{order?.customer || 'Customer'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color="#94A3B8" />
                <Text style={styles.infoText} numberOfLines={2}>
                  {order?.deliveryAddress || 'Address not available'}
                </Text>
              </View>

              {order?.pickupAddress ? (
                <View style={styles.infoRow}>
                  <Feather name="package" size={16} color="#94A3B8" />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {order?.pickupAddress}
                  </Text>
                </View>
              ) : null}

              <View style={styles.infoRow}>
                <Feather name="credit-card" size={16} color="#94A3B8" />
                <Text style={styles.infoText}>{paymentLabel}</Text>
              </View>

              {order?.notes ? (
                <View style={styles.notesBox}>
                  <Feather name="message-circle" size={14} color="#94A3B8" />
                  <Text style={styles.notesText}>{order.notes}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actions}>
              {canAcceptReject ? (
                <View style={styles.actionRow}>
                  <Button title="Reject" variant="danger" onPress={handleReject} style={styles.actionBtn} />
                  <Button title="Accept" variant="success" onPress={handleAccept} style={styles.actionBtn} />
                </View>
              ) : null}

              {canPick ? (
                <Button title="Mark Picked" variant="primary" onPress={() => handleStatusUpdate('picked')} />
              ) : null}
              {canTransit ? (
                <Button title="Mark In Transit" variant="primary" onPress={() => handleStatusUpdate('transit')} />
              ) : null}
              {canDeliver ? (
                <Button title="Mark Delivered" variant="success" onPress={() => handleStatusUpdate('delivered')} />
              ) : null}
            </View>
          </>
        )}
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  meta: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  qty: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  notesBox: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  notesText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});



