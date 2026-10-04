import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/constants';
import { Button } from '../ui/Button';

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  confirmText?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function ReasonModal({
  visible,
  title,
  placeholder = 'Type a reason...',
  confirmText = 'Confirm',
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');
  const canSubmit = useMemo(() => reason.trim().length >= 3, [reason]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textLight}
            style={styles.input}
            multiline
            numberOfLines={4}
          />

          <View style={styles.row}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Button
              title={confirmText}
              variant="primary"
              onPress={() => {
                const r = reason.trim();
                if (!r) return;
                onConfirm(r);
                setReason('');
              }}
              disabled={!canSubmit}
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
    marginBottom: 10,
  },
  input: {
    minHeight: 92,
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







