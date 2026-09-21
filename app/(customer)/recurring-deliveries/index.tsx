import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../src/context/AuthContext";
import {
  deleteRecurringDelivery,
  getRecurringDeliveries,
  getRecurringBills,
  pauseRecurringDelivery,
  RecurringBill,
  resumeRecurringDelivery,
  RecurringDelivery,
} from "../../../src/services/recurring.service";
import { COLORS } from "../../../src/utils/constants";

export default function RecurringDeliveriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [recurringDeliveries, setRecurringDeliveries] = useState<
    RecurringDelivery[]
  >([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "paused">("active");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadRecurringDeliveries = useCallback(async () => {
    try {
      const [deliveriesResponse, billsResponse] = await Promise.all([getRecurringDeliveries(), getRecurringBills()]);
      setRecurringDeliveries(deliveriesResponse.recurringDeliveries);
      setRecurringBills(billsResponse.recurringBills);
    } catch (error: any) {
      console.error("Error loading recurring deliveries:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to load recurring deliveries",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecurringDeliveries();
    }, [loadRecurringDeliveries]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRecurringDeliveries();
  };

  const handleTogglePauseResume = async (
    delivery: RecurringDelivery
  ) => {
    const id = delivery._id || delivery.id;
    const isPausing = delivery.isActive;
    setActionLoadingId(id);

    try {
      if (isPausing) {
        await pauseRecurringDelivery(id);
        Alert.alert(
          "Subscription Paused",
          `Recurring delivery for ${delivery.productName} is now paused. You can resume it anytime.`
        );
      } else {
        await resumeRecurringDelivery(id);
        Alert.alert(
          "Subscription Resumed",
          `Recurring delivery for ${delivery.productName} has been resumed. Next delivery scheduled.`
        );
      }
      loadRecurringDeliveries();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || `Failed to ${isPausing ? "pause" : "resume"} delivery`
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, productName: string) => {
    Alert.alert(
      "Cancel Subscription",
      `Are you sure you want to cancel your recurring subscription for ${productName}?`,
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setActionLoadingId(id);
            try {
              await deleteRecurringDelivery(id, false);
              Alert.alert(
                "Cancelled",
                "Recurring delivery subscription has been cancelled."
              );
              loadRecurringDeliveries();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to cancel recurring delivery"
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return t("Daily") || "Daily";
      case "3-per-week":
      case "3_per_week":
        return `3 ${t("deliveriesPerWeek") || "deliveries/week"}`;
      case "2-per-week":
      case "2_per_week":
        return `2 ${t("deliveriesPerWeek") || "deliveries/week"}`;
      case "every-2-days":
        return t("Every 2 Days") || "Every 2 Days";
      case "weekly":
        return t("Weekly") || "Weekly";
      default:
        return frequency;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const activeDeliveries = recurringDeliveries.filter((rd) => rd.isActive);
  const pausedDeliveries = recurringDeliveries.filter((rd) => !rd.isActive);
  const displayedDeliveries =
    activeTab === "active" ? activeDeliveries : pausedDeliveries;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recurring Deliveries</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Loading recurring deliveries...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recurring Deliveries</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/(customer)/recurring-delivery/setup")}
        >
          <Feather name="plus" size={20} color={COLORS.primary} />
          <Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "active" && styles.tabButtonActive]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "active" && styles.tabButtonTextActive,
            ]}
          >
            Active ({activeDeliveries.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "paused" && styles.tabButtonActive]}
          onPress={() => setActiveTab("paused")}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "paused" && styles.tabButtonTextActive,
            ]}
          >
            Paused / Cancelled ({pausedDeliveries.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {displayedDeliveries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="repeat" size={60} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>
              {activeTab === "active"
                ? "No Active Subscriptions"
                : "No Paused Subscriptions"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "active"
                ? "Set up recurring deliveries to automatically receive pure water on your preferred schedule."
                : "You don't have any paused recurring deliveries."}
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => router.push("/(customer)/recurring-delivery/setup")}
            >
              <Feather name="plus-circle" size={18} color="white" />
              <Text style={styles.setupButtonText}>Set Up Recurring Delivery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayedDeliveries.map((delivery) => {
            const id = delivery._id || delivery.id;
            const isProcessing = actionLoadingId === id;
            // Only attach a bill that explicitly includes this plan's next delivery.
            // A plan may have historical bills, which must never be presented as its current bill.
            const nextDeliveryKey = delivery.nextDeliveryDate ? new Date(delivery.nextDeliveryDate).toISOString().slice(0, 10) : undefined;
            const bill = recurringBills.find((item) =>
              (typeof item.recurringDeliveryId === "string" ? item.recurringDeliveryId : item.recurringDeliveryId._id) === id &&
              !!nextDeliveryKey && item.scheduledDeliveryDates.some((scheduled) => new Date(scheduled).toISOString().slice(0, 10) === nextDeliveryKey),
            );

            return (
              <View key={id} style={styles.deliveryCard}>
                <View style={styles.deliveryHeader}>
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.productName}>
                      {delivery.productName}
                    </Text>
                    <Text style={styles.quantity}>
                      Quantity: {delivery.quantity} cans
                    </Text>
                  </View>
                  <View style={styles.headerBadges}>
                    <View
                      style={[
                        styles.statusBadge,
                        delivery.isActive
                          ? styles.statusBadgeActive
                          : styles.statusBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          delivery.isActive
                            ? styles.statusTextActive
                            : styles.statusTextInactive,
                        ]}
                      >
                        {delivery.isActive ? "Active" : "Paused"}
                      </Text>
                    </View>
                    {bill ? <View style={[styles.statusBadge, bill.status === 'paid' ? styles.statusBadgeConfirmed : styles.statusBadgePending]}><Text style={[styles.statusText, bill.status === 'paid' ? styles.statusTextConfirmed : styles.statusTextPending]}>{bill.status[0].toUpperCase() + bill.status.slice(1)}</Text></View> : null}
                  </View>
                </View>

                <View style={styles.deliveryDetails}>
                  <View style={styles.detailRow}>
                    <Feather
                      name="repeat"
                      size={15}
                      color={COLORS.primary}
                    />
                    <Text style={styles.detailText}>
                      Frequency:{" "}
                      <Text style={styles.detailHighlight}>
                        {formatFrequency(delivery.frequency)}
                      </Text>
                    </Text>
                  </View>

                  {bill ? (
                    <View style={styles.detailRow}>
                      <Feather
                        name="dollar-sign"
                        size={15}
                        color={COLORS.primary}
                      />
                      <Text style={styles.detailText}>
                        Bill: <Text style={styles.detailHighlight}>₹{bill.amount}</Text> ({bill.billingFrequency.replace('_', ' ')})
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Feather
                      name="credit-card"
                      size={15}
                      color={COLORS.textLight}
                    />
                    <Text style={styles.detailText}>
                      {t("paymentMethod") || "Payment Method"}:{" "}
                      <Text style={styles.detailHighlight}>
                        {(bill?.paymentMethod || bill?.preferredPaymentMethod) === 'shop' ? 'Pay at Shop' : 'Cash on Delivery'}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.paymentNoticeBox}>
                    <Ionicons name="information-circle" size={16} color="#0284C7" />
                    <Text style={styles.paymentNoticeText}>
                      {bill ? `Due ${formatDate(bill.dueDate)} · ${bill.status === 'confirmed' ? 'Payment will be collected offline.' : 'Bill awaiting confirmation.'}` : 'Bill information will appear when available.'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Feather
                      name="calendar"
                      size={15}
                      color={COLORS.textLight}
                    />
                    <Text style={styles.detailText}>
                      Next delivery:{" "}
                      {delivery.isActive
                        ? formatDate(delivery.nextDeliveryDate)
                        : "Paused"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather
                      name="map-pin"
                      size={15}
                      color={COLORS.textLight}
                    />
                    <Text style={styles.detailText} numberOfLines={2}>
                      {delivery.deliveryAddress}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      delivery.isActive
                        ? styles.pauseBtn
                        : styles.resumeBtn,
                    ]}
                    onPress={() => handleTogglePauseResume(delivery)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <>
                        <Feather
                          name={delivery.isActive ? "pause" : "play"}
                          size={15}
                          color={delivery.isActive ? "#D97706" : COLORS.primary}
                        />
                        <Text
                          style={[
                            styles.actionBtnText,
                            delivery.isActive
                              ? styles.pauseBtnText
                              : styles.resumeBtnText,
                          ]}
                        >
                          {delivery.isActive ? "Pause" : "Resume"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(id, delivery.productName)}
                    disabled={isProcessing}
                  >
                    <Feather name="trash-2" size={15} color={COLORS.error} />
                    <Text style={styles.deleteBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.accent,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  tabButtonTextActive: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  setupButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  setupButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
  deliveryCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  deliveryInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  quantity: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  headerBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
    maxWidth: "50%",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: "#DCFCE7",
  },
  statusBadgeInactive: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeConfirmed: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusTextConfirmed: {
    color: "#059669",
    fontWeight: "700",
  },
  statusBadgePending: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  statusTextPending: {
    color: "#D97706",
    fontWeight: "700",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  statusTextActive: {
    color: "#16A34A",
  },
  statusTextInactive: {
    color: "#D97706",
  },
  paymentNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 4,
  },
  paymentNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
    flex: 1,
  },
  deliveryDetails: {
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  detailHighlight: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pauseBtn: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pauseBtnText: {
    color: "#D97706",
    fontSize: 13,
    fontWeight: "600",
  },
  resumeBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  resumeBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteBtnText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: "600",
  },
});
