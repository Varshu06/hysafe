import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/constants';

interface BulkOrderCardProps {
  item: {
    id: string;
    name: string;
    price: number;           // Single order price
    bulkPrice: number;      // Bulk order price
    bulkMinQuantity: number; // Minimum quantity for bulk
    deliveryCharge: string;
    image: ImageSourcePropType;
    volume: string;
  };
  selected?: boolean;
  onSelect?: () => void;
}

export const BulkOrderCard = ({ item, selected, onSelect }: BulkOrderCardProps) => {
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

  const savings = item.price - item.bulkPrice;
  const savingsPercent = Math.round((savings / item.price) * 100);

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

      {/* Bulk Order Badge */}
      <View style={styles.bulkBadge}>
        <Text style={styles.bulkBadgeText}>📦 Bulk Order</Text>
      </View>

      <View style={styles.imageContainer}>
        <Image 
          source={item.image} 
          style={styles.productImage}
          resizeMode="contain"
        />
      </View>
      
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.volume}>{item.volume}</Text>
      
      {/* Price Comparison Section */}
      <View style={styles.priceContainer}>
        {/* Single Order Price */}
        <View style={styles.singlePriceSection}>
          <Text style={styles.singlePriceLabel}>Single Order</Text>
          <Text style={styles.singlePrice}>₹{item.price}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bulk Order Price */}
        <View style={styles.bulkPriceSection}>
          <Text style={styles.bulkPriceLabel}>Bulk Order</Text>
          <Text style={styles.bulkPrice}>₹{item.bulkPrice}</Text>
          <View style={styles.savingsContainer}>
            <Text style={styles.savingsText}>Save ₹{savings}</Text>
            <Text style={styles.savingsPercent}>({savingsPercent}% off)</Text>
          </View>
        </View>
      </View>

      {/* Minimum Quantity Badge */}
      <View style={styles.minQuantityContainer}>
        <Text style={styles.minQuantityIcon}>📊</Text>
        <Text style={styles.minQuantityText}>
          Minimum {item.bulkMinQuantity} {item.volume.includes('L') ? 'cans' : 'bottles'} for bulk pricing
        </Text>
      </View>

      <View style={styles.deliveryBadge}>
        <Text style={styles.deliveryText}>🚚 {item.deliveryCharge}</Text>
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    position: 'relative',
  },
  selectedCard: {
    borderColor: COLORS.primary,
    backgroundColor: '#E0F2FE',
    elevation: 5,
  },
  bulkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 2,
  },
  bulkBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 2,
    borderColor: 'white',
  },
  checkText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  imageContainer: {
    height: 100,
    width: 100,
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
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  volume: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  priceContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  singlePriceSection: {
    alignItems: 'center',
    marginBottom: 6,
  },
  singlePriceLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  singlePrice: {
    fontSize: 12,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 6,
  },
  bulkPriceSection: {
    alignItems: 'center',
  },
  bulkPriceLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  bulkPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  savingsContainer: {
    alignItems: 'center',
  },
  savingsText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
  },
  savingsPercent: {
    fontSize: 9,
    color: COLORS.success,
    fontWeight: '600',
  },
  minQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 6,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  minQuantityIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  minQuantityText: {
    fontSize: 9,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  deliveryText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
});


