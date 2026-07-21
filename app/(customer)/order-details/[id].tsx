import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Clipboard,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Loader } from "../../../src/components/ui/Loader";
import { StatusBadge } from "../../../src/components/ui/StatusBadge";
import { useCart } from "../../../src/context/CartContext";
import { useOrder } from "../../../src/context/OrderContext";
import { PRODUCTS } from "../../../src/data/dummy";
import { getOrderById, cancelOrder } from "../../../src/services/order.service";
import { Order } from "../../../src/types/order.types";
import { COLORS } from "../../../src/utils/constants";
import { t } from "i18next";

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orders } = useOrder();
  const { addToCart, updateQuantity, getQuantity } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getDriverName = (): string => {
    if (order?.driverName) return order.driverName;
    if (order?.assignedStaff?.name) return order.assignedStaff.name;
    if (order?.status === "pending") return "Not Assigned";
    return "Delivery Partner";
  };

  const getDriverPhone = (): string | null => {
    return order?.assignedStaff?.phone || null;
  };

  const handleCallDriver = () => {
    const phone = getDriverPhone();
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert("No Phone Number", "Driver phone number is not available");
    }
  };

  const handleCopyOrderId = () => {
    if (order?._id) {
      Clipboard.setString(order._id);
      Alert.alert("Copied!", "Order ID copied to clipboard");
    }
  };

  const handleCancelOrder = () => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelOrder(order!._id);
            Alert.alert("Success", "Order cancelled successfully");
            router.back();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to cancel order");
          }
        },
      },
    ]);
  };

  const handleTrackOrder = () => {
    // Navigate to tracking page or show tracking info
    Alert.alert("Track Order", "Tracking feature coming soon!");
  };

  const handleReorder = () => {
    if (!order) {
      Alert.alert("Error", "Order information not available");
      return;
    }

    try {
      // Find the 20L water can product (default product)
      const product = PRODUCTS.find((p) => p.volume === "20L") || PRODUCTS[0];

      // Add to cart with the order quantity
      const currentQuantity = order.quantity || 1;

      // Check if product is already in cart
      const existingQuantity = getQuantity(product.id);

      if (existingQuantity > 0) {
        // Product already in cart, update quantity
        updateQuantity(product.id, existingQuantity + currentQuantity);
      } else {
        // Add product to cart (will add with quantity 1)
        addToCart({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          volume: product.volume,
          deliveryCharge: product.deliveryCharge || 0,
        });

        // Update quantity to match order quantity
        if (currentQuantity > 1) {
          updateQuantity(product.id, currentQuantity);
        }
      }

      Alert.alert(
        "Success",
        `${currentQuantity} x ${product.name} added to cart!`,
        [
          {
            text: "View Cart",
            onPress: () => router.push("/(customer)/checkout"),
          },
          {
            text: "Continue Shopping",
            style: "cancel",
          },
        ],
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add items to cart");
    }
  };

  const canCancel = () => {
    const status = order?.status?.toLowerCase();
    return status === "pending" || status === "accepted";
  };

  const canTrack = () => {
    const status = order?.status?.toLowerCase();
    return status === "out_for_delivery" || status === "accepted";
  };

  const canReorder = () => {
    const status = order?.status?.toLowerCase();
    return status === "delivered" || status === "cancelled";
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      // Try to find in context first
      const orderFromContext = orders.find((o) => o._id === id);
      if (orderFromContext) {
        setOrder(orderFromContext);
        setIsLoading(false);
        return;
      }

      // Otherwise fetch from API
      const orderData = await getOrderById(id);
      setOrder(orderData);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load order details");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader fullScreen />;
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t("orderNotFound")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.push("/(customer)/orders")}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("orderDetails")}</Text>
        <TouchableOpacity
          onPress={() => router.push("/(customer)")}
          style={styles.homeButton}
        >
          <Feather name="home" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <StatusBadge status={order.status} style={styles.statusBadge} />
        </View>

        {/* Order ID Display */}
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderIdLabel}>{t("orderId")}</Text>
          <View style={styles.orderIdRow}>
            <Text style={styles.orderIdValue}>#{order._id}</Text>
            <TouchableOpacity
              onPress={handleCopyOrderId}
              style={styles.copyButton}
            >
              <Feather name="copy" size={16} color={COLORS.primary} />
              {/* <Text style={styles.copyText}>Copy</Text> */}
            </TouchableOpacity>
          </View>
        </View>

        {/* Driver Contact Card */}
        {(order.driverName || order.assignedStaff?.name) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("driverPartner")}</Text>

            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{getDriverName()}</Text>
                {getDriverPhone() && (
                  <Text style={styles.driverPhone}>{getDriverPhone()}</Text>
                )}
                {!getDriverPhone() && (
                  <Text style={styles.driverPhone}>
                    {t("phoneNotAvailable")}
                  </Text>
                )}
              </View>
              {getDriverPhone() && (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={handleCallDriver}
                >
                  <Feather name="phone" size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Order Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("orderInfo")}</Text>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="water" size={20} color={COLORS.primary} />
            </View>

            <FlatList
              data={order.items}
              keyExtractor={(item) => item.productId}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {item.productName} ({item.quantity})
                  </Text>
                </View>
              )}
            />
          </View>

          {(order.price || order.totalPrice) && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Feather name="dollar-sign" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t("totalAmount")}</Text>
                <Text style={styles.infoValue}>
                  ₹{order.price || order.totalPrice}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Feather name="credit-card" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("paymentMethod")}</Text>
              <Text style={styles.infoValue}>
                {t(order.paymentMethod?.toLowerCase() || "offline")}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Feather
                name={order.paymentStatus === "paid" ? "check-circle" : "clock"}
                size={20}
                color={
                  order.paymentStatus === "paid"
                    ? COLORS.success
                    : COLORS.warning
                }
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("paymentStatus")}</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      order.paymentStatus === "paid"
                        ? COLORS.success
                        : COLORS.warning,
                  },
                ]}
              >
                {t(order.paymentStatus?.toLowerCase() || "pending")}
              </Text>
            </View>
          </View>

          {(order as any).paymentTerms && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Feather name="calendar" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t("paymentTerms")}</Text>
                <Text style={styles.infoValue}>
                  {(order as any).paymentTerms === "monthly" ||
                  (order as any).paymentTerms === "weekly"
                    ? `${((order as any).paymentTerms as string).charAt(0).toUpperCase() + ((order as any).paymentTerms as string).slice(1)} Payment${(order as any).nextPaymentDue ? ` - Due on ${(order as any).nextPaymentDue}` : ""}`
                    : ((order as any).paymentTerms as string)
                        .charAt(0)
                        .toUpperCase() +
                      ((order as any).paymentTerms as string)
                        .slice(1)
                        .replace("-", " ")}
                </Text>
                {(order as any).isRecurring && (
                  <Text
                    style={[
                      styles.infoValue,
                      { fontSize: 12, color: "#94A3B8", marginTop: 4 },
                    ]}
                  >
                    Part of recurring delivery schedule
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Delivery Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("deliveryInfo")}</Text>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("deliveryAddress")}</Text>
              <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
            </View>
          </View>

          {order.deliverySlot && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Feather name="calendar" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t("deliverySlot")}</Text>
                <Text style={styles.infoValue}>
                  {new Date(order.deliverySlot).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Notes Card */}
        {order.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("specialInstructions")}</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Timeline Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("orderTimeline")}</Text>

          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>{t("orderPlaced")}</Text>
              <Text style={styles.timelineValue}>
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </Text>
            </View>
          </View>

          {order.outForDeliveryAt && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>{t("outForDelivery")}</Text>
                <Text style={styles.timelineValue}>
                  {new Date(order.outForDeliveryAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons Footer */}
      <View
        style={[styles.actionFooter, { paddingBottom: insets.bottom + 16 }]}
      >
        {canCancel() && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelOrder}
          >
            <Feather name="x-circle" size={20} color={COLORS.error} />
            <Text style={styles.cancelButtonText}>{t("cancelOrder")}</Text>
          </TouchableOpacity>
        )}

        {canTrack() && (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={handleTrackOrder}
          >
            <Feather name="map-pin" size={20} color="white" />
            <Text style={styles.trackButtonText}>{t("trackOrder")}</Text>
          </TouchableOpacity>
        )}

        {canReorder() && (
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={handleReorder}
          >
            <Feather name="refresh-cw" size={20} color="white" />
            <Text style={styles.reorderButtonText}>{t("reorder")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#F0F9FF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
    gap: 16,
  },
  backButton: {
    padding: 8,
    left: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 22,
  },
  homeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  card: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
    lineHeight: 24,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 4,
    fontWeight: "500",
    lineHeight: 16,
  },
  infoValue: {
    fontSize: 15,
    color: "white",
    fontWeight: "600",
    flexShrink: 1,
    flexWrap: "wrap",
    lineHeight: 22,
  },
  notesText: {
    fontSize: 14,
    color: "white",
    lineHeight: 22,
    flexWrap: "wrap",
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
    marginTop: 4,
    marginRight: 16,
  },
  timelineDotCompleted: {
    backgroundColor: COLORS.success,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 20,
  },
  timelineValue: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 18,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: "center",
    marginTop: 40,
  },
  orderIdContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderIdLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 8,
    fontWeight: "500",
  },
  orderIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderIdValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 1,
    flexWrap: "wrap",
    lineHeight: 22,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 8,
    gap: 6,
  },
  copyText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
    lineHeight: 22,
  },
  driverPhone: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 20,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
  },
  actionFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.error,
    flexShrink: 1,
    textAlign: "center",
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  trackButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    flexShrink: 1,
    textAlign: "center",
  },
  reorderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  reorderButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    flexShrink: 1,
    textAlign: "center",
  },
});
