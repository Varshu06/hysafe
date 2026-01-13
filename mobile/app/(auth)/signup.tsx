import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/utils/constants';

type CustomerType = 'home' | 'shop' | 'hotel' | 'bank' | 'event';

const CUSTOMER_TYPES: { value: CustomerType; label: string; icon: string; description: string }[] = [
  { value: 'home', label: 'Home', icon: '🏠', description: 'Home delivery' },
  { value: 'shop', label: 'Shop', icon: '🏪', description: 'Retail shop' },
  { value: 'hotel', label: 'Hotel', icon: '🏨', description: 'Hotel/Restaurant' },
  { value: 'bank', label: 'Bank', icon: '🏦', description: 'Bank/Office' },
  { value: 'event', label: 'Event', icon: '🎉', description: 'Events/Weddings' },
];

export default function SignupScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('home');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !phone || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      await register({
        name,
        email: email || undefined,
        phone: phone || undefined,
        password,
        role: 'customer',
        address: address || undefined,
        customerType: customerType,
      });
      
      // Navigation will be handled by AuthContext based on role
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Water Theme Header */}
      <ImageBackground 
        source={require('../../src/assets/loginimage.png')} 
        style={styles.headerContainer}
        resizeMode="cover"
      >
         <View style={styles.overlay} />
         <View style={styles.headerWave} />
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Hy-Safe</Text>
        <Text style={styles.tagline}>Create Your Account</Text>
        <Text style={styles.subtitle}>Join us to order fresh water cans anytime, anywhere.</Text>
        
        <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>Sign up</Text>
            <View style={styles.line} />
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            placeholderTextColor={COLORS.textLight}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email (optional)"
            placeholderTextColor={COLORS.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.inputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.code}>+91</Text>
            </View>
          <TextInput
              style={styles.phoneInput}
              placeholder="Enter Phone Number"
            placeholderTextColor={COLORS.textLight}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
              maxLength={10}
          />
          </View>

          <TextInput
            style={[styles.input, styles.addressInput]}
            placeholder="Address (optional)"
            placeholderTextColor={COLORS.textLight}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />

          {/* Customer Type Selection */}
          <View style={styles.customerTypeSection}>
            <Text style={styles.sectionLabel}>Account Type *</Text>
            <Text style={styles.sectionSubtext}>Select your account type to get the best pricing</Text>
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
                  🏪 You'll get wholesale pricing on all products!
                </Text>
              </View>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Password *"
            placeholderTextColor={COLORS.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password *"
            placeholderTextColor={COLORS.textLight}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLinkText}>Login</Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.orText}>or</Text>

          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialIcon}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialIcon}>📧</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerContainer: {
    height: 350,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 132, 199, 0.3)',
  },
  headerWave: {
    position: 'absolute',
    bottom: -50,
    width: '150%',
    height: 100,
    backgroundColor: 'white',
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
    alignSelf: 'center',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 10,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 4,
    width: '100%',
    marginBottom: 16,
    height: 56,
    backgroundColor: '#F8FAFC',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  flag: {
    fontSize: 18,
    marginRight: 8,
  },
  code: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loginText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  loginLinkText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  orText: {
    color: COLORS.textLight,
    marginBottom: 24,
    textAlign: 'center',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  socialIcon: {
    fontSize: 24,
  },
  customerTypeSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 12,
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
});




