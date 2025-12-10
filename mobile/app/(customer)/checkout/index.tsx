import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddOns } from '../../../src/components/customer/AddOns';
import { DeliveryInstructionsSheet } from '../../../src/components/customer/DeliveryInstructionsSheet';
import { Button } from '../../../src/components/ui/Button';
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
      <View style={styles.header}>
         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Review Order</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Address Section */}
        <View style={styles.section}>
           <Text style={styles.sectionLabel}>Delivery at <Text style={styles.bold}>Home</Text></Text>
           <View style={styles.addressRow}>
              <Text style={styles.addressText} numberOfLines={1}>
                 9/482,B type,40th Street,sidco nagar,chen...
              </Text>
              <Text style={styles.arrow}>›</Text>
           </View>
           <TouchableOpacity onPress={() => setShowInstructions(true)}>
              <Text style={styles.addInstructions}>Add instructions for delivery partner</Text>
           </TouchableOpacity>
        </View>
        
        <View style={styles.divider} />

        {/* Contact */}
        <View style={styles.section}>
           <View style={styles.contactRow}>
              <Text style={styles.phoneIcon}>📞</Text>
              <Text style={styles.phoneText}>Varsha, +91 9342981893</Text>
              <Text style={styles.arrow}>›</Text>
           </View>
        </View>

        <View style={styles.divider} />

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
                <Image source={item.image} style={styles.cartItemImage} resizeMode="contain" />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemVolume}>{item.volume}</Text>
                </View>
              </View>
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
                <Text style={styles.itemPrice}>₹ {item.price * item.quantity}</Text>
              </View>
            </View>
          ))
        )}

        {/* Add Ons */}
        <AddOns />

        {/* Delivery Time */}
        <View style={styles.deliveryCard}>
            <View style={styles.deliveryHeader}>
                <Text style={styles.deliveryIcon}>🚚</Text>
                <Text style={styles.deliveryTitle}>Delivery in 1hr - 2hrs</Text>
            </View>
            <Text style={styles.deliverySubtitle}>Not Now? Set time for delivery</Text>
            
            {/* Date Selector */}
            <Text style={styles.dateLabel}>{dates[selectedDate].full}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
               {dates.map((d, index) => (
                   <TouchableOpacity 
                      key={index} 
                      style={[styles.dateBox, selectedDate === index && styles.activeDateBox]}
                      onPress={() => setSelectedDate(index)}
                   >
                       <Text style={[styles.dateLabelSmall, selectedDate === index && styles.activeDateText]}>
                           {d.label}
                       </Text>
                       <Text style={[styles.dateNum, selectedDate === index && styles.activeDateText]}>
                           {d.day}
                       </Text>
                   </TouchableOpacity>
               ))}
            </ScrollView>
            
            {/* Time Selector */}
            <Text style={styles.timeLabel}>Enter drop time</Text>
            <View style={styles.timeRow}>
                <View style={styles.timeBox}>
                    <Text style={styles.timeText}>{selectedTime.hour}</Text>
                </View>
                <Text style={styles.colon}>:</Text>
                <View style={styles.timeBox}>
                    <Text style={styles.timeText}>{selectedTime.minute}</Text>
                </View>
                <Text style={styles.ampm}>{selectedTime.ampm}</Text>
            </View>
        </View>

        {/* Bill Details */}
        {items.length > 0 && (
          <View style={styles.billSection}>
              <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Total</Text>
                  <Text style={styles.billValue}>₹ {totalPrice}</Text>
              </View>
               <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Delivery Fee</Text>
                  <Text style={styles.billValue}>Free</Text>
              </View>
              <View style={[styles.billRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Bill</Text>
                  <Text style={styles.totalValue}>₹ {totalPrice}</Text>
              </View>
          </View>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.paymentRow}>
               <Text style={styles.payVia}>Pay using</Text>
               <Text style={styles.gpay}>Google Pay</Text>
            </View>
            <View style={styles.payBtnContainer}>
                <Button 
                  title={`Pay ₹ ${totalPrice}`} 
                  onPress={() => {
                      alert('Order Placed!');
                      clearCart();
                      router.push('/(customer)');
                  }}
                  variant="primary"
                  style={{backgroundColor: '#0F172A'}} // Override to dark blue
                />
            </View>
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
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  arrow: {
    fontSize: 20,
    color: '#94A3B8',
  },
  addInstructions: {
    fontSize: 12,
    color: '#475569',
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  phoneText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
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
      borderRadius: 8,
  },
  browseBtnText: {
      color: 'white',
      fontWeight: 'bold',
  },
  mainItemContainer: {
      backgroundColor: 'white',
      marginHorizontal: 20,
      marginVertical: 8,
      padding: 16,
      borderRadius: 12,
  },
  itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  cartItemImage: {
      width: 50,
      height: 50,
      marginRight: 12,
  },
  itemDetails: {
      flex: 1,
  },
  itemName: {
      fontSize: 16,
      fontWeight: '500',
      color: COLORS.text,
  },
  itemVolume: {
      fontSize: 12,
      color: '#64748B',
  },
  quantityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  counter: {
      flexDirection: 'row',
      backgroundColor: '#0F172A',
      borderRadius: 8,
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
  },
  counterBtn: {
      color: 'white',
      fontSize: 18,
      paddingHorizontal: 8,
  },
  count: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
      paddingHorizontal: 4,
  },
  itemPrice: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  deliveryCard: {
      backgroundColor: '#E0F2FE',
      margin: 20,
      padding: 16,
      borderRadius: 16,
  },
  deliveryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      gap: 8,
  },
  deliveryIcon: {
      fontSize: 18,
  },
  deliveryTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  deliverySubtitle: {
      fontSize: 12,
      color: '#475569',
      textDecorationLine: 'underline',
      marginLeft: 26,
      marginBottom: 16,
  },
  dateLabel: {
      fontSize: 14,
      color: '#475569',
      marginBottom: 8,
  },
  dateScroll: {
      flexDirection: 'row',
      marginBottom: 20,
  },
  dateBox: {
      width: 60,
      height: 70,
      backgroundColor: 'white',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: 'transparent',
  },
  activeDateBox: {
      backgroundColor: '#0F172A',
      borderColor: '#0F172A',
  },
  dateLabelSmall: {
      fontSize: 12,
      color: '#64748B',
      marginBottom: 4,
  },
  dateNum: {
      fontSize: 18,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  activeDateText: {
      color: 'white',
  },
  timeLabel: {
      fontSize: 14,
      color: COLORS.text,
      marginBottom: 8,
  },
  timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  timeBox: {
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor: COLORS.text,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
  },
  timeText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  colon: {
      fontSize: 16,
      fontWeight: 'bold',
      marginHorizontal: 8,
  },
  ampm: {
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
      color: COLORS.text,
  },
  billSection: {
      padding: 20,
      backgroundColor: 'white',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
  },
  billRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
  },
  billLabel: {
      fontSize: 14,
      color: '#64748B',
  },
  billValue: {
      fontSize: 14,
      color: COLORS.text,
  },
  totalRow: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
  },
  totalLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  totalValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
  },
  paymentRow: {
      marginRight: 16,
  },
  payVia: {
      fontSize: 10,
      color: '#64748B',
  },
  gpay: {
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  payBtnContainer: {
      flex: 1,
  }
});

