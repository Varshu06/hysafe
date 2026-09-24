import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../../src/components/ui/Button";
import { useAuth } from "../../../src/context/AuthContext";
import { deleteAccount } from "../../../src/services/customer.service";
import { COLORS } from "../../../src/utils/constants";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const [confirmText, setConfirmText] = useState("");
  const [working, setWorking] = useState(false);

  const handleRequestDelete = async () => {
    if (working) return;

    if (confirmText.trim().toUpperCase() !== "DELETE") {
      Alert.alert("Confirmation Required", "Please type DELETE in the box to proceed.");
      return;
    }

    Alert.alert(
      "Permanent Account Deletion",
      "Are you absolutely sure? This will permanently delete your account, delivery addresses, and recurring subscriptions. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            if (working) return;
            setWorking(true);
            try {
              const res = await deleteAccount();
              Alert.alert(
                "Account Deleted",
                res?.message || "Your account has been permanently deleted.",
                [
                  {
                    text: "OK",
                    onPress: async () => {
                      await logout();
                      router.replace("/(auth)/login");
                    },
                  },
                ],
                { cancelable: false },
              );
            } catch (error: any) {
              Alert.alert(
                "Deletion Failed",
                error.message || "Failed to delete account. Please try again.",
              );
              setWorking(false);
            }
          },
        },
      ],
    );
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.replace("/(customer)/profile")}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Delete your account</Text>
          <Text style={styles.subtitle}>
            This action is permanent and cannot be undone. All your profile
            information, saved addresses, and active recurring subscriptions will
            be permanently erased. If you have an order currently in progress,
            it must be delivered or cancelled first.
          </Text>

          <Text style={styles.label}>Type DELETE to confirm</Text>
          <TextInput
            style={styles.input}
            placeholder="DELETE"
            placeholderTextColor={COLORS.textLight}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            editable={!working}
          />

          <Button
            title={working ? "Deleting Account..." : "Permanently Delete Account"}
            variant="danger"
            onPress={handleRequestDelete}
            disabled={working || confirmText.trim().toUpperCase() !== "DELETE"}
            style={styles.deleteButton}
          />

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutLink}
            disabled={working}
          >
            <Text style={styles.logoutText}>Logout instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.accent },
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
  placeholder: { width: 40, position: "absolute", right: 20 },
  content: { padding: 20 },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.error,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
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
  deleteButton: { marginTop: 14 },
  logoutLink: { marginTop: 14, alignItems: "center" },
  logoutText: { color: COLORS.primary, fontWeight: "600" },
});
