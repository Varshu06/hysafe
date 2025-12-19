import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductCard } from '../../../src/components/customer/ProductCard';
import { useCart } from '../../../src/context/CartContext';
import { PRODUCTS } from '../../../src/data/dummy';
import { COLORS } from '../../../src/utils/constants';

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addToCart, removeFromCart, getQuantity, getTotalItems } = useCart();

  const toggleSelection = (product: typeof PRODUCTS[0]) => {
    const isInCart = getQuantity(product.id) > 0;
    if (isInCart) {
      removeFromCart(product.id);
    } else {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        volume: product.volume,
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Select Your Products</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
            {PRODUCTS.map((product) => {
              const isInCart = getQuantity(product.id) > 0;
              return (
                <ProductCard
                    key={product.id}
                    item={product}
                    selected={isInCart}
                    onSelect={() => toggleSelection(product)}
                />
              );
            })}
        </View>
      </ScrollView>

      {getTotalItems() > 0 && (
        <View style={styles.footer}>
            <View style={styles.footerContent}>
                <Text style={styles.itemsCount}>{getTotalItems()} items selected</Text>
                <TouchableOpacity 
                    style={styles.nextButton}
                    onPress={() => router.push('/(customer)/checkout')}
                >
                    <Text style={styles.nextText}>View Items ›</Text>
                </TouchableOpacity>
            </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsCount: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

