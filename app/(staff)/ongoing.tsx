import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Button } from "../../src/components/ui/Button";
import {
  getOngoingOrders,
  updateDeliveryStatus,
} from "../../src/services/staff.service";
import { COLORS } from "../../src/utils/constants";
import { StaffHeader } from "../../src/components/staff/StaffHeader";
import { StaffOrderCard } from "../../src/components/staff/StaffOrderCard";
import { StatusStepper } from "../../src/components/staff/StatusStepper";
import {
  DeliveryConfirmModal,
  PaymentMethod,
} from "../../src/components/staff/DeliveryConfirmModal";
import { t } from "i18next";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type FilterType = "all" | "accepted" | "picked" | "transit" | "delivered";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "accepted", label: "Accepted" },
  { key: "delivered", label: "Done" },
];

export default function OngoingOrdersScreen() {
  const router = useRouter();
  const [ongoingOrders, setOngoingOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [confirming, setConfirming] = useState<any | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    refreshOngoingOrders();
    // Set initial scroll position to match current filter
    const initialIndex = FILTERS.findIndex((f) => f.key === filter);
    if (initialIndex !== -1 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * (SCREEN_WIDTH - 40),
          animated: false,
        });
      }, 100);
    }
  }, []);

  // Refresh orders when component comes into focus (e.g., after login)
  useFocusEffect(
    useCallback(() => {
      refreshOngoingOrders();
    }, []),
  );

  const refreshOngoingOrders = async () => {
    setIsLoading(true);
    try {
      const orders = await getOngoingOrders();
      setOngoingOrders(orders || []);
    } catch (error) {
      console.error("Failed to fetch ongoing orders:", error);
      setOngoingOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (
    orderId: string,
    status: string,
    paymentMethod?: PaymentMethod,
    transactionId?: string,
    notes?: string,
  ) => {
    try {
      await updateDeliveryStatus(
        orderId,
        status,
        paymentMethod,
        transactionId,
        notes,
      );
      Alert.alert("Success", "Order status updated!");
      refreshOngoingOrders();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update status");
    }
  };

  const handleCallCustomer = async (phone?: string) => {
    if (!phone)
      return Alert.alert(
        "No phone number",
        "Customer phone number is not available.",
      );
    const url = `tel:${phone}`;
    const can = await Linking.canOpenURL(url);
    if (!can)
      return Alert.alert(
        "Not supported",
        "Calling is not supported on this device.",
      );
    await Linking.openURL(url);
  };

  const handleNavigate = async (coords?: { lat: number; lng: number }) => {
    if (!coords)
      return Alert.alert("No location", "Delivery location is not available.");
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`;
    const can = await Linking.canOpenURL(url);
    if (!can)
      return Alert.alert(
        "Not supported",
        "Maps is not supported on this device.",
      );
    await Linking.openURL(url);
  };

  const getStatusButton = (order: any) => {
    const id = order._id || order.id;
    const status = String(order.status || "").toLowerCase();

    if (status === "accepted") {
      return (
        <Button
          title="Order Picked"
          variant="primary"
          onPress={() => handleStatusUpdate(id, "picked")}
          style={styles.statusButton}
        />
      );
    }

    if (status === "picked" || status === "out_for_delivery") {
      return (
        <Button
          title="Mark Delivered"
          variant="success"
          onPress={() => setConfirming(order)}
          style={styles.statusButton}
        />
      );
    }

    if (status === "transit" || status === "in-transit") {
      return (
        <Button
          title="Mark Delivered"
          variant="success"
          onPress={() => setConfirming(order)}
          style={styles.statusButton}
        />
      );
    }

    return null;
  };

  const handleTabScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageWidth = SCREEN_WIDTH - 40; // Account for container padding
    const index = Math.round(offsetX / pageWidth);
    const newFilter = FILTERS[index]?.key || "all";
    if (newFilter !== filter) {
      setFilter(newFilter);
    }
  };

  const handleTabPress = (filterKey: FilterType) => {
    const index = FILTERS.findIndex((f) => f.key === filterKey);
    if (index !== -1 && scrollViewRef.current) {
      const pageWidth = SCREEN_WIDTH - 40; // Account for container padding
      scrollViewRef.current.scrollTo({
        x: index * pageWidth,
        animated: true,
      });
      setFilter(filterKey);
    }
  };

  const getFilteredOrders = (filterKey: FilterType) => {
    return ongoingOrders.filter((o: any) => {
      if (filterKey === "all") return true;
      const s = String(o.status || "").toLowerCase();
      if (filterKey === "accepted") return s === "accepted";
      if (filterKey === "picked")
        return s === "picked" || s === "out_for_delivery";
      if (filterKey === "transit")
        return (
          s === "transit" || s === "in-transit" || s === "out_for_delivery"
        );
      if (filterKey === "delivered") return s === "delivered";
      return s === filterKey;
    });
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const id = item._id || item.id;
    const paymentLabel =
      String(item.paymentMethod || "offline").toLowerCase() === "online"
        ? "UPI"
        : "COD";
    return (
      <StaffOrderCard
        status={item.status}
        id={String(id)}
        createdAt={item.createdAt}
        quantity={item.quantity || 1}
        deliveryAddress={item.deliveryAddress}
        pickupAddress={item.pickupAddress}
        customer={item.customer}
        paymentLabel={paymentLabel}
        slot={item.deliverySlot}
        notes={item.notes}
        onPress={() => router.push(`/(staff)/order-details/${id}`)}
        extra={<StatusStepper status={String(item.status || "")} />}
        quickActions={
          <>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => handleCallCustomer(item.customerPhone)}
              activeOpacity={0.85}
            >
              <Feather name="phone" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => handleNavigate(item.location)}
              activeOpacity={0.85}
            >
              <Feather name="map" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push(`/(staff)/order-details/${id}`)}
              activeOpacity={0.85}
            >
              <Feather name="file-text" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Details</Text>
            </TouchableOpacity>
          </>
        }
        actions={getStatusButton(item)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StaffHeader title={t("ongoing")} />

      <View style={styles.content}>
        {/* Swipeable Tab Bar */}
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            {FILTERS.map((filterItem) => (
              <TouchableOpacity
                key={filterItem.key}
                style={[
                  styles.tab,
                  filter === filterItem.key && styles.tabActive,
                ]}
                onPress={() => handleTabPress(filterItem.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    filter === filterItem.key && styles.tabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t(filterItem.key)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Swipeable Content */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleTabScroll}
          scrollEventThrottle={16}
          style={styles.swipeContainer}
        >
          {FILTERS.map((filterItem) => {
            const filtered = getFilteredOrders(filterItem.key);
            return (
              <View key={filterItem.key} style={styles.swipePage}>
                <FlatList
                  data={filtered}
                  renderItem={renderOrderCard}
                  keyExtractor={(item) => String(item._id || item.id)}
                  contentContainerStyle={styles.listContent}
                  refreshControl={
                    <RefreshControl
                      refreshing={isLoading}
                      onRefresh={refreshOngoingOrders}
                    />
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Feather
                        name="truck"
                        size={28}
                        color={COLORS.textLight}
                      />
                      <Text style={styles.emptyTitle}>{t("noOrders")}</Text>
                      <Text style={styles.emptyText}>{t("pullToRefresh")}</Text>
                    </View>
                  }
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      <DeliveryConfirmModal
        visible={!!confirming}
        paymentMethod={confirming?.paymentMethod}
        codAmount={confirming?.codAmount || confirming?.totalPrice || 0}
        onClose={() => setConfirming(null)}
        onConfirm={async ({
          codCollected,
          transactionId,
          notes,
          paymentMethod,
        }) => {
          const id = confirming?._id || confirming?.id;
          if (!id) return;
          await handleStatusUpdate(
            String(id),
            "delivered",
            paymentMethod,
            transactionId,
            notes,
          );
          setConfirming(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tabBarContainer: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabBar: {
    flexDirection: "row",
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textLight,
    textAlign: "center",
  },
  tabTextActive: {
    color: COLORS.secondary,
    fontWeight: "800",
  },
  swipeContainer: {
    flex: 1,
  },
  swipePage: {
    width: SCREEN_WIDTH - 40, // Account for container padding (20 on each side)
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  statusButton: {
    marginTop: 0,
  },
  quickBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: "center",
    fontWeight: "600",
  },
});
