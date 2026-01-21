import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS } from '../../../src/utils/constants';
import { updateProfile as updateProfileAPI } from '../../../src/services/customer.service';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();

  type CustomerType = 'home' | 'shop' | 'hotel' | 'bank' | 'event';
  type PaymentTerms = 'one-time' | 'weekly' | 'monthly';

  const CUSTOMER_TYPES: { value: CustomerType; label: string; icon: keyof typeof Feather.glyphMap; description: string }[] = [
    { value: 'home', label: 'Home', icon: 'home', description: 'Home delivery' },
    { value: 'shop', label: 'Shop', icon: 'shopping-bag', description: 'Retail shop' },
    { value: 'hotel', label: 'Hotel', icon: 'briefcase', description: 'Hotel/Restaurant' },
    { value: 'bank', label: 'Bank', icon: 'building', description: 'Bank/Office' },
    { value: 'event', label: 'Event', icon: 'calendar', description: 'Events/Weddings' },
  ];

  const PAYMENT_TERMS_OPTIONS: { value: PaymentTerms; label: string; icon: keyof typeof Feather.glyphMap; description: string }[] = [
    { value: 'one-time', label: 'Pay Per Order', icon: 'credit-card', description: 'Pay for each order' },
    { value: 'weekly', label: 'Weekly', icon: 'refresh-cw', description: 'Pay weekly' },
    { value: 'monthly', label: 'Monthly', icon: 'calendar', description: 'Pay monthly' },
  ];

  const getDefaultPaymentTerms = (type: CustomerType): PaymentTerms => {
    if (type === 'hotel' || type === 'bank' || type === 'shop') {
      return 'monthly';
    }
    return 'one-time';
  };

  const initial = useMemo(() => {
    const defaultCustomerType: CustomerType = (user?.customerType as CustomerType) || 'home';
    return {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      customerType: defaultCustomerType,
      paymentTerms: ((user as any)?.paymentTerms as PaymentTerms) || getDefaultPaymentTerms(defaultCustomerType),
    };
  }, [user]);

  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone] = useState(initial.phone);
  const [customerType, setCustomerType] = useState<CustomerType>(initial.customerType);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(initial.paymentTerms);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setPaymentTerms(getDefaultPaymentTerms(customerType));
  }, [customerType]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Not logged in', 'Please login to edit profile.');
      router.replace('/(auth)/login');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your full name.');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: name.trim(),
        email: email.trim() || undefined,
        customerType,
        paymentTerms,
      };

      await updateProfileAPI(updateData);
      await refreshProfile();
      router.replace('/(customer)/profile');
      setTimeout(() => {
        Alert.alert('Success', 'Your profile has been updated successfully!');
      }, 100);
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.replace('/(customer)/profile')} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="user" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Feather name="user" size={18} color={COLORS.textLight} style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textLight}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Email <Text style={styles.optionalLabel}>(optional)</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Feather name="mail" size={18} color={COLORS.textLight} style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <Feather name="phone" size={18} color={COLORS.textLight} style={styles.fieldIcon} />
              <TextInput
                style={[styles.input, styles.disabledText]}
                value={phone}
                editable={false}
              />
            </View>
            <Text style={styles.hint}>Can be updated later with OTP verification</Text>
          </View>
        </View>

        {/* Account Type */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="tag" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Account Type</Text>
          </View>
          <Text style={styles.cardSubtitle}>Select your account type for best pricing</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {CUSTOMER_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeChip,
                  customerType === type.value && styles.typeChipActive,
                ]}
                onPress={() => setCustomerType(type.value)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.chipIcon,
                  customerType === type.value && styles.chipIconActive,
                ]}>
                  <Feather 
                    name={type.icon} 
                    size={16} 
                    color={customerType === type.value ? COLORS.primary : COLORS.textLight} 
                  />
                </View>
                <Text style={[
                  styles.chipLabel,
                  customerType === type.value && styles.chipLabelActive,
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {(customerType === 'shop' || customerType === 'hotel' || customerType === 'event') && (
            <View style={styles.alertBox}>
              <Feather name="star" size={14} color={COLORS.success} />
              <Text style={styles.alertText}>Bulk order pricing available for this account type</Text>
            </View>
          )}
        </View>

        {/* Payment Terms */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="credit-card" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Payment Terms</Text>
          </View>
          <Text style={styles.cardSubtitle}>Choose your preferred payment schedule</Text>
          
          <View style={styles.paymentContainer}>
            {PAYMENT_TERMS_OPTIONS.map((term) => (
              <TouchableOpacity
                key={term.value}
                style={[
                  styles.paymentCard,
                  paymentTerms === term.value && styles.paymentCardActive,
                ]}
                onPress={() => setPaymentTerms(term.value)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.paymentIconBox,
                  paymentTerms === term.value && styles.paymentIconBoxActive,
                ]}>
                  <Feather 
                    name={term.icon} 
                    size={18} 
                    color={paymentTerms === term.value ? COLORS.primary : COLORS.textLight} 
                  />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={[
                    styles.paymentTitle,
                    paymentTerms === term.value && styles.paymentTitleActive,
                  ]}>
                    {term.label}
                  </Text>
                  <Text style={[
                    styles.paymentSubtitle,
                    paymentTerms === term.value && styles.paymentSubtitleActive,
                  ]}>
                    {term.description}
                  </Text>
                </View>
                {paymentTerms === term.value && (
                  <View style={styles.checkBadge}>
                    <Feather name="check" size={14} color={COLORS.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {(paymentTerms === 'monthly' || paymentTerms === 'weekly') && (
            <View style={styles.alertBox}>
              <Feather name="info" size={14} color={COLORS.primary} />
              <Text style={styles.alertText}>
                {paymentTerms === 'monthly' ? 'Monthly' : 'Weekly'} billing will be applied. Payment due dates will be shown in order details.
              </Text>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <>
              <ActivityIndicator color={COLORS.secondary} size="small" />
              <Text style={styles.saveButtonText}>Saving...</Text>
            </>
          ) : (
            <>
              <Feather name="check" size={18} color={COLORS.secondary} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  backButton: {
    padding: 8,
    position: 'absolute',
    left: 12,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  placeholder: {
    width: 36,
    position: 'absolute',
    right: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 16,
    marginLeft: 28,
  },
  field: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  optionalLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.textLight,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.8,
  },
  fieldIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
    padding: 0,
  },
  disabledText: {
    color: COLORS.textLight,
  },
  hint: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 6,
    marginLeft: 2,
    lineHeight: 15,
  },
  horizontalScroll: {
    paddingRight: 16,
    gap: 10,
  },
  typeChip: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minWidth: 80,
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: '#F0F9FF',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  chipIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  chipIconActive: {
    backgroundColor: '#E0F2FE',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  paymentContainer: {
    gap: 12,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  paymentCardActive: {
    backgroundColor: '#F0F9FF',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  paymentIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  paymentIconBoxActive: {
    backgroundColor: '#E0F2FE',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 3,
  },
  paymentTitleActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  paymentSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
  paymentSubtitleActive: {
    color: COLORS.primary,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bottomSpacer: {
    height: 20,
  },
});
