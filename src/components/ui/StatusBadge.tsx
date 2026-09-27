import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { COLORS } from "../../utils/constants";
import { useTranslation } from "react-i18next";

export type StatusType =
  | "pending"
  | "accepted"
  | "picked"
  | "transit"
  | "delivered"
  | "missed"
  | "cancelled";

interface StatusBadgeProps {
  status: StatusType | string;
  style?: ViewStyle;
}

const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return {
        color: COLORS.statusPending,
        bgColor: COLORS.statusPendingBackground,
        label: "pending",
      };
    case "accepted":
      return {
        color: COLORS.statusAccepted,
        bgColor: COLORS.statusAcceptedBackground,
        label: "accepted",
      };
    case "out_for_delivery":
      return {
        color: COLORS.statusAccepted,
        bgColor: COLORS.statusAcceptedBackground,
        label: "out_for_delivery",
      };
    case "transit":
    case "on_the_way":
      return {
        color: COLORS.statusAccepted,
        bgColor: COLORS.statusAcceptedBackground,
        label: "on_the_way",
      };
    case "picked":
      return { color: "#8B5CF6", bgColor: "#EDE9FE", label: "picked" };
    case "delivered":
      return {
        color: COLORS.statusDelivered,
        bgColor: COLORS.statusDeliveredBackground,
        label: "delivered",
      };
    case "missed":
      return { color: COLORS.error, bgColor: "#FEE2E2", label: "missed" };
    case "cancelled":
      return {
        color: COLORS.textLight,
        bgColor: "#F3F4F6",
        label: "cancelled",
      };
    default:
      return { color: COLORS.textLight, bgColor: "#F3F4F6", label: status };
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const { t } = useTranslation();
  const config = getStatusConfig(status);

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }, style]}>
      <Text style={[styles.text, { color: config.color }]}>
        {t(config.label)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    textAlign: "center",
    flexShrink: 1,
    textTransform: "capitalize",
  },
});
