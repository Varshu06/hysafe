import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";
import { COLORS } from "../../src/utils/constants";
import { UserRole } from "../../src/types/user.types";
import { t } from "i18next";

type CustomerType = "home" | "shop" | "hotel" | "bank" | "event";

const ROLES: {
  value: UserRole;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  description: string;
}[] = [
  {
    value: "customer",
    label: "Customer",
    icon: "user",
    description: "Order water cans",
  },
  {
    value: "staff",
    label: "Staff",
    icon: "truck",
    description: "Delivery staff",
  },
];

const CUSTOMER_TYPES: {
  value: CustomerType;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  description: string;
}[] = [
  { value: "home", label: "Home", icon: "home", description: "Home delivery" },
  {
    value: "shop",
    label: "Shop",
    icon: "shopping-bag",
    description: "Retail shop",
  },
  {
    value: "hotel",
    label: "Hotel",
    icon: "users",
    description: "Hotel/Restaurant",
  },
  {
    value: "bank",
    label: "Bank",
    icon: "credit-card",
    description: "Bank/Office",
  },
  {
    value: "event",
    label: "Event",
    icon: "calendar",
    description: "Events/Weddings",
  },
];

export default function SignupScreen() {
  const router = useRouter();
  const { register, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [customerType, setCustomerType] = useState<CustomerType>("home");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !phone || !password) {
      Alert.alert(t("error"), t("pleaseFillAllRequiredFields"));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t("error"), t("passwordsDoNotMatch"));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t("error"), t("passwordMustBeAtLeast6Characters"));
      return;
    }

    if (phone.length < 10) {
      Alert.alert(t("error"), t("phoneNumberMustBeAtLeast10Digits"));
      return;
    }

    try {
      setLoading(true);
      await register({
        name,
        phone: phone || undefined,
        password,
        role: role,
        address: address || undefined,
        customerType: role === "customer" ? customerType : undefined,
      });

      // Navigation will be handled by AuthContext based on role
    } catch (error: any) {
      Alert.alert(t("signupFailed"), error.message || t("signupFailedMessage"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Water Theme Header */}
      <ImageBackground
        source={require("../../src/assets/loginimage.png")}
        style={styles.headerContainer}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.headerWave} />
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Hy-Safe</Text>
        <Text style={styles.tagline}>{t("tagline")}</Text>
        <Text style={styles.subtitle}>{t("signUpToGetStarted")}</Text>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>{t("signup")}</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.form}>
          {/* Role Selection */}
          <View style={styles.roleSection}>
            <Text style={styles.sectionLabel}>{t("selectYourRole")}</Text>
            <Text style={styles.sectionSubtext}>
              {t("selectRoleDescription")}
            </Text>
            <View style={styles.roleContainer}>
              {ROLES.map((roleOption) => (
                <TouchableOpacity
                  key={roleOption.value}
                  style={[
                    styles.roleCard,
                    role === roleOption.value && styles.roleCardSelected,
                  ]}
                  onPress={() => setRole(roleOption.value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.roleIconContainer,
                      role === roleOption.value &&
                        styles.roleIconContainerSelected,
                    ]}
                  >
                    <Feather
                      name={roleOption.icon}
                      size={24}
                      color={
                        role === roleOption.value
                          ? COLORS.primary
                          : COLORS.textLight
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.roleLabel,
                      role === roleOption.value && styles.roleLabelSelected,
                    ]}
                  >
                    {t(roleOption.label)}
                  </Text>
                  <Text
                    style={[
                      styles.roleDescription,
                      role === roleOption.value &&
                        styles.roleDescriptionSelected,
                    ]}
                  >
                    {t(roleOption.description)}
                  </Text>
                  {role === roleOption.value && (
                    <View style={styles.selectedIndicator}>
                      <Feather name="check" size={12} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Feather
              name="user"
              size={18}
              color={COLORS.textLight}
              style={styles.inputIconLeft}
            />
            <TextInput
              style={styles.inputWithIcon}
              placeholder={t("namePlaceholder")}
              placeholderTextColor={COLORS.textLight}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.countryCode}>
              <Feather
                name="phone"
                size={18}
                color={COLORS.textLight}
                style={styles.inputIcon}
              />
              <Text style={styles.code}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder={t("phoneNumberPlaceholder")}
              placeholderTextColor={COLORS.textLight}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Feather
              name="map-pin"
              size={18}
              color={COLORS.textLight}
              style={styles.inputIconLeft}
            />
            <TextInput
              style={[styles.inputWithIcon, styles.addressInput]}
              placeholder={t("addressPlaceholder")}
              placeholderTextColor={COLORS.textLight}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Customer Type Selection - Only show for customers */}
          {role === "customer" && (
            <View style={styles.customerTypeSection}>
              <Text style={styles.sectionLabel}>{t("selectAccountType")}</Text>
              <Text style={styles.sectionSubtext}>
                {t("selectAccountTypeDescription")}
              </Text>
              <View style={styles.customerTypeGrid}>
                {CUSTOMER_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.customerTypeCard,
                      customerType === type.value &&
                        styles.customerTypeCardSelected,
                    ]}
                    onPress={() => setCustomerType(type.value)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.customerTypeIconContainer,
                        customerType === type.value &&
                          styles.customerTypeIconContainerSelected,
                      ]}
                    >
                      <Feather
                        name={type.icon}
                        size={20}
                        color={
                          customerType === type.value
                            ? COLORS.primary
                            : COLORS.textLight
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.customerTypeLabel,
                        customerType === type.value &&
                          styles.customerTypeLabelSelected,
                      ]}
                    >
                      {t(type.label)}
                    </Text>
                    <Text
                      style={[
                        styles.customerTypeDescription,
                        customerType === type.value &&
                          styles.customerTypeDescriptionSelected,
                      ]}
                    >
                      {t(type.description)}
                    </Text>
                    {customerType === type.value && (
                      <View style={styles.selectedIndicator}>
                        <Feather name="check" size={10} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {(customerType === "shop" ||
                customerType === "hotel" ||
                customerType === "event") && (
                <View style={styles.wholesaleBanner}>
                  <Feather
                    name="tag"
                    size={16}
                    color="#166534"
                    style={styles.wholesaleIcon}
                  />
                  <Text style={styles.wholesaleBannerText}>
                    {t("wholesaleBenefits")}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t("passwordPlaceholderSignup")}
              placeholderTextColor={COLORS.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t("confirmPasswordPlaceholder")}
              placeholderTextColor={COLORS.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              activeOpacity={0.7}
            >
              <Feather
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>{t("signup")}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginText}>
              {t("alreadyHaveAccount")}
              <Text style={styles.loginLinkText}>{t("login")}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  headerContainer: {
    height: 350,
    width: "100%",
    position: "relative",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 132, 199, 0.3)",
  },
  headerWave: {
    position: "absolute",
    bottom: -50,
    width: "150%",
    height: 100,
    backgroundColor: "white",
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
    alignSelf: "center",
  },
  content: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 30,
    textAlign: "center",
    lineHeight: 20,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 10,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  form: {
    width: "100%",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    width: "100%",
  },
  inputIconLeft: {
    marginLeft: 16,
    marginRight: 12,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordContainer: {
    position: "relative",
    width: "100%",
    marginBottom: 16,
  },
  passwordInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: "100%",
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 4,
  },
  inputContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 4,
    width: "100%",
    marginBottom: 16,
    height: 56,
    backgroundColor: "#F8FAFC",
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  code: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  loginLink: {
    alignItems: "center",
    marginBottom: 24,
  },
  loginText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  loginLinkText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  roleSection: {
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  roleCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    position: "relative",
    minHeight: 100,
  },
  roleCardSelected: {
    backgroundColor: "#E0F2FE",
    borderColor: COLORS.primary,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  roleIconContainerSelected: {
    backgroundColor: "#E0F2FE",
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  roleLabelSelected: {
    color: COLORS.primary,
  },
  roleDescription: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: "center",
  },
  roleDescriptionSelected: {
    color: COLORS.primary,
  },
  customerTypeSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  customerTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  customerTypeCard: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    position: "relative",
  },
  customerTypeCardSelected: {
    backgroundColor: "#E0F2FE",
    borderColor: COLORS.primary,
  },
  customerTypeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  customerTypeIconContainerSelected: {
    backgroundColor: "#E0F2FE",
  },
  customerTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  customerTypeLabelSelected: {
    color: COLORS.primary,
  },
  customerTypeDescription: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: "center",
  },
  customerTypeDescriptionSelected: {
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
  wholesaleIcon: {
    marginRight: 8,
  },
  wholesaleBanner: {
    backgroundColor: "#F0FDF4",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  wholesaleBannerText: {
    fontSize: 13,
    color: "#166534",
    fontWeight: "500",
    flex: 1,
  },
});
