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

  const initial = useMemo(() => {
    return {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    };
  }, [user]);

  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone] = useState(initial.phone); // read-only for now (OTP flow later)
  const [saving, setSaving] = useState(false);

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
    justifyContent: 'space-between',
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
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
});


