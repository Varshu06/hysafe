import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { CartItem } from '../../context/CartContext';
import { COLORS } from '../../utils/constants';

interface BillDetailsModalProps {
  visible: boolean;
  items: CartItem[];
  onClose: () => void;
  deliveryFee?: number;
}

export const BillDetailsModal: React.FC<BillDetailsModalProps> = ({ visible, items, onClose, deliveryFee = 0 }) => {
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  }, [items]);

  const total = subtotal + (deliveryFee || 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.wrap}>
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.title}>Bill Details</Text>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeBtn}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Close bill details"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="x" size={18} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                  {items.map((it) => (
                    <View key={it.id} style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {it.name}
                        </Text>
                        <Text style={styles.itemMeta}>
                          ₹{it.price} × {it.quantity}
                        </Text>
                      </View>
                      <Text style={styles.itemAmount}>₹{it.price * it.quantity}</Text>
                    </View>
                  ))}

                  <View style={styles.divider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>₹{subtotal}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery</Text>
                    <Text style={styles.summaryValue}>{deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>₹{total}</Text>
                  </View>
                </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  wrap: {
    position: 'relative',
  },
  card: {
    backgroundColor: '#E0F2FE',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    maxHeight: 520,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191, 219, 254, 0.7)',
  },
  itemLeft: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102841',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#102841',
  },
  divider: {
    height: 1,
    backgroundColor: '#BFDBFE',
    marginTop: 12,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
});









