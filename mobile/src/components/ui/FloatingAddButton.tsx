import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function FloatingAddButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    router.push('/(customer)/products');
  };

  // Position just above the tab bar in the right corner
  // Positioned closer to the navbar (tab bar height ~70px)
  const bottomPosition = 25 + insets.bottom;

  return (
    <TouchableOpacity 
      style={[styles.container, { bottom: bottomPosition, right: 16 }]} 
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
          <View style={styles.overlay}>
            <Feather name="plus" size={28} color="#FFFFFF" />
          </View>
        </BlurView>
      ) : (
        <View style={styles.androidButton}>
          <Feather name="plus" size={28} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4EFFA',
    // Drop shadow
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  blurContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 40, 65, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidButton: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(16, 40, 65, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
});

