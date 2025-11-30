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

export const OrderCard = ({ order }: OrderCardProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusBadge}>
           <Text style={styles.check}>✓</Text>
           <Text style={styles.statusText}>{order.status}</Text>
        </View>
        <Text style={styles.date}>{order.date}</Text>
        <Text style={styles.price}>₹ {order.price}</Text>
      </View>
      
      <View style={styles.details}>
         <View style={styles.row}>
             <Text style={styles.label}>Baskar</Text>
             <Text style={styles.address} numberOfLines={1}>{order.address}</Text>
         </View>
      </View>

      <TouchableOpacity style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>👁 See All</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  header: {
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
  check: {
      fontSize: 12,
      color: COLORS.primary,
  },
  statusText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#0F172A',
  },
  date: {
      color: 'white',
      fontSize: 12,
  },
  price: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
  },
  details: {
      marginBottom: 16,
  },
  row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  label: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
      marginRight: 16,
  },
  address: {
      color: '#94A3B8',
      fontSize: 12,
      flex: 1,
      textAlign: 'right',
  },
  seeAllBtn: {
      backgroundColor: 'white',
      alignSelf: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
  },
  seeAllText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#0F172A',
  }
});

