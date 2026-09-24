import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../utils/constants";
import { Button } from "../ui/Button";

export type PaymentMethod = "offline" | "cash" | "shop";
type Props = {
  visible: boolean;
  paymentMethod: PaymentMethod;
  isRecurring?: boolean;
  codAmount?: number;
  onClose: () => void;
  onConfirm: (payload: {
    codCollected: boolean;
    notes?: string;
    paymentMethod: PaymentMethod;
    collectedPaymentMethod?: 'cash' | 'shop';
  }) => void;
};

export function DeliveryConfirmModal({
  visible,
  paymentMethod,
  isRecurring = false,
  codAmount = 0,
  onClose,
  onConfirm,
}: Props) {
  const isCOD = true;
  const [codCollected, setCodCollected] = useState(!isCOD);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [collectedPaymentMethod, setCollectedPaymentMethod] = useState<'cash' | 'shop' | null>(
    paymentMethod === 'cash' || paymentMethod === 'shop' ? paymentMethod : null,
  );

  const effectiveCollectionMethod = paymentMethod === 'cash' || paymentMethod === 'shop'
    ? paymentMethod
    : collectedPaymentMethod;
  const canConfirm = useMemo(() => {
    return codCollected && (!isRecurring || Boolean(effectiveCollectionMethod));
  }, [codCollected, isRecurring, effectiveCollectionMethod]);

  useEffect(() => {
    setCodCollected(!isCOD);
    setError("");
    setNotes("");
    setCollectedPaymentMethod(paymentMethod === 'cash' || paymentMethod === 'shop' ? paymentMethod : null);
  }, [isCOD, paymentMethod, visible]);

  const handleConfirm = () => {
    if (!codCollected) {
      setError("Confirm payment collection before marking delivered.");
      return;
    }
    if (isRecurring && !effectiveCollectionMethod) {
      setError("Select the method actually collected before marking delivered.");
      return;
    }

    onConfirm({
      codCollected,
      notes: notes.trim() ? notes.trim() : undefined,
      paymentMethod: "offline",
      collectedPaymentMethod: effectiveCollectionMethod || undefined,
    });

    setNotes("");
    setError("");
    setCodCollected(!isCOD);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirm Delivery</Text>
          <Text style={styles.subtitle}>
            {`Amount to collect: ₹${codAmount || 0}`}
          </Text>
          <View style={{ marginBottom: 12 }}>
            {/* Cash On Delivery */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: COLORS.primary,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: COLORS.primary,
                  }}
                />
              </View>

              <Text style={{ fontWeight: "700", color: COLORS.text }}>{effectiveCollectionMethod === "shop" ? "Pay at Shop" : effectiveCollectionMethod === "cash" || !isRecurring ? "Cash on Delivery" : "Payment method not recorded"}</Text>
            </View>
          </View>
          {isRecurring && paymentMethod !== 'cash' && paymentMethod !== 'shop' && <View style={styles.methodRow}>{(['cash', 'shop'] as const).map(method => <TouchableOpacity key={method} style={[styles.methodOption, collectedPaymentMethod === method && styles.methodOptionSelected]} onPress={() => setCollectedPaymentMethod(method)}><Text style={styles.checkText}>{method === 'cash' ? 'Cash on Delivery' : 'Pay at Shop'}</Text></TouchableOpacity>)}</View>}
          {
            <TouchableOpacity
              style={styles.checkRow}
              activeOpacity={0.85}
              onPress={() => setCodCollected((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={paymentMethod === "shop" ? "Confirm shop payment received" : "Confirm cash collected"}
            >
              <Feather
                name={codCollected ? "check-square" : "square"}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.checkText}>{effectiveCollectionMethod === "shop" ? "Payment received at shop" : "Cash collected"}</Text>
            </TouchableOpacity>
          }
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={COLORS.textLight}
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          <View style={styles.row}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Button
              title="Mark Delivered"
              variant="success"
              disabled={!canConfirm}
              onPress={handleConfirm}
              style={styles.confirmBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: "700",
    marginBottom: 12,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  methodOption: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10 },
  methodOptionSelected: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  checkText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  input: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    backgroundColor: "#F8FAFC",
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: COLORS.secondary,
  },
  cancelText: {
    fontWeight: "800",
    color: COLORS.text,
  },
  confirmBtn: {
    flex: 1,
  },
  errorText: {
    marginTop: 6,
    marginBottom: 10,
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },
});
