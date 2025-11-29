import { StyleSheet, Text, View } from 'react-native';
import { Order } from '../../types/order.types';
import { COLORS } from '../../utils/constants';
import Button from './Button';

interface OrderCardProps {
  order: Order;
  onAccept?: () => void;
  onReject?: () => void;
  onStatusUpdate?: (status: string) => void;
  showActions?: boolean;
}

export default function OrderCard({
  order,
  onAccept,
  onReject,
  onStatusUpdate,
  showActions = true,
}: OrderCardProps) {
  const canUpdateStatus = order.status === 'accepted' || order.status === 'picked' || order.status === 'transit';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.quantity}>{order.quantity} x 20L</Text>
        <Text style={styles.status}>{order.status.toUpperCase()}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.label}>Pickup:</Text>
        <Text style={styles.value}>{order.pickupAddress}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.label}>Delivery:</Text>
        <Text style={styles.value}>{order.deliveryAddress}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.label}>Payment:</Text>
        <Text style={styles.value}>{order.paymentMethod.toUpperCase()}</Text>
      </View>

      {order.notes && (
        <View style={styles.info}>
          <Text style={styles.label}>Notes:</Text>
          <Text style={styles.value}>{order.notes}</Text>
        </View>
      )}

      {showActions && (
        <View style={styles.actions}>
          {order.status === 'pending' && onAccept && onReject && (
            <>
              <Button title="REJECT" variant="danger" onPress={onReject} style={styles.actionButton} />
              <Button title="ACCEPT" variant="success" onPress={onAccept} style={styles.actionButton} />
            </>
          )}

          {canUpdateStatus && onStatusUpdate && (
            <View style={styles.statusButtons}>
              {order.status === 'accepted' && (
                <Button
                  title="Order Picked"
                  variant="primary"
                  onPress={() => onStatusUpdate('picked')}
                  style={styles.statusButton}
                />
              )}
              {order.status === 'picked' && (
                <Button
                  title="In Transit"
                  variant="primary"
                  onPress={() => onStatusUpdate('transit')}
                  style={styles.statusButton}
                />
              )}
              {order.status === 'transit' && (
                <Button
                  title="Mark Delivered"
                  variant="success"
                  onPress={() => onStatusUpdate('delivered')}
                  style={styles.statusButton}
                />
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  info: {
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
  actions: {
    marginTop: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  statusButtons: {
    marginTop: 8,
  },
  statusButton: {
    marginBottom: 8,
  },
});




