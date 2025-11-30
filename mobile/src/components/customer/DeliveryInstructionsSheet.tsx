import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { COLORS } from '../../utils/constants';

interface DeliveryInstructionsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const DeliveryInstructionsSheet = ({ visible, onClose }: DeliveryInstructionsSheetProps) => {
  const [selected, setSelected] = useState<string[]>([]);

  const options = [
    { id: 'door', label: 'Leave at door', icon: '🚪' },
    { id: 'guard', label: 'Leave with guard', icon: '👮' },
    { id: 'call', label: 'Avoid Calling', icon: '📞' },
    { id: 'bell', label: 'Don’t ring the bell', icon: '🔕' },
    { id: 'pet', label: 'Pet at home', icon: '🐕' },
  ];

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(item => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
               <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={styles.title}>Instructions for delivery partner</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.optionsList}>
                {options.map((option) => (
                  <TouchableOpacity 
                    key={option.id} 
                    style={styles.optionRow} 
                    onPress={() => toggleOption(option.id)}
                  >
                    <View style={styles.optionLeft}>
                      <Text style={styles.icon}>{option.icon}</Text>
                      <Text style={styles.label}>{option.label}</Text>
                    </View>
                    <View style={[styles.checkbox, selected.includes(option.id) && styles.checked]}>
                        {selected.includes(option.id) && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#EBF8FF', // Light blue bg like Figma
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeIcon: {
    fontSize: 20,
    color: COLORS.text,
    padding: 4,
  },
  optionsList: {
    gap: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 16,
    color: COLORS.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.text,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkMark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

