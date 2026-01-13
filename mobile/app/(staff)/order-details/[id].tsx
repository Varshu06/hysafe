import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../src/components/ui/Button';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { acceptOrder, getAssignedOrders, rejectOrder, updateDeliveryStatus } from '../../../src/services/staff.service';
import { COLORS } from '../../../src/utils/constants';
import { StaffHeader } from '../../../src/components/staff/StaffHeader';
import { StatusStepper } from '../../../src/components/staff/StatusStepper';
import { ReasonModal } from '../../../src/components/staff/ReasonModal';
import { DeliveryConfirmModal } from '../../../src/components/staff/DeliveryConfirmModal';

export default function StaffOrderDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);

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
    setRejectOpen(true);
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

  const handleCallCustomer = async () => {
    const phone = order?.customerPhone;
    if (!phone) return Alert.alert('No phone number', 'Customer phone number is not available.');
    const url = `tel:${phone}`;
    const can = await Linking.canOpenURL(url);
    if (!can) return Alert.alert('Not supported', 'Calling is not supported on this device.');
    await Linking.openURL(url);
  };

  const handleNavigate = async () => {
    const coords = order?.location;
    if (!coords) return Alert.alert('No location', 'Delivery location is not available.');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`;
    const can = await Linking.canOpenURL(url);
    if (!can) return Alert.alert('Not supported', 'Maps is not supported on this device.');
    await Linking.openURL(url);
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
      <StaffHeader title="Order Details" onBack={() => router.replace('/(staff)')} />

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
                <View style={styles.badgeRow}>
                  <StatusBadge status={order?.status || 'pending'} />
                  <View style={styles.payChip}>
                    <Text style={styles.payChipText}>{paymentLabel}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>#{order?._id || order?.id}</Text>
              </View>

              <Text style={styles.qty}>{order?.quantity || 1} x 20L</Text>

              <StatusStepper status={String(order?.status || '')} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Customer</Text>
                <View style={styles.infoRow}>
                  <Feather name="user" size={16} color="#94A3B8" />
                  <Text style={styles.infoText}>{order?.customer || 'Customer'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="phone" size={16} color="#94A3B8" />
                  <Text style={styles.infoText}>{order?.customerPhone || '—'}</Text>
                </View>

                <View style={styles.quickRow}>
                  <TouchableOpacity style={styles.quickBtn} onPress={handleCallCustomer} activeOpacity={0.85}>
                    <Feather name="phone" size={16} color={COLORS.primary} />
                    <Text style={styles.quickBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickBtn} onPress={handleNavigate} activeOpacity={0.85}>
                    <Feather name="map" size={16} color={COLORS.primary} />
                    <Text style={styles.quickBtnText}>Navigate</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Addresses</Text>
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
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment</Text>
                <View style={styles.infoRow}>
                  <Feather name="credit-card" size={16} color="#94A3B8" />
                  <Text style={styles.infoText}>
                    {paymentLabel} {String(order?.paymentMethod || '').toLowerCase() === 'offline' ? `• ₹${order?.codAmount || order?.totalPrice || 0}` : ''}
                  </Text>
                </View>
                {order?.deliverySlot ? (
                  <View style={styles.infoRow}>
                    <Feather name="calendar" size={16} color="#94A3B8" />
                    <Text style={styles.infoText}>{order.deliverySlot}</Text>
                  </View>
                ) : null}
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
                  <Button title="Reject" variant="outline" onPress={handleReject} style={styles.actionBtn} />
                  <Button title="Accept" variant="primary" onPress={handleAccept} style={styles.actionBtn} />
                </View>
              ) : null}

              {canPick ? (
                <Button title="Mark Picked" variant="primary" onPress={() => handleStatusUpdate('picked')} />
              ) : null}
              {canTransit ? (
                <Button title="Mark In Transit" variant="primary" onPress={() => handleStatusUpdate('transit')} />
              ) : null}
              {canDeliver ? (
                <Button title="Mark Delivered" variant="success" onPress={() => setDeliverOpen(true)} />
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      <ReasonModal
        visible={rejectOpen}
        title="Reject order"
        placeholder="Reason (e.g., too far / busy / issue with stock)"
        confirmText="Reject"
        onClose={() => setRejectOpen(false)}
        onConfirm={async (reason) => {
          try {
            await rejectOrder(order?._id || order?.id);
            console.log('reject reason:', reason);
            Alert.alert('Rejected', 'Order rejected.');
            router.replace('/(staff)');
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to reject order');
          } finally {
            setRejectOpen(false);
          }
        }}
      />

      <DeliveryConfirmModal
        visible={deliverOpen}
        paymentMethod={order?.paymentMethod}
        codAmount={order?.codAmount || order?.totalPrice || 0}
        onClose={() => setDeliverOpen(false)}
        onConfirm={async ({ codCollected }) => {
          console.log('cod_collected:', codCollected);
          await handleStatusUpdate('delivered');
          setDeliverOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardTop: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  payChip: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  payChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  meta: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '800',
  },
  qty: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  section: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  notesBox: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  notesText: {
    flex: 1,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  quickBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
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




