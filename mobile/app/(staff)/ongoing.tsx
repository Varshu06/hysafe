import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Linking,
    RefreshControl,
    StyleSheet,
    Text,
  TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { getAssignedOrders, updateDeliveryStatus } from '../../src/services/staff.service';
import { COLORS } from '../../src/utils/constants';
import { StaffHeader } from '../../src/components/staff/StaffHeader';
import { StaffOrderCard } from '../../src/components/staff/StaffOrderCard';
import { Chip, ChipRow } from '../../src/components/staff/StaffChips';
import { StatusStepper } from '../../src/components/staff/StatusStepper';
import { DeliveryConfirmModal } from '../../src/components/staff/DeliveryConfirmModal';

export default function OngoingOrdersScreen() {
  const router = useRouter();
  const [ongoingOrders, setOngoingOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'accepted' | 'picked' | 'transit' | 'delivered'>('all');
  const [confirming, setConfirming] = useState<any | null>(null);

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

  const handleCallCustomer = async (phone?: string) => {
    if (!phone) return Alert.alert('No phone number', 'Customer phone number is not available.');
    const url = `tel:${phone}`;
    const can = await Linking.canOpenURL(url);
    if (!can) return Alert.alert('Not supported', 'Calling is not supported on this device.');
    await Linking.openURL(url);
  };

  const handleNavigate = async (coords?: { lat: number; lng: number }) => {
    if (!coords) return Alert.alert('No location', 'Delivery location is not available.');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`;
    const can = await Linking.canOpenURL(url);
    if (!can) return Alert.alert('Not supported', 'Maps is not supported on this device.');
    await Linking.openURL(url);
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
            onPress={() => setConfirming(order)}
            style={styles.statusButton}
          />
        );
      default:
        return null;
    }
  };

  const filtered = ongoingOrders.filter((o: any) => {
    if (filter === 'all') return true;
    const s = String(o.status || '').toLowerCase();
    if (filter === 'transit') return s === 'transit' || s === 'in-transit';
    return s === filter;
  });

  const renderOrderCard = ({ item }: { item: any }) => {
    const id = item._id || item.id;
    const paymentLabel = String(item.paymentMethod || 'offline').toLowerCase() === 'online' ? 'UPI' : 'COD';
    return (
      <StaffOrderCard
        status={item.status}
        id={String(id)}
        createdAt={item.createdAt}
        quantity={item.quantity || 1}
        deliveryAddress={item.deliveryAddress}
        pickupAddress={item.pickupAddress}
        customer={item.customer}
        paymentLabel={paymentLabel}
        slot={item.deliverySlot}
        notes={item.notes}
        onPress={() => router.push(`/(staff)/order-details/${id}`)}
        extra={<StatusStepper status={String(item.status || '')} />}
        quickActions={
          <>
            <TouchableOpacity style={styles.quickBtn} onPress={() => handleCallCustomer(item.customerPhone)} activeOpacity={0.85}>
              <Feather name="phone" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => handleNavigate(item.location)} activeOpacity={0.85}>
              <Feather name="map" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push(`/(staff)/order-details/${id}`)} activeOpacity={0.85}>
              <Feather name="file-text" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Details</Text>
            </TouchableOpacity>
          </>
        }
        actions={getStatusButton(item)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader title="Ongoing" />

      <View style={styles.content}>
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Filter</Text>
          <ChipRow>
            <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label="Accepted" active={filter === 'accepted'} onPress={() => setFilter('accepted')} />
            <Chip label="Picked" active={filter === 'picked'} onPress={() => setFilter('picked')} />
            <Chip label="Transit" active={filter === 'transit'} onPress={() => setFilter('transit')} />
            <Chip label="Done" active={filter === 'delivered'} onPress={() => setFilter('delivered')} />
          </ChipRow>
        </View>

        <FlatList
          data={filtered}
          renderItem={renderOrderCard}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshOngoingOrders} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="truck" size={28} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No ongoing orders</Text>
              <Text style={styles.emptyText}>Pull to refresh.</Text>
            </View>
          }
        />
      </View>

      <DeliveryConfirmModal
        visible={!!confirming}
        paymentMethod={confirming?.paymentMethod}
        codAmount={confirming?.codAmount || confirming?.totalPrice || 0}
        onClose={() => setConfirming(null)}
        onConfirm={async ({ codCollected }) => {
          const id = confirming?._id || confirming?.id;
          if (!id) return;
          // codCollected can be sent to backend later
          console.log('cod_collected:', codCollected);
          await handleStatusUpdate(String(id), 'delivered');
          setConfirming(null);
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
    padding: 20,
  },
  filterCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 40,
  },
  statusButton: {
    marginTop: 0,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '600',
  },
});



