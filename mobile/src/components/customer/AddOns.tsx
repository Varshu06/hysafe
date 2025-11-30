import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../utils/constants';

export const AddOns = () => {
  const items = [
    { id: '1', name: '20L Water Can', price: 30, volume: '20L', image: 'https://via.placeholder.com/150?text=20L+Can' },
    { id: '2', name: '300ml Bottle', price: 10, volume: '300ml', image: 'https://via.placeholder.com/150?text=300ml' },
    { id: '3', name: '5L Can', price: 40, volume: '5L', image: 'https://via.placeholder.com/150?text=5L+Can' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Missed something? Add a few more bottles or cans!</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.addButton}>
              <Text style={styles.addText}>+</Text>
            </View>
            <View style={styles.imageContainer}>
               <Image 
                  source={{ uri: item.image }} 
                  style={styles.productImage}
                  resizeMode="contain"
               />
            </View>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.priceRow}>
               <Text style={styles.price}>₹ {item.price}</Text>
               <Text style={styles.free}>🚚 Free</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.text,
  },
  scrollContent: {
    paddingRight: 16,
    paddingBottom: 4,
  },
  card: {
    width: 140,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  addText: {
    color: 'white',
    fontWeight: 'bold',
    lineHeight: 18, // Adjust for centering
  },
  imageContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    color: COLORS.text,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  price: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  free: {
    fontSize: 10,
    color: COLORS.textLight,
  },
});

