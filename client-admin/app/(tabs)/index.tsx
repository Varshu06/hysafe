import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../src/utils/constants';

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalStaff: 0,
    onlineStaff: 0,
  });

  useEffect(() => {
    // TODO: Fetch dashboard stats from API
    // For now, show placeholder
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pendingOrders}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.todayOrders}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{stats.totalRevenue}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalCustomers}</Text>
          <Text style={styles.statLabel}>Customers</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.onlineStaff}/{stats.totalStaff}</Text>
          <Text style={styles.statLabel}>Staff Online</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  content: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});




