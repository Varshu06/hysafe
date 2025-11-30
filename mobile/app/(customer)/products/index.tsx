import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ProductCard } from '../../../src/components/customer/ProductCard';
import { PRODUCTS } from '../../../src/data/dummy';
import { COLORS } from '../../../src/utils/constants';

export default function ProductsScreen() {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Select Your Products</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
            {PRODUCTS.map((product) => (
                <ProductCard
                    key={product.id}
                    item={product}
                    selected={selectedItems.includes(product.id)}
                    onSelect={() => toggleSelection(product.id)}
                />
            ))}
        </View>
      </ScrollView>

      {selectedItems.length > 0 && (
        <View style={styles.footer}>
            <View style={styles.footerContent}>
                <Text style={styles.itemsCount}>{selectedItems.length} items selected</Text>
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
    paddingTop: 50,
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

