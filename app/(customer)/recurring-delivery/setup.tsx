import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddressPickerModal } from '../../../src/components/customer/AddressPickerModal';
import { useAuth } from '../../../src/context/AuthContext';
import { useProduct } from '../../../src/context/ProductContext';
import { createRecurringDelivery, previewRecurringDeliveryBill, RecurringBillPreview } from '../../../src/services/recurring.service';
import { RecurringFrequency } from '../../../src/types/recurring.types';
import type { Product } from '../../../src/types/product.types';
import { addressStorage, SavedAddress } from '../../../src/utils/addressStorage';
import { COLORS } from '../../../src/utils/constants';
import { LinearGradient } from 'expo-linear-gradient';

const WEEKDAYS = [{ label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 }, { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 }, { label: 'Sun', value: 0 }];
const FREQUENCIES: { value: RecurringFrequency; label: string; note: string }[] = [{ value: 'daily', label: 'Daily', note: 'Every day' }, { value: '2_per_week', label: '2 per week', note: 'Choose 2 weekdays' }, { value: '3_per_week', label: '3 per week', note: 'Choose 3 weekdays' }];
const BILLING = [{ value: 'per_order', label: 'Per order', note: 'A bill for each delivery' }, { value: 'weekly', label: 'Weekly', note: 'Monday–Sunday' }, { value: 'monthly', label: 'Monthly', note: 'Calendar month' }] as const;
const PAYMENT_METHODS = [{ value: 'cash', labelKey: 'cashOnDelivery' }, { value: 'shop', labelKey: 'payAtShop' }] as const;
const newCreateRequestKey = () => `recurring-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
const formatPreviewDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const formatBillingFrequency = (frequency: RecurringBillPreview['billingFrequency']) => frequency === 'per_order' ? 'Pay per order' : `${frequency[0].toUpperCase()}${frequency.slice(1)}`;
const productAvailability = (item: Product, requestedQuantity: number) => item.comingSoon
  ? 'coming_soon'
  : item.available && Number(item.quantity) >= requestedQuantity
    ? 'available'
    : 'unavailable';

export default function RecurringDeliverySetupScreen() {
  const { t } = useTranslation();
  const router = useRouter(); const { instruction } = useLocalSearchParams<{ instruction?: string }>(); const insets = useSafeAreaInsets(); const { user } = useAuth(); const { products, loading: loadingProducts } = useProduct();
  const [productId, setProductId] = useState<string | null>(null); const [quantity, setQuantity] = useState(1); const [frequency, setFrequency] = useState<RecurringFrequency>('daily'); const [deliveryDays, setDeliveryDays] = useState<number[]>([]);
  const [billingFrequency, setBillingFrequency] = useState<'per_order' | 'weekly' | 'monthly'>('weekly'); const [paymentMethod, setPaymentMethod] = useState<'cash' | 'shop' | null>(null); const [addresses, setAddresses] = useState<SavedAddress[]>([]); const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null); const [showAddressPicker, setShowAddressPicker] = useState(false); const [specialInstructions, setSpecialInstructions] = useState(instruction || ''); const [saving, setSaving] = useState(false);
  const [billPreview, setBillPreview] = useState<RecurringBillPreview | null>(null); const [billPreviewKey, setBillPreviewKey] = useState<string | null>(null); const [previewLoading, setPreviewLoading] = useState(false); const [previewError, setPreviewError] = useState<string | null>(null);
  const [proposedStartDate] = useState(() => new Date().toISOString());
  const submissionLocked = useRef(false);
  const confirmationOpen = useRef(false);
  const pendingCreateRequest = useRef<{ fingerprint: string; key: string } | null>(null);
  useEffect(() => { if (instruction) setSpecialInstructions(instruction); }, [instruction]);
  useEffect(() => { if (!productId && products.length) setProductId((products.find((item) => productAvailability(item, 1) === 'available') || products[0]).id); }, [products, productId]);
  const loadAddresses = useCallback(async () => { const all = await addressStorage.getAllAddresses(user); setAddresses(all); setSelectedAddressId((current) => current || all[0]?.id || null); }, [user]);
  useEffect(() => { loadAddresses(); }, [loadAddresses]); useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));
  const product = products.find((item) => item.id === productId); const address = addresses.find((item) => item.id === selectedAddressId); const requiredDays = frequency === '2_per_week' ? 2 : frequency === '3_per_week' ? 3 : 0;
  const toggleDay = (day: number) => setDeliveryDays((current) => current.includes(day) ? current.filter((value) => value !== day) : current.length < requiredDays ? [...current, day] : current);
  const weekdayLabel = [...deliveryDays].sort((a, b) => WEEKDAYS.findIndex((d) => d.value === a) - WEEKDAYS.findIndex((d) => d.value === b)).map((day) => WEEKDAYS.find((item) => item.value === day)?.label).join(', ');
  const previewKey = JSON.stringify([productId, quantity, frequency, [...deliveryDays].sort((a, b) => a - b), billingFrequency, proposedStartDate]);
  const currentBillPreview = billPreviewKey === previewKey ? billPreview : null;
  useEffect(() => {
    if (!productId || (requiredDays > 0 && deliveryDays.length !== requiredDays)) {
      setBillPreview(null);
      setBillPreviewKey(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    let current = true;
    setBillPreview(null);
    setBillPreviewKey(null);
    setPreviewError(null);
    setPreviewLoading(true);
    previewRecurringDeliveryBill({
      productId,
      quantity,
      frequency,
      deliveryDays: requiredDays ? deliveryDays : undefined,
      billingFrequency,
      startDate: proposedStartDate,
    }).then((preview) => {
      if (current) { setBillPreview(preview); setBillPreviewKey(previewKey); }
    }).catch((error: any) => {
      if (current) setPreviewError(error.message || 'Unable to calculate the bill preview.');
    }).finally(() => {
      if (current) setPreviewLoading(false);
    });
    return () => { current = false; };
  }, [productId, quantity, frequency, deliveryDays, requiredDays, billingFrequency, proposedStartDate, previewKey]);
  const handleCreate = async () => {
    if (submissionLocked.current) return;
    if (!product) return Alert.alert(t('selectProduct'), t('chooseOneProduct'));
    if (!address?.id || !(address.fullAddress || address.address)?.trim()) return Alert.alert(t('selectAddress'), t('chooseAddress'));
    if (!paymentMethod) return Alert.alert(t('selectPaymentMethod'), t('selectRecurringPaymentMethod'));
    if (deliveryDays.length !== requiredDays) return Alert.alert(t('chooseDeliveryDaysTitle'), t('selectRequiredDays', { days: requiredDays }));
    if (!currentBillPreview) return Alert.alert(t('Error'), previewError || 'Please wait for the bill amount to be calculated before confirming.');
    submissionLocked.current = true;
    setSaving(true);
    try {
      const createData = { productId: product.id, productName: product.name, quantity, frequency, deliveryDays: requiredDays ? deliveryDays : undefined, billingFrequency, paymentMethod, deliveryAddress: address.fullAddress || address.address, deliveryAddressId: address.id, specialInstructions: specialInstructions.trim() || undefined, startDate: currentBillPreview.startDate };
      const fingerprint = JSON.stringify(createData);
      if (!pendingCreateRequest.current || pendingCreateRequest.current.fingerprint !== fingerprint) {
        pendingCreateRequest.current = { fingerprint, key: newCreateRequestKey() };
      }
      const response = await createRecurringDelivery(createData, pendingCreateRequest.current.key);
      pendingCreateRequest.current = null;
      router.replace({ pathname: '/(customer)/recurring-deliveries', params: { recurringDeliveryId: response.recurringDelivery._id || response.recurringDelivery.id } });
    } catch (error: any) {
      Alert.alert(t('Error'), error.message || t('recurringSetupFailed'));
    } finally {
      submissionLocked.current = false;
      setSaving(false);
    }
  };
  const confirmPlan = () => {
    if (saving || confirmationOpen.current) return;
    if (!currentBillPreview) return Alert.alert(t('Error'), previewError || 'Please wait for the bill amount to be calculated before confirming.');
    confirmationOpen.current = true;
    const billingDescription = formatBillingFrequency(currentBillPreview.billingFrequency);
    const period = `${formatPreviewDate(currentBillPreview.periodStart)} – ${formatPreviewDate(currentBillPreview.periodEnd)}`;
    Alert.alert('Confirm recurring delivery?', `You’re about to start this recurring delivery plan. Upcoming bill: ₹${currentBillPreview.amount} (${billingDescription}, ${period}), due on the first delivery. Payment can be made through Cash on Delivery or Pay at Shop.`, [
      { text: 'Cancel', style: 'cancel', onPress: () => { confirmationOpen.current = false; } },
      { text: 'Confirm Plan', onPress: () => { confirmationOpen.current = false; void handleCreate(); } },
    ], { cancelable: true, onDismiss: () => { confirmationOpen.current = false; } });
  };
  return <View style={styles.container}><View style={[styles.header, { paddingTop: insets.top }]}><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Feather name="arrow-left" size={24} color={COLORS.text} /></TouchableOpacity><Text style={styles.headerTitle}>Set Up Recurring Delivery</Text></View><ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
    <View style={styles.card}><Text style={styles.sectionTitle}>1. Select Product</Text><Text style={styles.helperText}>One product per recurring plan. Set the quantity for each delivery.</Text>{loadingProducts ? <ActivityIndicator color="#102841" /> : products.map((item) => { const selected = productId === item.id; const baseState = productAvailability(item, 1); const state = productAvailability(item, selected ? quantity : 1); const canSelect = baseState === 'available'; const canInteract = canSelect || selected; return <TouchableOpacity key={item.id} disabled={!canInteract} style={[styles.productCard, selected && styles.selected, !canSelect && styles.unavailableProduct]} onPress={() => { if (canSelect && !selected) setProductId(item.id); }}><View><Text style={styles.productName}>{item.name}</Text><Text style={styles.productMeta}>{item.volume ? `${item.volume} · ` : ''}₹{item.price}</Text>{state !== 'available' && <Text style={styles.productStatus}>{state === 'coming_soon' ? t('comingSoon') : t('unavailableLabel')}</Text>}</View>{selected ? <View style={styles.quantity}><TouchableOpacity onPress={() => setQuantity((value) => Math.max(1, value - 1))}><Text style={styles.quantityButton}>−</Text></TouchableOpacity><Text style={styles.quantityValue}>{quantity}</Text><TouchableOpacity onPress={() => setQuantity((value) => value + 1)}><Text style={styles.quantityButton}>+</Text></TouchableOpacity></View> : null}</TouchableOpacity>; })}</View>
    <View style={styles.card}><Text style={styles.sectionTitle}>2. Delivery Frequency</Text><View style={styles.grid}>{FREQUENCIES.map((option) => <TouchableOpacity key={option.value} style={[styles.option, frequency === option.value && styles.selected]} onPress={() => { setFrequency(option.value); setDeliveryDays([]); }}><Text style={styles.optionLabel}>{option.label}</Text><Text style={styles.optionNote}>{option.note}</Text></TouchableOpacity>)}</View>{requiredDays > 0 && <><Text style={styles.label}>Select exactly {requiredDays} weekdays ({deliveryDays.length}/{requiredDays})</Text><View style={styles.weekdays}>{WEEKDAYS.map((day) => <TouchableOpacity key={day.value} disabled={!deliveryDays.includes(day.value) && deliveryDays.length >= requiredDays} style={[styles.day, deliveryDays.includes(day.value) && styles.daySelected]} onPress={() => toggleDay(day.value)}><Text style={[styles.dayText, deliveryDays.includes(day.value) && styles.dayTextSelected]}>{day.label}</Text></TouchableOpacity>)}</View></>}</View>
    <View style={styles.card}><Text style={styles.sectionTitle}>3. Delivery Location</Text><TouchableOpacity style={styles.addressButton} onPress={() => setShowAddressPicker(true)}><Ionicons name="location-outline" size={20} color="#102841" /><Text style={styles.addressText}>{address?.fullAddress || address?.address || 'Select delivery address'}</Text><Feather name="chevron-right" size={20} color={COLORS.textLight} /></TouchableOpacity><Text style={styles.label}>Special instructions (optional)</Text><TextInput style={styles.input} value={specialInstructions} onChangeText={setSpecialInstructions} multiline placeholder="e.g. Leave at door" placeholderTextColor={COLORS.textLight} /></View>
    <View style={styles.card}><Text style={styles.sectionTitle}>4. Billing Frequency</Text><View style={styles.grid}>{BILLING.map((option) => <TouchableOpacity key={option.value} style={[styles.option, billingFrequency === option.value && styles.selected]} onPress={() => setBillingFrequency(option.value)}><Text style={styles.optionLabel}>{option.label}</Text><Text style={styles.optionNote}>{option.note}</Text></TouchableOpacity>)}</View><Text style={styles.label}>{t('selectPaymentMethod')}</Text><View style={styles.grid}>{PAYMENT_METHODS.map((option) => <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityState={{ selected: paymentMethod === option.value }} style={[styles.option, paymentMethod === option.value && styles.selected]} onPress={() => setPaymentMethod(option.value)}><Text style={styles.optionLabel}>{t(option.labelKey)}</Text></TouchableOpacity>)}</View></View>
    <View style={styles.card}><Text style={styles.sectionTitle}>5. Recurring Delivery Summary</Text><Text style={styles.summary}>Product: {product?.name || 'Not selected'}</Text><Text style={styles.summary}>Quantity: {quantity} {quantity === 1 ? 'can' : 'cans'} per delivery</Text><Text style={styles.summary}>Schedule: {frequency === 'daily' ? 'Daily' : `${weekdayLabel || `Select ${requiredDays} weekdays`}`}</Text><Text style={styles.summary}>Delivery address: {address?.fullAddress || address?.address || 'Select delivery address'}</Text><Text style={styles.summary}>Instructions: {specialInstructions.trim() || 'None'}</Text><Text style={styles.summary}>Billing: {BILLING.find((item) => item.value === billingFrequency)?.label}</Text><Text style={styles.summary}>{t('paymentMethod')}: {paymentMethod ? t(PAYMENT_METHODS.find((item) => item.value === paymentMethod)!.labelKey) : t('notSelected')}</Text><Text style={styles.sectionTitle}>Upcoming Bill</Text>{previewLoading ? <View style={styles.previewState}><ActivityIndicator color={COLORS.primary} /><Text style={styles.helperText}>Calculating your bill from the scheduled deliveries…</Text></View> : previewError ? <Text style={styles.previewError}>{previewError}</Text> : currentBillPreview ? <View style={styles.previewBill}><Text style={styles.previewLabel}>TOTAL TO PAY</Text><Text style={styles.previewAmount}>₹{currentBillPreview.amount}</Text><Text style={styles.previewDetail}>Billing period: {formatPreviewDate(currentBillPreview.periodStart)} – {formatPreviewDate(currentBillPreview.periodEnd)}</Text><Text style={styles.previewDetail}>Billing frequency: {formatBillingFrequency(currentBillPreview.billingFrequency)}</Text><Text style={styles.previewDetail}>Due: On first delivery · {formatPreviewDate(currentBillPreview.dueDate)}</Text><Text style={styles.previewDetail}>Payment: {paymentMethod ? t(PAYMENT_METHODS.find((item) => item.value === paymentMethod)!.labelKey) : t('notSelected')}</Text><Text style={styles.helperText}>This amount is calculated by the billing system from the scheduled deliveries. Payment is due on the first delivery in the billing period.</Text></View> : <Text style={styles.helperText}>{requiredDays ? `Select exactly ${requiredDays} weekdays to calculate the bill.` : 'Select a product to calculate the bill.'}</Text>}</View>
    <TouchableOpacity style={[styles.saveButton, (saving || previewLoading || !currentBillPreview) && styles.disabled]} onPress={confirmPlan} disabled={saving || previewLoading || !currentBillPreview || !paymentMethod}>{saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Confirm Recurring Plan</Text>}</TouchableOpacity>
  </ScrollView><AddressPickerModal visible={showAddressPicker} addresses={addresses} selectedId={selectedAddressId} onClose={() => setShowAddressPicker(false)} onSelect={async (item) => { setSelectedAddressId(item.id); await addressStorage.setSelectedAddressId(item.id); }} onAddNew={() => { setShowAddressPicker(false); router.push('/(customer)/address/search'); }} /></View>;
}
const styles = StyleSheet.create({ container:{flex:1,backgroundColor:COLORS.accent},header:{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingHorizontal:20,paddingBottom:16,borderBottomWidth:1,borderBottomColor:'#E2E8F0'},backButton:{position:'absolute',left:20,bottom:12},headerTitle:{fontSize:16,fontWeight:'600',color:COLORS.text},content:{flex:1},contentContainer:{padding:16,paddingBottom:32},card:{backgroundColor:'#FFFFFF',borderRadius:16,padding:16,marginBottom:14},sectionTitle:{fontSize:16,fontWeight:'700',color:COLORS.text,marginBottom:8},helperText:{fontSize:13,color:COLORS.textLight,lineHeight:18,marginBottom:12},productCard:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderWidth:1,borderColor:'#C6DCEB',borderRadius:12,padding:12,marginTop:8},selected:{borderColor:'#102841',backgroundColor:'#EAF6FD'},unavailableProduct:{opacity:.62,backgroundColor:'#F8FAFC'},productName:{fontSize:15,fontWeight:'600',color:COLORS.text},productMeta:{fontSize:13,color:COLORS.textLight,marginTop:3},productStatus:{fontSize:12,fontWeight:'700',color:COLORS.textLight,marginTop:4},quantity:{flexDirection:'row',alignItems:'center',gap:14},quantityButton:{fontSize:24,color:'#102841',fontWeight:'600',paddingHorizontal:4},quantityValue:{fontSize:16,fontWeight:'700',color:COLORS.text},grid:{flexDirection:'row',flexWrap:'wrap',gap:8},option:{flexGrow:1,minWidth:'30%',borderWidth:1,borderColor:'#C6DCEB',borderRadius:10,padding:10},optionLabel:{fontSize:14,fontWeight:'600',color:COLORS.text},optionNote:{fontSize:11,color:COLORS.textLight,marginTop:3},label:{fontSize:13,fontWeight:'600',color:COLORS.text,marginTop:14,marginBottom:8},weekdays:{flexDirection:'row',gap:6},day:{flex:1,alignItems:'center',paddingVertical:9,borderRadius:8,borderWidth:1,borderColor:'#C6DCEB'},daySelected:{backgroundColor:'#102841',borderColor:'#102841'},dayText:{fontSize:12,fontWeight:'600',color:COLORS.text},dayTextSelected:{color:'white'},addressButton:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'#C6DCEB',borderRadius:10,padding:12},addressText:{flex:1,fontSize:14,color:COLORS.text},input:{borderWidth:1,borderColor:'#C6DCEB',borderRadius:10,padding:12,minHeight:70,textAlignVertical:'top',color:COLORS.text},summary:{fontSize:14,color:COLORS.text,marginBottom:7},previewState:{flexDirection:'row',alignItems:'center',gap:8},previewBill:{backgroundColor:'#F0F9FF',borderWidth:1,borderColor:'#BAE6FD',borderRadius:12,padding:12,marginTop:4},previewLabel:{fontSize:11,fontWeight:'700',letterSpacing:0.5,color:COLORS.textLight},previewAmount:{fontSize:26,fontWeight:'800',color:COLORS.primary,marginBottom:4},previewDetail:{fontSize:13,color:COLORS.text,marginBottom:4},previewError:{fontSize:13,color:COLORS.error,marginBottom:8},saveButton:{backgroundColor:'#102841',borderRadius:12,alignItems:'center',padding:15},saveButtonText:{color:'white',fontSize:16,fontWeight:'700'},disabled:{opacity:.65} });
