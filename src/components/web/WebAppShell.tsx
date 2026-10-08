import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../utils/constants";
import { emitAppResume } from "../../utils/appResume";
import { socketService } from "../../services/socket.service";

const INSTALL_DISMISS_KEY = "hysafe-install-dismissed";

type InstallMode = "hidden" | "ios-safari" | "ios-other" | "prompt" | "manual";

function detectInstallMode(): InstallMode {
  if (typeof window === "undefined" || Platform.OS !== "web") return "hidden";
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
  if (standalone) return "hidden";

  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS) {
    const inAppBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return inAppBrowser ? "ios-other" : "ios-safari";
  }
  const canInstallFromMenu = /Chrome|Chromium|Edg\/|SamsungBrowser/.test(ua) && !/OPR\//.test(ua);
  return canInstallFromMenu ? "manual" : "hidden";
}

export function WebAppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [installMode, setInstallMode] = useState<InstallMode>("hidden");
  const [installEvent, setInstallEvent] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const syncOnline = () => setOffline(!window.navigator.onLine);
    const resume = () => {
      if (document.visibilityState === "hidden") return;
      void socketService.connect();
      emitAppResume();
      syncOnline();
    };

    syncOnline();
    setInstallMode(window.localStorage.getItem(INSTALL_DISMISS_KEY) === "1" ? "hidden" : detectInstallMode());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event);
      if (window.localStorage.getItem(INSTALL_DISMISS_KEY) !== "1") setInstallMode("prompt");
    };
    const onInstalled = () => setInstallMode("hidden");
    const onUpdate = () => setUpdateReady(true);

    window.addEventListener("online", resume);
    window.addEventListener("offline", syncOnline);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("hysafe-sw-update", onUpdate);

    return () => {
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", syncOnline);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("hysafe-sw-update", onUpdate);
    };
  }, []);

  if (Platform.OS !== "web") return <>{children}</>;

  const dismissInstall = () => {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setInstallMode("hidden");
  };

  return (
    <View style={styles.frame}>
      {offline ? (
        <View style={[styles.banner, styles.offlineBanner, { paddingTop: Math.max(insets.top, 8) }]}>
          <Text style={styles.bannerTitle}>{t("webOfflineTitle")}</Text>
          <Text style={styles.bannerBody}>{t("webOfflineBody")}</Text>
        </View>
      ) : null}
      {updateReady ? (
        <View style={styles.banner}>
          <Text style={styles.bannerBody}>{t("webUpdateReady")}</Text>
          <Pressable accessibilityRole="button" onPress={() => window.location.reload()} style={styles.bannerButton}>
            <Text style={styles.bannerButtonText}>{t("webReload")}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.content}>{children}</View>
      {installMode !== "hidden" ? (
        <View style={[styles.installCard, { bottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.installTitle}>{t("webInstallTitle")}</Text>
          <Text style={styles.bannerBody}>
            {installMode === "ios-safari"
              ? t("webInstallIosSafari")
              : installMode === "ios-other"
                ? t("webInstallIosOther")
                : installMode === "prompt"
                  ? t("webInstallPrompt")
                  : t("webInstallManual")}
          </Text>
          <View style={styles.installActions}>
            {installMode === "prompt" && installEvent ? (
              <Pressable
                accessibilityRole="button"
                style={styles.bannerButton}
                onPress={async () => {
                  await installEvent.prompt();
                  setInstallMode("hidden");
                }}
              >
                <Text style={styles.bannerButtonText}>{t("webInstallAction")}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={dismissInstall} style={styles.dismissButton}>
              <Text style={styles.dismissText}>{t("webInstallDismiss")}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    backgroundColor: COLORS.accent,
  },
  content: { flex: 1 },
  banner: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#BAE6FD",
  },
  offlineBanner: { backgroundColor: "#FEF3C7" },
  bannerTitle: { color: COLORS.text, fontWeight: "800", marginBottom: 2 },
  bannerBody: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  bannerButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  bannerButtonText: { color: "#FFFFFF", fontWeight: "700" },
  installCard: {
    position: "absolute",
    left: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 14,
  },
  installTitle: { color: COLORS.text, fontWeight: "800", fontSize: 16, marginBottom: 4 },
  installActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  dismissButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  dismissText: { color: COLORS.primary, fontWeight: "700" },
});
