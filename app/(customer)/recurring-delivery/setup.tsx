import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
  label: string;
  description: string;
}[] = [
  { value: "daily", label: "Daily", description: "Every day" },
  {
    value: "every-2-days",
    label: "Every 2 Days",
    description: "Alternate days",
  },
  { value: "weekly", label: "Weekly", description: "Once a week" },
  { value: "custom", label: "Custom", description: "Custom schedule" },
];

const PAYMENT_TERMS_OPTIONS: {
  value: PaymentTerms;
  label: string;
  description: string;
}[] = [
  {
    value: "one-time",
    label: "Pay Per Order",
    description: "Pay for each delivery",
  },
  { value: "weekly", label: "Weekly", description: "Pay weekly" },
  { value: "monthly", label: "Monthly", description: "Pay monthly" },
];

export default function RecurringDeliverySetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { products, loading: loadingProducts } = useProduct();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("5");
  const [frequency, setFrequency] = useState<RecurringFrequency>("daily");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("monthly");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  // Automatically select first product if none selected
  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

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

  const selectedProduct =
    products.find((p) => p.id === selectedProductId) || products[0];

  const handleSave = async () => {
    const parsedQty = parseInt(quantity, 10);
    if (!parsedQty || parsedQty <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity (minimum 1)");
      return;
    }

    if (!selectedProduct) {
      Alert.alert("Select Product", "Please choose a product for your recurring subscription");
      return;
    }

    if (!selectedAddress) {
      Alert.alert("Select Address", "Please select a delivery address");
      return;
    }

    setSaving(true);
    try {
      await createRecurringDelivery({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: parsedQty,
        frequency,
        deliveryAddress: selectedAddress.fullAddress || selectedAddress.address,
        deliveryAddressId: selectedAddress.id,
        paymentTerms,
        specialInstructions: specialInstructions.trim() || undefined,
      });

      Alert.alert(
        "Subscription Created!",
        `Recurring delivery for ${parsedQty}x ${selectedProduct.name} has been set up successfully.\n\nFrequency: ${
          frequency === "daily"
            ? "Daily"
            : frequency === "every-2-days"
            ? "Every 2 Days"
            : frequency === "weekly"
            ? "Weekly"
            : "Custom"
        }\nPayment: ${
          paymentTerms === "monthly"
            ? "Monthly"
            : paymentTerms === "weekly"
            ? "Weekly"
            : "Pay per order"
        }`,
        [
          {
            text: "View Subscriptions",
            onPress: () => router.replace("/(customer)/recurring-deliveries"),
          },
        ],
      );
    } catch (error: any) {
      console.error("Failed to create recurring delivery:", error);
      Alert.alert(
        "Setup Failed",
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
          <Text style={styles.sectionTitle}>1. Select Product</Text>
          {loadingProducts ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : products.length === 0 ? (
            <Text style={styles.helperText}>No products available at the moment.</Text>
          ) : (
            <View style={styles.productList}>
              {products.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.productCard,
                      isSelected && styles.productCardSelected,
                    ]}
                    onPress={() => setSelectedProductId(p.id)}
                    activeOpacity={0.7}
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
                      {p.volume ? (
                        <Text style={styles.productVolume}>{p.volume}</Text>
                      ) : null}
                    </View>
                    <View style={styles.productPriceContainer}>
                      <Text
                        style={[
                          styles.productPrice,
                          isSelected && styles.productPriceSelected,
                        ]}
                      >
                        ₹{p.price}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={COLORS.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Quantity */}
          <Text style={styles.label}>Quantity per Delivery *</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => {
                const q = Math.max(1, (parseInt(quantity, 10) || 1) - 1);
                setQuantity(String(q));
              }}
            >
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.qtyInput}
              placeholder="Qty"
              placeholderTextColor={COLORS.textLight}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => {
                const q = (parseInt(quantity, 10) || 0) + 1;
                setQuantity(String(q));
              }}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Frequency */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Delivery Frequency</Text>
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
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    frequency === option.value &&
                      styles.optionDescriptionSelected,
                  ]}
                >
                  {option.description}
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
          <Text style={styles.sectionTitle}>3. Delivery Location</Text>

          {/* Delivery Address */}
          <Text style={styles.label}>Delivery Address *</Text>
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
          <Text style={styles.label}>Special Instructions (optional)</Text>
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
          <Text style={styles.sectionTitle}>4. Payment Terms</Text>
          <Text style={styles.helperText}>
            Choose how you want to settle payments for recurring deliveries
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
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    paymentTerms === option.value &&
                      styles.optionDescriptionSelected,
                  ]}
                >
                  {option.description}
                </Text>
                {paymentTerms === option.value && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedCheck}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {(paymentTerms === "monthly" || paymentTerms === "weekly") && (
            <View style={styles.paymentInfoBanner}>
              <Text style={styles.paymentInfoBannerText}>
                💰 All scheduled recurring deliveries will be billed{" "}
                {paymentTerms === "monthly" ? "monthly" : "weekly"}. Payments will be
                tracked in your order statement.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Set Up Recurring Delivery</Text>
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
    marginTop: 2,
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
  bottomSpacer: {
    height: 32,
  },
});
