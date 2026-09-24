import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { Badge, EmptyState, ErrorState, Loading } from '@components/Common';
import { Button } from '@components/Button';
import { recurringService } from '@services/recurring.service';
import { RecurringBill, RecurringDelivery, RecurringBillStatus } from '@types';
import { formatCurrency, formatDateOnly } from '@utils/formatting';
import { Eye, MoreVertical, RefreshCw, X } from 'lucide-react';
import { socketService } from '@services/socket.service';

type Tab = 'plans' | 'bills';
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const customerName = (value: RecurringDelivery['customerId'] | RecurringBill['customerId']) =>
  typeof value === 'object' ? value?.name || value?.phone || 'Unknown customer' : value || 'Unknown customer';
const deliveryLabel = (frequency: string) => ({ daily: 'Daily', '2_per_week': '2 deliveries/week', '2-per-week': '2 deliveries/week', '3_per_week': '3 deliveries/week', '3-per-week': '3 deliveries/week' }[frequency] || frequency.replace(/_/g, ' '));
const billingLabel = (frequency?: string) => ({ per_order: 'Pay per order', 'one-time': 'Pay per order', weekly: 'Weekly', monthly: 'Monthly' }[frequency || ''] || frequency || 'Not specified');
const billVariant = (status: RecurringBillStatus) => status === 'paid' ? 'success' : status === 'overdue' ? 'danger' : status === 'confirmed' ? 'primary' : 'warning';
const planStatus = (plan: RecurringDelivery) => plan.status || (plan.isActive ? 'active' : 'legacy_inactive');
const planStatusLabel = (plan: RecurringDelivery) => ({ active: 'Active', paused: 'Paused', cancelled: 'Cancelled', legacy_inactive: 'Inactive (legacy)' }[planStatus(plan)]);
const planStatusVariant = (plan: RecurringDelivery) => planStatus(plan) === 'active' ? 'success' : planStatus(plan) === 'cancelled' ? 'danger' : 'secondary';
const getError = (error: any) => error?.response?.data?.message || error?.message || 'Unable to load recurring data. Please try again.';

export const RecurringDeliveriesPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('plans');
  const [plans, setPlans] = useState<RecurringDelivery[]>([]);
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<RecurringDelivery | null>(null);
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'shop' | ''>('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [openMenuPlanId, setOpenMenuPlanId] = useState<string | null>(null);
  const [openMenuBillId, setOpenMenuBillId] = useState<string | null>(null);
  const [openUpdatePlanId, setOpenUpdatePlanId] = useState<string | null>(null);
  const [pendingPlanAction, setPendingPlanAction] = useState<{ plan: RecurringDelivery; status: 'paused' | 'active' | 'cancelled' } | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [planData, billData] = await Promise.all([recurringService.getPlans(), recurringService.getBills()]);
      setPlans(planData); setBills(billData);
    } catch (e) { setError(getError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => { void load(); };
    socketService.on('order-status-updated', refresh);
    return () => socketService.off('order-status-updated', refresh);
  }, [load]);

  const billPlan = useMemo(() => {
    if (!selectedBill) return null;
    return typeof selectedBill.recurringDeliveryId === 'object' ? selectedBill.recurringDeliveryId : null;
  }, [selectedBill]);
  const closeDetails = () => { setSelectedPlan(null); setSelectedBill(null); setActionError(''); };
  const recordPayment = async () => {
    if (!selectedBill || !paymentMethod) return;
    setSaving(true); setActionError(''); setNotice('');
    try {
      await recurringService.recordPayment(selectedBill._id, paymentMethod, selectedBill.amount);
      setSelectedBill(null); setNotice('Offline payment recorded. Bill is now paid.'); await load();
    } catch (e) { setActionError(getError(e)); }
    finally { setSaving(false); }
  };
  const confirmPlanAction = async () => {
    if (!pendingPlanAction) return;
    setUpdatingPlan(true); setActionError(''); setNotice('');
    try {
      await recurringService.updatePlanStatus(pendingPlanAction.plan._id, pendingPlanAction.status);
      setPendingPlanAction(null);
      setNotice(`Recurring delivery ${pendingPlanAction.status === 'active' ? 'resumed' : pendingPlanAction.status} successfully.`);
      setOpenMenuPlanId(null); setOpenUpdatePlanId(null);
      await load();
    } catch (e) { setActionError(getError(e)); }
    finally { setUpdatingPlan(false); }
  };

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold text-text-primary">Recurring Deliveries</h1><p className="mt-1 text-text-secondary">Manage recurring plans and their bills</p></div>
    <Card><CardBody className="flex flex-wrap gap-2">
      <Button size="sm" variant={tab === 'plans' ? 'primary' : 'secondary'} onClick={() => setTab('plans')}>Plans ({plans.length})</Button>
      <Button size="sm" variant={tab === 'bills' ? 'primary' : 'secondary'} onClick={() => setTab('bills')}>Bills ({bills.length})</Button>
      <Button size="sm" variant="secondary" aria-label="Refresh recurring data" title="Refresh recurring data" onClick={() => void load()}><RefreshCw size={16} /></Button>
    </CardBody></Card>
    {notice && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>}
    {error ? <ErrorState message={error} /> : loading ? <Loading /> : tab === 'plans' ? <Card>
      <CardHeader><h3 className="text-lg font-semibold">Plans ({plans.length})</h3></CardHeader><CardBody>
        {plans.length === 0 ? <EmptyState description="No recurring plans found" /> : <div className="overflow-visible"><table className="w-full"><thead><tr className="bg-surface border-b border-border">{['Customer', 'Product', 'Qty/delivery', 'Delivery', 'Days', 'Billing', 'Start date', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left text-sm font-semibold">{h}</th>)}</tr></thead><tbody>
          {plans.map(plan => <tr key={plan._id} className="border-b border-border hover:bg-accent"><td className="px-4 py-4 text-sm">{customerName(plan.customerId)}</td><td className="px-4 py-4 text-sm">{plan.productName}</td><td className="px-4 py-4 text-sm">{plan.quantity}</td><td className="px-4 py-4 text-sm">{deliveryLabel(plan.frequency)}</td><td className="px-4 py-4 text-sm">{plan.frequency === 'daily' ? 'Every day' : plan.deliveryDays?.map(d => dayNames[d]).join(', ') || 'Not set'}</td><td className="px-4 py-4 text-sm">{billingLabel(plan.billingFrequency || plan.paymentTerms)}</td><td className="px-4 py-4 text-sm">{formatDateOnly(plan.startDate)}</td><td className="px-4 py-4"><Badge variant={planStatusVariant(plan)}>{planStatusLabel(plan)}</Badge></td><td className="relative px-4 py-4 text-center"><button aria-label="Plan actions" className="rounded-lg p-2 hover:bg-gray-100" onClick={() => { setOpenMenuPlanId(openMenuPlanId === plan._id ? null : plan._id); setOpenUpdatePlanId(null); }}><MoreVertical size={18} /></button>{openMenuPlanId === plan._id && <div className="absolute right-4 top-full z-40 w-48 rounded-xl border border-border bg-white py-1 text-left shadow-xl"><button className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-surface" onClick={() => { setSelectedPlan(plan); setOpenMenuPlanId(null); }}><Eye size={16} />View Details</button><button className="flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-surface" disabled={planStatus(plan) === 'cancelled' || planStatus(plan) === 'legacy_inactive'} onClick={() => setOpenUpdatePlanId(openUpdatePlanId === plan._id ? null : plan._id)}>Update<span>›</span></button>{openUpdatePlanId === plan._id && (planStatus(plan) === 'active' || planStatus(plan) === 'paused') && <div className="border-t border-border py-1">{planStatus(plan) === 'active' && <button className="w-full px-4 py-2 text-left text-sm hover:bg-surface" onClick={() => { setActionError(''); setPendingPlanAction({ plan, status: 'paused' }); }}>Pause</button>}{planStatus(plan) === 'paused' && <button className="w-full px-4 py-2 text-left text-sm hover:bg-surface" onClick={() => { setActionError(''); setPendingPlanAction({ plan, status: 'active' }); }}>Resume</button>}<button className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-surface" onClick={() => { setActionError(''); setPendingPlanAction({ plan, status: 'cancelled' }); }}>Cancel</button></div>}</div>}</td></tr>)}
        </tbody></table></div>}
      </CardBody></Card> : <Card>
      <CardHeader><h3 className="text-lg font-semibold">Recurring Bills ({bills.length})</h3></CardHeader><CardBody>
        {bills.length === 0 ? <EmptyState description="No recurring bills found" /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-surface border-b border-border">{['Customer', 'Product', 'Billing period', 'Deliveries', 'Amount due', 'Due date / first delivery', 'Confirmation', 'Payment status', 'Payment method', ''].map(h => <th key={h} className="px-4 py-3 text-left text-sm font-semibold">{h}</th>)}</tr></thead><tbody>
          {bills.map(bill => <tr key={bill._id} className="border-b border-border hover:bg-accent"><td className="px-4 py-4 text-sm">{customerName(bill.customerId)}</td><td className="px-4 py-4 text-sm">{bill.productName}</td><td className="px-4 py-4 text-sm">{billingLabel(bill.billingFrequency)}<br />{formatDateOnly(bill.periodStart)} – {formatDateOnly(bill.periodEnd)}</td><td className="px-4 py-4 text-sm">{bill.deliveryCount}</td><td className="px-4 py-4 text-sm">{formatCurrency(bill.amount)}</td><td className="px-4 py-4 text-sm">{formatDateOnly(bill.dueDate)}</td><td className="px-4 py-4 text-sm">{bill.confirmedAt ? 'Confirmed' : bill.status === 'pending' ? 'Pending' : 'Not confirmed'}</td><td className="px-4 py-4"><Badge variant={billVariant(bill.status)}>{bill.status[0].toUpperCase() + bill.status.slice(1)}</Badge></td><td className="px-4 py-4 text-sm">{(bill.paymentMethod || bill.preferredPaymentMethod) === 'cash' ? 'Cash on Delivery' : (bill.paymentMethod || bill.preferredPaymentMethod) === 'shop' ? 'Pay at Shop' : 'Not recorded'}</td><td className="relative px-4 py-4 text-center"><button aria-label="Bill actions" className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setOpenMenuBillId(openMenuBillId === bill._id ? null : bill._id)}><MoreVertical size={18} /></button>{openMenuBillId === bill._id && <div className="absolute right-4 top-full z-40 w-40 rounded-xl border border-border bg-white py-1 text-left shadow-xl"><button className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-surface" onClick={() => { setSelectedBill(bill); setPaymentMethod(bill.preferredPaymentMethod || bill.paymentMethod || ''); setActionError(''); setOpenMenuBillId(null); }}><Eye size={16} />View Details</button></div>}</td></tr>)}
        </tbody></table></div>}
      </CardBody></Card>}

    {pendingPlanAction && <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" onClick={() => !updatingPlan && setPendingPlanAction(null)}><div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}><CardHeader><h2 className="text-xl font-semibold">{pendingPlanAction.status === 'paused' ? 'Pause recurring delivery?' : pendingPlanAction.status === 'active' ? 'Resume recurring delivery?' : 'Cancel recurring delivery?'}</h2><button disabled={updatingPlan} onClick={() => setPendingPlanAction(null)} className="rounded-lg p-2 hover:bg-gray-100"><X size={20} /></button></CardHeader><CardBody className="space-y-4"><p className="text-sm text-text-secondary">{pendingPlanAction.status === 'paused' ? `Future ${pendingPlanAction.plan.productName} deliveries will stop while this plan is paused.` : pendingPlanAction.status === 'active' ? `Future ${pendingPlanAction.plan.productName} deliveries will resume. Existing orders and bills will remain unchanged.` : `Cancelling stops future ${pendingPlanAction.plan.productName} deliveries. Existing orders and bills will remain available.`}</p>{actionError && <div className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">{actionError}</div>}<div className="flex justify-end gap-2"><Button variant="secondary" disabled={updatingPlan} onClick={() => setPendingPlanAction(null)}>Keep plan</Button><Button variant={pendingPlanAction.status === 'cancelled' ? 'danger' : 'primary'} isLoading={updatingPlan} onClick={confirmPlanAction}>{pendingPlanAction.status === 'paused' ? 'Pause plan' : pendingPlanAction.status === 'active' ? 'Resume plan' : 'Cancel plan'}</Button></div></CardBody></div></div>}

    {(selectedPlan || selectedBill) && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={closeDetails}><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
      <CardHeader><h2 className="text-xl font-semibold">{selectedPlan ? 'Recurring Plan Details' : 'Recurring Bill Details'}</h2><button onClick={closeDetails} className="rounded-lg p-2 hover:bg-gray-100"><X size={20} /></button></CardHeader>
      <CardBody className="space-y-5">
        {selectedPlan && <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">{[['Customer', customerName(selectedPlan.customerId)], ['Product', selectedPlan.productName], ['Quantity per delivery', selectedPlan.quantity], ['Delivery frequency', deliveryLabel(selectedPlan.frequency)], ['Selected delivery days', selectedPlan.frequency === 'daily' ? 'Every day' : selectedPlan.deliveryDays?.map(d => dayNames[d]).join(', ') || 'Not set'], ['Billing frequency', billingLabel(selectedPlan.billingFrequency || selectedPlan.paymentTerms)], ['Payment method', selectedPlan.offlinePaymentMethod === 'cash' ? 'Cash on Delivery' : selectedPlan.offlinePaymentMethod === 'shop' ? 'Pay at Shop' : 'Not recorded'], ['Start date', formatDateOnly(selectedPlan.startDate)], ['Next delivery', selectedPlan.nextDeliveryDate ? formatDateOnly(selectedPlan.nextDeliveryDate) : 'Not scheduled'], ['Status', planStatusLabel(selectedPlan)], ['Delivery address', selectedPlan.deliveryAddress || 'Not available'], ...(planStatus(selectedPlan) === 'legacy_inactive' ? [['Lifecycle actions', 'Unavailable: this older inactive plan has no saved paused/cancelled status.'] as [string, string]] : [])].map(([label, value]) => <div key={label}><p className="text-text-secondary">{label}</p><p className="font-semibold">{value}</p></div>)}</div>}
        {selectedBill && <><div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">{[['Customer', customerName(selectedBill.customerId)], ['Product', selectedBill.productName], ['Billing frequency', billingLabel(selectedBill.billingFrequency)], ['Billing period', `${formatDateOnly(selectedBill.periodStart)} – ${formatDateOnly(selectedBill.periodEnd)}`], ['Delivery count', selectedBill.deliveryCount], ['Quantity per delivery', selectedBill.quantityPerDelivery], ['Amount due', formatCurrency(selectedBill.amount)], ['Amount paid', selectedBill.paymentAmount !== undefined ? formatCurrency(selectedBill.paymentAmount) : '—'], ['Due date / first delivery', formatDateOnly(selectedBill.dueDate)], ['Confirmation', selectedBill.status === 'pending' ? 'Pending — awaiting customer confirmation' : selectedBill.confirmedAt ? 'Confirmed — payment is separate' : 'Not required for this bill'], ['Payment status', selectedBill.status[0].toUpperCase() + selectedBill.status.slice(1)], ['Payment method', (selectedBill.paymentMethod || selectedBill.preferredPaymentMethod) === 'cash' ? 'Cash on Delivery' : (selectedBill.paymentMethod || selectedBill.preferredPaymentMethod) === 'shop' ? 'Pay at Shop' : 'Not recorded'], ['Collected by', selectedBill.paidBy?.name || '—'], ['Paid at', selectedBill.paidAt ? new Date(selectedBill.paidAt).toLocaleString() : '—'], ['Linked orders', selectedBill.orderIds?.length || 0]].map(([label, value]) => <div key={label}><p className="text-text-secondary">{label}</p><p className="font-semibold">{value}</p></div>)}</div>
          {actionError && <div className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">{actionError}</div>}
          {selectedBill.status === 'confirmed' || selectedBill.status === 'overdue' ? <div className="space-y-3 border-t border-border pt-4"><p className="font-semibold">Manual admin payment correction (fallback) · {formatCurrency(selectedBill.amount)}</p><label className="block space-y-2 text-sm"><span>Collected payment method</span><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as 'cash' | 'shop' | '')} className="w-full rounded-lg border border-border px-4 py-2"><option value="">Select recorded method</option><option value="cash">Cash on Delivery</option><option value="shop">Pay at Shop</option></select></label><Button disabled={!paymentMethod} onClick={recordPayment} isLoading={saving}>Record Manual Correction</Button></div> : null}
          {selectedBill.status === 'pending' && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Awaiting customer confirmation. Payment cannot be recorded yet.</p>}
          {selectedBill.status === 'paid' && <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">This bill is paid. Payment cannot be recorded again.</p>}
          {billPlan && <div className="border-t border-border pt-4 text-sm"><p className="font-semibold">Linked plan schedule</p><p>{deliveryLabel(billPlan.frequency || '')} · {billPlan.deliveryDays?.map(d => dayNames[d]).join(', ') || 'Daily'} · {billingLabel(billPlan.billingFrequency)}</p></div>}
        </>}
      </CardBody>
    </div></div>}
  </div>;
};
