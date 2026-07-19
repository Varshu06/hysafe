import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../../src/components/ui/Button";
import { COLORS } from "../../../src/utils/constants";

type PaymentMethodValue = "online" | "offline";

const PAYMENT_METHOD_KEY = "@hysafe_default_payment_method";

export default function PaymentMethodsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const returnTo =
    typeof params.returnTo === "string" ? params.returnTo : undefined;

  const [selected, setSelected] = useState<PaymentMethodValue>("online"); // default to UPI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(PAYMENT_METHOD_KEY);
        if (stored === "online" || stored === "offline") {
          setSelected(stored);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(PAYMENT_METHOD_KEY, selected);
      Alert.alert(t("saved"), t("defaultPaymentMethodUpdated"), [
        {
          text: t("ok"),
          onPress: () =>
            router.replace(
              returnTo === "checkout"
                ? "/(customer)/checkout"
                : "/(customer)/profile",
            ),
        },
      ]);
    } catch (e) {
      Alert.alert(t("error"), t("couldNotSavePaymentMethod"));
    } finally {
      setSaving(false);
    }
  };

  const Option = ({
    value,
    title,
    subtitle,
    iconName,
  }: {
    value: PaymentMethodValue;
    title: string;
    subtitle: string;
    iconName: React.ComponentProps<typeof Feather>["name"];
  }) => {
    const active = selected === value;
    return (
      <TouchableOpacity
        style={[styles.optionCard, active && styles.optionCardActive]}
        onPress={() => setSelected(value)}
        activeOpacity={0.85}
        disabled={loading}
      >
        <View style={styles.optionLeft}>
          <View
            style={[
              styles.optionIconWrap,
              active && styles.optionIconWrapActive,
            ]}
          >
            <Feather
              name={iconName}
              size={18}
              color={active ? "white" : COLORS.text}
            />
          </View>
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>{title}</Text>
            <Text style={styles.optionSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
          {active ? <View style={styles.radioInner} /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() =>
            router.replace(
              returnTo === "checkout"
                ? "/(customer)/checkout"
                : "/(customer)/profile",
            )
          }
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("paymentMethods")}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t("chooseDefaultPayment")}</Text>
        <Text style={styles.sectionSubtitle}>
          {t("defaultPaymentDescription")}
        </Text>

        <Option
          value="online"
          title={t("upi")}
          subtitle={t("payUsingUpi")}
          iconName="smartphone"
        />
        <Option
          value="offline"
          title={t("cashOnDelivery")}
          subtitle={t("payAfterDelivery")}
          iconName="dollar-sign"
        />

        <Button
          title={saving ? t("saving") : t("save")}
          onPress={handleSave}
          disabled={loading || saving}
          style={styles.saveButton}
        />
      </View>
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
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 16,
    lineHeight: 18,
  },
  optionCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionCardActive: {
    borderColor: COLORS.primary,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  optionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionIconWrapActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  saveButton: {
    marginTop: 10,
  },
});
