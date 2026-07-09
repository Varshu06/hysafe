import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui/Button";
import { useAuth } from "../../src/context/AuthContext";
import { useOrder } from "../../src/context/OrderContext";
import { Order } from "../../src/types/order.types";
import { COLORS } from "../../src/utils/constants";
import { t } from "i18next";

type TabType = "active" | "history";

export default function OrdersScreen() {
  const { isAuthenticated } = useAuth();
  const { orders, isLoading, refreshOrders } = useOrder();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("active");

  useEffect(() => {
    if (isAuthenticated) {
      refreshOrders();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Please login to view your orders</Text>
        <Button
          title="Login"
          onPress={() => router.push("/(auth)/login")}
          style={styles.loginButton}
        />
      </View>
    );
  }

  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return "N/A";
    const methodLower = method.toLowerCase();
    if (methodLower === "online") return "Card";
    if (methodLower === "offline") return "Cash";
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const getDriverName = (order: Order): string => {
    // Priority: driverName > assignedStaff.name > default placeholder
    if (order.driverName) return order.driverName;
    if (order.assignedStaff?.name) return order.assignedStaff.name;
    // For pending orders, show "Not Assigned", otherwise show a default name
    if (order.status === "pending") return t("notAssigned");
    return "Delivery Partner"; // Fallback for assigned orders without name
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "pending") {
      return <Feather name="clock" size={12} color={COLORS.warning} />;
    }
    if (statusLower === "cancelled") {
      return <Feather name="x" size={12} color={COLORS.textLight} />;
    }
    if (statusLower === "delivered") {
      return <Feather name="check" size={12} color={COLORS.success} />;
    }
    return <Feather name="check" size={12} color={COLORS.primary} />;
  };

  // Filter orders based on active tab
  const getFilteredOrders = (): Order[] => {
    if (activeTab === "active") {
      // Active orders: pending, accepted, out_for_delivery
      return orders.filter((order) => {
        const status = order.status.toLowerCase();
        return (
          status === "pending" ||
          status === "accepted" ||
          status === "out_for_delivery"
        );
      });
    } else {
      // Order history: delivered, cancelled
      return orders.filter((order) => {
        const status = order.status.toLowerCase();
        return status === "delivered" || status === "cancelled";
      });
    }
  };

  const filteredOrders = getFilteredOrders();

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/(customer)/order-details/${item._id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          {getStatusIcon(item.status)}
          <Text style={styles.statusText}>{t(item.status)}</Text>
        </View>
        <Text style={styles.date}>
          {item.createdAt
            ? new Date(item.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </Text>
        <Text style={styles.price}>
          ₹ {item.price || item.totalPrice || "0"}
        </Text>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.driverLabel}>{getDriverName(item)}</Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {item.deliveryAddress}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.viewDetailsBtn}
        onPress={() => router.push(`/(customer)/order-details/${item._id}`)}
      >
        <Text style={styles.viewDetailsText}>{t("viewDetails")}</Text>
        <Feather name="chevron-right" size={16} color="#0F172A" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const getEmptyMessage = () => {
    if (activeTab === "active") {
      return {
        icon: "⏳",
        title: "noActiveOrders",
        subtitle: "noActiveOrdersDesc",
      };
    } else {
      return {
        icon: "📦",
        title: "noOrderHistory",
        subtitle: "noOrderHistoryDesc",
      };
    }
  };

  const emptyMessage = getEmptyMessage();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.push("/(customer)")}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("myOrders")}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.activeTabText,
            ]}
          >
            {t("activeOrders")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            {t("orderHistory")}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshOrders} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{emptyMessage.icon}</Text>
            <Text style={styles.emptyText}>{t(emptyMessage.title)}</Text>
            <Text style={styles.emptySubtext}>{t(emptyMessage.subtitle)}</Text>
          </View>
        }
      />
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
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.accent,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  backButton: {
    padding: 16,
    top: 16,
    position: "absolute",
    left: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
    position: "absolute",
    right: 16,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: "transparent",
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  activeTabText: {
    color: "white",
    fontWeight: "bold",
  },
  listContent: {
    padding: 20,
  },
  orderCard: {
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0F172A",
    textTransform: "capitalize",
  },
  date: {
    color: "white",
    fontSize: 12,
    flex: 1,
    marginLeft: 12,
  },
  price: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  driverLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 16,
    flexShrink: 0,
  },
  addressText: {
    color: "#94A3B8",
    fontSize: 12,
    flex: 1,
    textAlign: "right",
    lineHeight: 18,
  },
  viewDetailsBtn: {
    backgroundColor: "white",
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0F172A",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  loginButton: {
    marginTop: 20,
    minWidth: 120,
  },
});
