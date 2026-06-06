import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui/Button";
import { useAuth } from "../../src/context/AuthContext";
import { COLORS } from "../../src/utils/constants";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { model } from "mongoose";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [language, setLanguage] = useState<"en" | "ta">("ta");

  const getInitials = (value?: string) => {
    const s = (value || "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          // Logout function in AuthContext handles navigation
          await logout();
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    router.push("/(customer)/profile/edit");
  };

  const handleSavedAddresses = () => {
    router.push("/(customer)/address/search");
  };

  const handlePaymentMethods = () => {
    router.push("/(customer)/profile/payment-methods");
  };

  const handleNotifications = () => {
    Alert.alert("Notifications", "Notification settings feature coming soon!", [
      { text: "OK" },
    ]);
  };

  const handlePrivacySecurity = () => {
    router.push("/(customer)/profile/privacy-security");
  };

  const handleHelpSupport = () => {
    Alert.alert(
      "Help & Support",
      "For support, please contact us at:\n\nEmail: support@hysafe.com\nPhone: +91-1800-XXX-XXXX",
      [{ text: "OK" }],
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "About Hy-Safe",
      "Hy-Safe Water Delivery App\n\nVersion 1.0.0\n\nPure Water, Delivered Fast.\n\n© 2024 Hy-Safe. All rights reserved.",
      [{ text: "OK" }],
    );
  };

  const changeLanguage = (lang: "en" | "ta") => {
    i18n.changeLanguage(lang);
    setVisible(false);
    setLanguage(lang);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            onPress={() => router.push("/(customer)")}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please login to view profile</Text>
          <Button
            title="Login"
            onPress={() => router.push("/(auth)/login")}
            style={styles.loginButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.push("/(customer)")}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile")}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {getInitials(user.name || user.email || user.phone)}
              </Text>
            </View>
            <View style={styles.profileMain}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {user.name || user.email || user.phone}
                </Text>
                <View style={styles.roleChip}>
                  <Text style={styles.roleChipText}>Customer</Text>
                </View>
              </View>
              <Text style={styles.profileHint}>
                Manage your account settings & preferences
              </Text>
            </View>
          </View>

          <View style={styles.contactList}>
            {user.email ? (
              <View style={styles.contactRow}>
                <Feather name="mail" size={16} color={COLORS.textLight} />
                <Text style={styles.contactText} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            ) : null}
            {user.phone ? (
              <View style={styles.contactRow}>
                <Feather name="phone" size={16} color={COLORS.textLight} />
                <Text style={styles.contactText} numberOfLines={1}>
                  {user.phone}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("account")}</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <View style={styles.menuItemLeft}>
              <Feather name="edit-3" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>{t("editProfile")}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSavedAddresses}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="map-pin" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>{t("savedAddresses")}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePaymentMethods}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="credit-card" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>{t("paymentMethods")}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(customer)/recurring-deliveries")}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="repeat" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>
                {t("recurringDeliveries")}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("Settings")}</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleNotifications}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="bell" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>{t("notifications")}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePrivacySecurity}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="shield" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>{t("privacySecurity")}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleHelpSupport}>
            <View style={styles.menuItemLeft}>
              <Feather name="help-circle" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>{t("helpSupport")}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
            <View style={styles.menuItemLeft}>
              <Feather name="info" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>{t("about")}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          {/* language*/}
          {/* <TouchableOpacity
            onPress={() => setVisible(true)}
            style={styles.menuItem}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="language-outline" size={24} color={COLORS.text} />
              <Text style={styles.menuItemText}>{t("language")}</Text>
            </View>

            <View style={styles.menuItemRight}>
              <Text style={styles.menuItemLangText}>{t("lan")}</Text>
              <Feather
                name="chevron-right"
                size={20}
                color={COLORS.textLight}
              />
            </View>
          </TouchableOpacity> */}

          {/* language change */}
          {/* <Modal visible={visible} transparent animationType="slide">
            <Pressable
              onPress={() => setVisible(false)}
              style={styles.modalOverlay}
            >
              <Pressable style={styles.model}>
                <View style={styles.modelHandle} />

                <Text style={styles.langChangeTitle}>{t("language")}</Text>

                <TouchableOpacity
                  onPress={() => changeLanguage("en")}
                  style={styles.modelOption}
                >
                  <Text style={styles.menuItemText}>English</Text>
                  {i18n.language === "en" && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => changeLanguage("ta")}
                  style={styles.modelOption}
                >
                  <Text style={styles.menuItemText}>தமிழ்</Text>

                  {i18n.language === "ta" && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal> */}
        </View>

        {/* Logout Button */}
        <Button
          title={t("logout")}
          variant="danger"
          onPress={handleLogout}
          style={styles.logoutButton}
        />

        <View style={styles.bottomSpacer} />
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
    padding: 8,
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
  profileCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarInitials: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  profileMain: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  roleChip: {
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roleChipText: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 12,
  },
  profileHint: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.textLight,
  },
  contactList: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 14,
    gap: 10,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },

  langChangeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
  },
  menuItemLangText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: "400",
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
  },
  loginButton: {
    minWidth: 120,
  },
  bottomSpacer: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  model: {
    backgroundColor: COLORS.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 30,
  },
  modelHandle: {
    width: 60,
    height: 5,
    backgroundColor: COLORS.grey,
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 24,
  },
  modelOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});
