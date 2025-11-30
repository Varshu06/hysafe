import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActiveOrderCardProps {
  order: {
    id: string;
    status: string;
    driverName: string;
    progress: number;
    timeline: { status: string; completed: boolean; current?: boolean }[];
  };
}

export const ActiveOrderCard = ({ order }: ActiveOrderCardProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Water Can On it's Way</Text>
        <TouchableOpacity>
          <Text style={styles.shareIcon}>🔗</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timeline}>
        <View style={styles.line} />
        <View style={styles.timelineItems}>
            <View style={styles.timelineItem}>
                <View style={[styles.dot, styles.completedDot]}>
                    <Text style={styles.check}>✓</Text>
                </View>
                <Text style={styles.timelineLabel}>Picked UP</Text>
            </View>
             <View style={styles.timelineItem}>
                <View style={[styles.dot, styles.currentDot]}>
                   <Text style={styles.icon}>💧</Text>
                </View>
            </View>
             <View style={styles.timelineItem}>
                <View style={[styles.dot, styles.pendingDot]} />
                <Text style={styles.timelineLabel}>Delivered</Text>
            </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.driverName}>{order.driverName}</Text>
        <TouchableOpacity style={styles.callButton}>
           <Text style={styles.callIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A', // Dark blue
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shareIcon: {
    fontSize: 20,
    color: 'white',
  },
  timeline: {
    marginBottom: 24,
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 12,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 0,
  },
  timelineItems: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
  },
  timelineItem: {
      alignItems: 'center',
      zIndex: 1,
  },
  dot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#334155',
      marginBottom: 8,
  },
  completedDot: {
      backgroundColor: '#3B82F6', // Blue
  },
  currentDot: {
      backgroundColor: '#60A5FA',
      width: 32,
      height: 32,
      borderRadius: 16,
      marginTop: -4,
  },
  pendingDot: {
      backgroundColor: 'white',
      borderWidth: 4,
      borderColor: '#334155',
  },
  check: {
      color: 'white',
      fontSize: 12,
  },
  icon: {
      fontSize: 16,
  },
  timelineLabel: {
      color: 'white',
      fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIcon: {
      fontSize: 18,
  },
});

