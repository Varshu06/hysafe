import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ActiveOrderCard } from "../../src/components/customer/ActiveOrderCard";
import { CustomerHeader } from "../../src/components/customer/Header";
import { OrderCard } from "../../src/components/customer/OrderCard";
import { WhyChooseUs } from "../../src/components/customer/WhyChooseUs";
import { FloatingAddButton } from "../../src/components/ui/FloatingAddButton";
import { useCart } from "../../src/context/CartContext";
import { useOrder } from "../../src/context/OrderContext";
import { useProduct } from "../../src/context/ProductContext";
// import { PRODUCTS } from "../../src/data/dummy";
import { Order } from "../../src/types/order.types";
import { COLORS } from "../../src/utils/constants";
import { t } from "i18next";
import { Product } from "@/types/product.types";
import { ProductImages } from "@/data/dummy";
import { normalizeImageSource } from "../../src/utils/image";
// import { Product } from "../types/product.types";

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { addToCart, getQuantity, incrementQuantity, decrementQuantity } =
    useCart();
  const { orders, refreshOrders, isLoading } = useOrder();
  const { products, loading, refreshing, error, refreshProducts } = useProduct();

  useEffect(() => {
    refreshOrders();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshProducts();
    }, [refreshProducts]),
  );

  // Get active orders (pending, accepted, out_for_delivery)
  const activeOrders = orders.filter((order) => {
    const status = order.status?.toLowerCase();
    return (
      status === "pending" ||
      status === "accepted" ||
      status === "out_for_delivery"
    );
  });

  // Get past orders (delivered, cancelled) - show last 3
  const pastOrders = orders
    .filter((order) => {
      const status = order.status?.toLowerCase();
      return status === "delivered" || status === "cancelled";
    })
    .slice(0, 3);

  // Transform order for ActiveOrderCard
  const transformOrderForActiveCard = (order: Order) => {
    const status = order.status?.toLowerCase();
    let progress = 0;
    let timeline = [
      { status: "picked", completed: false, current: false },
      { status: "on_the_way", completed: false, current: false },
      { status: "delivered", completed: false, current: false },
    ];

    if (status === "pending") {
      progress = 0;
      timeline[0].current = true;
    } else if (status === "accepted") {
      progress = 0.33;
      timeline[0].completed = true;
      timeline[1].current = true;
    } else if (status === "out_for_delivery") {
      progress = 0.66;
      timeline[0].completed = true;
      timeline[1].completed = true;
      timeline[2].current = true;
    } else if (status === "delivered") {
      progress = 1;
      timeline[0].completed = true;
      timeline[1].completed = true;
      timeline[2].completed = true;
    }

    return {
      id: order._id,
      status: order.status || "pending",
      driverName:
        order.driverName || order.assignedStaff?.name || "notAssigned",
      progress,
      timeline,
    };
  };

  // Transform order for OrderCard
  const transformOrderForCard = (order: Order) => {
    const date = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "N/A";

    return {
      id: order._id,
      date,
      status: order.status || "pending",
      price: order.price || order.totalPrice || 0,
      driver: order.driverName || order.assignedStaff?.name || "Not Assigned",
      address: order.deliveryAddress || "Address not provided",
    };
  };

  const handleAddProduct = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      volume: product.volume,
      deliveryCharge: product.deliveryCharge || 0,
    });
    // Don't redirect - let user add multiple items and go to checkout when ready
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
          <Text style={styles.sectionTitle}>{t("products")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsScroll}
          >
            {products.map((product) => (
              <View key={product.id} style={styles.productCardSmall}>
                <View style={styles.productImageContainer}>
                  <Image
                    source={normalizeImageSource(product.image) || ProductImages[product.volume.toLowerCase()]}
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
                      <Text style={styles.qtyText}>
                        {getQuantity(product.id)}
                      </Text>
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
                      <Text style={styles.addButtonText}>{t("add")}</Text>
                      <Text style={styles.plusIcon}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.viewMoreBtn}
            onPress={() => router.push("/(customer)/products")}
          >
            <Text style={styles.viewMoreText}>{t("viewMore")}</Text>
          </TouchableOpacity>
        </View>

        {/* Active Orders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("activeOrders")}</Text>
          {activeOrders.length > 0 ? (
            activeOrders
              .slice(0, 1)
              .map((order) => (
                <ActiveOrderCard
                  key={order._id}
                  order={transformOrderForActiveCard(order)}
                />
              ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t("noActiveOrders")}</Text>
            </View>
          )}
        </View>

        {/* Order History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("orderHistory")}</Text>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => router.push("/(customer)/orders")}
            >
              <Text style={styles.seeAllText}>{t("seeAll")}</Text>
            </TouchableOpacity>
          </View>
          {pastOrders.length > 0 ? (
            pastOrders.map((order) => (
              <OrderCard key={order._id} order={transformOrderForCard(order)} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t("noOrderHistory")}</Text>
            </View>
          )}
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
    backgroundColor: "#F0F9FF",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  seeAllBtn: {
    backgroundColor: "#102841",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  seeAllText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  productsScroll: {
    paddingRight: 20,
    alignItems: "center",
  },
  productCardSmall: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
    width: 160,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  productImageContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
    lineHeight: 20,
    flexShrink: 1,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: "#102841",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
  },
  addButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  plusIcon: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  quantitySelector: {
    backgroundColor: "#102841",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 32,
    gap: 8,
  },
  qtyButton: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  qtyText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    minWidth: 14,
    textAlign: "center",
  },
  viewMoreBtn: {
    backgroundColor: "#102841",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: "flex-end",
    marginTop: 16,
    minHeight: 44,
  },
  viewMoreText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  bottomSpacer: {
    height: 80,
  },
  emptyState: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
});
