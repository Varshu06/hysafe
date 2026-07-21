import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { StatCard } from '@components/StatCard';
import { Loading, EmptyState } from '@components/Common';
import { orderService } from '@services/order.service';
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@components/StatusBadge";
import { inventoryService } from '@services/inventory.service';
import { socketService } from "@services/socket.service";
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

  const [chartData, setChartData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
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

        const chart = await orderService.getOrdersChart();
        setChartData(chart);

        const recent = await orderService.getRecentOrders();
        setRecentOrders(recent);
      } catch (err) {
        console.error(err);
      }
    };

    socketService.on("new-order", refreshDashboard);
    socketService.on("order-status-updated", refreshDashboard);

    return () => {
      socketService.off("new-order");
      socketService.off("order-status-updated");
    };
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
