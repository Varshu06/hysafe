import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/utils/constants';

export default function ProfileScreen() {
  const { staff, logout } = useAuth();
  const router = useRouter();

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
      <View style={styles.profileCard}>
        <Text style={styles.name}>{staff?.name || 'Staff Member'}</Text>
        <Text style={styles.phone}>{staff?.phone}</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text
            style={[
              styles.statusValue,
              staff?.isOnline ? styles.statusOnline : styles.statusOffline,
            ]}
          >
            {staff?.isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
    padding: 16,
  },
  profileCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  phone: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginRight: 8,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusOnline: {
    color: COLORS.success,
    backgroundColor: COLORS.accent,
  },
  statusOffline: {
    color: COLORS.textLight,
    backgroundColor: COLORS.accent,
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

