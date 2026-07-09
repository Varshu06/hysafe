import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { t } from "i18next";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ActiveOrderCardProps {
  order: {
    id: string;
    status: string;
    driverName: string;
    progress: number; // 0 to 1 representing delivery progress
    timeline: { status: string; completed: boolean; current?: boolean }[];
  };
}

export const ActiveOrderCard = ({ order }: ActiveOrderCardProps) => {
  const animationProgress = useRef(new Animated.Value(0)).current;
  const [timelineWidth, setTimelineWidth] = useState(0);

  // Measure the actual timeline width
  const onTimelineLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTimelineWidth(width);
  };

  useEffect(() => {
    if (timelineWidth === 0) return;

    // Set initial progress based on order status
    const initialProgress = order.progress || 0;
    animationProgress.setValue(initialProgress);

    // Animate from current progress to 1 (if not already at 1)
    if (initialProgress < 1) {
      const animation = Animated.timing(animationProgress, {
        toValue: 1,
        duration: (1 - initialProgress) * 10000, // Scale duration based on remaining progress
        easing: Easing.linear,
        useNativeDriver: false, // Need false for width animation
      });

      animation.start();

      return () => {
        animation.stop();
      };
    }
  }, [timelineWidth, order.progress]);

  // Calculate the travel distance
  // Truck is 32px wide, delivery dot is 24px wide at the right edge
  // Truck should end up centered over the delivery dot
  // Timeline width - truck width (32) + small offset to center over delivery dot
  const travelDistance = timelineWidth - 32 - 4; // Stop with truck centered over delivery dot

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
          {order.timeline?.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View
                style={[
                  styles.dot,
                  item.completed ? styles.completedDot : styles.pendingDot,
                  item.current && styles.currentDot,
                ]}
              >
                {item.completed && (
                  <Feather name="check" size={12} color="white" />
                )}
              </View>
              <Text style={styles.timelineLabel}>{t(item.status)}</Text>
            </View>
          )) || (
            <>
              <View style={styles.timelineItem}>
                <View style={[styles.dot, styles.completedDot]}>
                  <Feather name="check" size={12} color="white" />
                </View>
                <Text style={styles.timelineLabel}>{t("picked")}</Text>
              </View>
              <View style={styles.timelineItem}>
                <View style={styles.spacer} />
              </View>
              <View style={styles.timelineItem}>
                <View style={[styles.dot, styles.pendingDot]} />
                <Text style={styles.timelineLabel}>{t("delivered")}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.driverName}>{t(order.driverName)}</Text>
        <TouchableOpacity style={styles.callButton}>
          <Feather name="phone" size={18} color="white" />
        </TouchableOpacity>
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
    backgroundColor: "#3B82F6",
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
    alignItems: "center",
    zIndex: 1,
  },
  spacer: {
    width: 32,
    height: 32,
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
  completedDot: {
    backgroundColor: "#3B82F6",
  },
  pendingDot: {
    backgroundColor: "white",
    borderWidth: 3,
    borderColor: "#334155",
  },
  currentDot: {
    backgroundColor: "#60A5FA",
    borderWidth: 3,
    borderColor: "#3B82F6",
  },
  timelineLabel: {
    color: "white",
    fontSize: 12,
    width: 70,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  driverName: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
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
