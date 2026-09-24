import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../utils/constants';

const steps = ['accepted', 'picked', 'transit', 'delivered'] as const;

const STEP_FALLBACKS: Record<string, string> = {
  accepted: 'Accepted',
  picked: 'Picked',
  transit: 'Transit',
  delivered: 'Delivered',
};

function normalize(status: string) {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'in-transit' || s === 'in_transit' || s === 'transit') return 'transit';
  if (s === 'on_the_way' || s === 'out_for_delivery') return 'transit';
  if (s === 'picked' || s === 'picked_up' || s === 'order_picked') return 'picked';
  if (s === 'delivered' || s === 'completed' || s === 'done') return 'delivered';
  if (s === 'accepted' || s === 'confirmed' || s === 'assigned') return 'accepted';
  return s;
}

export function StatusStepper({ status }: { status: string }) {
  const { t } = useTranslation();
  const s = normalize(status);
  const idx = steps.indexOf(s as any);

  return (
    <View style={styles.row}>
      {steps.map((step, i) => {
        const done = idx !== -1 && i <= idx;
        const lineDone = idx !== -1 && i < idx;
        const label = t(step) || STEP_FALLBACKS[step];

        return (
          <View key={step} style={styles.step}>
            {i < steps.length - 1 ? (
              <View
                style={[
                  styles.line,
                  lineDone ? styles.lineOn : styles.lineOff,
                ]}
              />
            ) : null}
            <View style={[styles.dot, done ? styles.dotOn : styles.dotOff]} />
            <Text
              style={[styles.label, done ? styles.labelOn : styles.labelOff]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {label}
            </Text>
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
    alignItems: 'flex-start',
    marginTop: 6,
    marginBottom: 4,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 2,
    zIndex: 2,
    backgroundColor: '#FFFFFF',
  },
  dotOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dotOff: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  label: {
    fontSize: 9.5,
    textAlign: 'center',
    paddingHorizontal: 1,
    height: 14,
    lineHeight: 14,
  },
  labelOn: {
    color: COLORS.text,
    fontWeight: '800',
  },
  labelOff: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  line: {
    position: 'absolute',
    top: 4.5,
    left: '50%',
    width: '100%',
    height: 3,
    zIndex: 1,
  },
  lineOn: {
    backgroundColor: COLORS.primary,
  },
  lineOff: {
    backgroundColor: '#E2E8F0',
  },
});







