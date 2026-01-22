import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';
import { useAuth } from '../../src/context/AuthContext';
import { getAssignedOrders } from '../../src/services/staff.service';
import { COLORS } from '../../src/utils/constants';
import { StaffHeader } from '../../src/components/staff/StaffHeader';
import { storage } from '../../src/utils/storage';
import { getProfile } from '../../src/services/auth.service';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [staff, setStaff] = useState({
    name: user?.name || user?.email || 'Staff Member',
    phone: user?.phone || '123-456-7890',
    isOnline: false,
  });

  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState({ pending: 0, ongoing: 0, delivered: 0, cod: 0 });

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const load = async () => {
        try {
          const online = await storage.getStaffOnline();
          if (mounted) setIsOnline(online);
          
          // Fetch staff profile to get name
          const profileResponse = await getProfile();
          if (profileResponse?.user && mounted) {
            setStaff({
              name: profileResponse.user.name || profileResponse.user.email || 'Staff Member',
              phone: profileResponse.user.phone || '123-456-7890',
              isOnline: online,
            });
          }
        } catch (error) {
          console.error('Failed to load profile:', error);
          // Fallback to user data from context
          if (mounted) {
            const online = await storage.getStaffOnline();
            setStaff({
              name: user?.name || user?.email || 'Staff Member',
              phone: user?.phone || '123-456-7890',
              isOnline: online,
            });
          }
        }
      };
      load();
      return () => {
        mounted = false;
      };
    }, [user])
  );

  useEffect(() => {
    const load = async () => {
      try {
        const orders = await getAssignedOrders();
        const pending = orders.filter((o: any) => String(o.status).toLowerCase() === 'pending').length;
        const delivered = orders.filter((o: any) => String(o.status).toLowerCase() === 'delivered').length;
        const ongoing = orders.filter((o: any) => {
          const s = String(o.status).toLowerCase();
          return s !== 'pending' && s !== 'delivered' && s !== 'cancelled';
        }).length;
        const cod = orders
          .filter((o: any) => String(o.paymentMethod || '').toLowerCase() === 'offline')
          .reduce((sum: number, o: any) => sum + Number(o.codAmount || o.totalPrice || 0), 0);
        setStats({ pending, ongoing, delivered, cod });
      } catch (e) {
        // ignore for now
      }
    };
    load();
  }, []);


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
            // Logout function in AuthContext handles navigation
            await logout();
          },
        },
      ]
    );
  };

  const statusLabel = useMemo(() => (isOnline ? 'ONLINE' : 'OFFLINE'), [isOnline]);

  return (
    <View style={styles.container}>
      <StaffHeader title="Profile" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            <View style={[styles.statusPill, isOnline ? styles.statusOnline : styles.statusOffline]}>
              <Text style={[styles.statusPillText, isOnline ? styles.statusOnlineText : styles.statusOfflineText]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Today</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>New</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.ongoing}</Text>
              <Text style={styles.statLabel}>Ongoing</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.delivered}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>₹{stats.cod}</Text>
              <Text style={styles.statLabel}>COD</Text>
            </View>
          </View>
        </View>

        <Button
          title="Logout"
          variant="danger"
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  statsCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textLight,
  },
  logoutButton: {
    marginTop: 20,
    marginBottom: 20,
  },
});



