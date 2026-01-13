import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/utils/constants';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleDeleteAccount = () => {
    router.push('/(customer)/profile/delete-account');
  };

  const Row = ({
    icon,
    title,
    subtitle,
    onPress,
    danger,
  }: {
    icon: React.ComponentProps<typeof Feather>['name'];
    title: string;
    subtitle?: string;
    onPress: () => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
          <Feather name={icon} size={18} color={danger ? COLORS.error : COLORS.text} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.replace('/(customer)/profile')} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Security</Text>

        <Row
          icon="lock"
          title="Change Password"
          subtitle="Update your account password"
          onPress={() => router.push('/(customer)/profile/change-password')}
        />
        <Row
          icon="key"
          title="App Lock"
          subtitle="Enable biometric/PIN lock (coming soon)"
          onPress={() => router.push('/(customer)/profile/app-lock')}
        />
        <Row
          icon="shield"
          title="Login Activity"
          subtitle="View recent logins (coming soon)"
          onPress={() => router.push('/(customer)/profile/login-activity')}
        />

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Privacy</Text>
        <Row
          icon="file-text"
          title="Privacy Policy"
          subtitle="Read how we handle your data"
          onPress={() => router.push('/(customer)/profile/privacy-policy')}
        />
        <Row
          icon="trash-2"
          title="Delete Account"
          subtitle="Permanently delete your account"
          onPress={handleDeleteAccount}
          danger
        />
      </View>
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
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  row: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  rowTitleDanger: {
    color: COLORS.error,
  },
  rowSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
});


