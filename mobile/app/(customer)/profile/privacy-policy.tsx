import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/utils/constants';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.replace('/(customer)/profile/privacy-security')} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.h1}>Hy-Safe Privacy Policy</Text>
          <Text style={styles.p}>
            This is a placeholder policy until final legal content is provided.
          </Text>

          <Text style={styles.h2}>What we collect</Text>
          <Text style={styles.p}>
            - Phone number / email (for login and communication){'\n'}
            - Delivery address (for fulfilling orders){'\n'}
            - Order details and payment method selection (for processing orders)
          </Text>

          <Text style={styles.h2}>How we use it</Text>
          <Text style={styles.p}>
            - To deliver water cans to your address{'\n'}
            - To send order updates (accepted/out for delivery/delivered){'\n'}
            - To improve app experience and support
          </Text>

          <Text style={styles.h2}>Data sharing</Text>
          <Text style={styles.p}>
            We may share limited details with delivery staff (name, phone, address) only to complete deliveries.
          </Text>

          <Text style={styles.h2}>Contact</Text>
          <Text style={styles.p}>
            If you have questions, contact support via the Help & Support section.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.accent },
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
  backButton: { padding: 8, position: 'absolute', left: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  placeholder: { width: 40, position: 'absolute', right: 20 },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
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
  h1: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  h2: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginTop: 14, marginBottom: 6 },
  p: { fontSize: 13, color: COLORS.textLight, lineHeight: 18 },
});


