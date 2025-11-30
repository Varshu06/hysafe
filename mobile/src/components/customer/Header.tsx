import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/constants';

export const CustomerHeader = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addressContainer} onPress={() => router.push('/(customer)/address/search')}>
        <Text style={styles.label}>Home ⌄</Text>
        <Text style={styles.address} numberOfLines={1}>
          9/482,B type,40th Street,sidco nagar,chennai-...
        </Text>
      </TouchableOpacity>
      
      <View style={styles.actions}>
         <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.icon}>🔔</Text>
         </TouchableOpacity>
         <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(customer)/profile')}>
            <Text style={styles.profileText}>V</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.accent,
  },
  addressContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {
    fontSize: 18,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

