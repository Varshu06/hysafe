import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
  const { recurringDeliveryId } = useLocalSearchParams<{ recurringDeliveryId?: string }>();
  const { t } = useTranslation();
  const [recurringDeliveries, setRecurringDeliveries] = useState<
    RecurringDelivery[]
  >([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "paused">("active");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  useEffect(() => {
    if (!recurringDeliveryId) return;
    const plan = recurringDeliveries.find(item => (item._id || item.id) === recurringDeliveryId);
    if (plan) setActiveTab(plan.isActive ? "active" : "paused");
  }, [recurringDeliveryId, recurringDeliveries]);

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
          t("subscriptionPaused"),
          t("subscriptionPausedMessage", { product: delivery.productName }),
        );
      } else {
        await resumeRecurringDelivery(id);
        Alert.alert(
          t("subscriptionResumed"),
          t("subscriptionResumedMessage", { product: delivery.productName }),
        );
      }
      loadRecurringDeliveries();
    } catch (error: any) {
      Alert.alert(
        t("Error"),
        error.message || t("failedToCancelRecurringDelivery"),
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, productName: string) => {
    Alert.alert(
      t("cancelSubscription"),
      t("cancelSubscriptionConfirm", { product: productName }),
      [
        { text: t("keepSubscription"), style: "cancel" },
        {
          text: t("yesCancel"),
          style: "destructive",
          onPress: async () => {
            setActionLoadingId(id);
            try {
              await deleteRecurringDelivery(id, false);
              Alert.alert(
                t("cancelled"),
                t("subscriptionCancelledSuccess"),
              );
              loadRecurringDeliveries();
            } catch (error: any) {
              Alert.alert(
                t("Error"),
                error.message || t("failedToCancelRecurringDelivery"),
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

  const formatBillPeriod = (bill: RecurringBill) =>
    `${new Date(bill.periodStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(bill.periodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

  const formatBillingFrequency = (frequency: RecurringBill["billingFrequency"]) =>
    frequency === "per_order" ? "Pay per order" : `${frequency[0].toUpperCase()}${frequency.slice(1)}`;

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
            // Prefer the bill covering the next delivery. Per-order bills cover
            // only one occurrence, so retain the oldest unpaid bill as fallback
            // after the scheduler advances nextDeliveryDate.
            const nextDeliveryKey = delivery.nextDeliveryDate ? new Date(delivery.nextDeliveryDate).toISOString().slice(0, 10) : undefined;
            const planBills = recurringBills.filter((item) =>
              (typeof item.recurringDeliveryId === "string" ? item.recurringDeliveryId : item.recurringDeliveryId._id) === id,
            );
            const outstandingBills = planBills
              .filter((item) => item.status === "pending" || item.status === "confirmed" || item.status === "overdue")
              .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());
            const dueBill = (nextDeliveryKey && outstandingBills.find((item) =>
              item.scheduledDeliveryDates.some((scheduled) => new Date(scheduled).toISOString().slice(0, 10) === nextDeliveryKey),
            )) || outstandingBills[0];
            const latestPaidBill = planBills
              .filter((item) => item.status === "paid")
              .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())[0];
            const currentBill = latestPaidBill && dueBill &&
              new Date(latestPaidBill.periodStart).getTime() < new Date(dueBill.periodStart).getTime()
              ? latestPaidBill
              : dueBill || latestPaidBill;
            const nextBill = currentBill?.status === "paid" && dueBill?._id !== currentBill._id ? dueBill : undefined;
            const bill = currentBill || nextBill;
            const billHeading = (item: RecurringBill) => item.billingFrequency === "weekly"
              ? "This Week's Payment"
              : item.billingFrequency === "monthly"
                ? "This Month's Payment"
                : "This Delivery's Payment";
            return (
              <View key={id} style={[styles.deliveryCard, recurringDeliveryId === id && { borderColor: COLORS.primary, borderWidth: 2 }]}>
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
                        {delivery.status === 'cancelled' ? t('cancelled') : delivery.isActive ? t('active') : t('paused')}
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

                  <View style={styles.detailRow}>
                    <Feather
                      name="credit-card"
                      size={15}
                      color={COLORS.textLight}
                    />
                    <Text style={styles.detailText}>
                      {t("paymentMethod") || "Payment Method"}:{" "}
                      <Text style={styles.detailHighlight}>
                        {(bill?.paymentMethod || bill?.preferredPaymentMethod) === 'shop' ? t('payAtShop') : (bill?.paymentMethod || bill?.preferredPaymentMethod) === 'cash' ? t('cashOnDelivery') : t('paymentMethodNotRecorded')}
                      </Text>
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
                        : delivery.status === 'cancelled' ? t('cancelled') : t('paused')}
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

                <View style={styles.upcomingBillBox}>
                  <View style={styles.upcomingBillHeader}>
                    <Ionicons name="information-circle" size={18} color="#0284C7" />
                    <Text style={styles.paymentNoticeText}>{currentBill ? billHeading(currentBill) : "Upcoming Bill"}</Text>
                  </View>
                  {currentBill ? <>
                    <Text style={styles.billAmountLabel}>{currentBill.status === "paid" ? "AMOUNT PAID" : "TOTAL TO PAY"}</Text>
                    <Text style={styles.billAmount}>₹{currentBill.amount}</Text>
                    <Text style={styles.billSummaryLine}>{formatBillingFrequency(currentBill.billingFrequency)} · {formatBillPeriod(currentBill)}</Text>
                    <Text style={styles.billSummaryLine}>Due: {formatDate(currentBill.dueDate)}</Text>
                    <Text style={styles.billStatus}>{currentBill.status === "paid" ? "✓ Payment completed" : currentBill.status === "overdue" ? "Payment overdue" : "Payment due"}</Text>
                  </> : <>
                    <Text style={styles.billPreparing}>Bill is being prepared</Text>
                    <Text style={styles.billHelperText}>The billing system will calculate the bill from scheduled deliveries.</Text>
                    <Text style={styles.billHelperText}>Payment is due on the first delivery in the billing period.</Text>
                    <Text style={styles.billSummaryLine}>Pull to refresh; if it remains unavailable, contact support.</Text>
                  </>}
                  {nextBill ? <View style={styles.nextPaymentBox}>
                    <Text style={styles.paymentNoticeText}>Next Payment</Text>
                    <Text style={styles.billAmount}>₹{nextBill.amount}</Text>
                    <Text style={styles.billStatus}>{nextBill.status === "overdue" ? "Payment overdue" : "Payment due"}</Text>
                    <Text style={styles.billSummaryLine}>Billing period: {formatBillPeriod(nextBill)}</Text>
                    <Text style={styles.billSummaryLine}>Due: {formatDate(nextBill.dueDate)}</Text>
                  </View> : null}
                  <Text style={styles.billHelperText}>Payment is due on the first delivery in the billing period.</Text>
                </View>

                {/* Actions */}
                {delivery.status !== 'cancelled' && <View style={styles.actionRow}>
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
                </View>}
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
  upcomingBillBox: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 4,
  },
  upcomingBillHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  billAmountLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textLight,
    letterSpacing: 0.5,
  },
  billAmount: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 2,
  },
  billSummaryLine: {
    fontSize: 13,
    color: COLORS.text,
  },
  billStatus: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
  },
  billPreparing: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  billHelperText: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textLight,
    marginTop: 3,
  },
  nextPaymentBox: {
    borderTopWidth: 1,
    borderTopColor: "#BAE6FD",
    marginTop: 8,
    paddingTop: 8,
    gap: 4,
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
