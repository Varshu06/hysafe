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
      <Text
        style={[styles.text, active ? styles.activeText : styles.inactiveText]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  inactiveChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  activeText: {
    color: COLORS.secondary,
  },
  inactiveText: {
    color: COLORS.text,
  },
});







