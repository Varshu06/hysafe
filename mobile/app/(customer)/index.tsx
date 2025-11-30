import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActiveOrderCard } from '../../src/components/customer/ActiveOrderCard';
import { CustomerHeader } from '../../src/components/customer/Header';
import { OrderCard } from '../../src/components/customer/OrderCard';
import { WhyChooseUs } from '../../src/components/customer/WhyChooseUs';
import { ACTIVE_ORDER, PAST_ORDERS, PRODUCTS } from '../../src/data/dummy';
import { COLORS } from '../../src/utils/constants';

export default function CustomerHomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <CustomerHeader />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Products Horizontal Scroll */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Products</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsScroll}>
                {PRODUCTS.map((product) => (
                    <TouchableOpacity 
                        key={product.id} 
                        style={styles.productCardSmall}
                        onPress={() => router.push('/(customer)/products')}
                    >
                        <View style={styles.productImageContainer}>
                             {/* Real Image Placeholder - user will add local assets */}
                             <Image 
                                source={{ uri: product.image }} 
                                style={styles.productImage}
                                resizeMode="contain"
                             />
                        </View>
                        <Text style={styles.productName}>{product.name}</Text>
                        <View style={styles.priceRow}>
                            <Text style={styles.price}>₹ {product.price}</Text>
                            <TouchableOpacity style={styles.addButton}>
                                <Text style={styles.addButtonText}>ADD</Text>
                                <Text style={styles.plusIcon}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                ))}
                
                <TouchableOpacity 
                    style={styles.nextBtn}
                    onPress={() => router.push('/(customer)/products')}
                >
                    <Text style={styles.nextBtnText}>Next ›</Text>
                </TouchableOpacity>
            </ScrollView>
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
      backgroundColor: COLORS.primary,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
  nextBtn: {
      backgroundColor: '#0F172A',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginLeft: 8,
  },
  nextBtnText: {
      color: 'white',
      fontWeight: 'bold',
  },
  bottomSpacer: {
      height: 80,
  }
});
