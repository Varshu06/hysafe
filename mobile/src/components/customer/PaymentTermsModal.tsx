import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { COLORS } from '../../utils/constants';

type PaymentTerms = 'one-time' | 'weekly' | 'monthly';

interface PaymentTermsModalProps {
  visible: boolean;
  selectedTerms?: PaymentTerms;
  onClose: () => void;
  onSelect: (terms: PaymentTerms) => void;
}

const PAYMENT_TERMS_OPTIONS: { value: PaymentTerms; label: string; description: string }[] = [
  { value: 'one-time', label: 'Pay Per Order', description: 'Pay for each order' },
  { value: 'weekly', label: 'Weekly', description: 'Pay weekly' },
  { value: 'monthly', label: 'Monthly', description: 'Pay monthly' },
];

export const PaymentTermsModal: React.FC<PaymentTermsModalProps> = ({
  visible,
  selectedTerms,
  onClose,
  onSelect,
}) => {
  const handleSelect = (terms: PaymentTerms) => {
    onSelect(terms);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Select Payment Terms</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.85}>
                  <Feather name="x" size={18} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {PAYMENT_TERMS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionCard,
                      selectedTerms === option.value && styles.optionCardSelected,
                    ]}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionLabel,
                          selectedTerms === option.value && styles.optionLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionDescription,
                          selectedTerms === option.value && styles.optionDescriptionSelected,
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                    {selectedTerms === option.value && (
                      <View style={styles.selectedIndicator}>
                        <Feather name="check" size={16} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.infoBox}>
                <Feather name="info" size={14} color={COLORS.primary} />
                <Text style={styles.infoText}>
                  You can change payment terms anytime from your profile settings.
                </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
  },
  headerRow: {
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
  closeButton: {
    padding: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionCardSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: COLORS.primary,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  optionDescriptionSelected: {
    color: COLORS.primary,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E0F2FE',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
    lineHeight: 18,
  },
});


