import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { StatCard } from '@components/StatCard';
import { ErrorState, Loading, EmptyState } from '@components/Common';
import { orderService } from '@services/order.service';
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@components/StatusBadge";
import { inventoryService } from '@services/inventory.service';
import { socketService } from "@services/socket.service";
import { createAnnouncement } from '@services/notification.service';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  DollarSign,
  Users,
  Truck,
} from 'lucide-react';

type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';
type ChartPoint = { date: string; orders: number; revenue: number };
type ChartPeriod = {
  points: ChartPoint[];
  periodStart: string;
  periodEnd: string;
  currentDate: string;
  granularity: string;
};

const localDateKey = (date: Date) => [
  date.getFullYear().toString().padStart(4, '0'),
  (date.getMonth() + 1).toString().padStart(2, '0'),
  date.getDate().toString().padStart(2, '0'),
].join('-');

const dateFromKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatPeriodLabel = (start: string, end: string) => {
  const startDate = dateFromKey(start);
  const endDate = dateFromKey(end);
  if (start === end) {
    return startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  const includeStartYear = startDate.getFullYear() !== endDate.getFullYear();
  return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(includeStartYear ? { year: 'numeric' } : {}) })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const shiftPeriodDate = (dateKey: string, period: Exclude<AnalyticsPeriod, 'custom'>, amount: number) => {
  const date = dateFromKey(dateKey);
  if (period === 'daily') date.setDate(date.getDate() + amount);
  else if (period === 'weekly') date.setDate(date.getDate() + amount * 7);
  else {
    date.setDate(1);
    date.setMonth(date.getMonth() + amount);
  }
  return localDateKey(date);
};

const formatCompactCurrency = (value: number) => {
  const absoluteValue = Math.abs(value);
  const [divisor, suffix] = absoluteValue >= 10_000_000
    ? [10_000_000, 'Cr']
    : absoluteValue >= 100_000
      ? [100_000, 'L']
      : absoluteValue >= 1_000
        ? [1_000, 'K']
        : [1, ''];
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: suffix ? 1 : 0 }).format(value / divisor)}${suffix}`;
};

const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    activeDeliveries: 0,
    pendingOrders: 0,
    acceptedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    orderGrowth: 0,
    revenueGrowth: 0,
    customerGrowth: 0,
  });

  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartPeriod, setChartPeriod] = useState<Omit<ChartPeriod, 'points'> | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('weekly');
  const [anchorDate, setAnchorDate] = useState('');
  const [customFrom, setCustomFrom] = useState(() => localDateKey(new Date()));
  const [customTo, setCustomTo] = useState(() => localDateKey(new Date()));
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState('');
  const [rangeError, setRangeError] = useState('');
  const chartRequestId = useRef(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementStatus, setAnnouncementStatus] = useState('');
  const [announcementSaving, setAnnouncementSaving] = useState(false);

  const loadChartData = useCallback(async () => {
    const requestId = ++chartRequestId.current;
    setChartData([]);
    setChartPeriod(null);
    setChartError('');

    if (analyticsPeriod === 'custom' && !appliedCustomRange) {
      setChartLoading(false);
      return;
    }

    setChartLoading(true);
    try {
      const range = analyticsPeriod === 'custom'
        ? { period: 'custom' as const, ...appliedCustomRange! }
        : { period: analyticsPeriod, ...(anchorDate ? { anchorDate } : {}) };
      const result: ChartPeriod = await orderService.getOrdersChart(range);
      if (requestId === chartRequestId.current) {
        setChartData(result.points || []);
        setChartPeriod({
          periodStart: result.periodStart,
          periodEnd: result.periodEnd,
          currentDate: result.currentDate,
          granularity: result.granularity,
        });
      }
    } catch (error) {
      if (requestId === chartRequestId.current) {
        console.error('Error loading analytics chart data:', error);
        setChartError('Unable to load analytics for this period. Please try again.');
      }
    } finally {
      if (requestId === chartRequestId.current) setChartLoading(false);
    }
  }, [analyticsPeriod, anchorDate, appliedCustomRange]);

  useEffect(() => {
    void loadChartData();
  }, [loadChartData]);

  const selectAnalyticsPeriod = (period: AnalyticsPeriod) => {
    setRangeError('');
    setAnchorDate('');
    if (period === 'custom') {
      const startDate = chartPeriod?.periodStart || localDateKey(new Date());
      const endDate = chartPeriod?.periodEnd || localDateKey(new Date());
      setCustomFrom(startDate);
      setCustomTo(endDate);
      setAppliedCustomRange({ startDate, endDate });
    }
    setAnalyticsPeriod(period);
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) {
      setRangeError('Choose both a start date and an end date.');
      setAppliedCustomRange(null);
      return;
    }
    if (customFrom > customTo) {
      setRangeError('The start date must be on or before the end date.');
      setAppliedCustomRange(null);
      return;
    }
    setRangeError('');
    setAppliedCustomRange({ startDate: customFrom, endDate: customTo });
  };

  const navigateAnalyticsPeriod = (direction: -1 | 1) => {
    if (!chartPeriod || analyticsPeriod === 'custom') return;
    const nextAnchor = shiftPeriodDate(chartPeriod.periodStart, analyticsPeriod, direction);
    if (direction > 0 && nextAnchor > chartPeriod.currentDate) return;
    setAnchorDate(nextAnchor);
  };
  const publishAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault(); setAnnouncementSaving(true); setAnnouncementStatus('');
    try { await createAnnouncement(announcementTitle, announcementMessage); setAnnouncementTitle(''); setAnnouncementMessage(''); setAnnouncementOpen(false); setAnnouncementStatus('Announcement published to all customers.'); }
    catch (error: any) { setAnnouncementStatus(error?.response?.data?.message || 'Unable to publish announcement.'); }
    finally { setAnnouncementSaving(false); }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const statsData = await orderService.getOrderStats();
        console.log("Dashboard Stats:", statsData);
        setStats(statsData);

        const recentOrdersData = await orderService.getRecentOrders();
        console.log("Recent Orders:", recentOrdersData);
        setRecentOrders(recentOrdersData);

        const lowStock = await inventoryService.getLowStockItems();
        setLowStockItems(lowStock);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);
  useEffect(() => {
    const refreshDashboard = async () => {
      try {
        const stats = await orderService.getOrderStats();
        setStats(stats);
        const recent = await orderService.getRecentOrders();
        setRecentOrders(recent);
        void loadChartData();
      } catch (err) {
        console.error(err);
      }
    };

    socketService.on("new-order", refreshDashboard);
    socketService.on("order-status-updated", refreshDashboard);

    return () => {
      socketService.off("new-order", refreshDashboard);
      socketService.off("order-status-updated", refreshDashboard);
    };
  }, [loadChartData]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">
            Welcome back! Here's your business overview.
          </p>
          {announcementStatus && <span role="status" className="mt-2 block text-sm text-text-secondary">{announcementStatus}</span>}
        </div>
        <button onClick={() => setAnnouncementOpen(true)} className="shrink-0 self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:self-center">Create Announcement</button>
      </div>
      {announcementOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={publishAnnouncement} className="w-full max-w-lg space-y-4 rounded-xl bg-secondary p-6 shadow-xl"><div className="flex justify-between"><h2 className="text-xl font-semibold">Create Announcement</h2><button type="button" aria-label="Close" onClick={() => setAnnouncementOpen(false)}>×</button></div><label className="block text-sm font-medium">Title<input required maxLength={120} value={announcementTitle} onChange={event => setAnnouncementTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-2" /></label><label className="block text-sm font-medium">Message<textarea required maxLength={2000} rows={5} value={announcementMessage} onChange={event => setAnnouncementMessage(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-2" /></label><label className="block text-sm font-medium">Audience<div className="mt-1 rounded-lg border border-border bg-accent p-2">All Customers</div></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setAnnouncementOpen(false)} className="rounded-lg border border-border px-4 py-2">Cancel</button><button disabled={announcementSaving} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">{announcementSaving ? 'Publishing…' : 'Publish'}</button></div></form></div>}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Package />}
          label="Total Orders"
          value={stats.totalOrders}
          change={stats.orderGrowth}
          trend={stats.orderGrowth >= 0 ? "up" : "down"}
        />
        <StatCard
          icon={<DollarSign />}
          label="Total Revenue"
          value={
            stats.totalRevenue >= 100000
              ? `₹${(stats.totalRevenue / 100000).toFixed(1)}L`
              : `₹${stats.totalRevenue.toLocaleString()}`
          }
          change={0}
          trend= "up"
        />
        <StatCard
          icon={<Users />}
          label="Total Customers"
          value={stats.totalCustomers}
          change={0}
          trend= "up"
        />
        <StatCard
          icon={<Truck />}
          label="Active Deliveries"
          value={stats.activeDeliveries}
          change={0}
          trend="up"
        />
      </div>

      {/* Charts */}
      <section className="space-y-4">
        <div className="rounded-xl border border-border/70 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Analytics time range">
              {(['daily', 'weekly', 'monthly', 'custom'] as AnalyticsPeriod[]).map(period => (
                <button
                  key={period}
                  type="button"
                  onClick={() => selectAnalyticsPeriod(period)}
                  aria-pressed={analyticsPeriod === period}
                  className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${analyticsPeriod === period ? 'bg-primary text-white' : 'border border-border text-text-secondary hover:bg-accent'}`}
                >
                  {period === 'custom' && <CalendarDays size={15} className="mr-1.5 inline-block" />}
                  {period === 'custom' ? 'Custom Range' : period}
                </button>
              ))}
            </div>

            {analyticsPeriod === 'custom' ? (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>From</span>
                  <input type="date" value={customFrom} max={customTo || undefined} onChange={event => setCustomFrom(event.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-text-primary" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>To</span>
                  <input type="date" value={customTo} min={customFrom || undefined} onChange={event => setCustomTo(event.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-text-primary" />
                </label>
                <button type="button" onClick={applyCustomRange} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">Apply range</button>
                {chartPeriod && <span className="text-sm text-text-secondary lg:ml-auto">Showing {formatPeriodLabel(chartPeriod.periodStart, chartPeriod.periodEnd)}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Previous period" onClick={() => navigateAnalyticsPeriod(-1)} disabled={!chartPeriod} className="rounded-lg border border-border p-2 text-text-secondary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-medium text-text-primary">
                  {chartPeriod ? formatPeriodLabel(chartPeriod.periodStart, chartPeriod.periodEnd) : 'Loading selected period…'}
                </span>
                <button
                  type="button"
                  aria-label="Next period"
                  onClick={() => navigateAnalyticsPeriod(1)}
                  disabled={!chartPeriod || shiftPeriodDate(chartPeriod.periodStart, analyticsPeriod, 1) > chartPeriod.currentDate}
                  className="rounded-lg border border-border p-2 text-text-secondary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
            {rangeError && <p role="alert" className="text-sm text-danger">{rangeError}</p>}
          </div>
        </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Orders Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              Orders Trend
            </h3>
          </CardHeader>
          <CardBody>
            {chartLoading ? (
              <div className="flex h-64 items-center justify-center gap-2 text-sm text-text-secondary"><Loader2 className="animate-spin" size={18} />Loading analytics…</div>
            ) : chartError ? (
              <ErrorState message={chartError} />
            ) : rangeError ? (
              <EmptyState title="Select a valid date range" description="Choose a start date and end date, then apply the range." />
            ) : !chartData.some(point => point.orders > 0) ? (
              <EmptyState title="No orders for this period" description="Try a different date range." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#BAE6FD" />
                  <XAxis dataKey="date" stroke="#64748B" interval="preserveStartEnd" minTickGap={12} tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748B" domain={[0, 'auto']} allowDecimals={false} tickCount={6} />
                  <Tooltip contentStyle={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }} />
                  <Legend />
                  <Line type="monotone" dataKey="orders" name="Orders" stroke="#0284C7" strokeWidth={2} dot={{ fill: '#0284C7' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              Revenue Trend
            </h3>
          </CardHeader>
          <CardBody>
            {chartLoading ? (
              <div className="flex h-64 items-center justify-center gap-2 text-sm text-text-secondary"><Loader2 className="animate-spin" size={18} />Loading analytics…</div>
            ) : chartError ? (
              <ErrorState message={chartError} />
            ) : rangeError ? (
              <EmptyState title="Select a valid date range" description="Choose a start date and end date, then apply the range." />
            ) : !chartData.some(point => point.revenue > 0) ? (
              <EmptyState title="No revenue for this period" description="Revenue is recorded from delivered orders." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#BAE6FD" />
                  <XAxis dataKey="date" stroke="#64748B" interval="preserveStartEnd" minTickGap={12} tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748B" domain={[0, 'auto']} allowDecimals={false} tickCount={6} tickFormatter={formatCompactCurrency} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#0284C7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
      </section>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">
              Recent Orders
            </h3>

            <button
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => navigate("/orders")}
            >
             View All →
            </button>
          </CardHeader>

          <CardBody>
            {recentOrders.length === 0 ? (
              <EmptyState
                title="No recent orders"
                description="Orders will appear here once customers place them."
              />
              ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order._id}
                    className="flex items-center justify-between border-b pb-3"
                  >
                  <div>
                    <p className="font-medium">
                      {order.customerId?.name || "Unknown Customer"}
                    </p>

                    <StatusBadge status={order.status} />
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">
                      ₹{order.totalPrice}
                    </p>

                    <p className="text-sm text-text-secondary">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">⚠ Low Stock Items</h3>

            <button
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => navigate("/inventory")}
            >View Inventory →
            </button>
          </CardHeader>

          <CardBody>
            {lowStockItems.length === 0 ? (
              <EmptyState
                title="Inventory Healthy"
                description="All inventory items are above their minimum stock."/>
            ) : (
              <div className="space-y-4">
                {lowStockItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                      {item.name}
                      </p>

                      <p className="text-sm text-text-secondary">
                      Minimum Stock: {item.minStock}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        item.quantity <= 2
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.quantity} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>   
  );
};
