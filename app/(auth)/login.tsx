import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { changeLanguage, t } from "i18next";
import LanguageSelectionModal from "@/components/auth/LanguageSelectionModal";
import { getSavedLanguage } from "@/i18n";

export default function LoginScreen() {
  const router = useRouter();
  const { login, refreshProfile } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkLanguage();
  }, []);

  const checkLanguage = async () => {
    const lang = await getSavedLanguage();

    if (!lang) {
      setShowModal(true);
    }
  };

  const handleLanguage = async (lang: string) => {
    await changeLanguage(lang);

    setShowModal(false);
  };

  const handleLogin = async () => {
    // Validate phone number
    if (!phone || phone.trim().length === 0) {
      Alert.alert(t("error"), t("pleaseEnterPhoneNumber"));
      return;
    }

    // Remove any spaces or special characters
    const cleanPhone = phone.replace(/\s+/g, "").replace(/[^0-9]/g, "");

    if (cleanPhone.length < 10) {
      Alert.alert(t("error"), t("phoneNumberMustBeAtLeast10Digits"));
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert(t("error"), t("passwordMustBeAtLeast6Characters"));
      return;
    }

    try {
      setLoading(true);
      await login({
        phone: cleanPhone, // Use cleaned phone number
        password,
      });
      // Navigation will be handled by AuthContext based on role
    } catch (error: any) {
      // Get the error message from the service (already user-friendly)
      let errorMessage = error.message || t("loginFailedError");

      // Only log non-password errors for debugging
      if (
        !errorMessage.includes("Wrong password") &&
        !errorMessage.includes("password")
      ) {
        console.error("Login error in UI:", error);
      }

      // Determine alert title based on error type
      let alertTitle = t("loginFailed");
      if (
        errorMessage.includes("Wrong password") ||
        errorMessage.includes("password")
      ) {
        alertTitle = t("wrongPassword");
        errorMessage = t("wrongPasswordMessage");
      } else if (
        errorMessage.includes("Connection") ||
        errorMessage.includes("timeout")
      ) {
        alertTitle = t("connectionError");
        errorMessage = t("connectionErrorMessage");
      } else if (errorMessage.includes("Server")) {
        alertTitle = t("serverError");
        errorMessage = t("serverErrorMessage");
      }

      Alert.alert(alertTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LanguageSelectionModal visible={showModal} onSelect={handleLanguage} />
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
        <Text style={styles.subtitle}>{t("logInToContinue")}</Text>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>{t("logInOrSignUp")}</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.code}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder={t("phoneNumberPlaceholder")}
            placeholderTextColor={COLORS.textLight}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t("passwordPlaceholder")}
            placeholderTextColor={COLORS.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeIconButton}
            onPress={() => {
              console.log("Eye icon pressed, showPassword:", showPassword);
              setShowPassword(!showPassword);
            }}
            activeOpacity={0.7}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color="#0284C7"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>{t("login")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => router.push("/(auth)/signup")}
        >
          <Text style={styles.signupText}>
            {t("dontHaveAccount")}
            <Text style={styles.signupLinkText}>{t("signup")}</Text>
          </Text>
        </TouchableOpacity>
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
    height: 350, // Increased height to show more image
    width: "100%",
    position: "relative",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 132, 199, 0.3)", // COLORS.primary with opacity
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
  // Removed bubble1, bubble2, logoArea, headerImage, headerIcon
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
  inputContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 4,
    width: "100%",
    marginBottom: 20,
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
  flag: {
    fontSize: 18,
    marginRight: 8,
  },
  code: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    height: 56,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    height: "100%",
    backgroundColor: "transparent",
  },
  eyeIconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  button: {
    backgroundColor: COLORS.primary,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 24,
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
  signupLink: {
    alignItems: "center",
    marginBottom: 24,
  },
  signupText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  signupLinkText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
