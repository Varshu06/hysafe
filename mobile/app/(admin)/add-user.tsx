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
import { createUser } from '../../src/services/admin.service';
import { COLORS } from '../../src/utils/constants';

type Role = 'staff' | 'admin';

export default function AddUserScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [vehicleType, setVehicleType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async () => {
    if (!name || (!email && !phone) || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await createUser({
        name,
        email,
        phone,
        password,
        role,
        vehicleType: role === 'staff' ? vehicleType : undefined,
      });
      
      Alert.alert('Success', 'User created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add New User</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Role *</Text>
          <View style={styles.roleContainer}>
            {(['staff', 'admin'] as Role[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleButton, role === r && styles.roleButtonActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Personal Details</Text>
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

          {role === 'staff' && (
            <>
                <Text style={styles.label}>Vehicle Details</Text>
                <TextInput
                style={styles.input}
                placeholder="Vehicle Type (e.g. Bike, Van)"
                placeholderTextColor={COLORS.textLight}
                value={vehicleType}
                onChangeText={setVehicleType}
                />
            </>
          )}

          <Text style={styles.label}>Security</Text>
          <TextInput
            style={styles.input}
            placeholder="Password *"
            placeholderTextColor={COLORS.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateUser}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.secondary} />
            ) : (
              <Text style={styles.buttonText}>Create User</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EBF8FF',
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
    marginTop: 20,
    marginBottom: 40,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

