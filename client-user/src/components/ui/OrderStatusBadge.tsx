import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../utils/constants';

type OrderStatus = 'pending' | 'accepted' | 'picked' | 'transit' | 'delivered' | 'missed' | 'cancelled';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: COLORS.warning, bgColor: '#FEF3C7' },
  accepted: { label: 'Accepted', color: COLORS.primary, bgColor: COLORS.accent },
  picked: { label: 'Picked Up', color: '#8B5CF6', bgColor: '#EDE9FE' },
  transit: { label: 'On The Way', color: COLORS.primary, bgColor: COLORS.accent },
  delivered: { label: 'Delivered', color: COLORS.success, bgColor: '#D1FAE5' },
  missed: { label: 'Missed', color: COLORS.error, bgColor: '#FEE2E2' },
  cancelled: { label: 'Cancelled', color: COLORS.textLight, bgColor: '#F3F4F6' },
};

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});




