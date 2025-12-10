import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActiveOrderCard } from '../../src/components/customer/ActiveOrderCard';
import { CustomerHeader } from '../../src/components/customer/Header';
import { OrderCard } from '../../src/components/customer/OrderCard';
import { WhyChooseUs } from '../../src/components/customer/WhyChooseUs';
import { FloatingAddButton } from '../../src/components/ui/FloatingAddButton';
import { useCart } from '../../src/context/CartContext';
import { ACTIVE_ORDER, PAST_ORDERS, PRODUCTS } from '../../src/data/dummy';
import { COLORS } from '../../src/utils/constants';

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { addToCart, getQuantity, incrementQuantity, decrementQuantity } = useCart();

  const handleAddProduct = (product: typeof PRODUCTS[0]) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      volume: product.volume,
    });
    // Redirect to checkout after adding
    router.push('/(customer)/checkout');
  };

  const handleIncrement = (productId: string) => {
    incrementQuantity(productId);
  };

  const handleDecrement = (productId: string) => {
    decrementQuantity(productId);
  };

  return (
    <View style={styles.container}>
      <CustomerHeader />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Products Horizontal Scroll */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Products</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsScroll}>
                {PRODUCTS.map((product) => (
                    <View 
                        key={product.id} 
                        style={styles.productCardSmall}
                    >
                        <View style={styles.productImageContainer}>
                             <Image 
                                source={product.image} 
                                style={styles.productImage}
                                resizeMode="contain"
                             />
                        </View>
                        <Text style={styles.productName}>{product.name}</Text>
                        <View style={styles.priceRow}>
                            <Text style={styles.price}>₹ {product.price}</Text>
                            {getQuantity(product.id) > 0 ? (
                                <View style={styles.quantitySelector}>
                                    <TouchableOpacity 
                                        style={styles.qtyButton}
                                        onPress={() => handleDecrement(product.id)}
                                    >
                                        <Text style={styles.qtyButtonText}>−</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{getQuantity(product.id)}</Text>
                                    <TouchableOpacity 
                                        style={styles.qtyButton}
                                        onPress={() => handleIncrement(product.id)}
                                    >
                                        <Text style={styles.qtyButtonText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={styles.addButton}
                                    onPress={() => handleAddProduct(product)}
                                >
                                    <Text style={styles.addButtonText}>ADD</Text>
                                    <Text style={styles.plusIcon}>+</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>
            <TouchableOpacity 
                style={styles.viewMoreBtn}
                onPress={() => router.push('/(customer)/products')}
            >
                <Text style={styles.viewMoreText}>View More</Text>
            </TouchableOpacity>
        </View>

        {/* Active Orders */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Orders</Text>
            <ActiveOrderCard order={ACTIVE_ORDER} />
        </View>

        {/* Order History */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order History</Text>
            {PAST_ORDERS.map((order) => (
                <OrderCard key={order.id} order={order} />
            ))}
        </View>

        {/* Why Choose Us */}
        <WhyChooseUs />
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
      
      <FloatingAddButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text,
  },
  productsScroll: {
    paddingRight: 20,
    alignItems: 'center',
  },
  productCardSmall: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 12,
      marginRight: 16,
      width: 160,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
  },
  productImageContainer: {
      width: 100, 
      height: 100, 
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
  },
  productImage: {
      width: '100%',
      height: '100%',
  },
  productName: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: 8,
      textAlign: 'center',
  },
  priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 4,
  },
  price: {
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  addButton: {
      backgroundColor: '#102841',
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 32,
  },
  addButtonText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
  },
  plusIcon: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
  },
  quantitySelector: {
      backgroundColor: '#102841',
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      height: 32,
      gap: 8,
  },
  qtyButton: {
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
  },
  qtyButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
  },
  qtyText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
      minWidth: 14,
      textAlign: 'center',
  },
  viewMoreBtn: {
      backgroundColor: '#102841',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      alignSelf: 'flex-end',
      marginTop: 16,
  },
  viewMoreText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 14,
  },
  bottomSpacer: {
      height: 80,
  }
});
