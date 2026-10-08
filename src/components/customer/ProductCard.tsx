import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../utils/constants";
import { Product } from "@/types/product.types";
import { ProductImages } from "@/data/dummy";
import { normalizeImageSource } from "../../utils/image";
import { useTranslation } from "react-i18next";

interface ProductCardProps {
  item: Product;
  selected?: boolean;
  onSelect?: () => void;
}

export const ProductCard = ({ item, selected, onSelect }: ProductCardProps) => {
  const { t } = useTranslation();
  const availabilityState = item.comingSoon
    ? "coming_soon"
    : item.available !== true || Number(item.quantity) < 1
      ? "unavailable"
      : item.availabilityState || "available";
  const isOrderable = availabilityState === "available";
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const prevSelectedRef = useRef(selected);

  useEffect(() => {
    // Only animate if item just changed from not selected to selected
    if (!prevSelectedRef.current && selected) {
      setShouldAnimate(true);
    }
    prevSelectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if (shouldAnimate) {
      // Animate when item is added
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldAnimate(false);
      });
    }
  }, [shouldAnimate]);
  
  const getProductImage = (volume?: string) => {
    const key = String(volume || "20l").toLowerCase();
    return (
      ProductImages[key as keyof typeof ProductImages] || ProductImages["20l"]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, selected && isOrderable && styles.selectedCard, !isOrderable && styles.unavailableCard]}
      onPress={isOrderable ? onSelect : undefined}
      disabled={!isOrderable}
      activeOpacity={0.8}
    >
      {selected && isOrderable && (
        <Animated.View
          style={[
            styles.checkIcon,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.checkText}>✓</Text>
        </Animated.View>
      )}
      <View style={styles.imageContainer}>
        <Image
          source={normalizeImageSource(item.image) || getProductImage(item.volume)}
          style={[styles.productImage, !isOrderable && styles.dimmedImage]}
          resizeMode="contain"
        />
        {!isOrderable && (
          <View style={styles.availabilityBadge}>
            <Text style={styles.availabilityText}>
              {availabilityState === "coming_soon" ? t("comingSoon") : t("unavailableLabel")}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.name, !isOrderable && styles.dimmedText]}>{item.name}</Text>

      <View style={styles.priceRow}>
        <Text style={[styles.price, !isOrderable && styles.dimmedText]}>₹ {item.price}</Text>
        <View style={styles.deliveryBadge}>
          <Text style={styles.deliveryText}>🚚 {item.deliveryCharge === 0 ? 'Free' : `₹${item.deliveryCharge}`}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    width: "48%",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedCard: {
    borderColor: COLORS.primary,
    backgroundColor: "#F0F9FF",
  },
  unavailableCard: {
    backgroundColor: "#F8FAFC",
  },
  checkIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  checkText: {
    color: "white",
    fontSize: 10,
  },
  imageContainer: {
    height: 100,
    width: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  dimmedImage: {
    opacity: 0.45,
  },
  availabilityBadge: {
    position: "absolute",
    top: 6,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  availabilityText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  dimmedText: {
    color: COLORS.textLight,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
    textAlign: "center",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    justifyContent: "center",
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
  },
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  deliveryText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  dualPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  priceOption: {
    flex: 1,
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  priceDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  regularPrice: {
    color: COLORS.textLight,
    textDecorationLine: "line-through",
  },
  bulkPrice: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  minQuantityText: {
    fontSize: 8,
    color: COLORS.textLight,
    marginTop: 2,
    fontWeight: "500",
  },
  savingsText: {
    fontSize: 8,
    color: COLORS.success,
    fontWeight: "600",
    marginTop: 2,
  },
});
