import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/utils/constants';

type Role = 'customer' | 'staff' | 'admin';

export default function SignupScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || (!email && !phone) || !password) {
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

    try {
      setLoading(true);
      await register({
        name,
        email: email || undefined,
        phone: phone || undefined,
        password,
        role: 'customer',
        address: address || undefined,
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
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>

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

          <TextInput
            style={styles.input}
            placeholder="Phone Number *"
            placeholderTextColor={COLORS.textLight}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Address (optional)"
            placeholderTextColor={COLORS.textLight}
            value={address}
            onChangeText={setAddress}
            multiline
          />

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
              <ActivityIndicator color={COLORS.secondary} />
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  content: {
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 30,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.accent,
  },
  roleText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  roleTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.secondary,
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  loginLinkText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});




