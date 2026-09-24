import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BUSINESS_ADDRESS, BUSINESS_EMAIL, BUSINESS_PHONE, COLORS } from "../../../src/utils/constants";

const FAQS = [
  ["How do I place an order?", "Choose products, add them to your cart, select a delivery address at checkout, then place your order."],
  ["What payment methods are available?", "HySafe currently supports offline payment collection: Cash on Delivery and Pay at Shop."],
  ["How does payment work?", "Choose the available offline method for your order. Staff records payment when cash is collected or payment at the shop is confirmed."],
  ["How do recurring deliveries work?", "Create a plan by choosing a product, quantity, delivery schedule, billing frequency, address and payment method. The plan appears under Recurring Deliveries."],
  ["How do I change or cancel a recurring delivery?", "Open Recurring Deliveries to pause, resume or cancel a plan. Available actions depend on the plan's current status."],
  ["How do I change my delivery address?", "Open Saved Addresses from Profile to add, edit, select or remove an address. Saved addresses are stored on this device; checkout sends the selected address with the order."],
  ["What if there is a problem with my order?", "Open Orders and select the order to review its current details and available actions. An order-specific contact option is shown when the order provides one."],
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openContactLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open", "No compatible phone or email app is available.");
    }
  };
  return <View style={styles.container}>
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to Profile" onPress={() => router.replace("/(customer)/profile")} style={styles.back}><Feather name="arrow-left" size={24} color={COLORS.text} /></TouchableOpacity>
      <Text style={styles.headerTitle}>Help & Support</Text><View style={styles.placeholder} />
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.contactGrid}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Call us ${BUSINESS_PHONE}`} style={styles.contactRow} onPress={() => openContactLink(`tel:${BUSINESS_PHONE}`)}>
            <View style={styles.contactIcon}>
              <Feather name="phone" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.contactCopy}>
              <Text style={styles.contactTitle}>Call us</Text>
              <Text style={styles.contactValue} numberOfLines={1}>{BUSINESS_PHONE}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Email us ${BUSINESS_EMAIL}`} style={styles.contactRow} onPress={() => openContactLink(`mailto:${BUSINESS_EMAIL}`)}>
            <View style={styles.contactIcon}>
              <Feather name="mail" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.contactCopy}>
              <Text style={styles.contactTitle}>Email us</Text>
              <Text style={styles.contactValue} numberOfLines={1}>{BUSINESS_EMAIL}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.addressLabel}>Business address</Text>
        <Text style={styles.body}>{BUSINESS_ADDRESS}</Text>
        <Text style={styles.body}>For an order-specific issue, open the order in Orders and use any contact option shown there.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQS.map(([question, answer]) => <View key={question} style={styles.faq}><Text style={styles.question}>{question}</Text><Text style={styles.body}>{answer}</Text></View>)}
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.accent },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, position: "relative" },
  back: { padding: 16, top: 16, position: "absolute", left: 20 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
  placeholder: { width: 40 },
  content: { padding: 20, gap: 14 },
  card: { backgroundColor: COLORS.secondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.text, marginBottom: 8 },
  contactGrid: { flexDirection: "row", gap: 10 },
  contactRow: { flex: 1, flexDirection: "row", alignItems: "center", minHeight: 64, padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12 },
  contactIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", marginRight: 8 },
  contactCopy: { flex: 1 },
  contactTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  contactValue: { fontSize: 13, lineHeight: 19, color: COLORS.textLight, marginTop: 2 },
  body: { fontSize: 13, lineHeight: 19, color: COLORS.textLight, marginTop: 4 },
  addressLabel: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginTop: 12 },
  faq: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  question: { fontSize: 14, fontWeight: "700", color: COLORS.text },
});
