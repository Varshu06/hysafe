import { Feather } from '@expo/vector-icons';
import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/constants';
import { StatusBadge } from '../ui/StatusBadge';

type Props = {
  status: string;
  id: string;
  createdAt?: string;
  quantity?: number;
  deliveryAddress?: string;
  pickupAddress?: string;
  customer?: string;
  paymentLabel?: string; // UPI/COD
  distanceKm?: number | null;
  etaMin?: number | null;
  slot?: string;
  notes?: string;
  compact?: boolean;
  compactShowAddress?: boolean;
  onPress?: () => void;
  extra?: ReactNode;
  actions?: ReactNode;
  quickActions?: ReactNode;
};

export function StaffOrderCard({
  status,
  id,
  createdAt,
  quantity = 1,
  deliveryAddress,
  pickupAddress,
  customer,
  paymentLabel,
  distanceKm,
  etaMin,
  slot,
  notes,
  compact = false,
  compactShowAddress = false,
  onPress,
  extra,
  actions,
  quickActions,
}: Props) {
  const timeText = useMemo(() => {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }, [createdAt]);

  const distanceText =
    distanceKm == null ? '-- km' : `${distanceKm < 1 ? distanceKm.toFixed(1) : distanceKm.toFixed(1)} km`;
  const etaText = etaMin == null ? '-- min' : `${etaMin} min`;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress} disabled={!onPress}>
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <StatusBadge status={status} />
          {paymentLabel ? (
            <View style={styles.payChip}>
              <Text style={styles.payChipText}>{paymentLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.metaText} numberOfLines={1}>
          #{id} {timeText ? `• ${timeText}` : ''}
        </Text>
      </View>

      <View style={styles.mainRow}>
        <Text style={styles.qty}>{quantity} x 20L</Text>
        <View style={styles.metrics}>
          <View style={styles.metricChip}>
            <Feather name="navigation" size={14} color={COLORS.primary} />
            <Text style={styles.metricText}>{distanceText}</Text>
          </View>
          <View style={styles.metricChip}>
            <Feather name="clock" size={14} color={COLORS.primary} />
            <Text style={styles.metricText}>{etaText}</Text>
          </View>
        </View>
      </View>

      {!compact && slot ? (
        <View style={styles.slotRow}>
          <Feather name="calendar" size={14} color="#64748B" />
          <Text style={styles.slotText} numberOfLines={1}>
            {slot}
          </Text>
        </View>
      ) : null}

      {customer ? (
        <View style={styles.infoRow}>
          <Feather name="user" size={16} color="#94A3B8" />
          <Text style={styles.infoText} numberOfLines={1}>
            {customer}
          </Text>
        </View>
      ) : null}

      {compact && compactShowAddress ? (
        <View style={styles.infoRow}>
          <Feather name="map-pin" size={16} color="#94A3B8" />
          <Text style={styles.infoText} numberOfLines={2}>
            {deliveryAddress || 'Address not available'}
          </Text>
        </View>
      ) : null}

      {!compact ? (
        <>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color="#94A3B8" />
            <Text style={styles.infoText} numberOfLines={2}>
              {deliveryAddress || 'Address not available'}
            </Text>
          </View>

          {pickupAddress ? (
            <View style={styles.infoRow}>
              <Feather name="package" size={16} color="#94A3B8" />
              <Text style={styles.infoText} numberOfLines={2}>
                {pickupAddress}
              </Text>
            </View>
          ) : null}

          {notes ? (
            <View style={styles.notesRow}>
              <Feather name="message-circle" size={14} color="#94A3B8" />
              <Text style={styles.notesText} numberOfLines={2}>
                {notes}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {extra ? <View style={styles.extra}>{extra}</View> : null}

      {(quickActions || actions) ? <View style={styles.divider} /> : null}
      {quickActions ? <View style={styles.quickRow}>{quickActions}</View> : null}
      {actions ? <View style={styles.actionsRow}>{actions}</View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  payChip: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  payChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  metaText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  qty: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  slotText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700',
    lineHeight: 20,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 2,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '700',
    lineHeight: 18,
  },
  extra: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 12,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionsRow: {
    marginTop: 12,
  },
});


