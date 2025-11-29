import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS } from '../../utils/constants';

export type StatusType = 'pending' | 'accepted' | 'picked' | 'transit' | 'delivered' | 'missed' | 'cancelled';

interface StatusBadgeProps {
  status: StatusType | string;
  style?: ViewStyle;
}

const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return { color: COLORS.warning, bgColor: '#FEF3C7', label: 'Pending' };
    case 'accepted':
      return { color: COLORS.primary, bgColor: COLORS.accent, label: 'Accepted' };
    case 'picked':
      return { color: '#8B5CF6', bgColor: '#EDE9FE', label: 'Picked Up' };
    case 'transit':
    case 'on_the_way':
      return { color: COLORS.primary, bgColor: COLORS.accent, label: 'On The Way' };
    case 'delivered':
      return { color: COLORS.success, bgColor: '#D1FAE5', label: 'Delivered' };
    case 'missed':
      return { color: COLORS.error, bgColor: '#FEE2E2', label: 'Missed' };
    case 'cancelled':
      return { color: COLORS.textLight, bgColor: '#F3F4F6', label: 'Cancelled' };
    default:
      return { color: COLORS.textLight, bgColor: '#F3F4F6', label: status };
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const config = getStatusConfig(status);

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }, style]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});



