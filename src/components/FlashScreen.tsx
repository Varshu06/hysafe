import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../utils/constants';

export const FlashScreen = ({ onComplete }: { onComplete?: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dotScale = useRef(new Animated.Value(0.15)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
        textOpacity.setValue(1);
        dotOpacity.setValue(0);
        onComplete?.();
        return;
      }
      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(dotScale, { toValue: 2.8, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(dotOpacity, { toValue: 0, duration: 280, delay: 120, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.timing(textOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]);
      animation.start(({ finished }) => { if (finished) onComplete?.(); });
    });
    return () => { cancelled = true; animation?.stop(); };
  }, [onComplete]);

  return (
    <View style={styles.container}>
      
      <Animated.View style={[styles.dot, { opacity: dotOpacity, transform: [{ scale: dotScale }] }]} />

      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoWrapper}>
          <Image 
            source={require('../assets/logo1.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
          <Text style={styles.appName}>Hy-Safe</Text>
          <Text style={styles.tagline}>Pure Water. Pure Life.</Text>
        </Animated.View>
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
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    zIndex: 2,
  },
  logoContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
    backgroundColor: 'transparent',
    paddingTop: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    letterSpacing: 1,
    lineHeight: 48,
  },
  tagline: {
    fontSize: 16,
    color: '#E0F2FE', // Very light blue
    letterSpacing: 2,
    fontWeight: '500',
    lineHeight: 22,
  },
});
