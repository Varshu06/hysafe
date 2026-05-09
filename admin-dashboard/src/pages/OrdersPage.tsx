import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { DataTable } from '@components/DataTable';
import { Button } from '@components/Button';
import { Badge, EmptyState, Loading } from '@components/Common';
import { orderService } from '@services/order.service';
import { staffService } from '@services/staff.service';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@utils/constants';
import { formatDate, formatCurrency } from '@utils/formatting';
import { Order, OrderStatus } from '@types';
import { Edit2, Eye } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    loadOrders();
    loadStaff();
  }, [filter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const data = await orderService.getAllOrders({
        limit: 100,
      });
      const ordersArray = Array.isArray(data) ? data : data?.data || [];
      const filtered =
        filter === 'all'
          ? ordersArray
          : ordersArray.filter((o: any) => o.status === filter);
      setOrders(filtered);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const data = await staffService.getAllStaff({ limit: 100 });
      const staffArray = Array.isArray(data) ? data : data?.data || [];
      setStaff(staffArray);
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, status);
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const columns = [
    {
      key: '_id' as const,
      label: 'Order ID',
      render: (value: unknown) => `#${String(value).slice(0, 8)}`,
    },
    {
      key: 'customerName' as const,
      label: 'Customer',
    },
    {
      key: 'totalPrice' as const,
      label: 'Amount',
      render: (value: unknown) => formatCurrency(value as number),
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: unknown) => (
        <Badge variant={value === 'delivered' ? 'success' : 'primary'}>
          {ORDER_STATUS_LABELS[String(value)]}
        </Badge>
      ),
    },
    {
      key: 'createdAt' as const,
      label: 'Date',
      render: (value: unknown) => formatDate(String(value)),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Orders</h1>
        <p className="text-text-secondary mt-1">Manage all orders</p>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-wrap gap-2">
          {['all', 'pending', 'accepted', 'out_for_delivery', 'delivered', 'cancelled'].map(
            (status) => (
              <Button
                key={status}
                variant={filter === status ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter(status as any)}
              >
                {status === 'all'
                  ? 'All Orders'
                  : ORDER_STATUS_LABELS[status] || status}
              </Button>
            )
          )}
        </CardBody>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            Order List ({orders.length})
          </h3>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <Loading />
          ) : orders.length === 0 ? (
            <EmptyState message="No orders found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-text-primary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="border-b border-border hover:bg-accent">
                      <td className="px-6 py-4 text-sm font-mono">
                        #{String(order._id).slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-sm">{order.customerName}</td>
                      <td className="px-6 py-4 text-sm">
                        {formatCurrency(order.totalPrice)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge
                          variant={
                            order.status === 'delivered'
                              ? 'success'
                              : 'primary'
                          }
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 hover:bg-surface rounded transition-colors"
                          >
                            <Eye size={18} className="text-primary" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowAssignModal(true);
                            }}
                            className="p-2 hover:bg-surface rounded transition-colors"
                          >
                            <Edit2 size={18} className="text-primary" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
