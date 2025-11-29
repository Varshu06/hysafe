import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/utils/constants';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
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

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Please login to view profile</Text>
        <Button
          title="Login"
          onPress={() => router.push('/(auth)/login')}
          style={styles.loginButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <Text style={styles.name}>{user.email || user.phone}</Text>
        <Text style={styles.role}>Customer</Text>
      </View>

      <Button
        title="Logout"
        variant="danger"
        onPress={handleLogout}
        style={styles.logoutButton}
      />
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
  role: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  logoutButton: {
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 40,
  },
  loginButton: {
    marginTop: 20,
    minWidth: 120,
    alignSelf: 'center',
  },
});



