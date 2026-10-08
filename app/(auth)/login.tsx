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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AndroidGoogleAuth } from "../../src/components/auth/AndroidGoogleAuth";
import { GoogleSignInButton } from "../../src/components/auth/GoogleSignInButton";
import { useAuth } from "../../src/context/AuthContext";
import { beginWebGoogleOAuth, googleErrorMessage } from "../../src/services/googleAuth.service";
import { COLORS } from "../../src/utils/constants";
import { normalizeIndianMobilePhone } from "../../src/utils/phone";
import { useTranslation } from "react-i18next";
import { changeLanguage, getSavedLanguage } from "@/i18n";
import LanguageSelectionModal from "@/components/auth/LanguageSelectionModal";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleNotice, setGoogleNotice] = useState("");
  const [showModal, setShowModal] = useState(false);
  const authBusy = loading || googleLoading;

  useEffect(() => {
    checkLanguage();
    if (Platform.OS !== "web" || typeof sessionStorage === "undefined") return;
    const notice = sessionStorage.getItem("hysafe_google_notice");
    if (!notice) return;
    setGoogleNotice(notice);
    const timeout = setTimeout(() => sessionStorage.removeItem("hysafe_google_notice"), 0);
    return () => clearTimeout(timeout);
  }, []);

  const checkLanguage = async () => {
    const lang = await getSavedLanguage();

    if (!lang) {
      setShowModal(true);
    }
  };

  const handleLanguage = async (lang: string) => {
    await changeLanguage(lang as "en" | "ta");

    setShowModal(false);
  };

  const handleLogin = async () => {
    // Validate phone number
    if (!phone || phone.trim().length === 0) {
      Alert.alert(t("error"), t("pleaseEnterPhoneNumber"));
      return;
    }

    const normalizedPhone = normalizeIndianMobilePhone(phone);
    if (!normalizedPhone) {
      Alert.alert(t("error"), t("phoneNumberMustBeAtLeast10Digits"));
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert(t("error"), t("passwordMustBeAtLeast6Characters"));
      return;
    }

    if (authBusy) return;

    try {
      setLoading(true);
      await login({
        phone: normalizedPhone,
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
        errorMessage.includes("password") ||
        errorMessage.includes("credentials") ||
        errorMessage.includes("Invalid phone number")
      ) {
        alertTitle = t("loginFailed");
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

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}>
        <Text style={styles.title}>Hy-Safe</Text>
        <Text style={styles.tagline}>{t("tagline")}</Text>
        <Text style={styles.subtitle}>{t("logInToContinue")}</Text>

        {Platform.OS === "android" ? (
          <AndroidGoogleAuth
            label={t("continueWithGoogle")}
            disabled={loading}
            onBusyChange={setGoogleLoading}
            onCredential={async (credential) => {
              setGoogleNotice("");
              await loginWithGoogle(credential);
            }}
            onCancel={() => setGoogleNotice(t("googleSignInCancelled"))}
            onError={(message) => setGoogleNotice(message)}
          />
        ) : Platform.OS === "web" ? (
          <GoogleSignInButton
            label={t("continueWithGoogle")}
            disabled={authBusy}
            loading={googleLoading}
            onPress={() => {
              if (authBusy) return;
              setGoogleNotice("");
              setGoogleLoading(true);
              void beginWebGoogleOAuth("login").catch((error: unknown) => {
                setGoogleNotice(googleErrorMessage(error, t("googleSignInFailed")));
                setGoogleLoading(false);
              });
            }}
          />
        ) : null}
        {googleNotice ? <Text style={styles.googleNotice}>{googleNotice}</Text> : null}

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
            autoCapitalize="none"
            autoCorrect={false}
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
            autoCapitalize="none"
            autoCorrect={false}
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
          style={styles.forgotPasswordLink}
          onPress={() => router.push("/(auth)/forgot-password")}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotPasswordText}>{t("forgotPassword") || "Forgot Password?"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, authBusy && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={authBusy}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>{t("login")}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signupLink}>
          <Text style={styles.signupText}>
            {t("dontHaveAccount")}
            <Text
              style={styles.signupLinkText}
              onPress={() => {
                if (!authBusy) router.push("/(auth)/signup");
              }}
            >
              {t("signup")}
            </Text>
          </Text>
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
    height: 350, // Increased height to show more image
    width: "100%",
    position: "relative",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
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
  googleNotice: {
    width: "100%",
    color: "#B45309",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: -8,
    marginBottom: 16,
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
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    color: "#0284C7",
    fontWeight: "bold",
    fontSize: 15,
  },
});
