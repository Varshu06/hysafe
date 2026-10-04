import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../utils/constants";

interface ActiveOrderCardProps {
  order: {
    id: string;
    status: string;
    productName: string;
    quantity: number | null;
    totalAmount: number;
    partnerAssigned: boolean;
    partnerName: string;
    partnerPhone: string;
    progress: number; // 0 to 1 representing delivery progress
    timeline: { status: string; completed: boolean; current?: boolean }[];
  };
}

export const ActiveOrderCard = ({ order }: ActiveOrderCardProps) => {
  const { t } = useTranslation();
  const animationProgress = useRef(new Animated.Value(order.progress)).current;
  const [timelineWidth, setTimelineWidth] = useState(0);

  // Measure the actual timeline width
  const onTimelineLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTimelineWidth(width);
  };

  useEffect(() => {
    if (timelineWidth === 0) return;

    const animation = Animated.timing(animationProgress, {
      toValue: Math.max(0, Math.min(1, order.progress)),
      duration: 350,
      useNativeDriver: false,
    });
    animation.start();

    return () => animation.stop();
  }, [timelineWidth, order.progress, animationProgress]);

  // Align the truck center with the first/last dot centers (12px inset).
  const travelDistance = Math.max(0, timelineWidth - 24);

  // Interpolate truck position
  const truckTranslateX = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travelDistance],
    extrapolate: "clamp",
  });

  // Progress line should end at the delivery dot (not go past it)
  // Line starts at left: 12, so max width should reach the delivery dot center
  const progressLineWidth = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, timelineWidth - 24], // Stop at the delivery dot position
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("waterCanOnItsWay")}</Text>
        <TouchableOpacity>
          <Feather name="link" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.timeline} onLayout={onTimelineLayout}>
        {/* Background line */}
        <View style={styles.line} />

        {/* Animated Progress line (blue) - follows the truck */}
        <Animated.View
          style={[styles.progressLine, { width: progressLineWidth }]}
        />

        {/* Animated truck on the line */}
        <Animated.View
          style={[
            styles.truckContainer,
            {
              transform: [{ translateX: truckTranslateX }],
            },
          ]}
        >
          <View style={styles.truckIcon}>
            <MaterialCommunityIcons
              name="truck-delivery"
              size={18}
              color="#0F172A"
            />
          </View>
        </Animated.View>

        <View style={styles.timelineItems}>
          {order.timeline.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View
                style={[
                  styles.dot,
                  item.completed
                    ? item.status === "delivered"
                      ? styles.deliveredDot
                      : styles.acceptedDot
                    : styles.pendingDot,
                  item.current &&
                    (item.status === "delivered"
                      ? styles.deliveredCurrentDot
                      : styles.acceptedCurrentDot),
                ]}
              >
                {item.completed && (
                  <Feather name="check" size={12} color="white" />
                )}
              </View>
              <Text style={styles.timelineLabel} numberOfLines={2}>{t(item.status)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.productName} numberOfLines={1}>{order.productName}</Text>
        <Text style={styles.orderDetailText}>
          {t("quantity")}: {order.quantity ?? "—"}
        </Text>
        <Text style={styles.totalAmount}>
          {t("totalAmount")}: ₹{order.totalAmount}
        </Text>

        <View style={styles.partnerSection}>
          <Text style={styles.partnerLabel}>{t("deliveryPartner")}</Text>
          {order.partnerAssigned ? (
            <>
              {order.partnerName ? (
                <Text style={styles.partnerName} numberOfLines={1}>
                  {order.partnerName}
                </Text>
              ) : null}
              {order.partnerPhone ? (
                <View style={styles.partnerPhoneRow}>
                  <Text style={styles.partnerPhone}>{order.partnerPhone}</Text>
                  <TouchableOpacity
                    style={styles.callButton}
                    accessibilityRole="button"
                    accessibilityLabel={t("call")}
                    onPress={() => {
                      void Linking.openURL(`tel:${order.partnerPhone}`).catch(() => undefined);
                    }}
                  >
                    <Feather name="phone" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ) : null}
              {!order.partnerName && !order.partnerPhone ? (
                <Text style={styles.waitingText}>{t("partnerDetailsUnavailable")}</Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.waitingText}>{t("waitingForDeliveryPartner")}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
    lineHeight: 24,
    paddingVertical: 2,
  },
  timeline: {
    marginBottom: 24,
    position: "relative",
    height: 60,
  },
  line: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    zIndex: 0,
  },
  progressLine: {
    position: "absolute",
    top: 12,
    left: 12,
    height: 3,
    backgroundColor: COLORS.statusAccepted,
    borderRadius: 2,
    zIndex: 1,
  },
  truckContainer: {
    position: "absolute",
    top: -4,
    left: -4, // Offset to align truck center with dot center
    zIndex: 10, // Higher than dots to cover them
  },
  truckIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#60A5FA",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  timelineItems: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 4,
  },
  timelineItem: {
    width: 24,
    alignItems: "center",
    zIndex: 1,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#334155",
    marginBottom: 8,
  },
  acceptedDot: {
    backgroundColor: COLORS.statusAccepted,
  },
  deliveredDot: {
    backgroundColor: COLORS.statusDelivered,
  },
  pendingDot: {
    backgroundColor: "white",
    borderWidth: 3,
    borderColor: "#334155",
  },
  acceptedCurrentDot: {
    backgroundColor: COLORS.statusAccepted,
    borderWidth: 3,
    borderColor: "#93C5FD",
  },
  deliveredCurrentDot: {
    backgroundColor: COLORS.statusDelivered,
    borderWidth: 3,
    borderColor: "#86EFAC",
  },
  timelineLabel: {
    color: "white",
    fontSize: 12,
    width: 88,
    textAlign: "center",
    lineHeight: 18,
    paddingVertical: 1,
  },
  footer: {
    marginTop: 2,
  },
  productName: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  orderDetailText: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 19,
  },
  totalAmount: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  partnerSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    marginTop: 10,
    paddingTop: 8,
  },
  partnerLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  partnerName: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  partnerPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 32,
  },
  partnerPhone: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 19,
  },
  waitingText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
});
