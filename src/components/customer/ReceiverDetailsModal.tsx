import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS } from '../../utils/constants';

interface ReceiverDetailsModalProps {
  visible: boolean;
  initialName?: string;
  initialPhone?: string; // 10-digit (no country code)
  onClose: () => void;
  onConfirm: (payload: { name: string; phone: string }) => void;
}

export const ReceiverDetailsModal: React.FC<ReceiverDetailsModalProps> = ({
  visible,
  initialName,
  initialPhone,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState(initialName || '');
  const [phone, setPhone] = useState(initialPhone || '');

  useEffect(() => {
    if (visible) {
      setName(initialName || '');
      setPhone(initialPhone || '');
    }
  }, [visible, initialName, initialPhone]);

  const handleConfirm = () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.replace(/\s+/g, '').trim();

    if (!trimmedName) return;
    if (trimmedPhone.length < 10) return;

    onConfirm({ name: trimmedName, phone: trimmedPhone });
    onClose();
  };

  const isValid = name.trim().length > 0 && phone.replace(/\s+/g, '').trim().length >= 10;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.centerWrap}
          >
            <TouchableWithoutFeedback>
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.title}>Update Receiver’s Details</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
                    <Feather name="x" size={18} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrap}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Receiver Name"
                    placeholderTextColor={COLORS.textLight}
                    style={styles.input}
                    returnKeyType="next"
                  />
                  {!!name && (
                    <TouchableOpacity onPress={() => setName('')} style={styles.clearButton} activeOpacity={0.8}>
                      <Feather name="x" size={16} color={COLORS.textLight} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputWrap}>
                  <TextInput
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
                    placeholder="Receiver Number"
                    placeholderTextColor={COLORS.textLight}
                    style={styles.input}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                  {!!phone && (
                    <TouchableOpacity onPress={() => setPhone('')} style={styles.clearButton} activeOpacity={0.8}>
                      <Feather name="x" size={16} color={COLORS.textLight} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.confirmButton, !isValid && styles.confirmButtonDisabled]}
                  onPress={handleConfirm}
                  activeOpacity={0.9}
                  disabled={!isValid}
                >
                  <Text style={styles.confirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  centerWrap: {
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#E0F2FE',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#EBF8FF',
    borderWidth: 2,
    borderColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    paddingRight: 44,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    marginTop: 6,
    backgroundColor: '#102841',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
});


