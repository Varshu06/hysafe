import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../src/utils/constants";

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
  return <View style={styles.container}>
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to Profile" onPress={() => router.replace("/(customer)/profile")} style={styles.back}><Feather name="arrow-left" size={24} color={COLORS.text} /></TouchableOpacity>
      <Text style={styles.headerTitle}>Help & Support</Text><View style={styles.placeholder} />
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.body}>Support phone, email and WhatsApp contact details have not been configured in the app.</Text>
        <Text style={styles.body}>For an order-specific issue, open the order in Orders and use any contact option shown there.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQS.map(([question, answer]) => <View key={question} style={styles.faq}><Text style={styles.question}>{question}</Text><Text style={styles.body}>{answer}</Text></View>)}
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({ container:{flex:1,backgroundColor:COLORS.accent}, header:{flexDirection:"row",alignItems:"center",justifyContent:"center",paddingHorizontal:20,paddingBottom:16,borderBottomWidth:1,borderBottomColor:"#E2E8F0",position:"relative"}, back:{padding:16,top:16,position:"absolute",left:20},headerTitle:{fontSize:18,fontWeight:"bold",color:COLORS.text},placeholder:{width:40},content:{padding:20,gap:14},card:{backgroundColor:COLORS.secondary,borderRadius:16,padding:16,borderWidth:1,borderColor:"#E2E8F0"},sectionTitle:{fontSize:16,fontWeight:"bold",color:COLORS.text,marginBottom:8},body:{fontSize:13,lineHeight:19,color:COLORS.textLight,marginTop:4},faq:{paddingVertical:10,borderTopWidth:1,borderTopColor:"#E2E8F0"},question:{fontSize:14,fontWeight:"700",color:COLORS.text} });
