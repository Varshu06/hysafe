import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../context/CartContext';
import { COLORS } from '../../utils/constants';

export const CustomerHeader = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getTotalItems } = useCart();
  const [showNotifications, setShowNotifications] = useState(false);
  
  const cartCount = getTotalItems();
  const notificationCount = 0; // Replace with actual notification count when implemented

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.addressContainer} onPress={() => router.push('/(customer)/address/search')}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Home</Text>
            <Feather name="chevron-down" size={16} color={COLORS.text} style={styles.chevron} />
          </View>
          <Text style={styles.address} numberOfLines={1}>
            9/482,B type,40th Street,sidco nagar,chennai-...
          </Text>
        </TouchableOpacity>
        
        <View style={styles.actions}>
           <TouchableOpacity style={styles.iconButton} onPress={() => setShowNotifications(true)}>
              <Text style={styles.icon}>🔔</Text>
              {notificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                </View>
              )}
           </TouchableOpacity>
           <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/(customer)/checkout')}>
              <Feather name="shopping-cart" size={18} color="#FFFFFF" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
           </TouchableOpacity>
        </View>
      </View>
      <View style={styles.divider} />

      {/* Notification Modal */}
      <Modal
        visible={showNotifications}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowNotifications(false)}
        >
          <View style={[styles.notificationModal, { marginTop: insets.top + 60 }]}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Feather name="x" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.emptyNotification}>
              <Feather name="bell-off" size={48} color="#94A3B8" />
              <Text style={styles.emptyNotificationText}>No notifications yet</Text>
              <Text style={styles.emptyNotificationSubtext}>We'll notify you when something arrives</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  addressContainer: {
    flex: 1,
    marginRight: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  chevron: {
    marginLeft: 4,
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
  cartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#102841',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4EFFA',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  notificationModal: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 16,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyNotification: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyNotificationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyNotificationSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});

