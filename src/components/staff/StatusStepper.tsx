import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../utils/constants';

const steps = ['accepted', 'picked', 'transit', 'delivered'] as const;

function normalize(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'in-transit') return 'transit';
  if (s === 'on_the_way' || s === 'out_for_delivery') return 'transit';
  return s;
}

export function StatusStepper({ status }: { status: string }) {
  const s = normalize(status);
  const idx = Math.max(0, steps.indexOf(s as any));
  return (
    <View style={styles.row}>
      {steps.map((step, i) => {
        const done = i <= idx;
        const label = step === 'accepted' ? 'Accepted' : step === 'picked' ? 'Picked' : step === 'transit' ? 'Transit' : 'Delivered';
        return (
          <View key={step} style={styles.step}>
            <View style={[styles.dot, done ? styles.dotOn : styles.dotOff]} />
            <Text style={[styles.label, done ? styles.labelOn : styles.labelOff]}>{label}</Text>
            {i < steps.length - 1 ? <View style={[styles.line, i < idx ? styles.lineOn : styles.lineOff]} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
    borderWidth: 2,
  },
  dotOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dotOff: {
    backgroundColor: COLORS.secondary,
    borderColor: '#CBD5E1',
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
  },
  labelOn: {
    color: COLORS.text,
  },
  labelOff: {
    color: '#94A3B8',
  },
  line: {
    position: 'absolute',
    top: 5,
    right: -1,
    width: '100%',
    height: 2,
    zIndex: -1,
  },
  lineOn: {
    backgroundColor: COLORS.primary,
  },
  lineOff: {
    backgroundColor: '#E2E8F0',
  },
});







