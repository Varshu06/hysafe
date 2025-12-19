import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddOns } from '../../../src/components/customer/AddOns';
import { DeliveryInstructionsSheet } from '../../../src/components/customer/DeliveryInstructionsSheet';
import { useCart } from '../../../src/context/CartContext';
import { COLORS } from '../../../src/utils/constants';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, incrementQuantity, decrementQuantity, getTotalPrice, clearCart } = useCart();
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedDate, setSelectedDate] = useState(0); // Index
  const [selectedTime, setSelectedTime] = useState({ hour: '07', minute: '30', ampm: 'AM' });

  const totalPrice = getTotalPrice();

  const dates = [
    { day: '07', label: 'Today', full: '7th, July' },
    { day: '08', label: 'Tue', full: '8th, July' },
    { day: '09', label: 'Wed', full: '9th, July' },
    { day: '10', label: 'Thu', full: '10th, July' },
    { day: '11', label: 'Fri', full: '11th, July' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#64748B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.homeRow}>
            <Text style={styles.homeText}>Home</Text>
            <Feather name="chevron-down" size={18} color="#102841" />
          </View>
          <Text style={styles.headerAddress} numberOfLines={1}>
            9/482,B type,40th Street,sidco nagar,chennai-...
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Cart Items */}
        {items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>Your cart is empty</Text>
            <TouchableOpacity 
              style={styles.browseBtn}
              onPress={() => router.push('/(customer)/products')}
            >
              <Text style={styles.browseBtnText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.mainItemContainer}>
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.quantityRow}>
                  <View style={styles.counter}>
                    <TouchableOpacity onPress={() => decrementQuantity(item.id)}>
                      <Text style={styles.counterBtn}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.count}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => incrementQuantity(item.id)}>
                      <Text style={styles.counterBtn}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Add Ons */}
        <AddOns />

        {/* Delivery and Bill Details Card */}
        {items.length > 0 && (
          <View style={styles.detailsCard}>
            {/* Delivery Time */}
            <View style={styles.detailRow}>
              <Ionicons name="car-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>Delivery in 1hr - 2hrs</Text>
                <TouchableOpacity>
                  <Text style={styles.detailLink}>Not Now? Set time for delivery</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Delivery Address */}
            <View style={styles.detailRow}>
              <Ionicons name="home-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>Delivery at Home</Text>
                <Text style={styles.detailSubtext} numberOfLines={1}>
                  9/482,B type, 40th Street, sidco nagar,che.....
                </Text>
                <TouchableOpacity onPress={() => setShowInstructions(true)}>
                  <Text style={styles.detailLink}>Add instructions for delivery partner</Text>
                </TouchableOpacity>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </View>

            {/* Contact Person */}
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>Varsha,+91 9342981893</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </View>

            {/* Total Bill */}
            <View style={styles.detailRowLast}>
              <Ionicons name="receipt-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>Total Bill ₹{totalPrice}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </View>
          </View>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.paymentRow}>
            <Text style={styles.gpayLogo}>GP</Text>
            <View style={styles.paymentTextContainer}>
              <Text style={styles.payVia}>Pay using</Text>
              <Text style={styles.gpay}>Google Pay</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.payButton}
            onPress={() => {
              alert('Order Placed!');
              clearCart();
              router.push('/(customer)');
            }}
          >
            <Text style={styles.payButtonText}>Pay ₹{totalPrice}</Text>
          </TouchableOpacity>
        </View>
      )}

      <DeliveryInstructionsSheet 
        visible={showInstructions} 
        onClose={() => setShowInstructions(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F0F9FF',
  },
  backButton: {
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
  },
  homeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  homeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#102841',
  },
  headerAddress: {
    fontSize: 12,
    color: '#64748B',
  },
  content: {
    paddingBottom: 120,
  },
  emptyCart: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
  },
  emptyCartText: {
      fontSize: 16,
      color: '#64748B',
      marginBottom: 16,
  },
  browseBtn: {
      backgroundColor: '#102841',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
  },
  browseBtnText: {
      color: 'white',
      fontWeight: 'bold',
  },
  mainItemContainer: {
    backgroundColor: '#E0F2FE',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#102841',
    flex: 1,
    marginRight: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counter: {
    flexDirection: 'row',
    backgroundColor: '#102841',
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  counterBtn: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  count: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#102841',
  },
  detailsCard: {
    backgroundColor: '#E0F2FE',
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailRowLast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#102841',
    marginBottom: 4,
  },
  detailSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  detailLink: {
    fontSize: 12,
    color: '#102841',
    textDecorationLine: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#102841',
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  gpayLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    color: '#102841',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
  },
  paymentTextContainer: {
    flex: 1,
  },
  payVia: {
    fontSize: 10,
    color: '#94A3B8',
  },
  gpay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  payButton: {
    backgroundColor: '#102841',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

