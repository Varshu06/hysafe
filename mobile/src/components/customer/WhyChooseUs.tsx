import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FEATURES = [
  {
    id: 1,
    icon: 'water',
    title: 'Pure Water',
    description: 'Purified and safe for drinking',
  },
  {
    id: 2,
    icon: 'truck-delivery',
    title: 'Fast Delivery',
    description: 'Within 2 hours of ordering',
  },
  {
    id: 3,
    icon: 'heart-hands',
    title: 'Great Service',
    description: 'Friendly and professional staff',
  },
  {
    id: 4,
    icon: 'credit-card',
    title: 'Easy Payment',
    description: 'Cash, online, or monthly',
  },
];

export const WhyChooseUs = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Update index
        setActiveIndex((prev) => (prev + 1) % FEATURES.length);
        
        // Slide in from right
        slideAnim.setValue(50);
        
        // Animate slide and fade in
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'water':
        return <Ionicons name="water" size={24} color="#0F172A" />;
      case 'truck-delivery':
        return <MaterialCommunityIcons name="truck-delivery-outline" size={24} color="#0F172A" />;
      case 'heart-hands':
        return <MaterialCommunityIcons name="hand-heart-outline" size={24} color="#0F172A" />;
      case 'credit-card':
        return <MaterialCommunityIcons name="credit-card-outline" size={24} color="#0F172A" />;
      default:
        return <Feather name="star" size={24} color="#0F172A" />;
    }
  };

  const currentFeature = FEATURES[activeIndex];

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Why Choose us</Text>
      
      <View style={styles.card}>
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            {renderIcon(currentFeature.icon)}
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentFeature.title}</Text>
            <Text style={styles.desc}>{currentFeature.description}</Text>
          </View>
        </Animated.View>
        
        <View style={styles.dots}>
          {FEATURES.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                activeIndex === index && styles.activeDot
              ]} 
            />
          ))}
        </View>
      </View>
      
      <View style={styles.promoContainer}>
        <Text style={styles.promoTitle}>Pure Water,</Text>
        <Text style={styles.promoTitle}>Prompt</Text>
        <View style={styles.deliveryRow}>
          <Text style={styles.promoTitle}>Delivery</Text>
          <Text style={styles.promoIcon}>🚚</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    marginBottom: 16,
  },
  promoContainer: {
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    minHeight: 160,
  },
  contentContainer: {
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    marginBottom: 16,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  desc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeDot: {
    backgroundColor: 'white',
    width: 24,
  },
  promoTitle: {
    fontSize: 62,
    fontWeight: '900',
    color: '#B8D4E8',
    opacity: 0.7,
    lineHeight: 76,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoIcon: {
    fontSize: 62,
    opacity: 0.7,
    marginLeft: 14,
  }
});
