import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../../src/components/ui/Button";
import { COLORS } from "../../../src/utils/constants";
import { changePassword } from "../../../src/services/auth.service";

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t("missingFields"), t("pleaseFillAllFields"));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t("weakPassword"), t("newPasswordMin6"));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("mismatch"), t("passwordsDoNotMatch"));
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert(t("success"), t("passwordChangedSuccess"), [
        {
          text: t("ok"),
          onPress: () => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            router.replace("/(customer)/profile/privacy-security");
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(t("error"), error.message || t("failedToChangePassword"));
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.headerTitle}>{t("changePassword")}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.label}>{t("currentPassword")}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t("currentPasswordPlaceholder")}
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!currentPasswordVisible}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity
              onPress={() => setCurrentPasswordVisible(!currentPasswordVisible)}
              style={styles.eyeIcon}
              activeOpacity={0.7}
            >
              <Feather
                name={currentPasswordVisible ? "eye-off" : "eye"}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t("newPassword")}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t("newPasswordPlaceholder")}
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!newPasswordVisible}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity
              onPress={() => setNewPasswordVisible(!newPasswordVisible)}
              style={styles.eyeIcon}
              activeOpacity={0.7}
            >
              <Feather
                name={newPasswordVisible ? "eye-off" : "eye"}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t("confirmNewPassword")}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t("confirmNewPasswordPlaceholder")}
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!confirmPasswordVisible}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              style={styles.eyeIcon}
              activeOpacity={0.7}
            >
              <Feather
                name={confirmPasswordVisible ? "eye-off" : "eye"}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>

          <Button
            title={saving ? t("saving") : t("updatePassword")}
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
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
  content: { flex: 1 },
  contentContainer: { padding: 20 },
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
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  saveButton: { marginTop: 16 },
});
