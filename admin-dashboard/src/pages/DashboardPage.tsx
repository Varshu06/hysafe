import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { StatCard } from '@components/StatCard';
import { Loading, EmptyState } from '@components/Common';
import { orderService } from '@services/order.service';
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
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    activeDeliveries: 0,
    orderGrowth: 0,
    revenueGrowth: 0,
    customerGrowth: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const statsData = await orderService.getOrderStats();
        console.log("Dashboard Stats:", statsData);
        setStats(statsData);

        // Prepare chart data (mock)
        const ordersChartData = await orderService.getOrdersChart();
        console.log("Orders Chart Data:", ordersChartData);
        setChartData(ordersChartData);
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
          change={stats.revenueGrowth}
          trend={stats.revenueGrowth >= 0 ? "up" : "down"}
        />
        <StatCard
          icon={<Users />}
          label="Total Customers"
          value={stats.totalCustomers}
          change={stats.customerGrowth}
          trend={stats.customerGrowth >= 0 ? "up" : "down"}
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
