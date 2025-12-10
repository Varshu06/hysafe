import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
}

export const MapPicker = ({ latitude, longitude }: MapPickerProps) => {
  const hasLocation = latitude !== undefined && longitude !== undefined;

  return (
    <View style={styles.container}>
      {/* Map placeholder with grid pattern */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.gridContainer}>
          {/* Create a simple grid pattern to simulate a map */}
          {[...Array(6)].map((_, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {[...Array(8)].map((_, colIndex) => (
                <View key={colIndex} style={styles.gridCell} />
              ))}
            </View>
          ))}
        </View>
        
        {/* Roads simulation */}
        <View style={styles.horizontalRoad} />
        <View style={styles.verticalRoad} />
        
        {hasLocation && (
          <Text style={styles.coordsText}>
            {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
          </Text>
        )}
      </View>
      
      {/* Center Pin */}
      <View style={styles.pinContainer}>
        <View style={styles.pin}>
          <View style={styles.pinHead}>
            <Ionicons name="location" size={20} color="white" />
          </View>
          <View style={styles.pinPoint} />
        </View>
        <View style={styles.pinShadow} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 280,
    backgroundColor: '#E8F0E8',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E8F0E8',
  },
  gridContainer: {
    flex: 1,
    padding: 20,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 100, 0, 0.1)',
    backgroundColor: 'transparent',
  },
  horizontalRoad: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#D4D4D4',
    marginTop: -4,
  },
  verticalRoad: {
    position: 'absolute',
    left: '40%',
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#D4D4D4',
  },
  coordsText: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    fontSize: 11,
    color: '#64748B',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -44,
    marginLeft: -16,
    alignItems: 'center',
  },
  pin: {
    alignItems: 'center',
  },
  pinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#EF4444',
    marginTop: -2,
  },
  pinShadow: {
    width: 16,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    marginTop: 4,
  },
});
