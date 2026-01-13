import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/constants';
import { Button } from '../ui/Button';

type Props = {
  visible: boolean;
  paymentMethod: 'online' | 'offline' | string;
  codAmount?: number;
  onClose: () => void;
  onConfirm: (payload: { codCollected: boolean; notes?: string }) => void;
};

export function DeliveryConfirmModal({ visible, paymentMethod, codAmount = 0, onClose, onConfirm }: Props) {
  const isCOD = String(paymentMethod || '').toLowerCase() === 'offline';
  const [codCollected, setCodCollected] = useState(!isCOD);
  const [notes, setNotes] = useState('');

  const canConfirm = useMemo(() => (isCOD ? codCollected : true), [isCOD, codCollected]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirm Delivery</Text>
          <Text style={styles.subtitle}>
            {isCOD ? `COD to collect: ₹${codAmount || 0}` : 'UPI/Online payment'}
          </Text>

          {isCOD ? (
            <TouchableOpacity
              style={styles.checkRow}
              activeOpacity={0.85}
              onPress={() => setCodCollected((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Toggle cash collected"
            >
              <Feather name={codCollected ? 'check-square' : 'square'} size={20} color={COLORS.primary} />
              <Text style={styles.checkText}>Cash collected</Text>
            </TouchableOpacity>
          ) : null}

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
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Button
              title="Mark Delivered"
              variant="success"
              disabled={!canConfirm}
              onPress={() => {
                onConfirm({ codCollected, notes: notes.trim() ? notes.trim() : undefined });
                setNotes('');
                setCodCollected(!isCOD);
              }}
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
    backgroundColor: 'rgba(2,6,23,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '700',
    marginBottom: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  checkText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  input: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: COLORS.secondary,
  },
  cancelText: {
    fontWeight: '800',
    color: COLORS.text,
  },
  confirmBtn: {
    flex: 1,
  },
});







