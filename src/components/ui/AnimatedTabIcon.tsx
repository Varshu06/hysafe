import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface AnimatedTabIconProps {
  children: React.ReactNode;
  focused: boolean;
}

export const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({ children, focused }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      // Pop up animation when selected
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.25,
            friction: 4,
            tension: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1.1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(translateYAnim, {
          toValue: -2,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});


