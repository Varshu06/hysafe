import { Feather } from '@expo/vector-icons';
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
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.push('/(customer)')} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.text} />
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Select Your Products</Text>
        <View style={styles.placeholder} />
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  backButton: {
    padding: 8,
    position: 'absolute',
    left: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
    position: 'absolute',
    right: 16,
  },
  grid: {
    padding: 20,
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

