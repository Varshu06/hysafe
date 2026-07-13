import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { StatCard } from '@components/StatCard';
import { Loading, EmptyState } from '@components/Common';
import { orderService } from '@services/order.service';
import { customerService } from '@services/customer.service';
import { useFetch } from '@hooks/useLoading';
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
  Package,
  DollarSign,
  Users,
  Truck,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    activeDeliveries: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch orders
        const orders = await orderService.getAllOrders({ limit: 100 });
        const ordersData = orders.data || orders || [];

        // Calculate stats
        const total = ordersData.length;
        const revenue = (ordersData as any[]).reduce(
          (sum, order) => sum + (order.totalPrice || 0),
          0
        );
        const active = (ordersData as any[]).filter(
          (o) => o.status === 'out_for_delivery'
        ).length;

        // Fetch customers
        const customers = await customerService.getAllCustomers({
          limit: 100,
        });
        const customersData = customers.data || customers || [];

        setStats({
          totalOrders: total,
          totalRevenue: revenue,
          totalCustomers: Array.isArray(customersData)
            ? customersData.length
            : 0,
          activeDeliveries: active,
        });

        // Prepare chart data (mock)
        const mockChartData = [
          { date: 'Mon', orders: 12, revenue: 45000 },
          { date: 'Tue', orders: 15, revenue: 52000 },
          { date: 'Wed', orders: 18, revenue: 61000 },
          { date: 'Thu', orders: 14, revenue: 48000 },
          { date: 'Fri', orders: 22, revenue: 75000 },
          { date: 'Sat', orders: 20, revenue: 68000 },
          { date: 'Sun', orders: 16, revenue: 55000 },
        ];
        setChartData(mockChartData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Welcome back! Here's your business overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Package />}
          label="Total Orders"
          value={stats.totalOrders}
          change={12}
          trend="up"
        />
        <StatCard
          icon={<DollarSign />}
          label="Total Revenue"
          value={`₹${(stats.totalRevenue / 100000).toFixed(1)}L`}
          change={8}
          trend="up"
        />
        <StatCard
          icon={<Users />}
          label="Total Customers"
          value={stats.totalCustomers}
          change={5}
          trend="up"
        />
        <StatCard
          icon={<Truck />}
          label="Active Deliveries"
          value={stats.activeDeliveries}
          change={3}
          trend="down"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              Orders Trend
            </h3>
          </CardHeader>
          <CardBody>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#BAE6FD" />
                  <XAxis dataKey="date" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#0284C7"
                    strokeWidth={2}
                    dot={{ fill: '#0284C7' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
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
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#BAE6FD" />
                  <XAxis dataKey="date" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    fill="#0284C7"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            Quick Actions
          </h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button className="p-4 border border-border rounded-lg hover:bg-surface transition-colors text-left">
              <p className="text-sm text-text-secondary">View Orders</p>
              <p className="font-semibold text-text-primary">→</p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:bg-surface transition-colors text-left">
              <p className="text-sm text-text-secondary">Manage Staff</p>
              <p className="font-semibold text-text-primary">→</p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:bg-surface transition-colors text-left">
              <p className="text-sm text-text-secondary">View Customers</p>
              <p className="font-semibold text-text-primary">→</p>
            </button>
            <button className="p-4 border border-border rounded-lg hover:bg-surface transition-colors text-left">
              <p className="text-sm text-text-secondary">Check Inventory</p>
              <p className="font-semibold text-text-primary">→</p>
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
