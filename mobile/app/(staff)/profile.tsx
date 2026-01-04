import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/utils/constants';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Mock staff data (replace with actual staff profile from context later)
  const staff = {
    name: user?.email || 'Staff Member',
    phone: user?.phone || '123-456-7890',
    isOnline: false
  };

  const getInitials = (value?: string) => {
    const s = (value || '').trim();
    if (!s) return 'S';
    const parts = s.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || 'S';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getInitials(staff.name)}</Text>
            </View>
            <View style={styles.profileMain}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {staff.name}
                </Text>
                <View style={styles.roleChip}>
                  <Text style={styles.roleChipText}>Staff</Text>
                </View>
              </View>
              <Text style={styles.phone}>{staff.phone}</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={[styles.statusPill, staff.isOnline ? styles.statusOnline : styles.statusOffline]}>
              <Text style={[styles.statusPillText, staff.isOnline ? styles.statusOnlineText : styles.statusOfflineText]}>
                {staff.isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
        </View>

      <Button
        title="Logout"
        variant="danger"
        onPress={handleLogout}
        style={styles.logoutButton}
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
  headerLeft: { width: 40 },
  headerRight: { width: 40 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  profileMain: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  roleChip: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roleChipText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 12,
  },
  phone: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  statusOffline: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  statusOnlineText: { color: COLORS.success },
  statusOfflineText: { color: COLORS.textLight },
  logoutButton: {
    marginTop: 20,
  },
});



