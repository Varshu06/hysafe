import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/constants';

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active ? styles.activeChip : styles.inactiveChip]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <Text style={[styles.text, active ? styles.activeText : styles.inactiveText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  activeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  inactiveChip: {
    backgroundColor: COLORS.secondary,
    borderColor: '#E2E8F0',
  },
  text: {
    fontSize: 12,
    fontWeight: '900',
  },
  activeText: {
    color: COLORS.secondary,
  },
  inactiveText: {
    color: COLORS.text,
  },
});







