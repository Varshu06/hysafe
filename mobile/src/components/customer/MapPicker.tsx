import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const MapPicker = () => {
  return (
    <View style={styles.container}>
      {/* Placeholder for Map View */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>📍</Text>
        <Text style={styles.mapLabel}>Map View</Text>
      </View>
      <View style={styles.pinContainer}>
          <View style={styles.pin}>
              <View style={styles.pinHead} />
              <View style={styles.pinPoint} />
          </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    alignItems: 'center',
    opacity: 0.5,
  },
  mapText: {
    fontSize: 40,
  },
  mapLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#64748B',
  },
  pinContainer: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginTop: -24, // Half height
      marginLeft: -12, // Half width
  },
  pin: {
      alignItems: 'center',
  },
  pinHead: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#EF4444',
      borderWidth: 2,
      borderColor: 'white',
  },
  pinPoint: {
      width: 2,
      height: 10,
      backgroundColor: '#EF4444',
  }

});

