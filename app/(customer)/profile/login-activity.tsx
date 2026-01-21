import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/utils/constants';
import { getLoginActivity, LoginActivity } from '../../../src/services/customer.service';

export default function LoginActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivities = async () => {
    try {
      const response = await getLoginActivity();
      setActivities(response.activities);
    } catch (error: any) {
      console.error('Error loading login activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.replace('/(customer)/profile/privacy-security')} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Login Activity</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading login history...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {activities.length === 0 ? (
            <View style={styles.card}>
              <Feather name="shield" size={48} color={COLORS.textLight} style={styles.emptyIcon} />
              <Text style={styles.title}>No login history</Text>
              <Text style={styles.subtitle}>
                Your recent login sessions will appear here once you log in.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Recent Login Sessions</Text>
              {activities.map((activity, index) => (
                <View key={activity.id} style={[styles.card, index === 0 && styles.currentSession]}>
                  <View style={styles.activityHeader}>
                    <View style={styles.iconContainer}>
                      <Feather
                        name={index === 0 ? 'check-circle' : 'log-in'}
                        size={20}
                        color={index === 0 ? COLORS.success : COLORS.primary}
                      />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>
                        {activity.deviceInfo}
                        {index === 0 && <Text style={styles.currentBadge}> (Current)</Text>}
                      </Text>
                      <Text style={styles.activityTime}>{formatDate(activity.loginAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.activityDetails}>
                    <View style={styles.detailRow}>
                      <Feather name="map-pin" size={14} color={COLORS.textLight} />
                      <Text style={styles.detailText}>{activity.location}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="globe" size={14} color={COLORS.textLight} />
                      <Text style={styles.detailText}>{activity.ipAddress}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentSession: {
    borderColor: COLORS.success,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  currentBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  activityDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  emptyIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: COLORS.textLight, lineHeight: 18, textAlign: 'center' },
});


