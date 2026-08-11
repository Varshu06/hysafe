import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddOns } from "../../../src/components/customer/AddOns";
import { AddressPickerModal } from "../../../src/components/customer/AddressPickerModal";
import { BillDetailsModal } from "../../../src/components/customer/BillDetailsModal";
import { DeliveryTimeModal } from "../../../src/components/customer/DeliveryTimeModal";
import { DeliveryInstructionsSheet } from "../../../src/components/customer/DeliveryInstructionsSheet";
import { PaymentTermsModal } from "../../../src/components/customer/PaymentTermsModal";
import { ReceiverDetailsModal } from "../../../src/components/customer/ReceiverDetailsModal";
import { useAuth } from "../../../src/context/AuthContext";
import { useCart } from "../../../src/context/CartContext";
import { useOrder } from "../../../src/context/OrderContext";
import { createOrder } from "../../../src/services/order.service";
import { getProductsByIds } from "../../../src/services/product.service";
import { createRecurringDelivery } from "../../../src/services/recurring.service";
import {
  addressStorage,
  SavedAddress,
} from "../../../src/utils/addressStorage";
import { haversineKm } from "../../../src/utils/geo";
import {
  COLORS,
  FACTORY_LOCATION,
  SERVICE_RADIUS_KM,
} from "../../../src/utils/constants";
import { t } from "i18next";
import { Order } from "../../../src/types/order.types";
import { Product } from "../../../src/types/product.types";
import { useProduct } from "../../../src/context/ProductContext";

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    items,
    incrementQuantity,
    decrementQuantity,
    getTotalPrice,
    clearCart,
  } = useCart();
  const { refreshOrders } = useOrder();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDeliveryTime, setShowDeliveryTime] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [scheduledTime, setScheduledTime] = useState({
    hour: "07",
    minute: "30",
    ampm: "AM" as const,
  });
  const [isScheduledDelivery, setIsScheduledDelivery] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showReceiverModal, setShowReceiverModal] = useState(false);
  const [receiverName, setReceiverName] = useState(
    () => user?.name || "Receiver",
  );
  const [receiverPhone, setReceiverPhone] = useState(() => {
    const raw = (user?.phone || "").replace(/[^0-9]/g, "");
    return raw ? raw.slice(-10) : "";
  });
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [isEventOrder, setIsEventOrder] = useState(false);
  const [eventName, setEventName] = useState("");
  const [distanceFromFactory, setDistanceFromFactory] = useState<number | null>(
    null,
  );
  const [isWithinServiceArea, setIsWithinServiceArea] = useState<boolean>(true);
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [isRecurringDelivery, setIsRecurringDelivery] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<
    "daily" | "every-2-days" | "weekly" | "custom"
  >("daily");

  // Get user payment terms
  const userPaymentTerms = (user as any)?.paymentTerms as
    | "one-time"
    | "weekly"
    | "monthly"
    | undefined;
  const nextPaymentDue = (user as any)?.nextPaymentDue as string | undefined;

  // Track selected payment terms in checkout (can override user profile)
  const [selectedPaymentTerms, setSelectedPaymentTerms] = useState<
    "one-time" | "weekly" | "monthly" | undefined
  >(userPaymentTerms);

  // Sync selectedPaymentTerms when userPaymentTerms changes (only if not already set)
  useEffect(() => {
    if (userPaymentTerms && !selectedPaymentTerms) {
      setSelectedPaymentTerms(userPaymentTerms);
    }
  }, [userPaymentTerms, selectedPaymentTerms]);
  const paymentTerm = selectedPaymentTerms || userPaymentTerms;
  const { products: availableProducts } = useProduct();
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>("");
  // Load saved addresses
  const loadAddresses = useCallback(async () => {
    const addresses = await addressStorage.getAllAddresses(user);
    setSavedAddresses(addresses);
    // Set default selected address
    if (addresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [user, selectedAddressId]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Refresh addresses when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses]),
  );

  // Determine if payment should be collected now
  const shouldCollectPaymentNow =
    selectedPaymentTerms === "one-time" || !selectedPaymentTerms;

  const subtotal = getTotalPrice();

  // Determine order-level delivery charge using available product data (max of deliveryCharge)
  const computeDeliveryCharge = () => {
    try {
      if (!items || items.length === 0) return 0;
      const charges = items.map((it) => {
        const p = availableProducts.find((ap) => ap.id === it.id);
        return Number(p?.deliveryCharge ?? it.deliveryCharge ?? 0);
      });
      return charges.length > 0 ? Math.max(...charges) : 0;
    } catch (e) {
      return 0;
    }
  };

  const deliveryCharge = computeDeliveryCharge();
  const totalPrice = subtotal + deliveryCharge;

  const getScheduledLabel = () => {
    const dateLabel = scheduledDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
       const timeLabel = `${scheduledTime.hour}:${scheduledTime.minute} ${scheduledTime.ampm}`;
    return `${dateLabel}, ${timeLabel}`;
  };
  const selectedAddress =
    savedAddresses.find((a) => a.id === selectedAddressId) ||
    savedAddresses[0] ||
    null;

  // Calculate distance from factory and validate 5km radius
  React.useEffect(() => {
    if (selectedAddress?.location) {
      const distance = haversineKm(FACTORY_LOCATION, selectedAddress.location);
      setDistanceFromFactory(distance);
      setIsWithinServiceArea(
        distance !== null && distance <= SERVICE_RADIUS_KM,
      );
    } else {
      setDistanceFromFactory(null);
      setIsWithinServiceArea(true); // Assume valid if no location data
    }
  }, [selectedAddress]);

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert("Error", "Please select a delivery address");
      return;
    }

    if (isPlacingOrder) {
      return;
    }

    setIsPlacingOrder(true);
    try {
      // Calculate total quantity
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const cartProductIds = items.map((item) => item.id);

      let latestProducts: Map<string, Product>;
      try {
        latestProducts = await getProductsByIds(cartProductIds);
      } catch (error: any) {
        Alert.alert(
          "Unable to verify cart",
          "We couldn't verify the latest product information. Please check your connection and try again.",
        );
        return;
      }

      // Validate stock and availability per item
      for (const item of items) {
        const latestProduct = latestProducts.get(item.id);
        if (!latestProduct) {
          Alert.alert(
            "Product unavailable",
            `Product ${item.name} is no longer available. Please review your cart before placing the order.`,
          );
          return;
        }

        if (latestProduct.available === false) {
          Alert.alert(
            "Product unavailable",
            `Product ${latestProduct.name} is currently unavailable. Please review your cart before placing the order.`,
          );
          return;
        }

        if (Number(latestProduct.quantity) === 0) {
          Alert.alert(
            "Out of stock",
            `Product ${latestProduct.name} is out of stock. Please remove it from your cart.`,
          );
          return;
        }

        if (Number(latestProduct.quantity) < item.quantity) {
          Alert.alert(
            "Insufficient quantity",
            `Only ${latestProduct.quantity} unit(s) of ${latestProduct.name} are available. Please reduce the quantity.`,
          );
          return;
        }
      }

      const changedProducts = items.reduce(
        (acc, item) => {
          const latestProduct = latestProducts.get(item.id);
          if (!latestProduct) {
            return acc;
          }

          const priceChanged = item.price !== latestProduct.price;
          const deliveryChanged =
            item.deliveryCharge !== latestProduct.deliveryCharge;

          if (priceChanged || deliveryChanged) {
            acc.push({
              productName: latestProduct.name,
              oldPrice: item.price,
              newPrice: latestProduct.price,
              oldDeliveryCharge: item.deliveryCharge,
              newDeliveryCharge: latestProduct.deliveryCharge,
            });
          }
          return acc;
        },
        [] as Array<{
          productName: string;
          oldPrice: number;
          newPrice: number;
          oldDeliveryCharge: number;
          newDeliveryCharge: number;
        }>,
      );

      if (changedProducts.length > 0) {
        const confirmPriceChange = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Cart updated",
            "Some product prices or delivery charges have changed. Please review the updated prices before placing the order.",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: "Continue",
                onPress: () => resolve(true),
              },
            ],
            { cancelable: false },
          );
        });

        if (!confirmPriceChange) {
          return;
        }
      }

      // Prepare order data with latest backend prices and charges
      const orderData: Partial<Order> = {
        quantity: totalQuantity,
        items: items.map((item) => {
          const latestProduct = latestProducts.get(item.id)!;
          return {
            productId: latestProduct.id,
            productName: latestProduct.name,
            quantity: item.quantity,
            price: latestProduct.price,
            deliveryCharge: latestProduct.deliveryCharge,
          };
        }),
        deliveryAddress: selectedAddress.fullAddress || selectedAddress.address,
        location: selectedAddress.location,
        paymentMethod: "offline",
           notes: deliveryInstructions || "",
           deliveryCharge: deliveryCharge,
        deliverySlot: isScheduledDelivery
          ? new Date(
              `${scheduledDate.toISOString().split("T")[0]}T${scheduledTime.hour}:${scheduledTime.minute}:00`,
            ).toISOString()
          : undefined,
        isEventOrder: isEventOrder,
        eventName: isEventOrder ? eventName : undefined,
        receiverName: receiverName,
        receiverPhone: receiverPhone ? `+91${receiverPhone}` : undefined,
        paymentTerms: paymentTerm || "one-time",
      };

      const response = await createOrder(orderData);

      if (response.success) {
        // If recurring delivery is enabled, create recurring delivery
        if (isRecurringDelivery && items.length > 0) {
          try {
            const firstItem = items[0];
            const recurringData = {
              productId: firstItem.id,
              productName: firstItem.name,
              quantity: totalQuantity,
              frequency: recurringFrequency,
              deliveryAddress:
                selectedAddress.fullAddress || selectedAddress.address,
              deliveryAddressId: selectedAddress.id,
              paymentTerms: paymentTerm || "one-time",
              specialInstructions: "", // Can be enhanced later
            };

            await createRecurringDelivery(recurringData);
          } catch (recurringError: any) {
            console.error(
              "Failed to create recurring delivery:",
              recurringError,
            );
            // Don't fail the order if recurring delivery creation fails
          }
        }

        Alert.alert(
          "Order Placed!",
          isRecurringDelivery
            ? "Your order has been placed and recurring delivery has been set up successfully!"
            : "Your order has been placed successfully.",
          [
            {
              text: "OK",
              onPress: () => {
                clearCart();
                refreshOrders(); // Refresh orders list
                router.push("/(customer)");
              },
            },
          ],
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to place order. Please try again.",
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

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
        <Text style={styles.headerTitle}>{t("checkout")}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Cart Items */}
        {items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>{t("emptyCart")}</Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.push("/(customer)/products")}
            >
              <Text style={styles.browseBtnText}>{t("browseProducts")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.mainItemContainer}>
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.quantityRow}>
                  <View style={styles.counter}>
                    <TouchableOpacity
                      onPress={() => decrementQuantity(item.id)}
                    >
                      <Text style={styles.counterBtn}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.count}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => incrementQuantity(item.id)}
                    >
                      <Text style={styles.counterBtn}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemPrice}>
                    ₹{item.price * item.quantity}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Delivery and Bill Details Card */}
        {items.length > 0 && (
          <View style={styles.detailsCard}>
            {/* Delivery Time */}
            <View style={styles.detailRow}>
              <Ionicons name="car-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>
                  {isScheduledDelivery
                    ? `${t("scheduled")}: ${getScheduledLabel()}`
                    : `${t("deliveryIn1hr2hrs")}`}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDeliveryTime(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.detailLink}>
                    {isScheduledDelivery
                      ? `${t("changeDeliveryTime")}`
                      : `${t("notNowSetDeliveryTime")}`}
                  </Text>
                </TouchableOpacity>
                {/* Event/Wedding Order Toggle */}
                <TouchableOpacity
                  onPress={() => setIsEventOrder(!isEventOrder)}
                  style={styles.eventToggle}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isEventOrder && styles.checkboxChecked,
                    ]}
                  >
                    {isEventOrder && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <Text style={styles.eventLabel}>
                    {t("eventWeddingOrder")}
                  </Text>
                </TouchableOpacity>
                {/* Event Name Input - Shows when event toggle is ON */}
                {isEventOrder && (
                  <View style={styles.eventNameContainer}>
                    <TextInput
                      style={styles.eventNameInput}
                      placeholder={t("eventNamePlaceholder")}
                      placeholderTextColor={COLORS.textLight}
                      value={eventName}
                      onChangeText={setEventName}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Delivery Address */}
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={0.85}
              onPress={() => setShowAddressPicker(true)}
            >
              <Ionicons name="home-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>{t("deliveryAtHome")}</Text>
                <Text style={styles.detailSubtext} numberOfLines={1}>
                  {selectedAddress?.address || "Select delivery address"}
                </Text>
                {/* 5km Radius Validation */}
                {distanceFromFactory !== null && (
                  <View style={styles.distanceInfo}>
                    <Ionicons
                      name={
                        isWithinServiceArea ? "checkmark-circle" : "warning"
                      }
                      size={14}
                      color={
                        isWithinServiceArea ? COLORS.success : COLORS.error
                      }
                    />
                    <Text
                      style={[
                        styles.distanceText,
                        !isWithinServiceArea && styles.distanceTextError,
                      ]}
                    >
                      {isWithinServiceArea
                        ? `Within service area (${distanceFromFactory.toFixed(1)} km)`
                        : `Outside service area (${distanceFromFactory.toFixed(1)} km) - You can still proceed`}
                    </Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => setShowInstructions(true)}>
                  <Text style={styles.detailLink}>
                    {t("addDeliveryInstructions")}
                  </Text>
                </TouchableOpacity>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Contact Person */}
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={0.85}
              onPress={() => setShowReceiverModal(true)}
            >
              <Ionicons name="call-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>
                  {receiverName}
                  {receiverPhone ? `, +91 ${receiverPhone}` : ""}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Recurring Delivery Toggle */}
            <View style={styles.detailRow}>
              <Ionicons name="repeat-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>{t("recurringDelivery")}</Text>
                <Text style={styles.detailSubtext}>
                  {t("recurringDeliveryDescription")}
                </Text>
                {isRecurringDelivery && (
                  <View style={styles.frequencyOptions}>
                    <Text style={styles.frequencyLabel}>{t("frequency")}</Text>
                    <View style={styles.frequencyButtons}>
                      {[
                        { value: "daily", label: "Daily" },
                        { value: "every-2-days", label: "Every 2 Days" },
                        { value: "weekly", label: "Weekly" },
                      ].map((freq) => (
                        <TouchableOpacity
                          key={freq.value}
                          style={[
                            styles.frequencyButton,
                            recurringFrequency === freq.value &&
                              styles.frequencyButtonSelected,
                          ]}
                          onPress={() =>
                            setRecurringFrequency(freq.value as any)
                          }
                        >
                          <Text
                            style={[
                              styles.frequencyButtonText,
                              recurringFrequency === freq.value &&
                                styles.frequencyButtonTextSelected,
                            ]}
                          >
                            {t(freq.label)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setIsRecurringDelivery(!isRecurringDelivery)}
                style={styles.toggleSwitch}
              >
                <View
                  style={[
                    styles.switch,
                    isRecurringDelivery && styles.switchActive,
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      isRecurringDelivery && styles.switchThumbActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Payment Terms */}
            {paymentTerm ? (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={20} color="#102841" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>
                    {t("paymentTerms")}:{" "}
                    {paymentTerm?.charAt(0).toUpperCase() +
                      paymentTerm?.slice(1)}
                  </Text>
                  {(paymentTerm === "monthly" || paymentTerm === "weekly") &&
                    nextPaymentDue && (
                      <Text style={styles.detailSubtext}>
                        Due on {nextPaymentDue}
                      </Text>
                    )}
                  {paymentTerm === "one-time" && (
                    <Text style={styles.detailSubtext}>
                      {t("payForEachOrder")}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setShowPaymentTermsModal(true)}
                >
                  <Feather name="edit-2" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => setShowPaymentTermsModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={20} color="#102841" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>{t("paymentTerms")}</Text>
                  <Text style={styles.detailSubtext}>
                    {t("selectPaymentTerm")}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {/* Total Bill */}
            <TouchableOpacity
              style={styles.detailRowLast}
              activeOpacity={0.85}
              onPress={() => setShowBillDetails(true)}
            >
              <Ionicons name="receipt-outline" size={20} color="#102841" />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>
                  {t("totalBill")} ₹{totalPrice}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.payButton,
              isPlacingOrder && styles.payButtonDisabled,
            ]}
            onPress={async () => {
              // Warn but allow orders outside service area
              if (!isWithinServiceArea && distanceFromFactory !== null) {
                Alert.alert(
                  "Address Outside Service Area",
                  `This address is ${distanceFromFactory.toFixed(1)} km away from our service center (${SERVICE_RADIUS_KM} km limit). Do you want to proceed anyway? Extra charges may apply.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Proceed",
                      onPress: () => handlePlaceOrder(),
                      style: "default",
                    },
                  ],
                );
                return;
              }

              handlePlaceOrder();
            }}
            disabled={isPlacingOrder}
          >
            <Text style={styles.payButtonText}>
              {isPlacingOrder
                ? "Placing Order..."
                : !isWithinServiceArea && distanceFromFactory !== null
                  ? `Proceed (${distanceFromFactory.toFixed(1)} km away)`
                  : `Place Order - ₹${totalPrice}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <DeliveryInstructionsSheet
        visible={showInstructions}
        onClose={() => setShowInstructions(false)}
        onSave={(val) => setDeliveryInstructions(val)}
        initial={deliveryInstructions}
      />

      <AddressPickerModal
        visible={showAddressPicker}
        addresses={savedAddresses}
        selectedId={selectedAddressId}
        onClose={() => setShowAddressPicker(false)}
        onSelect={async (addr) => {
          setSelectedAddressId(addr.id);
          // Save as selected address
          await addressStorage.setSelectedAddressId(addr.id);
          // Refresh addresses in case user added a new one
          const addresses = await addressStorage.getAllAddresses(user);
          setSavedAddresses(addresses);
        }}
        onAddNew={() => {
          setShowAddressPicker(false);
          router.push("/(customer)/address/search");
        }}
      />

      <ReceiverDetailsModal
        visible={showReceiverModal}
        initialName={receiverName}
        initialPhone={receiverPhone}
        onClose={() => setShowReceiverModal(false)}
        onConfirm={({ name, phone }) => {
          setReceiverName(name);
          setReceiverPhone(phone);
        }}
      />

      <BillDetailsModal
        visible={showBillDetails}
        items={items}
        onClose={() => setShowBillDetails(false)}
        deliveryFee={deliveryCharge}
      />

      <PaymentTermsModal
        visible={showPaymentTermsModal}
        selectedTerms={paymentTerm}
        onClose={() => setShowPaymentTermsModal(false)}
        onSelect={(terms) => {
          setSelectedPaymentTerms(terms);
          // TODO: Save payment terms to user profile via API
          Alert.alert(
            "Payment Terms Updated",
            `Payment terms set to: ${terms.charAt(0).toUpperCase() + terms.slice(1)}. ${terms === "one-time" ? "You will be prompted to pay now." : "Payment will be collected later according to your payment terms."}`,
            [{ text: "OK" }],
          );
        }}
      />

      <DeliveryTimeModal
        visible={showDeliveryTime}
        selectedDate={scheduledDate}
        selectedTime={scheduledTime as any}
        isEventOrder={isEventOrder}
        onClose={() => setShowDeliveryTime(false)}
        onConfirm={({ date, time, isEvent }) => {
          setScheduledDate(date);
          setScheduledTime(time as any);
          setIsScheduledDelivery(true);
          setIsEventOrder(isEvent || false);
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
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  emptyCart: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyCartText: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 16,
  },
  browseBtn: {
    backgroundColor: "#102841",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseBtnText: {
    color: "white",
    fontWeight: "bold",
  },
  mainItemContainer: {
    backgroundColor: "#E0F2FE",
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#102841",
    flex: 1,
    marginRight: 12,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  counter: {
    flexDirection: "row",
    backgroundColor: "#102841",
    borderRadius: 8,
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  counterBtn: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
  count: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    minWidth: 20,
    textAlign: "center",
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#102841",
  },
  detailsCard: {
    backgroundColor: "#E0F2FE",
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  detailRowLast: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#102841",
    marginBottom: 4,
  },
  detailSubtext: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },
  detailLink: {
    fontSize: 12,
    color: "#102841",
    textDecorationLine: "underline",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#102841",
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  gpayLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    color: "#102841",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 32,
  },
  paymentTextContainer: {
    flex: 1,
  },
  payVia: {
    fontSize: 10,
    color: "#94A3B8",
  },
  gpay: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  payButton: {
    backgroundColor: "#102841",
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  payButtonDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.error,
  },
  eventToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  eventLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
  },
  eventNameContainer: {
    marginTop: 8,
    width: "100%",
  },
  eventNameInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  distanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "500",
  },
  distanceTextError: {
    color: COLORS.error,
  },
  toggleSwitch: {
    marginLeft: 12,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  frequencyOptions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  frequencyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  frequencyButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  frequencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  frequencyButtonSelected: {
    backgroundColor: "#E0F2FE",
    borderColor: COLORS.primary,
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.text,
  },
  frequencyButtonTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
