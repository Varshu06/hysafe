import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddressPickerModal } from "../../../src/components/customer/AddressPickerModal";
import { useAuth } from "../../../src/context/AuthContext";
import { useProduct } from "../../../src/context/ProductContext";
import { createRecurringDelivery } from "../../../src/services/recurring.service";
import { RecurringFrequency } from "../../../src/types/recurring.types";
import {
  addressStorage,
  SavedAddress,
} from "../../../src/utils/addressStorage";
import { COLORS } from "../../../src/utils/constants";

type PaymentTerms = "one-time" | "weekly" | "monthly";

const FREQUENCY_OPTIONS: {
  value: RecurringFrequency;
  labelKey: string;
  defaultLabel: string;
  defaultDescription: string;
}[] = [
  {
    value: "daily",
    labelKey: "Daily",
    defaultLabel: "Daily",
    defaultDescription: "Every day",
  },
  {
    value: "2-per-week",
    labelKey: "twoPerWeek",
    defaultLabel: "2 per week",
    defaultDescription: "2 deliveries/week",
  },
  {
    value: "3-per-week",
    labelKey: "threePerWeek",
    defaultLabel: "3 per week",
    defaultDescription: "3 deliveries/week",
  },
  {
    value: "every-2-days",
    labelKey: "Every 2 Days",
    defaultLabel: "Every 2 Days",
    defaultDescription: "Alternate days",
  },
  {
    value: "weekly",
    labelKey: "Weekly",
    defaultLabel: "Weekly",
    defaultDescription: "Once a week",
  },
];

const PAYMENT_TERMS_OPTIONS: {
  value: PaymentTerms;
  labelKey: string;
  defaultLabel: string;
  defaultDescription: string;
}[] = [
  {
    value: "one-time",
    labelKey: "payPerOrder",
    defaultLabel: "Pay Per Order",
    defaultDescription: "Pay for each delivery",
  },
  {
    value: "weekly",
    labelKey: "Weekly",
    defaultLabel: "Weekly",
    defaultDescription: "Pay weekly",
  },
  {
    value: "monthly",
    labelKey: "monthlyBill",
    defaultLabel: "Monthly",
    defaultDescription: "Pay monthly",
  },
];

export default function RecurringDeliverySetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { products, loading: loadingProducts } = useProduct();
  const { t } = useTranslation();

  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [frequency, setFrequency] = useState<RecurringFrequency>("3-per-week");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("weekly");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  // Automatically select first product with 1 quantity if none selected
  useEffect(() => {
    if (products.length > 0 && Object.keys(selectedQuantities).length === 0) {
      setSelectedQuantities({ [products[0].id]: 1 });
    }
  }, [products]);

  const updateProductQuantity = (productId: string, delta: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[productId];
      } else {
        updated[productId] = next;
      }
      return updated;
    });
  };

  // Load saved addresses
  const loadAddresses = useCallback(async () => {
    const addresses = await addressStorage.getAllAddresses(user);
    setSavedAddresses(addresses);
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

  const selectedAddress = savedAddresses.find(
    (addr) => addr.id === selectedAddressId,
  );

  // Multi-item calculations
  const selectedItems = products
    .filter((p) => (selectedQuantities[p.id] || 0) > 0)
    .map((p) => ({
      product: p,
      quantity: selectedQuantities[p.id] || 0,
    }));

  const totalCans = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalPerDelivery = selectedItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const maxDeliveryCharge = selectedItems.reduce(
    (max, item) => Math.max(max, item.product.deliveryCharge || 0),
    0
  );
  const singleDeliveryCost = subtotalPerDelivery + maxDeliveryCharge;

  let deliveryCount = 1;
  if (paymentTerms === "weekly") {
    if (frequency === "daily") deliveryCount = 7;
    else if (frequency === "3-per-week") deliveryCount = 3;
    else if (frequency === "2-per-week") deliveryCount = 2;
    else if (frequency === "every-2-days") deliveryCount = 3;
    else if (frequency === "weekly") deliveryCount = 1;
    else deliveryCount = 1;
  } else if (paymentTerms === "monthly") {
    if (frequency === "daily") deliveryCount = 30;
    else if (frequency === "3-per-week") deliveryCount = 12;
    else if (frequency === "2-per-week") deliveryCount = 8;
    else if (frequency === "every-2-days") deliveryCount = 15;
    else if (frequency === "weekly") deliveryCount = 4;
    else deliveryCount = 4;
  } else {
    deliveryCount = 1;
  }

  const billAmount = singleDeliveryCost * deliveryCount;

  const billTitle =
    paymentTerms === "weekly"
      ? (t("weeklyBill") || "Weekly bill")
      : paymentTerms === "monthly"
      ? (t("monthlyBill") || "Monthly bill")
      : (t("orderBill") || "Order bill");

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      Alert.alert(t("error") || "Select Products", "Please add at least one product for your recurring subscription");
      return;
    }

    if (!selectedAddress) {
      Alert.alert(t("error") || "Select Address", "Please select a delivery address");
      return;
    }

    const itemsPayload = selectedItems.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      deliveryCharge: item.product.deliveryCharge || 0,
      volume: item.product.volume,
    }));

    const summaryProductNames = itemsPayload
      .map((i) => `${i.quantity}x ${i.productName}`)
      .join(", ");

    setSaving(true);
    try {
      await createRecurringDelivery({
        productId: itemsPayload[0].productId,
        productName: summaryProductNames,
        quantity: totalCans,
        items: itemsPayload,
        frequency,
        deliveryAddress: selectedAddress.fullAddress || selectedAddress.address,
        deliveryAddressId: selectedAddress.id,
        paymentTerms,
        specialInstructions: specialInstructions.trim() || undefined,
        deliveryCount,
        billAmount,
        paymentMethod: "offline",
        paymentStatus: "pending",
        confirmationStatus: "confirmed",
      });

      Alert.alert(
        t("confirmed") || "Confirmed",
        `${billTitle}: ₹${billAmount}\n${deliveryCount} ${t("deliveries") || "deliveries"}\n${t("offlineCod") || "Offline/COD"}\n\nStatus: ${t("confirmed") || "Confirmed"}\n${t("paymentStatus") || "Payment Status"}: ${t("paymentPending") || "Payment pending"}\n\n${t("paymentDueNotice") || "Payment is due on your first delivery day."}`,
        [
          {
            text: t("viewDetails") || "View Subscriptions",
            onPress: () => router.replace("/(customer)/recurring-deliveries"),
          },
        ],
      );
    } catch (error: any) {
      console.error("Failed to create recurring delivery:", error);
      Alert.alert(
        t("error") || "Setup Failed",
        error.message || "Failed to set up recurring delivery. Please try again."
      );
    } finally {
      setSaving(false);
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
        <Text style={styles.headerTitle}>Set Up Recurring Delivery</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Selection */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1. {t("selectProduct") || "Select Products"}</Text>
            {selectedItems.length > 0 && (
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountBadgeText}>
                  {selectedItems.length} {t("items") || "items"} ({totalCans} cans)
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.helperText}>
            Choose one or more items and adjust quantities for each recurring delivery
          </Text>

          {loadingProducts ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : products.length === 0 ? (
            <Text style={styles.helperText}>No products available at the moment.</Text>
          ) : (
            <View style={styles.productList}>
              {products.map((p) => {
                const itemQty = selectedQuantities[p.id] || 0;
                const isSelected = itemQty > 0;
                return (
                  <View
                    key={p.id}
                    style={[
                      styles.productCard,
                      isSelected && styles.productCardSelected,
                    ]}
                  >
                    <View style={styles.productInfo}>
                      <Text
                        style={[
                          styles.productName,
                          isSelected && styles.productNameSelected,
                        ]}
                      >
                        {p.name}
                      </Text>
                      <View style={styles.productMetaRow}>
                        {p.volume ? (
                          <Text style={styles.productVolume}>{p.volume}</Text>
                        ) : null}
                        <Text
                          style={[
                            styles.productPrice,
                            isSelected && styles.productPriceSelected,
                          ]}
                        >
                          ₹{p.price}
                        </Text>
                      </View>
                    </View>

                    {isSelected ? (
                      <View style={styles.itemQtyContainer}>
                        <TouchableOpacity
                          style={styles.itemQtyBtn}
                          onPress={() => updateProductQuantity(p.id, -1)}
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                          <Text style={styles.itemQtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.itemQtyValue}>{itemQty}</Text>
                        <TouchableOpacity
                          style={styles.itemQtyBtn}
                          onPress={() => updateProductQuantity(p.id, 1)}
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                          <Text style={styles.itemQtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => updateProductQuantity(p.id, 1)}
                        activeOpacity={0.7}
                      >
                        <Feather name="plus" size={14} color={COLORS.primary} />
                        <Text style={styles.addBtnText}>{t("add") || "ADD"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Selected Items Breakdown */}
          {selectedItems.length > 0 && (
            <View style={styles.selectedItemsSummary}>
              <Text style={styles.selectedItemsSummaryTitle}>
                Per Delivery Subtotal: ₹{subtotalPerDelivery}
                {maxDeliveryCharge > 0 ? ` (+₹${maxDeliveryCharge} delivery)` : ""}
              </Text>
              {selectedItems.map((it) => (
                <Text key={it.product.id} style={styles.selectedItemSummaryRow}>
                  • {it.quantity}x {it.product.name} (₹{it.product.price * it.quantity})
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Delivery Frequency */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. {t("frequency") || "Delivery Frequency"}</Text>
          <View style={styles.optionsGrid}>
            {FREQUENCY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  frequency === option.value && styles.optionCardSelected,
                ]}
                onPress={() => setFrequency(option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    frequency === option.value && styles.optionLabelSelected,
                  ]}
                >
                  {t(option.labelKey) || option.defaultLabel}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    frequency === option.value &&
                      styles.optionDescriptionSelected,
                  ]}
                >
                  {option.defaultDescription}
                </Text>
                {frequency === option.value && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedCheck}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Address and Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. {t("deliveryAddress") || "Delivery Location"}</Text>

          {/* Delivery Address */}
          <Text style={styles.label}>{t("deliveryAddress") || "Delivery Address"} *</Text>
          <TouchableOpacity
            style={styles.addressButton}
            onPress={() => setShowAddressPicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="location-outline"
              size={20}
              color={COLORS.primary}
            />
            <View style={styles.addressContent}>
              <Text style={styles.addressText} numberOfLines={2}>
                {selectedAddress?.fullAddress ||
                  selectedAddress?.address ||
                  "Select delivery address"}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          {/* Special Instructions */}
          <Text style={styles.label}>{t("specialInstructions") || "Special Instructions"} ({t("optional") || "optional"})</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Leave at door, call before delivery"
            placeholderTextColor={COLORS.textLight}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Payment Terms */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4. {t("paymentTerms") || "Payment Terms"}</Text>
          <Text style={styles.helperText}>
            {t("selectPaymentTerm") || "Choose how you want to settle payments for recurring deliveries"}
          </Text>

          <View style={styles.optionsGrid}>
            {PAYMENT_TERMS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  paymentTerms === option.value && styles.optionCardSelected,
                ]}
                onPress={() => setPaymentTerms(option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    paymentTerms === option.value && styles.optionLabelSelected,
                  ]}
                >
                  {t(option.labelKey) || option.defaultLabel}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    paymentTerms === option.value &&
                      styles.optionDescriptionSelected,
                  ]}
                >
                  {option.defaultDescription}
                </Text>
                {paymentTerms === option.value && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedCheck}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 5. Bill Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>5. {t("totalBill") || "Bill Summary"}</Text>

          <View style={styles.billBox}>
            <View style={styles.billMainRow}>
              <View>
                <Text style={styles.billPeriodTitle}>{billTitle}</Text>
                <Text style={styles.billAmount}>₹{billAmount}</Text>
              </View>
              <View style={styles.deliveryBadge}>
                <Feather name="truck" size={14} color={COLORS.primary} />
                <Text style={styles.deliveryBadgeText}>
                  {deliveryCount} {t("deliveries") || "deliveries"}
                </Text>
              </View>
            </View>

            <View style={styles.billDivider} />

            <View style={styles.billDetailRow}>
              <Text style={styles.billDetailLabel}>
                {t("paymentMethod") || "Payment Method"}
              </Text>
              <Text style={styles.billDetailValue}>
                {t("offlineCod") || "Offline/COD"}
              </Text>
            </View>

            <View style={styles.billDetailRow}>
              <Text style={styles.billDetailLabel}>
                {t("paymentTerms") || "Billing Period"}
              </Text>
              <Text style={styles.billDetailValue}>
                {paymentTerms === "weekly"
                  ? (t("Weekly") || "Weekly")
                  : paymentTerms === "monthly"
                  ? (t("monthlyBill") || "Monthly")
                  : (t("payPerOrder") || "Pay per order")}
              </Text>
            </View>

            <View style={styles.dueNoticeBox}>
              <Ionicons name="information-circle" size={18} color="#0284C7" />
              <Text style={styles.dueNoticeText}>
                {t("paymentDueNotice") || "Payment is due on your first delivery day."}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>{t("confirmBill") || "Confirm Bill"}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <AddressPickerModal
        visible={showAddressPicker}
        addresses={savedAddresses}
        selectedId={selectedAddressId}
        onClose={() => setShowAddressPicker(false)}
        onSelect={async (addr) => {
          setSelectedAddressId(addr.id);
          await addressStorage.setSelectedAddressId(addr.id);
          const addresses = await addressStorage.getAllAddresses(user);
          setSavedAddresses(addresses);
        }}
        onAddNew={() => {
          setShowAddressPicker(false);
          router.push("/(customer)/address/search");
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
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemCountBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  itemCountBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 14,
  },
  productList: {
    gap: 10,
    marginBottom: 16,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  productCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  productNameSelected: {
    color: COLORS.primary,
  },
  productVolume: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  productMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  productPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
  },
  productPriceSelected: {
    color: COLORS.primary,
  },
  itemQtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 2,
  },
  itemQtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  itemQtyBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    lineHeight: 18,
  },
  itemQtyValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primary,
    minWidth: 20,
    textAlign: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  selectedItemsSummary: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedItemsSummaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  selectedItemSummaryRow: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  qtyInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  optionCard: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  optionCardSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: COLORS.primary,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  optionDescription: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: "center",
  },
  optionDescriptionSelected: {
    color: COLORS.primary,
  },
  selectedIndicator: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCheck: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  addressButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.text,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  paymentInfoBanner: {
    backgroundColor: "#EFF6FF",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentInfoBannerText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  billBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 16,
  },
  billMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billPeriodTitle: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: "600",
  },
  billAmount: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 4,
  },
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  deliveryBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  billDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },
  billDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  billDetailLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  billDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  dueNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E0F2FE",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  dueNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0369A1",
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 32,
  },
});
