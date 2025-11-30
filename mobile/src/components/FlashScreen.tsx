import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';

export const FlashScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Ripple Effect Loop
    const createRipple = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            delay: delay,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    createRipple(ripple1, 0);
    createRipple(ripple2, 1000);
  }, []);

  return (
    <View style={styles.container}>
      
      {/* Ripples */}
      <Animated.View style={[styles.ripple, { 
          transform: [{ scale: ripple1.interpolate({ inputRange: [0, 1], outputRange: [1, 4] }) }],
          opacity: ripple1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] })
      }]} />
      <Animated.View style={[styles.ripple, { 
          transform: [{ scale: ripple2.interpolate({ inputRange: [0, 1], outputRange: [1, 4] }) }],
          opacity: ripple2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] })
      }]} />

      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>💧</Text>
        </View>
        <Text style={styles.appName}>Hy-Safe</Text>
        <Text style={styles.tagline}>Pure Water. Pure Life.</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  ripple: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'white',
      zIndex: 0,
  },
  logoContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
  },
  logoIcon: {
      fontSize: 50,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#E0F2FE', // Very light blue
    letterSpacing: 2,
    fontWeight: '500',
  },
});
