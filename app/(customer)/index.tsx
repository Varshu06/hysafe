import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
import { useTranslation } from "react-i18next";
import { Product } from "@/types/product.types";
import { ProductImages } from "@/data/dummy";
import { normalizeImageSource } from "../../src/utils/image";
// import { Product } from "../types/product.types";

export default function CustomerHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { addToCart, getQuantity, incrementQuantity, decrementQuantity } =
    useCart();
  const { orders, refreshOrders } = useOrder();
  const { products, refreshProducts } = useProduct();

  useFocusEffect(
    useCallback(() => {
      void refreshOrders();
    }, [refreshOrders]),
  );

  useFocusEffect(
    useCallback(() => {
      void refreshProducts();
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

  // Map the persisted order lifecycle to the three customer tracking milestones.
  const transformOrderForActiveCard = (order: Order) => {
    const status = order.status?.toLowerCase();
    const stageIndex =
      status === "accepted" ? 0 : status === "out_for_delivery" ? 1 : status === "delivered" ? 2 : -1;
    const timeline = ["accepted", "out_for_delivery", "delivered"].map(
      (stage, index) => ({
        status: stage,
        completed: stageIndex >= index,
        current: stageIndex === index,
      }),
    );
    // The track has three dot centers at 0%, 50%, and 100% of its width.
    const progress = stageIndex < 0 ? 0 : stageIndex / 2;
    const assignedPartnerPhone =
      order.assignedStaffId?.phone || order.assignedStaff?.phone;

    return {
      id: order._id,
      status: order.status || "pending",
      productName:
        Array.from(
          new Set(
            (order.items || [])
              .map((item) => item.productName?.trim())
              .filter((name): name is string => Boolean(name)),
          ),
        ).join(" + ") || t("productDetailsUnavailable"),
      quantity:
        (Number.isFinite(order.quantity) && order.quantity > 0
          ? order.quantity
          : (order.items || []).reduce((sum, item) => {
              const itemQuantity = Number(item.quantity);
              return sum + (Number.isFinite(itemQuantity) && itemQuantity > 0 ? itemQuantity : 0);
            }, 0)) || null,
      totalAmount: Number.isFinite(Number(order.price || order.totalPrice || 0))
        ? Number(order.price || order.totalPrice || 0)
        : 0,
      partnerAssigned: Boolean(
        order.assignedStaffId ||
          order.assignedStaff ||
          status === "accepted" ||
          status === "out_for_delivery",
      ),
      partnerName:
        order.assignedStaffId?.name || order.assignedStaff?.name || "",
      partnerPhone:
        typeof assignedPartnerPhone === "string"
          ? assignedPartnerPhone.trim()
          : "",
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
          <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>{t("products")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsScroll}
          >
            {products.map((product) => {
              const availabilityState = product.comingSoon
                ? "coming_soon"
                : product.available !== true || Number(product.quantity) < 1
                  ? "unavailable"
                  : product.availabilityState || "available";
              const isOrderable = availabilityState === "available";
              const cartQuantity = getQuantity(product.id);

              return (
                <View key={product.id} style={styles.productCardSmall}>
                  <View style={styles.productImageContainer}>
                    <Image
                      source={normalizeImageSource(product.image) || ProductImages[product.volume.toLowerCase()]}
                      style={[styles.productImage, !isOrderable && styles.unavailableProductImage]}
                      resizeMode="contain"
                    />
                    {!isOrderable && (
                      <View style={styles.productAvailabilityBadge}>
                        <Text style={styles.productAvailabilityText}>
                          {availabilityState === "coming_soon" ? t("comingSoon") : t("unavailableLabel")}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.productName, !isOrderable && styles.unavailableProductText]}>{product.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.price, !isOrderable && styles.unavailableProductText]}>₹ {product.price}</Text>
                    {cartQuantity > 0 ? (
                      <View style={styles.quantitySelector}>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => handleDecrement(product.id)}
                        >
                          <Text style={styles.qtyButtonText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{cartQuantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => handleIncrement(product.id)}
                          disabled={!isOrderable}
                        >
                          <Text style={[styles.qtyButtonText, !isOrderable && styles.disabledQuantityButton]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isOrderable ? (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleAddProduct(product)}
                      >
                        <Text
                          style={styles.addButtonText}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          {t("add")}
                        </Text>
                        <Text style={styles.plusIcon}>+</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.unavailableActionPlaceholder} />
                    )}
                  </View>
                </View>
              );
            })}
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
          <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>{t("activeOrders")}</Text>
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
            <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{t("orderHistory")}</Text>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => router.push("/(customer)/orders")}
            >
              <Text style={styles.seeAllText} numberOfLines={1}>{t("seeAll")}</Text>
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
    marginBottom: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    lineHeight: 26,
    paddingVertical: 2,
    flex: 1,
  },
  sectionTitleStandalone: {
    marginBottom: 12,
  },
  seeAllBtn: {
    backgroundColor: "#102841",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  seeAllText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 1,
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
  unavailableProductImage: {
    opacity: 0.45,
  },
  productAvailabilityBadge: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 8,
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  productAvailabilityText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  unavailableProductText: {
    color: COLORS.textLight,
  },
  unavailableActionPlaceholder: {
    width: 48,
    minHeight: 32,
  },
  disabledQuantityButton: {
    opacity: 0.45,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
    lineHeight: 20,
    paddingVertical: 2,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 32,
  },
  addButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-end",
    marginTop: 12,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  viewMoreText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 1,
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
