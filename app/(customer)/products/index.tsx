import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "../../../src/components/customer/ProductCard";
import { useCart } from "../../../src/context/CartContext";
import { useProduct } from "../../../src/context/ProductContext";
import { COLORS } from "../../../src/utils/constants";
import { t } from "i18next";
import { Product } from "@/types/product.types";
const PAGE_SIZE = 5;

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addToCart, removeFromCart, getQuantity, getTotalItems } = useCart();
  const { products, loading, refreshing, error, refreshProducts } = useProduct();

  const [page, setPage] = useState(1);
  const [moreProducts, setMoreProducts] = useState<Product[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(true);

  useFocusEffect(
    useCallback(() => {
      refreshProducts(PAGE_SIZE);
    }, [refreshProducts]),
  );

  const loadMore = async () => {
    if (loadingMore || loading || !hasNext) {
      return;
    }

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const response = await getProducts(nextPage, PAGE_SIZE);
      setMoreProducts((prev) => [...prev, ...response.data]);
      setPage(nextPage);
      setHasNext(response.hasNext);
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setHasNext(true);
    setPage(1);
    setMoreProducts([]);
    refreshProducts(PAGE_SIZE);
  };

  const toggleSelection = (product: Product) => {
    const isInCart = getQuantity(product.id) > 0;
    if (isInCart) {
      removeFromCart(product.id);
    } else {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        volume: product.volume,
        deliveryCharge: product.deliveryCharge || 0,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.push("/(customer)")}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("products")}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.row}>
          {PRODUCTS.map((product) => {
            const isInCart = getQuantity(product.id) > 0;
            return (
              <ProductCard
                key={product.id}
                item={product}
                selected={isInCart}
                onSelect={() => toggleSelection(product)}
              />
            );
          })}
        </View>
      </ScrollView> */}
      <FlatList
        data={[...products, ...moreProducts]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            key={item.id}
            item={item}
            selected={getQuantity(item.id) > 0}
            onSelect={() => toggleSelection(item)}
          />
        )}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={
          loading && page > 1 ? (
            <ActivityIndicator size="large" style={{ marginVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <Text
              style={{
                textAlign: "center",
                marginTop: 50,
              }}
            >
              No Products Found
            </Text>
          ) : null
        }
      />

      {getTotalItems() > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <Text style={styles.itemsCount}>
              {getTotalItems()} {getTotalItems() === 1 ? t("item") : t("items")}
            </Text>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => router.push("/(customer)/checkout")}
            >
              <Text style={styles.nextText}>{t("viewitem")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F9FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#F0F9FF",
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
    left: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
    position: "absolute",
    right: 16,
  },
  grid: {
    padding: 20,
    paddingBottom: 100,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0F172A",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemsCount: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nextText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
