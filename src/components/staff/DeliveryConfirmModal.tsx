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

export type PaymentMethod = "online" | "offline";
type Props = {
  visible: boolean;
  paymentMethod: PaymentMethod;
  codAmount?: number;
  onClose: () => void;
  onConfirm: (payload: {
    codCollected: boolean;
    notes?: string;
    transactionId?: string;
    paymentMethod: PaymentMethod;
  }) => void;
};

export function DeliveryConfirmModal({
  visible,
  paymentMethod,
  codAmount = 0,
  onClose,
  onConfirm,
}: Props) {
  const isCOD = String(paymentMethod || "").toLowerCase() === "offline";
  const [codCollected, setCodCollected] = useState(!isCOD);
  const [notes, setNotes] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>("offline");

  const canConfirm = useMemo(() => {
    if (paymentMode === "online") {
      return Boolean(transactionId.trim());
    }
    return codCollected;
  }, [paymentMode, transactionId, codCollected]);

  useEffect(() => {
    setPaymentMode(isCOD ? "offline" : "online");
  }, [isCOD]);

  const handleConfirm = () => {
    if (paymentMode === "online" && !transactionId.trim()) {
      setError("Transaction ID is required for online payments.");
      return;
    }

    if (paymentMode === "offline" && !codCollected) {
      setError("Confirm cash collected before marking delivered.");
      return;
    }

    onConfirm({
      codCollected: paymentMode === "online" ? true : codCollected,
      notes: notes.trim() ? notes.trim() : undefined,
      transactionId:
        paymentMode === "online" ? transactionId.trim() : undefined,
      paymentMethod: paymentMode,
    });

    setNotes("");
    setTransactionId("");
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
          {/* <Text style={styles.subtitle}>
            {isCOD
              ? `COD to collect: ₹${codAmount || 0}`
              : "UPI/Online payment"}
          </Text> */}
          <View style={{ marginBottom: 12 }}>
            {/* Online Payment */}
            <TouchableOpacity
              onPress={() => setPaymentMode("online")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 15,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                {paymentMode === "online" && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "black",
                    }}
                  />
                )}
              </View>

              <Text>Online Payment</Text>
            </TouchableOpacity>

            {/* Cash On Delivery */}
            <TouchableOpacity
              onPress={() => setPaymentMode("offline")}
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
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                {paymentMode === "offline" && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "black",
                    }}
                  />
                )}
              </View>

              <Text>Cash On Delivery</Text>
            </TouchableOpacity>
          </View>
          {paymentMode === "offline" ? (
            <TouchableOpacity
              style={styles.checkRow}
              activeOpacity={0.85}
              onPress={() => setCodCollected((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Toggle cash collected"
            >
              <Feather
                name={codCollected ? "check-square" : "square"}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.checkText}>Cash collected</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              value={transactionId}
              onChangeText={(value) => {
                setTransactionId(value);
                if (error) {
                  setError("");
                }
              }}
              placeholder="Enter Transaction ID"
              style={styles.inputTransactionId}
            />
          )}
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
  inputTransactionId: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    color: COLORS.text,
    backgroundColor: "#F8FAFC",
    textAlignVertical: "top",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
});
