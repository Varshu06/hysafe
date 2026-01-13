import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../src/components/ui/Button';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS } from '../../../src/utils/constants';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  type CustomerType = 'home' | 'shop' | 'hotel' | 'bank' | 'event';
  type PaymentTerms = 'one-time' | 'weekly' | 'monthly';

  const CUSTOMER_TYPES: { value: CustomerType; label: string; icon: string; description: string }[] = [
    { value: 'home', label: 'Home', icon: '🏠', description: 'Home delivery' },
    { value: 'shop', label: 'Shop', icon: '🏪', description: 'Retail shop' },
    { value: 'hotel', label: 'Hotel', icon: '🏨', description: 'Hotel/Restaurant' },
    { value: 'bank', label: 'Bank', icon: '🏦', description: 'Bank/Office' },
    { value: 'event', label: 'Event', icon: '🎉', description: 'Events/Weddings' },
  ];

  const PAYMENT_TERMS_OPTIONS: { value: PaymentTerms; label: string; description: string }[] = [
    { value: 'one-time', label: 'Pay Per Order', description: 'Pay for each order' },
    { value: 'weekly', label: 'Weekly', description: 'Pay weekly' },
    { value: 'monthly', label: 'Monthly', description: 'Pay monthly' },
  ];

  // Smart defaults based on customer type
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
  const [phone] = useState(initial.phone); // read-only for now (OTP flow later)
  const [customerType, setCustomerType] = useState<CustomerType>(initial.customerType);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(initial.paymentTerms);
  const [saving, setSaving] = useState(false);

  // Update payment terms when customer type changes
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
      // TODO: integrate API call later (PUT /api/customers/profile)
      // Should include: { name, email, customerType }
      // For now: UI-only
      Alert.alert('Saved', 'Your profile has been updated (UI only for now).', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.replace('/(customer)/profile')} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor={COLORS.textLight}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={COLORS.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput style={[styles.input, styles.inputDisabled]} value={phone} editable={false} />
          <Text style={styles.helperText}>
            Phone number edits can be added later with OTP verification.
          </Text>

          <Text style={styles.label}>Account Type *</Text>
          <Text style={styles.sectionSubtext}>
            Select your account type to get the best pricing
          </Text>
          <View style={styles.customerTypeGrid}>
            {CUSTOMER_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.customerTypeCard,
                  customerType === type.value && styles.customerTypeCardSelected,
                ]}
                onPress={() => setCustomerType(type.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.customerTypeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.customerTypeLabel,
                    customerType === type.value && styles.customerTypeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>
                <Text
                  style={[
                    styles.customerTypeDescription,
                    customerType === type.value && styles.customerTypeDescriptionSelected,
                  ]}
                >
                  {type.description}
                </Text>
                {customerType === type.value && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedCheck}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {(customerType === 'shop' || customerType === 'hotel' || customerType === 'event') && (
            <View style={styles.wholesaleBanner}>
              <Text style={styles.wholesaleBannerText}>
                🏪 You'll get bulk order pricing on all products!
              </Text>
            </View>
          )}

          <Text style={styles.label}>Payment Terms *</Text>
          <Text style={styles.sectionSubtext}>
            Choose how you want to pay for your orders
          </Text>
          <View style={styles.customerTypeGrid}>
            {PAYMENT_TERMS_OPTIONS.map((term) => (
              <TouchableOpacity
                key={term.value}
                style={[
                  styles.customerTypeCard,
                  paymentTerms === term.value && styles.customerTypeCardSelected,
                ]}
                onPress={() => setPaymentTerms(term.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.customerTypeLabel,
                    paymentTerms === term.value && styles.customerTypeLabelSelected,
                  ]}
                >
                  {term.label}
                </Text>
                <Text
                  style={[
                    styles.customerTypeDescription,
                    paymentTerms === term.value && styles.customerTypeDescriptionSelected,
                  ]}
                >
                  {term.description}
                </Text>
                {paymentTerms === term.value && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedCheck}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {(paymentTerms === 'monthly' || paymentTerms === 'weekly') && (
            <View style={styles.paymentInfoBanner}>
              <Text style={styles.paymentInfoBannerText}>
                💰 {paymentTerms === 'monthly' ? 'Monthly' : 'Weekly'} payment terms will be applied to your orders. Payment due dates will be shown in order details.
              </Text>
            </View>
          )}
        </View>

        <Button
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
        />

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
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textLight,
  },
  saveButton: {
    marginTop: 16,
  },
  bottomSpacer: {
    height: 24,
  },
  sectionSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 12,
    marginTop: 4,
  },
  customerTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  customerTypeCard: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  customerTypeCardSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: COLORS.primary,
  },
  customerTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  customerTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  customerTypeLabelSelected: {
    color: COLORS.primary,
  },
  customerTypeDescription: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  customerTypeDescriptionSelected: {
    color: COLORS.primary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheck: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  wholesaleBanner: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  wholesaleBannerText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
  paymentInfoBanner: {
    backgroundColor: '#E0F2FE',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  paymentInfoBannerText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
});


