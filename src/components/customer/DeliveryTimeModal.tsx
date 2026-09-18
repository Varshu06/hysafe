import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Alert } from 'react-native';
import { COLORS } from '../../utils/constants';

export interface DeliveryTimeValue {
  hour: string; // 01-12
  minute: string; // 00-59
  ampm: 'AM' | 'PM';
}

interface DeliveryTimeModalProps {
  visible: boolean;
  selectedDate: Date;
  selectedTime: DeliveryTimeValue;
  isEventOrder?: boolean;
  onClose: () => void;
  onConfirm: (payload: { date: Date; time: DeliveryTimeValue; isEvent: boolean }) => void;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const monthLabel = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const shortDateLabel = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

export const DeliveryTimeModal: React.FC<DeliveryTimeModalProps> = ({
  visible,
  selectedTime,
  selectedDate,
  isEventOrder = false,
  onClose,
  onConfirm,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(selectedDate));
  const [draftDate, setDraftDate] = useState<Date>(selectedDate);
  const [timeText, setTimeText] = useState(`${selectedTime.hour}:${selectedTime.minute}`);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(selectedTime.ampm);
  const [isEvent, setIsEvent] = useState(isEventOrder);

  // Reset drafts when opening
  useEffect(() => {
    if (visible) {
      setShowCalendar(false);
      setCalendarMonth(startOfMonth(selectedDate));
      setDraftDate(selectedDate);
      setTimeText(`${selectedTime.hour}:${selectedTime.minute}`);
      setAmpm(selectedTime.ampm);
      setIsEvent(isEventOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isEventOrder]);

  const quickDates = useMemo(() => {
    const base = new Date();
    const list = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const label =
        i === 0
          ? 'Today'
          : d.toLocaleDateString('en-US', { weekday: 'short' });
      return { date: d, day: pad2(d.getDate()), label };
    });
    return list;
  }, []);

  const parseTime = (input: string): { hour: string; minute: string } | null => {
    const raw = input.trim();
    const m = raw.match(/^(\d{1,2})\s*:\s*(\d{2})$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 1 || hh > 12) return null;
    if (mm < 0 || mm > 59) return null;
    return { hour: pad2(hh), minute: pad2(mm) };
  };

  const handleConfirm = () => {
    const parsed = parseTime(timeText);
    if (!parsed) {
      Alert.alert('Invalid time', 'Please enter time in HH:MM format (e.g., 07:30).');
      return;
    }

    onConfirm({
      date: draftDate,
      time: { hour: parsed.hour, minute: parsed.minute, ampm },
      isEvent,
    });
    onClose();
  };

  const monthDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const total = daysInMonth(calendarMonth);
    const startWeekday = start.getDay(); // 0 Sun
    const cells: Array<{ date: Date } | null> = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= total; day++) {
      cells.push({ date: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day) });
    }
    return cells;
  }, [calendarMonth]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>
                  {isEvent ? 'Set Event/Wedding Delivery' : 'Set Delivery Time'}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.85}>
                  <Feather name="x" size={18} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Event/Wedding Toggle */}
                <View style={styles.eventToggleContainer}>
                  <TouchableOpacity
                    onPress={() => setIsEvent(!isEvent)}
                    style={styles.eventToggle}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.checkbox, isEvent && styles.checkboxChecked]}>
                      {isEvent && <Feather name="check" size={12} color="white" />}
                    </View>
                    <Text style={styles.eventLabel}>This is an Event/Wedding order</Text>
                  </TouchableOpacity>
                  {isEvent && (
                    <View style={styles.eventInfoBox}>
                      <Feather name="info" size={14} color={COLORS.primary} />
                      <Text style={styles.eventInfoText}>
                        Event orders are prioritized and require specific delivery time
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.sectionLabel}>Select day</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                  <TouchableOpacity
                    style={styles.monthButton}
                    activeOpacity={0.85}
                    onPress={() => setShowCalendar((v) => !v)}
                  >
                    <Feather name="calendar" size={16} color="#102841" />
                    <Text style={styles.monthButtonText}>Month</Text>
                  </TouchableOpacity>

                  {quickDates.map((d) => {
                    const active = toYMD(d.date) === toYMD(draftDate);
                    return (
                      <TouchableOpacity
                        key={toYMD(d.date)}
                        style={[styles.dateChip, active && styles.dateChipActive]}
                        activeOpacity={0.85}
                        onPress={() => setDraftDate(d.date)}
                      >
                        <Text style={[styles.dateDay, active && styles.dateDayActive]}>{d.day}</Text>
                        <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>{d.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.selectedDateRow}>
                  <Feather name="calendar" size={14} color="#102841" />
                  <Text style={styles.selectedDateText}>
                    Selected: {draftDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>

                {showCalendar ? (
                  <View style={styles.calendarCard}>
                    <View style={styles.calHeader}>
                      <TouchableOpacity
                        onPress={() =>
                          setCalendarMonth(
                            new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                          )
                        }
                        style={styles.calNavBtn}
                        activeOpacity={0.85}
                      >
                        <Feather name="chevron-left" size={18} color={COLORS.text} />
                      </TouchableOpacity>
                      <Text style={styles.calTitle}>{monthLabel(calendarMonth)}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          setCalendarMonth(
                            new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                          )
                        }
                        style={styles.calNavBtn}
                        activeOpacity={0.85}
                      >
                        <Feather name="chevron-right" size={18} color={COLORS.text} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.dowRow}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                        <Text key={d} style={styles.dowText}>
                          {d}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.grid}>
                      {monthDays.map((cell, idx) => {
                        if (!cell) {
                          return <View key={`e-${idx}`} style={styles.dayCell} />;
                        }
                        const ymd = toYMD(cell.date);
                        const active = ymd === toYMD(draftDate);
                        return (
                          <TouchableOpacity
                            key={ymd}
                            style={[styles.dayCell, active && styles.dayCellActive]}
                            activeOpacity={0.85}
                            onPress={() => {
                              setDraftDate(cell.date);
                              setShowCalendar(false);
                            }}
                          >
                            <Text style={[styles.dayText, active && styles.dayTextActive]}>
                              {cell.date.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Select time</Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    value={timeText}
                    onChangeText={(t) => setTimeText(t.replace(/[^0-9:]/g, '').slice(0, 5))}
                    placeholder="07:30"
                    placeholderTextColor={COLORS.textLight}
                    style={styles.timeInput}
                    keyboardType="number-pad"
                  />
                  <View style={styles.ampmWrap}>
                    {(['AM', 'PM'] as const).map((v) => {
                      const active = ampm === v;
                      return (
                        <TouchableOpacity
                          key={v}
                          style={[styles.ampmBtn, active && styles.ampmBtnActive]}
                          onPress={() => setAmpm(v)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.ampmText, active && styles.ampmTextActive]}>{v}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.confirmButton}
                activeOpacity={0.9}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmText}>Confirm</Text>
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
  card: {
    backgroundColor: '#E0F2FE',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 6,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  monthButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#102841',
  },
  dateChip: {
    width: 72,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: '#102841',
    borderColor: '#102841',
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '900',
    color: '#102841',
    marginBottom: 2,
  },
  dateDayActive: {
    color: 'white',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  dateLabelActive: {
    color: 'white',
  },
  dateFull: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  selectedDateRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedDateText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    color: '#102841',
  },
  calendarCard: {
    marginTop: 12,
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 12,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  dowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  dowText: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textLight,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dayCellActive: {
    backgroundColor: '#102841',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  dayTextActive: {
    color: 'white',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '800',
    color: '#102841',
  },
  ampmWrap: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    overflow: 'hidden',
  },
  ampmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ampmBtnActive: {
    backgroundColor: '#102841',
  },
  ampmText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#102841',
  },
  ampmTextActive: {
    color: 'white',
  },
  confirmButton: {
    backgroundColor: '#102841',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  confirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  eventToggleContainer: {
    marginBottom: 16,
  },
  eventToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  eventLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  eventInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  eventInfoText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: '500',
    lineHeight: 16,
  },
});


