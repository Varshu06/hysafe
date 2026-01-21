import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../utils/constants';

type Props = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function StaffHeader({ title, onBack, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.side}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={[styles.side, styles.right]}>{right || <View style={styles.placeholder} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  side: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 20,
  },
  right: {
    alignItems: 'center',
    position: 'absolute',
    right: 20,
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
});







