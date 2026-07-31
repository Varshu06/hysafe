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
import { Edit2, Eye, MoreVertical, X } from 'lucide-react';
import { createPortal } from "react-dom";

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('pending');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [menu, setMenu] = useState<{
    id: string;
  } | null>(null);

  useEffect(() => {
    setSelectedOrder(null);
    setShowAssignModal(false);
    setSelectedStaffId('');
    setSelectedStatus('pending');
    setFormError('');

    loadOrders();
    loadStaff();
  }, [filter]);

  useEffect(() => {
    if (
      selectedOrder &&
      !orders.some((order) => order._id === selectedOrder._id)
    ) {
      setSelectedOrder(null);
      setShowAssignModal(false);
    }
  }, [orders]);

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

  const openDetails = (order: Order) => {
    setSelectedOrder(order);
    setSelectedStatus(order.status);
    setSelectedStaffId(
      typeof order.assignedStaffId === 'string'
        ? order.assignedStaffId
        : (order.assignedStaffId as any)?._id || ''
    );
    setShowAssignModal(false);
    setFormError('');
  };

  const openAssignEditor = (order: Order) => {
    setSelectedOrder(order);
    setSelectedStatus(order.status);
    setSelectedStaffId(
      typeof order.assignedStaffId === 'string'
        ? order.assignedStaffId
        : (order.assignedStaffId as any)?._id || ''
    );
    setShowAssignModal(true);
    setFormError('');
  };

  const closeEditor = () => {
    setShowAssignModal(false);
    setSelectedOrder(null);
    setSelectedStaffId('');
    setSelectedStatus('pending');
    setFormError('');
  };

  const handleSaveAssignment = async () => {
    if (!selectedOrder) return;

    if (!selectedStaffId) {
      setFormError('Please select a staff member.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      await orderService.assignStaff(selectedOrder._id, selectedStaffId);
      if (selectedStatus && selectedStatus !== selectedOrder.status) {
        await orderService.updateOrderStatus(selectedOrder._id, selectedStatus);
      }
      closeEditor();
      loadOrders();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to update order.';
      setFormError(message);
      console.error('Error saving order assignment:', error);
    } finally {
      setIsSaving(false);
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
            <EmptyState description="No orders found" />
          ) : (
            <div className="overflow-visible">
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
                      <td className="relative px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            setMenu(menu?.id === order._id ? null : { id: order._id })
                          }
                        >
                          <MoreVertical size={18} />
                        </button>

                        {menu?.id === order._id && (
                          <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border bg-white shadow-xl">
                            <button
                              className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-100"
                              onClick={() => {
                                openDetails(order);
                                setMenu(null);
                              }}
                            >
                              <Eye size={18} />
                              View Details
                            </button>

                            <button
                              className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-100"
                              onClick={() => {
                                openAssignEditor(order);
                                setMenu(null);
                              }}
                            >
                              <Edit2 size={18} />
                              Update Order
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}


        </CardBody>
      </Card>

      {selectedOrder &&
        !showAssignModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-6"
            onClick={closeEditor}
          >
            <div
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Order Details</h2>

                <button
                  onClick={closeEditor}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </CardHeader>

              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><p className="text-text-secondary">Order ID</p><p className="font-semibold">#{String(selectedOrder._id).slice(0, 8)}</p></div>
                  <div><p className="text-text-secondary">Customer</p><p className="font-semibold">{selectedOrder.customerName}</p></div>
                  <div><p className="text-text-secondary">Amount</p><p className="font-semibold">{formatCurrency(selectedOrder.totalPrice)}</p></div>
                  <div><p className="text-text-secondary">Status</p><p className="font-semibold">{ORDER_STATUS_LABELS[selectedOrder.status]}</p></div>
                  <div><p className="text-text-secondary">Payment</p><p className="font-semibold capitalize">{selectedOrder.paymentMethod}</p></div>
                  <div><p className="text-text-secondary">Assigned Staff</p><p className="font-semibold">{selectedOrder.assignedStaffName || 'Unassigned'}</p></div>
                  <div className="md:col-span-2"><p className="text-text-secondary">Delivery Address</p><p className="font-semibold">{selectedOrder.deliveryAddress}</p></div>
                </div>
              </CardBody>
            </div>
          </div>,
          document.body
        )}

      {selectedOrder &&
        showAssignModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-6"
            onClick={closeEditor}
          >
            <div
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Assign / Update Order
                </h2>

                <button
                  onClick={closeEditor}
                  className="rounded-lg p-2 hover:bg-gray-100 transition"
                >
                  <X size={20} />
                </button>
              </CardHeader>

              <CardBody className="space-y-4">
                {formError && (
                  <div className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-text-primary">
                      Staff Member
                    </span>

                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select staff</option>

                      {staff.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name} - {member.phone}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-text-primary">
                      Status
                    </span>

                    <select
                      value={selectedStatus}
                      onChange={(e) =>
                        setSelectedStatus(e.target.value as OrderStatus)
                      }
                      className="w-full rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-primary"
                    >
                      {[
                        'pending',
                        'accepted',
                        'out_for_delivery',
                        'delivered',
                        'cancelled',
                      ].map((status) => (
                        <option key={status} value={status}>
                          {ORDER_STATUS_LABELS[status] || status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveAssignment} isLoading={isSaving}>
                    Save Changes
                  </Button>

                  <Button variant="secondary" onClick={closeEditor}>
                    Cancel
                  </Button>
                </div>
              </CardBody>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
