import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCart } from '../../context/CartContext';
import { PRODUCTS } from '../../data/dummy';
import { COLORS } from '../../utils/constants';

interface AddOnItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    volume: string;
    image: ImageSourcePropType;
  };
  isInCart: boolean;
  onAdd: () => void;
}

const AddOnItem: React.FC<AddOnItemProps> = ({ item, isInCart, onAdd }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const prevInCartRef = useRef(isInCart);

  useEffect(() => {
    // Only animate if item just changed from not in cart to in cart
    if (!prevInCartRef.current && isInCart) {
      setShouldAnimate(true);
    }
    prevInCartRef.current = isInCart;
  }, [isInCart]);

  useEffect(() => {
    if (shouldAnimate) {
      // Animate when item is added
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

  const handlePress = () => {
    onAdd();
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.addText}>{isInCart ? '✓' : '+'}</Text>
        </Animated.View>
      </TouchableOpacity>
      <View style={styles.imageContainer}>
         {item.image && (
           <Image 
              source={item.image} 
              style={styles.productImage}
              resizeMode="contain"
           />
         )}
      </View>
      <Text style={styles.name}>{item.name}</Text>
      <View style={styles.priceRow}>
         <Text style={styles.price}>₹{item.price}</Text>
         <Text style={styles.free}>Free</Text>
      </View>
    </View>
  );
};

export const AddOns = () => {
  const { addToCart, getQuantity } = useCart();

  const handleAddItem = (item: typeof PRODUCTS[0]) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      volume: item.volume,
    });
  };

  // Filter items to only show those not in cart
  const itemsNotInCart = PRODUCTS.filter((item) => getQuantity(item.id) === 0);

  // Don't show the section if all items are already in cart
  if (itemsNotInCart.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Missed something? Add a few more bottles or cans!</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {itemsNotInCart.map((item) => {
          return (
            <AddOnItem
              key={item.id}
              item={item}
              isInCart={false}
              onAdd={() => handleAddItem(item)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#102841',
  },
  scrollContent: {
    paddingRight: 20,
    paddingBottom: 4,
  },
  card: {
    width: 140,
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    position: 'relative',
  },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#102841',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
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
    color: '#102841',
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  price: {
    fontSize: 12,
    fontWeight: '600',
    color: '#102841',
  },
  free: {
    fontSize: 10,
    color: '#102841',
  },
});

