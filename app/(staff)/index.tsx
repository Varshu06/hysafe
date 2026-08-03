import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Button } from "../../src/components/ui/Button";
import { Loader } from "../../src/components/ui/Loader";
import { useAuth } from "../../src/context/AuthContext";
import {
  acceptOrder,
  getAssignedOrders,
  rejectOrder,
  toggleStatus,
  updateDeliveryStatus,
} from "../../src/services/staff.service";
import { COLORS } from "../../src/utils/constants";
import { StaffHeader } from "../../src/components/staff/StaffHeader";
import { StaffOrderCard } from "../../src/components/staff/StaffOrderCard";
import { Chip, ChipRow } from "../../src/components/staff/StaffChips";
import { ReasonModal } from "../../src/components/staff/ReasonModal";
import { haversineKm, etaMinutes } from "../../src/utils/geo";
import { storage } from "../../src/utils/storage";
import { socketService } from "../../src/services/socket.service";
import { t } from "i18next";
// Push notifications temporarily disabled
// import { registerForPushNotifications, setupNotificationListeners } from '../../src/services/notification.service';

export default function NewOrdersScreen() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  // Placeholder state until OrderContext is fully implemented for staff
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "nearest" | "quantity">(
    "newest",
  );
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [staffLocation, setStaffLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/(auth)/login");
      return;
    }
    // Check if user is staff
    if (!authLoading && isAuthenticated && user?.role !== "staff") {
      // Redirect non-staff users to their appropriate screen
      if (user?.role === "customer") {
        router.replace("/(customer)");
      } else {
        router.replace("/(auth)/login");
      }
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    // Only load if authenticated and user is staff
    if (!isAuthenticated || user?.role !== "staff" || authLoading) {
      return;
    }

    const load = async () => {
      const online = await storage.getStaffOnline();
      setIsOnline(online);
      refreshAvailableOrders();

      // Push notifications temporarily disabled
      // if (online) {
      //   await toggleStatus(true, undefined);
      // }

      // Connect to Socket.io if online
      if (online) {
        const token = await storage.getToken();
        await socketService.connect(token || undefined);
        socketService.emitStaffOnline();
      }
    };
    load();

    // Push notification listeners temporarily disabled
    // Setup notification listeners (async)
    // let removeListeners: (() => void) | null = null;
    // setupNotificationListeners(...)

    // Cleanup on unmount
    return () => {
      socketService.off("order-accepted");
      socketService.off("new-order");
      // if (removeListeners) {
      //   removeListeners();
      // }
    };
  }, []);

  // Set up Socket.io listeners for real-time updates
  useEffect(() => {
    if (!isOnline) return;

    // Listen for order accepted by another driver
    const handleOrderAccepted = (data: { orderId: string }) => {
      console.log("📢 Order accepted by another driver:", data.orderId);
      // Remove the accepted order from available orders
      setAvailableOrders((prev) =>
        prev.filter((order) => {
          const orderId = order._id || order.id;
          return String(orderId) !== String(data.orderId);
        }),
      );
    };

    // Listen for new orders
    const handleNewOrder = (order: any) => {
      console.log("📦 New order received:", order._id || order.id);
      // Add new order to available orders if it's pending
      if (order.status === "pending" && !order.assignedStaffId) {
        setAvailableOrders((prev) => {
          // Check if order already exists
          const exists = prev.some((o) => {
            const existingId = o._id || o.id;
            const newId = order._id || order.id;
            return String(existingId) === String(newId);
          });

          if (exists) return prev;

          // Transform order to match frontend format
          const transformedOrder = {
            ...order,
            id: order._id,
            customer:
              order.customerId?.name || order.customer?.name || "Customer",
            customerPhone:
              order.customerId?.phone || order.customer?.phone || "",
            pickupAddress: "Hy-Safe Plant, 12 Industrial Rd, Chennai",
            pickupLocation: { lat: 13.0827, lng: 80.2707 },
            location: order.location || { lat: 0, lng: 0 },
            codAmount: order.paymentMethod === "offline" ? order.totalPrice : 0,
          };

          return [transformedOrder, ...prev];
        });
      }
    };

    socketService.onOrderAccepted(handleOrderAccepted);
    socketService.onNewOrder(handleNewOrder);

    return () => {
      socketService.off("order-accepted", handleOrderAccepted);
      socketService.off("new-order", handleNewOrder);
    };
  }, [isOnline]);

  // Refresh orders when screen comes into focus (e.g., after login)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if authenticated and user is staff
      if (isAuthenticated && user?.role === "staff" && isOnline) {
        refreshAvailableOrders();
      }
    }, [isAuthenticated, user, isOnline]),
  );

  const refreshAvailableOrders = async () => {
    // Don't make API calls if not authenticated
    if (!isAuthenticated || user?.role !== "staff") {
      return;
    }

    setIsLoading(true);
    try {
      // Mock fetching available orders
      const orders = await getAssignedOrders();
      setAvailableOrders(
        orders.filter((o: any) => String(o.status).toLowerCase() === "pending"),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    // Don't allow if not authenticated
    if (!isAuthenticated || user?.role !== "staff") {
      router.replace("/(auth)/login");
      return;
    }

    try {
      setIsToggling(true);
      let location = undefined;

      if (!isOnline) {
        // Get location when going online (optional - allow going online without location)
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            try {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              location = {
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
              };
              setStaffLocation(location);
            } catch (locError: any) {
              // Location unavailable - allow going online anyway
              console.warn(
                "Location unavailable, continuing without location:",
                locError.message,
              );
              // Don't show error to user - location is optional
            }
          } else {
            // Permission denied - allow going online anyway
            console.warn(
              "Location permission denied, continuing without location",
            );
          }
        } catch (permError: any) {
          // Permission request failed - allow going online anyway
          console.warn(
            "Location permission request failed, continuing without location:",
            permError.message,
          );
        }
      }

      // Push notifications temporarily disabled
      // Get FCM token for notifications - removed

      // Toggle status API call - no FCM token
      const next = !isOnline;
      await toggleStatus(next, location);
      setIsOnline(next);
      await storage.setStaffOnline(next);

      // Connect/disconnect Socket.io based on status
      if (next) {
        // Going online - connect to Socket.io
        const token = await storage.getToken();
        await socketService.connect(token || undefined);
        socketService.emitStaffOnline();
        refreshAvailableOrders();
      } else {
        // Going offline - disconnect Socket.io
        socketService.disconnect();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update status");
    } finally {
      setIsToggling(false);
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

  const handleAccept = async (orderId: string) => {
    // Don't allow if not authenticated
    if (!isAuthenticated || user?.role !== "staff") {
      router.replace("/(auth)/login");
      return;
    }

    try {
      await acceptOrder(orderId);
      // Immediately remove the order from available orders (optimistic update)
      setAvailableOrders((prev) =>
        prev.filter((order) => {
          const id = order._id || order.id;
          return String(id) !== String(orderId);
        }),
      );
      Alert.alert("Success", "Order accepted!");
      // Also refresh to ensure consistency
      refreshAvailableOrders();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to accept order");
      // Refresh on error to restore correct state
      refreshAvailableOrders();
    }
  };

  const handleReject = async (orderId: string, reason: string) => {
    // Don't allow if not authenticated
    if (!isAuthenticated || user?.role !== "staff") {
      router.replace("/(auth)/login");
      return;
    }

    try {
      await rejectOrder(orderId);
      console.log("reject reason:", reason);
      refreshAvailableOrders();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reject order");
    }
  };

  const sortedOrders = (() => {
    const list = [...availableOrders];
    if (sortBy === "quantity") {
      list.sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
      return list;
    }
    if (sortBy === "nearest") {
      list.sort((a, b) => {
        const da = haversineKm(staffLocation || undefined, a.location);
        const db = haversineKm(staffLocation || undefined, b.location);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
      return list;
    }
    // newest
    list.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return list;
  })();

  const renderOrderCard = ({ item }: { item: any }) => {
    const id = item._id || item.id;
    const paymentLabel =
      String(item.paymentMethod || "offline").toLowerCase() === "online"
        ? "UPI"
        : "COD";
    const dist = haversineKm(staffLocation || undefined, item.location);
    const eta = etaMinutes(dist);

    return (
      <StaffOrderCard
        status={item.status}
        id={String(id)}
        createdAt={item.createdAt}
        quantity={item.quantity || 1}
        items={item.items}
        deliveryAddress={item.deliveryAddress}
        customer={item.customer}
        paymentLabel={paymentLabel}
        distanceKm={dist}
        etaMin={eta}
        compact
        compactShowAddress
        onPress={() => router.push(`/(staff)/order-details/${id}`)}
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
        actions={
          <View style={styles.buttonRow}>
            <Button
              title="Reject"
              variant="outline"
              onPress={() => setRejectingId(String(id))}
              style={styles.actionButton}
            />
            <Button
              title="Accept"
              variant="primary"
              onPress={() => handleAccept(String(id))}
              style={styles.actionButton}
            />
          </View>
        }
      />
    );
  };

  // Show loading or nothing while checking auth
  if (authLoading || !isAuthenticated || user?.role !== "staff") {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      <StaffHeader title={t("newOrders")} />

      {/* Online/Offline Toggle */}
      <View style={styles.content}>
        <View style={styles.toggleCard}>
          <View>
            <Text style={styles.toggleLabel}>{t("status")}</Text>
            <Text style={styles.toggleValue}>
              {t(isOnline ? "ONLINE" : "OFFLINE")}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              isOnline ? styles.toggleOnline : styles.toggleOffline,
              isToggling && styles.toggleDisabled,
            ]}
            onPress={handleToggleStatus}
            disabled={isToggling}
            activeOpacity={0.85}
          >
            {isToggling ? (
              <Loader size="small" color={COLORS.secondary} />
            ) : (
              <Text style={styles.toggleText}>
                {t(isOnline ? "goOffline" : "goOnline")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {isOnline ? (
          <View style={styles.sortCard}>
            <Text style={styles.sortTitle}>{t("sort")}</Text>
            <ChipRow>
              <Chip
                label={t("newest")}
                active={sortBy === "newest"}
                onPress={() => setSortBy("newest")}
              />
              <Chip
                label={t("nearest")}
                active={sortBy === "nearest"}
                onPress={() => setSortBy("nearest")}
              />
              <Chip
                label={t("quantity")}
                active={sortBy === "quantity"}
                onPress={() => setSortBy("quantity")}
              />
            </ChipRow>
          </View>
        ) : null}

        {/* Orders List */}
        {!isOnline ? (
          <View style={styles.emptyContainer}>
            <Feather name="wifi-off" size={28} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>{t("youAreOffline")}</Text>
            <Text style={styles.emptyText}>
              {t("goOnlineToReceiveNewOrders")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedOrders}
            renderItem={renderOrderCard}
            keyExtractor={(item) => String(item._id || item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refreshAvailableOrders}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="inbox" size={28} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>{t("noNewOrders")}</Text>
                <Text style={styles.emptyText}>{t("pullToRefresh")}</Text>
              </View>
            }
          />
        )}
      </View>

      <ReasonModal
        visible={!!rejectingId}
        title="Reject order"
        placeholder="Reason (e.g., too far / busy / out of stock)"
        confirmText="Reject"
        onClose={() => setRejectingId(null)}
        onConfirm={(reason) => {
          if (!rejectingId) return;
          handleReject(rejectingId, reason);
          setRejectingId(null);
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
  toggleCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textLight,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  toggleValue: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toggleOnline: {
    backgroundColor: "#FEE2E2",
  },
  toggleOffline: {
    backgroundColor: "#D1FAE5",
  },
  toggleDisabled: {
    opacity: 0.6,
  },
  toggleText: {
    color: COLORS.text,
    fontWeight: "800",
  },
  sortCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sortTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.textLight,
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
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
