import { Feather, Ionicons } from '@expo/vector-icons';
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
import { COLORS } from '../../utils/constants';

export interface SavedAddressItem {
  id: string;
  type: string; // Home/Office/Work/etc.
  address: string; // short
  fullAddress?: string;
}

interface AddressPickerModalProps {
  visible: boolean;
  addresses: SavedAddressItem[];
  selectedId?: string | null;
  onClose: () => void;
  onSelect: (addr: SavedAddressItem) => void;
  onAddNew: () => void;
}

export const AddressPickerModal: React.FC<AddressPickerModalProps> = ({
  visible,
  addresses,
  selectedId,
  onClose,
  onSelect,
  onAddNew,
}) => {
  const list = useMemo(() => addresses || [], [addresses]);

  const getIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('home')) return <Feather name="home" size={18} color="#102841" />;
    if (t.includes('office') || t.includes('work')) return <Ionicons name="business-outline" size={18} color="#102841" />;
    return <Ionicons name="navigate-outline" size={18} color="#102841" />;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.wrap}>
              <View style={styles.card}>
                <View style={styles.headerBar}>
                  <Text style={styles.headerTitle}>Add Address</Text>
                  <TouchableOpacity
                    onPress={onAddNew}
                    style={styles.headerIconBtn}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Add new address"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="plus" size={18} color="white" />
                  </TouchableOpacity>
                </View>

                <View style={styles.sectionDivider}>
                  <View style={styles.sectionLine} />
                  <Text style={styles.sectionText}>Saved Address</Text>
                  <View style={styles.sectionLine} />
                </View>

                <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                  {list.map((addr) => {
                    const active = addr.id === selectedId;
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[styles.row, active && styles.rowActive]}
                        activeOpacity={0.85}
                        onPress={() => {
                          onSelect(addr);
                          onClose();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${addr.type} address`}
                      >
                        <View style={styles.rowLeft}>
                          <View style={styles.iconWrap}>{getIcon(addr.type)}</View>
                          <View style={styles.textWrap}>
                            <Text style={styles.type}>{addr.type}</Text>
                            <Text style={styles.addr} numberOfLines={1}>
                              {addr.address}
                            </Text>
                          </View>
                        </View>
                        {active ? (
                          <View style={styles.checkWrap}>
                            <Feather name="check" size={16} color="#102841" />
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}

                  {list.length === 0 ? (
                    <View style={styles.empty}>
                      <Text style={styles.emptyTitle}>No saved addresses</Text>
                    </View>
                  ) : null}

                  {/* Always show an explicit add button */}
                  <TouchableOpacity
                    onPress={onAddNew}
                    style={styles.addBtn}
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Add new address"
                  >
                    <Text style={styles.addBtnText}>Add new address</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Close button is outside the clipped card so it stays visible */}
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeFloating}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Close address picker"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={18} color="white" />
              </TouchableOpacity>
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
    overflow: 'hidden', // keep rounded corners for header/list
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerBar: {
    backgroundColor: '#102841',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#BFDBFE',
  },
  sectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    opacity: 0.9,
  },
  list: {
    maxHeight: 320,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowActive: {
    borderColor: '#102841',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: { flex: 1 },
  type: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102841',
    marginBottom: 2,
  },
  addr: {
    fontSize: 12,
    color: '#64748B',
  },
  checkWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#102841',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  addBtn: {
    backgroundColor: '#102841',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 6,
  },
  addBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },
  closeFloating: {
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#102841',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0F2FE',
  },
});


