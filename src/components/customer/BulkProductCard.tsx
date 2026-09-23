import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { normalizeImageSource } from '../../utils/image';
import { COLORS } from '../../utils/constants';

interface BulkProductCardProps {
  item: {
    id: string;
    name: string;
    price: number;
    bulkMinQuantity: number;
    deliveryCharge: number;
    image: ImageSourcePropType | string;
    volume: string;
  };
  selected?: boolean;
  onSelect?: () => void;
}

export const BulkProductCard = ({ item, selected, onSelect }: BulkProductCardProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const prevSelectedRef = useRef(selected);

  useEffect(() => {
    if (!prevSelectedRef.current && selected) {
      setShouldAnimate(true);
    }
    prevSelectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if (shouldAnimate) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldAnimate(false);
      });
    }
  }, [shouldAnimate]);

  return (
    <TouchableOpacity 
      style={[styles.card, selected && styles.selectedCard]} 
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {selected && (
        <Animated.View 
          style={[
            styles.checkIcon,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.checkText}>✓</Text>
        </Animated.View>
      )}

      <View style={styles.imageContainer}>
        <Image 
          source={normalizeImageSource(item.image)} 
          style={styles.productImage}
          resizeMode="contain"
        />
      </View>
      
      <Text style={styles.name}>{item.name}</Text>
      
      <View style={styles.bulkPriceContainer}>
        <Text style={styles.bulkPriceText}>{item.bulkMinQuantity} cans for ₹{item.price}</Text>
      </View>

      <View style={styles.priceRow}>
        <View style={styles.deliveryBadge}>
          <Text style={styles.deliveryText}>🚚 {item.deliveryCharge === 0 ? 'Free' : `₹${item.deliveryCharge}`}</Text>
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
    position: 'relative',
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
  checkText: {
    color: 'white',
    fontSize: 10,
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
    marginBottom: 6,
    textAlign: 'center',
  },
  bulkPriceContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulkPriceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 4,
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

