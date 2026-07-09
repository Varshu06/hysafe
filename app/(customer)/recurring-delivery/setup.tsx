import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
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
import {
  addressStorage,
  SavedAddress,
} from "../../../src/utils/addressStorage";
import { RecurringFrequency } from "../../../src/types/recurring.types";
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
  const [quantity, setQuantity] = useState("20");
  const [frequency, setFrequency] = useState<RecurringFrequency>("daily");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("monthly");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    if (!selectedAddressId) {
      Alert.alert("Error", "Please select a delivery address");
      return;
    }

    setSaving(true);
    try {
      // TODO: Integrate with API to save recurring delivery
      Alert.alert(
        "Success",
        `Recurring delivery set up successfully!\n\n${quantity} cans will be delivered ${frequency === "daily" ? "daily" : frequency === "every-2-days" ? "every 2 days" : "weekly"}.\nPayment: ${paymentTerms === "monthly" ? "Monthly" : paymentTerms === "weekly" ? "Weekly" : "Pay per order"}`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      Alert.alert("Error", "Failed to set up recurring delivery");
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
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>

          {/* Quantity */}
          <Text style={styles.label}>Quantity (cans) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter quantity"
            placeholderTextColor={COLORS.textLight}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
          />

          {/* Frequency */}
          <Text style={styles.label}>Delivery Frequency *</Text>
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
                {selectedAddress?.address || "Select delivery address"}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          {/* Special Instructions */}
          <Text style={styles.label}>Special Instructions (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special delivery instructions"
            placeholderTextColor={COLORS.textLight}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Terms</Text>
          <Text style={styles.helperText}>
            Choose how you want to pay for recurring deliveries
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
                💰 All deliveries will be billed{" "}
                {paymentTerms === "monthly" ? "monthly" : "weekly"}. Payment due
                dates will be shown in order details.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Setting Up..." : "Set Up Recurring Delivery"}
          </Text>
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
    marginBottom: 16,
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
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  optionCard: {
    width: "31%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    position: "relative",
  },
  optionCardSelected: {
    backgroundColor: "#E0F2FE",
    borderColor: COLORS.primary,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  optionDescription: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: "center",
  },
  optionDescriptionSelected: {
    color: COLORS.primary,
  },
  selectedIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCheck: {
    color: "white",
    fontSize: 12,
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
    backgroundColor: "#E0F2FE",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentInfoBannerText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
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
    height: 24,
  },
});
