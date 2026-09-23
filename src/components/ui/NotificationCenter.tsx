import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../utils/constants';
import { getInAppNotifications, InAppNotification, markAllInAppNotificationsRead, markInAppNotificationRead } from '../../services/inAppNotification.service';

type Props = { topInset?: number; onNotificationPress?: (item: InAppNotification) => void };
export function NotificationCenter({ topInset = 0, onNotificationPress }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { const result = await getInAppNotifications(); setItems(result.notifications); setUnread(result.unreadCount); }
    catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const markRead = async (item: InAppNotification) => {
    if (!item.isRead) {
      try { await markInAppNotificationRead(item._id); setItems(current => current.map(row => row._id === item._id ? { ...row, isRead: true } : row)); setUnread(value => Math.max(0, value - 1)); }
      catch { setError(true); return; }
    }
    if (onNotificationPress) { setOpen(false); onNotificationPress(item); }
  };
  const markAll = async () => {
    try { await markAllInAppNotificationsRead(); setItems(current => current.map(row => ({ ...row, isRead: true }))); setUnread(0); }
    catch { setError(true); }
  };
  const label = (item: InAppNotification) => {
    if (item.type === 'admin_announcement') return item.title || t('notifications');
    const keys: Record<string, string> = {
      recurring_delivery_paused: 'recurringNotificationPaused', recurring_delivery_resumed: 'recurringNotificationResumed', recurring_delivery_cancelled: 'recurringNotificationCancelled',
      order_placed: 'notificationOrderPlaced', order_accepted: 'notificationOrderAccepted', order_cancelled: 'notificationOrderCancelled', order_out_for_delivery: 'notificationOutForDelivery', order_delivered: 'notificationDelivered', bill_due: 'notificationBillDue', bill_paid: 'notificationBillPaid', new_order_available: 'notificationNewOrder',
    };
    return t(keys[item.type] || 'notifications', { product: item.productName || t('orders') });
  };
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('notifications')} style={styles.bell} onPress={() => { setOpen(true); void load(); }}>
      <Feather name="bell" size={20} color={COLORS.text} />{unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text></View>}
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
        <View style={[styles.panel, { marginTop: topInset + 60 }]} onStartShouldSetResponder={() => true}>
          <View style={styles.header}><Text style={styles.title}>{t('notifications')}</Text><View style={styles.headerActions}>{unread > 0 && <TouchableOpacity onPress={() => void markAll()}><Text style={styles.markAll}>{t('markAllRead')}</Text></TouchableOpacity>}<TouchableOpacity onPress={() => setOpen(false)}><Feather name="x" size={20} color={COLORS.text} /></TouchableOpacity></View></View>
          {loading ? <View style={styles.empty}><ActivityIndicator color={COLORS.text} /><Text style={styles.muted}>{t('loadingNotifications')}</Text></View> : error ? <View style={styles.empty}><Text style={styles.muted}>{t('notificationsLoadError')}</Text><TouchableOpacity onPress={() => void load()}><Text style={styles.markAll}>{t('retry')}</Text></TouchableOpacity></View> : !items.length ? <View style={styles.empty}><Feather name="bell-off" size={36} color="#94A3B8"/><Text style={styles.muted}>{t('noNotifications')}</Text></View> : <ScrollView style={styles.list}>{items.map(item => <TouchableOpacity key={item._id} style={[styles.item, !item.isRead && styles.unread]} onPress={() => void markRead(item)}><Text style={styles.itemText}>{label(item)}</Text>{item.type === 'admin_announcement' && !!item.message && <Text style={styles.muted}>{item.message}</Text>}<Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text></TouchableOpacity>)}</ScrollView>}
        </View>
      </TouchableOpacity>
    </Modal>
  </>;
}
const styles = StyleSheet.create({ bell:{width:36,height:36,borderRadius:18,backgroundColor:'white',justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:COLORS.border}, badge:{position:'absolute',top:-4,right:-4,backgroundColor:'#EF4444',borderRadius:10,minWidth:18,height:18,alignItems:'center',justifyContent:'center',paddingHorizontal:4},badgeText:{color:'white',fontSize:10,fontWeight:'bold'},overlay:{flex:1,backgroundColor:'rgba(0,0,0,.5)'},panel:{backgroundColor:'white',marginHorizontal:16,borderRadius:16,maxHeight:430,elevation:8},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:16,borderBottomWidth:1,borderBottomColor:'#E2E8F0'},title:{fontSize:18,fontWeight:'bold',color:COLORS.text},headerActions:{flexDirection:'row',alignItems:'center',gap:14},markAll:{color:'#0284C7',fontWeight:'600'},empty:{alignItems:'center',justifyContent:'center',padding:36,gap:10},muted:{fontSize:13,color:'#64748B',marginTop:4},list:{maxHeight:350},item:{paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#E2E8F0'},unread:{backgroundColor:'#F0F9FF'},itemText:{fontSize:14,color:COLORS.text,lineHeight:20},date:{fontSize:12,color:'#64748B',marginTop:5}});
