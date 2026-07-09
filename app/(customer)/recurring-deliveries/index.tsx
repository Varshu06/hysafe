import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
  RecurringDelivery,
} from "../../../src/services/recurring.service";
import { COLORS } from "../../../src/utils/constants";

export default function RecurringDeliveriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [recurringDeliveries, setRecurringDeliveries] = useState<
    RecurringDelivery[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecurringDeliveries = useCallback(async () => {
    try {
      const response = await getRecurringDeliveries();
      setRecurringDeliveries(response.recurringDeliveries);
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

  const handleDelete = async (id: string, productName: string) => {
    Alert.alert(
      "Cancel Recurring Delivery",
      `Are you sure you want to cancel the recurring delivery for ${productName}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRecurringDelivery(id);
              Alert.alert(
                "Success",
                "Recurring delivery cancelled successfully",
              );
              loadRecurringDeliveries();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to cancel recurring delivery",
              );
            }
          },
        },
      ],
    );
  };

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "Daily";
      case "every-2-days":
        return "Every 2 Days";
      case "weekly":
        return "Weekly";
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {recurringDeliveries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="repeat" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Recurring Deliveries</Text>
            <Text style={styles.emptySubtitle}>
              Set up recurring deliveries from the checkout page to
              automatically receive your orders
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push("/(customer)/products")}
            >
              <Text style={styles.browseButtonText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Active Recurring Deliveries</Text>
            {recurringDeliveries
              .filter((rd) => rd.isActive)
              .map((delivery) => (
                <View
                  key={delivery._id || delivery.id}
                  style={styles.deliveryCard}
                >
                  <View style={styles.deliveryHeader}>
                    <View style={styles.deliveryInfo}>
                      <Text style={styles.productName}>
                        {delivery.productName}
                      </Text>
                      <Text style={styles.quantity}>
                        Quantity: {delivery.quantity}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        delivery.isActive && styles.statusBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          delivery.isActive && styles.statusTextActive,
                        ]}
                      >
                        {delivery.isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.deliveryDetails}>
                    <View style={styles.detailRow}>
                      <Feather
                        name="repeat"
                        size={16}
                        color={COLORS.textLight}
                      />
                      <Text style={styles.detailText}>
                        {formatFrequency(delivery.frequency)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather
                        name="calendar"
                        size={16}
                        color={COLORS.textLight}
                      />
                      <Text style={styles.detailText}>
                        Next delivery: {formatDate(delivery.nextDeliveryDate)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather
                        name="map-pin"
                        size={16}
                        color={COLORS.textLight}
                      />
                      <Text style={styles.detailText} numberOfLines={2}>
                        {delivery.deliveryAddress}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather
                        name="credit-card"
                        size={16}
                        color={COLORS.textLight}
                      />
                      <Text style={styles.detailText}>
                        Payment:{" "}
                        {delivery.paymentTerms.charAt(0).toUpperCase() +
                          delivery.paymentTerms.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() =>
                      handleDelete(
                        delivery._id || delivery.id,
                        delivery.productName,
                      )
                    }
                  >
                    <Feather name="x-circle" size={18} color={COLORS.error} />
                    <Text style={styles.cancelButtonText}>
                      Cancel Recurring Delivery
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
          </>
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
    justifyContent: "center",
    paddingHorizontal: 20,
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
    left: 20,
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
    right: 20,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
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
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: "600",
  },
  deliveryCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  statusBadgeActive: {
    backgroundColor: "#D1FAE5",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  statusTextActive: {
    color: COLORS.success,
  },
  deliveryDetails: {
    gap: 10,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textLight,
    flex: 1,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.error,
  },
});
