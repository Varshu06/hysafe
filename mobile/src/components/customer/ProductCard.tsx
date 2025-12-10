import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/constants';

interface ProductCardProps {
  item: {
    id: string;
    name: string;
    price: number;
    deliveryCharge: string;
    image: ImageSourcePropType;
    volume: string;
  };
  selected?: boolean;
  onSelect?: () => void;
}

export const ProductCard = ({ item, selected, onSelect }: ProductCardProps) => {
  return (
    <TouchableOpacity 
      style={[styles.card, selected && styles.selectedCard]} 
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {selected && (
        <View style={styles.checkIcon}>
           <Text style={{color: 'white', fontSize: 10}}>✓</Text>
        </View>
      )}
      <View style={styles.imageContainer}>
         <Image 
            source={item.image} 
            style={styles.productImage}
            resizeMode="contain"
         />
      </View>
      
      <Text style={styles.name}>{item.name}</Text>
      
      <View style={styles.priceRow}>
        <Text style={styles.price}>₹ {item.price}</Text>
        <View style={styles.deliveryBadge}>
           <Text style={styles.deliveryText}>🚚 {item.deliveryCharge}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F9FF',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageContainer: {
    height: 100,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
});

