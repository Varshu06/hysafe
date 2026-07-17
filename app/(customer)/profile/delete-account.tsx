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
import { COLORS } from "../../../src/utils/constants";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const [confirmText, setConfirmText] = useState("");
  const [working, setWorking] = useState(false);

  const handleRequestDelete = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      Alert.alert("Confirm", "Please type DELETE to continue.");
      return;
    }

    Alert.alert(
      "Final Confirmation",
      "This will permanently delete your account (feature coming soon).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: async () => {
            setWorking(true);
            try {
              // TODO: integrate backend endpoint for account deletion
              Alert.alert(
                "Coming soon",
                "Account deletion will be available after API integration.",
              );
            } finally {
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
          onPress={() => router.replace("/(customer)/profile/privacy-security")}
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
            This action is permanent. Your order history and saved data will be
            removed once this feature is enabled.
          </Text>

          <Text style={styles.label}>Type DELETE to confirm</Text>
          <TextInput
            style={styles.input}
            placeholder="DELETE"
            placeholderTextColor={COLORS.textLight}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
          />

          <Button
            title={working ? "Please wait..." : "Request Account Deletion"}
            variant="danger"
            onPress={handleRequestDelete}
            disabled={working}
            style={styles.deleteButton}
          />

          <TouchableOpacity onPress={handleLogout} style={styles.logoutLink}>
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
