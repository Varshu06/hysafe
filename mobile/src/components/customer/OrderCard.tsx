import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/constants';

interface OrderCardProps {
  order: {
    id: string;
    date: string;
    status: string;
    price: number;
    driver: string;
    address: string;
  };
}

const getStatusIcon = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === 'pending') {
    return <Feather name="clock" size={12} color={COLORS.warning} />;
  }
  if (statusLower === 'cancelled') {
    return <Feather name="x" size={12} color={COLORS.textLight} />;
  }
  if (statusLower === 'delivered') {
    return <Feather name="check" size={12} color={COLORS.success} />;
  }
  return <Feather name="check" size={12} color={COLORS.primary} />;
};

export const OrderCard = ({ order }: OrderCardProps) => {
  const router = useRouter();
  
  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/(customer)/order-details/${order.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          {getStatusIcon(order.status)}
           <Text style={styles.statusText}>{order.status}</Text>
        </View>
        <Text style={styles.date}>{order.date}</Text>
        <Text style={styles.price}>₹ {order.price}</Text>
      </View>
      
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.driverLabel}>{order.driver}</Text>
          <Text style={styles.addressText} numberOfLines={1}>{order.address}</Text>
         </View>
      </View>

      <TouchableOpacity 
        style={styles.viewDetailsBtn}
        onPress={() => router.push(`/(customer)/order-details/${order.id}`)}
      >
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Feather name="chevron-right" size={16} color="#0F172A" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  statusText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#0F172A',
    textTransform: 'capitalize',
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
});

