import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddOns } from '../../../src/components/customer/AddOns';
import { AddressPickerModal } from '../../../src/components/customer/AddressPickerModal';
import { BillDetailsModal } from '../../../src/components/customer/BillDetailsModal';
import { DeliveryTimeModal } from '../../../src/components/customer/DeliveryTimeModal';
import { DeliveryInstructionsSheet } from '../../../src/components/customer/DeliveryInstructionsSheet';
import { PaymentTermsModal } from '../../../src/components/customer/PaymentTermsModal';
import { ReceiverDetailsModal } from '../../../src/components/customer/ReceiverDetailsModal';
import { useAuth } from '../../../src/context/AuthContext';
import { useCart } from '../../../src/context/CartContext';
import { SAVED_ADDRESSES } from '../../../src/data/dummy';
import { haversineKm } from '../../../src/utils/geo';
import { COLORS, FACTORY_LOCATION, SERVICE_RADIUS_KM } from '../../../src/utils/constants';

type PaymentMethodValue = 'online' | 'offline';
const CHECKOUT_PAYMENT_METHOD_KEY = '@hysafe_checkout_payment_method';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, incrementQuantity, decrementQuantity, getTotalPrice, clearCart } = useCart();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDeliveryTime, setShowDeliveryTime] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [scheduledTime, setScheduledTime] = useState({ hour: '07', minute: '30', ampm: 'AM' as const });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>('online');
  const [isScheduledDelivery, setIsScheduledDelivery] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(SAVED_ADDRESSES[0]?.id || null);
  const [showReceiverModal, setShowReceiverModal] = useState(false);
  const [receiverName, setReceiverName] = useState(() => user?.name || 'Receiver');
  const [receiverPhone, setReceiverPhone] = useState(() => {
    const raw = (user?.phone || '').replace(/[^0-9]/g, '');
    return raw ? raw.slice(-10) : '';
  });
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [isEventOrder, setIsEventOrder] = useState(false);
  const [eventName, setEventName] = useState('');
  const [distanceFromFactory, setDistanceFromFactory] = useState<number | null>(null);
  const [isWithinServiceArea, setIsWithinServiceArea] = useState<boolean>(true);
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  
  // Get user payment terms
  const userPaymentTerms = (user as any)?.paymentTerms as 'one-time' | 'weekly' | 'monthly' | undefined;
  const nextPaymentDue = (user as any)?.nextPaymentDue as string | undefined;
  
  // Track selected payment terms in checkout (can override user profile)
  const [selectedPaymentTerms, setSelectedPaymentTerms] = useState<'one-time' | 'weekly' | 'monthly' | undefined>(userPaymentTerms);
  
  // Sync selectedPaymentTerms when userPaymentTerms changes (only if not already set)
  useEffect(() => {
    if (userPaymentTerms && !selectedPaymentTerms) {
      setSelectedPaymentTerms(userPaymentTerms);
    }
  }, [userPaymentTerms, selectedPaymentTerms]);
  
  // Determine if payment should be collected now
  const shouldCollectPaymentNow = selectedPaymentTerms === 'one-time' || !selectedPaymentTerms;

  const totalPrice = getTotalPrice();

  const getScheduledLabel = () => {
    const dateLabel = scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeLabel = `${scheduledTime.hour}:${scheduledTime.minute} ${scheduledTime.ampm}`;
    return `${dateLabel}, ${timeLabel}`;
  };

  const loadPaymentMethod = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CHECKOUT_PAYMENT_METHOD_KEY);
      if (stored === 'online' || stored === 'offline') {
        setPaymentMethod(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadPaymentMethod();
  }, [loadPaymentMethod]);

  useFocusEffect(
    useCallback(() => {
      loadPaymentMethod();
    }, [loadPaymentMethod])
  );

  const paymentLabel = paymentMethod === 'offline' ? 'Cash on Delivery' : 'UPI';
  const paymentBadge = paymentMethod === 'offline' ? 'COD' : 'UPI';

  const selectedAddress =
    SAVED_ADDRESSES.find((a) => a.id === selectedAddressId) || SAVED_ADDRESSES[0] || null;

  // Calculate distance from factory and validate 5km radius
  React.useEffect(() => {
    if (selectedAddress?.location) {
      const distance = haversineKm(FACTORY_LOCATION, selectedAddress.location);
      setDistanceFromFactory(distance);
      setIsWithinServiceArea(distance !== null && distance <= SERVICE_RADIUS_KM);
    } else {
      setDistanceFromFactory(null);
      setIsWithinServiceArea(true); // Assume valid if no location data
    }
  }, [selectedAddress]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.placeholder} />
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
                <Text style={styles.detailTitle}>
                  {isScheduledDelivery ? `Scheduled: ${getScheduledLabel()}` : 'Delivery in 1hr - 2hrs'}
                </Text>
                <TouchableOpacity onPress={() => setShowDeliveryTime(true)} activeOpacity={0.85}>
                  <Text style={styles.detailLink}>
                    {isScheduledDelivery ? 'Change delivery time' : 'Not Now? Set time for delivery'}
                  </Text>
                </TouchableOpacity>
                {/* Event/Wedding Order Toggle */}
                <TouchableOpacity
                  onPress={() => setIsEventOrder(!isEventOrder)}
                  style={styles.eventToggle}
                  activeOpacity={0.85}
                >
                  <View style={[styles.checkbox, isEventOrder && styles.checkboxChecked]}>
                    {isEventOrder && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                  <Text style={styles.eventLabel}>This is an Event/Wedding order</Text>
                </TouchableOpacity>
                {/* Event Name Input - Shows when event toggle is ON */}
                {isEventOrder && (
                  <View style={styles.eventNameContainer}>
                    <TextInput
                      style={styles.eventNameInput}
                      placeholder="Event name (optional)"
                      placeholderTextColor={COLORS.textLight}
                      value={eventName}
                      onChangeText={setEventName}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Delivery Address */}
            <TouchableOpacity style={styles.detailRow} activeOpacity={0.85} onPress={() => setShowAddressPicker(true)}>
              <Ionicons name="home-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>Delivery at Home</Text>
                <Text style={styles.detailSubtext} numberOfLines={1}>
                  {selectedAddress?.address || 'Select delivery address'}
                </Text>
                {/* 5km Radius Validation */}
                {distanceFromFactory !== null && (
                  <View style={styles.distanceInfo}>
                    <Ionicons
                      name={isWithinServiceArea ? 'checkmark-circle' : 'warning'}
                      size={14}
                      color={isWithinServiceArea ? COLORS.success : COLORS.error}
                    />
                    <Text
                      style={[
                        styles.distanceText,
                        !isWithinServiceArea && styles.distanceTextError,
                      ]}
                    >
                      {isWithinServiceArea
                        ? `Within service area (${distanceFromFactory.toFixed(1)} km)`
                        : `Outside service area (${distanceFromFactory.toFixed(1)} km) - Contact support`}
                    </Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => setShowInstructions(true)}>
                  <Text style={styles.detailLink}>Add instructions for delivery partner</Text>
                </TouchableOpacity>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Contact Person */}
            <TouchableOpacity style={styles.detailRow} activeOpacity={0.85} onPress={() => setShowReceiverModal(true)}>
              <Ionicons name="call-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>
                  {receiverName}
                  {receiverPhone ? `, +91 ${receiverPhone}` : ''}
                </Text>
        </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Payment Terms */}
            {(selectedPaymentTerms || userPaymentTerms) ? (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={20} color="#102841" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>
                    Payment Terms: {(selectedPaymentTerms || userPaymentTerms)?.charAt(0).toUpperCase() + (selectedPaymentTerms || userPaymentTerms)?.slice(1)}
                  </Text>
                  {((selectedPaymentTerms || userPaymentTerms) === 'monthly' || (selectedPaymentTerms || userPaymentTerms) === 'weekly') && nextPaymentDue && (
                    <Text style={styles.detailSubtext}>
                      Due on {nextPaymentDue}
                    </Text>
                  )}
                  {(selectedPaymentTerms || userPaymentTerms) === 'one-time' && (
                    <Text style={styles.detailSubtext}>
                      Pay for each order
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setShowPaymentTermsModal(true)}>
                  <Feather name="edit-2" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.detailRow} 
                onPress={() => setShowPaymentTermsModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={20} color="#102841" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>Payment Terms</Text>
                  <Text style={styles.detailSubtext}>Select payment terms</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {/* Total Bill */}
            <TouchableOpacity
              style={styles.detailRowLast}
              activeOpacity={0.85}
              onPress={() => setShowBillDetails(true)}
            >
              <Ionicons name="receipt-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>Total Bill ₹{totalPrice}</Text>
            </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>
        </View>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {/* Only show payment method selection if payment terms are one-time or not set */}
          {shouldCollectPaymentNow && (
            <TouchableOpacity
              style={styles.paymentRow}
              onPress={() => router.push('/(customer)/checkout/payment-methods')}
              activeOpacity={0.85}
            >
              <Text style={styles.gpayLogo}>{paymentBadge}</Text>
              <View style={styles.paymentTextContainer}>
               <Text style={styles.payVia}>Pay using</Text>
               <Text style={styles.gpay}>{paymentLabel}</Text>
            </View>
              <Feather name="chevron-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.payButton, !isWithinServiceArea && styles.payButtonDisabled]}
            onPress={() => {
              if (!isWithinServiceArea) {
                Alert.alert(
                  'Delivery outside service area',
                  'This address is outside our 5km service area. Please contact support or select a different address.'
                );
                return;
              }
              Alert.alert('Order Placed!', 'Your order has been placed successfully.');
              clearCart();
              router.push('/(customer)');
            }}
            disabled={!isWithinServiceArea}
          >
            <Text style={styles.payButtonText}>
              {!isWithinServiceArea 
                ? 'Address Outside Service Area' 
                : shouldCollectPaymentNow 
                  ? `Pay ₹${totalPrice}` 
                  : 'Place Order'}
            </Text>
          </TouchableOpacity>
          </View>
      )}

      <DeliveryInstructionsSheet 
        visible={showInstructions} 
        onClose={() => setShowInstructions(false)} 
      />

      <AddressPickerModal
        visible={showAddressPicker}
        addresses={SAVED_ADDRESSES}
        selectedId={selectedAddressId}
        onClose={() => setShowAddressPicker(false)}
        onSelect={(addr) => setSelectedAddressId(addr.id)}
        onAddNew={() => {
          setShowAddressPicker(false);
          router.push('/(customer)/address/search');
        }}
      />

      <ReceiverDetailsModal
        visible={showReceiverModal}
        initialName={receiverName}
        initialPhone={receiverPhone}
        onClose={() => setShowReceiverModal(false)}
        onConfirm={({ name, phone }) => {
          setReceiverName(name);
          setReceiverPhone(phone);
        }}
      />

      <BillDetailsModal
        visible={showBillDetails}
        items={items}
        onClose={() => setShowBillDetails(false)}
      />

      <PaymentTermsModal
        visible={showPaymentTermsModal}
        selectedTerms={selectedPaymentTerms || userPaymentTerms}
        onClose={() => setShowPaymentTermsModal(false)}
        onSelect={(terms) => {
          setSelectedPaymentTerms(terms);
          // TODO: Save payment terms to user profile via API
          Alert.alert(
            'Payment Terms Updated',
            `Payment terms set to: ${terms.charAt(0).toUpperCase() + terms.slice(1)}. ${terms === 'one-time' ? 'You will be prompted to pay now.' : 'Payment will be collected later according to your payment terms.'}`,
            [{ text: 'OK' }]
          );
        }}
      />

      <DeliveryTimeModal
        visible={showDeliveryTime}
        selectedDate={scheduledDate}
        selectedTime={scheduledTime as any}
        isEventOrder={isEventOrder}
        onClose={() => setShowDeliveryTime(false)}
        onConfirm={({ date, time, isEvent }) => {
          setScheduledDate(date);
          setScheduledTime(time as any);
          setIsScheduledDelivery(true);
          setIsEventOrder(isEvent || false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.accent,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  backButton: {
    padding: 8,
    position: 'absolute',
    left: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
    position: 'absolute',
    right: 20,
  },
  content: {
    padding: 20,
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
  payButtonDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.error,
  },
  eventToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  eventLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  eventNameContainer: {
    marginTop: 8,
    width: '100%',
  },
  eventNameInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  eventNameContainer: {
    marginTop: 8,
    width: '100%',
  },
  eventNameInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  distanceTextError: {
    color: COLORS.error,
  },
});

