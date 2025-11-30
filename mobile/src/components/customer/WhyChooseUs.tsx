import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../utils/constants';

export const WhyChooseUs = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Why Choose us</Text>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
            <Text style={styles.icon}>💧</Text>
        </View>
        <View>
            <Text style={styles.title}>Pure Water</Text>
            <Text style={styles.desc}>Purified and safe for drinking</Text>
        </View>
        <View style={styles.dots}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
        </View>
      </View>
      
       <Text style={styles.promoTitle}>Pure Water,{"\n"}Prompt{"\n"}Delivery</Text>
       <Text style={styles.promoIcon}>🚚</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
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
  },
  iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
  },
  icon: {
      fontSize: 20,
  },
  title: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 4,
  },
  desc: {
      color: '#94A3B8',
      fontSize: 14,
      marginBottom: 20,
  },
  dots: {
      flexDirection: 'row',
      gap: 6,
  },
  dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#334155',
  },
  activeDot: {
      backgroundColor: 'white',
  },
  promoTitle: {
      fontSize: 32,
      fontWeight: '900',
      color: '#E2E8F0',
      opacity: 0.5,
      lineHeight: 40,
  },
  promoIcon: {
      position: 'absolute',
      bottom: 10,
      right: 20,
      fontSize: 40,
      opacity: 0.3,
  }
});

