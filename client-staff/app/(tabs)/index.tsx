import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useOrders } from '../../src/context/OrderContext';
import { acceptOrder, rejectOrder, toggleStatus } from '../../src/services/staff.service';
import { Order } from '../../src/types/order.types';
import { COLORS } from '../../src/utils/constants';

export default function NewOrdersScreen() {
  const { staff, refreshProfile } = useAuth();
  const { availableOrders, isLoading, refreshAvailableOrders } = useOrders();
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    refreshAvailableOrders();
  }, []);

  const handleToggleStatus = async () => {
    try {
      setIsToggling(true);
      let location = undefined;
      
      if (!staff?.isOnline) {
        // Get location when going online
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          location = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          };
        }
      }

      await toggleStatus(!staff?.isOnline, location);
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setIsToggling(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      await acceptOrder(orderId);
      Alert.alert('Success', 'Order accepted!');
      refreshAvailableOrders();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept order');
    }
  };

  const handleReject = async (orderId: string) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectOrder(orderId);
              refreshAvailableOrders();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject order');
            }
          },
        },
      ]
    );
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderQuantity}>{item.quantity} x 20L</Text>
        <Text style={styles.orderStatus}>{item.status.toUpperCase()}</Text>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.label}>Pickup:</Text>
        <Text style={styles.value}>{item.pickupAddress}</Text>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.label}>Delivery:</Text>
        <Text style={styles.value}>{item.deliveryAddress}</Text>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.label}>Payment:</Text>
        <Text style={styles.value}>{item.paymentMethod.toUpperCase()}</Text>
      </View>

      {item.notes && (
        <View style={styles.orderInfo}>
          <Text style={styles.label}>Notes:</Text>
          <Text style={styles.value}>{item.notes}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.rejectButton]}
          onPress={() => handleReject(item._id)}
        >
          <Text style={styles.buttonText}>REJECT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.acceptButton]}
          onPress={() => handleAccept(item._id)}
        >
          <Text style={styles.buttonText}>ACCEPT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Online/Offline Toggle */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>
          Status: {staff?.isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            staff?.isOnline ? styles.toggleOnline : styles.toggleOffline,
            isToggling && styles.toggleDisabled,
          ]}
          onPress={handleToggleStatus}
          disabled={isToggling}
        >
          {isToggling ? (
            <ActivityIndicator color={COLORS.secondary} />
          ) : (
            <Text style={styles.toggleText}>
              {staff?.isOnline ? 'Go Offline' : 'Go Online'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {!staff?.isOnline ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Go online to receive new orders
          </Text>
        </View>
      ) : (
        <FlatList
          data={availableOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshAvailableOrders}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No new orders available</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  toggleContainer: {
    backgroundColor: COLORS.secondary,
    padding: 16,
    margin: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  toggleOnline: {
    backgroundColor: COLORS.success,
  },
  toggleOffline: {
    backgroundColor: COLORS.textLight,
  },
  toggleDisabled: {
    opacity: 0.6,
  },
  toggleText: {
    color: COLORS.secondary,
    fontWeight: '600',
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
    color: COLORS.textLight,
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
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
  },
  buttonText: {
    color: COLORS.secondary,
    fontWeight: '600',
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

