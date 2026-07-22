import { CardBody, CardHeader } from '@components/Card';
import { EmptyState, Loading } from '@components/Common';
import { customerService } from '@services/customer.service';
import { formatDate } from '@utils/formatting';
import { Eye, MoreVertical, Search, X, } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from "react-dom";

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [menu, setMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await customerService.getAllCustomers({ limit: 100 });
      const customerArray = Array.isArray(data) ? data : data?.data || [];
      setCustomers(customerArray);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      await customerService.deleteCustomer(customerToDelete._id);

      setShowDeleteModal(false);
      setCustomerToDelete(null);

      if (selectedCustomer?._id === customerToDelete._id) {
        setSelectedCustomer(null);
        setCustomerOrders([]);
      }

      loadCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  const handleViewDetails = async (customer: any) => {
    const customerId = customer.userId || customer._id;
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    setIsDetailsLoading(true);

    try {
      const [detailResponse, ordersResponse] = await Promise.all([
        customerService.getCustomerById(customerId).catch(() => customer),
        customerService.getCustomerOrders(customerId).catch(() => []),
      ]);

      const detail = detailResponse && !Array.isArray(detailResponse)
        ? detailResponse
        : customer;
      const orders = Array.isArray(ordersResponse)
        ? ordersResponse
        : ordersResponse?.data || [];

      setSelectedCustomer(detail);
      setCustomerOrders(orders);
    } catch (error) {
      console.error('Error loading customer details:', error);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name?.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Customers</h1>
        <p className="text-text-secondary mt-1">
          Manage customer profiles and information
        </p>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">

        <div className="p-5 border-b flex items-center justify-between">

          <div className="relative w-80">

            <Search
              className="absolute left-3 top-3 text-gray-400"
              size={18}
            />

            <input
              className="pl-10 pr-4 py-2 w-full border rounded-lg"
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

          </div>

        </div>

        {isLoading ? (

          <Loading />

        ) : filteredCustomers.length === 0 ? (

          <EmptyState description="No customers found" />

        ) : (
          <>

            <table className="w-full">

              <thead className="bg-gray-50">

                <tr>

                  <th className="text-left px-6 py-4">Name</th>

                  <th className="text-left px-6 py-4">Phone</th>

                  <th className="text-left px-6 py-4">Type</th>

                  <th className="text-left px-6 py-4">Joined</th>

                  <th className="text-center px-6 py-4">Action</th>

                </tr>

              </thead>

              <tbody>

                {filteredCustomers.map(customer => (

                  <tr
                    key={customer._id}
                    className="border-t hover:bg-gray-50"
                  >

                    <td className="px-6 py-4 font-medium">
                      {customer.name}
                    </td>

                    <td className="px-6 py-4">
                      {customer.phone}
                    </td>

                    <td className="px-6 py-4">
                      {customer.customerType || "Home"}
                    </td>

                    <td className="px-6 py-4">
                      {formatDate(customer.createdAt)}
                    </td>

                    <td className="px-6 py-4 text-center relative">

                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenu({
                            id: customer._id,
                            x: rect.right,
                            y: rect.bottom,
                          });
                        }}
                      >

                        <MoreVertical size={18} />

                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

            {menu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenu(null)}
                />

                {/* Popup */}
                <div
                  className="fixed z-50 w-48 rounded-xl border bg-white shadow-2xl"
                  style={{
                    top: menu.y + 6,
                    left: menu.x - 190,
                  }}
                >
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-100"
                    onClick={() => {
                      const customer = customers.find(
                        (c) => c._id === menu.id
                      );

                      if (customer) {
                        handleViewDetails(customer);
                      }

                      setMenu(null);
                    }}
                  >
                    <Eye size={18} />
                    View Details
                  </button>

                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50"
                    onClick={() => {
                      const customer = customers.find((c) => c._id === menu.id);

                      if (customer) {
                        setCustomerToDelete(customer);
                        setShowDeleteModal(true);
                      }

                      setMenu(null);
                    }}
                  >
                    Delete Customer
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {selectedCustomer &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="relative">
                <CardHeader>
                  <h2 className="text-xl font-semibold">
                    Customer Details
                  </h2>
                </CardHeader>

                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerOrders([]);
                  }}
                  className="absolute right-5 top-5 rounded-full p-2 hover:bg-gray-100"
                >
                  <X size={22} />
                </button>
              </div>
              <CardBody>
                {isDetailsLoading ? (
                  <Loading />
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-text-secondary">Name</p>
                        <p className="font-semibold text-text-primary">
                          {selectedCustomer.name}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-text-secondary">Phone</p>
                        <p className="font-semibold text-text-primary">
                          {selectedCustomer.phone || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-text-secondary">Email</p>
                        <p className="font-semibold text-text-primary break-all">
                          {selectedCustomer.email || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-text-secondary">Customer Type</p>
                        <p className="font-semibold text-text-primary">
                          {selectedCustomer.customerType || "Home"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-text-secondary">Payment Terms</p>
                        <p className="font-semibold text-text-primary">
                          {selectedCustomer.paymentTerms || "One-time"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-text-secondary">Address</p>
                        <p className="font-semibold text-text-primary">
                          {selectedCustomer.address || "Address not provided"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 text-base font-semibold text-text-primary">
                        Recent Orders ({customerOrders.length})
                      </h4>

                      {customerOrders.length > 0 && (
                        <div className="space-y-2">
                          {customerOrders.slice(0, 5).map((order: any) => (
                            <div
                              key={order._id}
                              className="flex items-center justify-between rounded-lg border border-border p-3"
                            >
                              <div>
                                <p className="font-medium text-text-primary">
                                  #{String(order._id).slice(0, 8)}
                                </p>
                                <p className="text-sm text-text-secondary">
                                  {formatDate(order.createdAt)}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="font-semibold text-text-primary">
                                  ₹{order.totalPrice || 0}
                                </p>

                                <p className="text-xs capitalize text-text-secondary">
                                  {(order.status || "pending").replaceAll("_", " ")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardBody>
            </div>
          </div>,
          document.body
        )}
      {showDeleteModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
            onClick={() => {
              setShowDeleteModal(false);
              setCustomerToDelete(null);
            }}
          >
            <div
              className="w-full max-w-md rounded-xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <h2 className="text-xl font-semibold text-red-600">
                  Delete Customer
                </h2>
              </CardHeader>

              <CardBody className="space-y-6">
                <p className="text-text-secondary">
                  Are you sure you want to delete
                  <span className="font-semibold text-text-primary">
                    {" "}
                    {customerToDelete?.name}
                  </span>
                  ?
                </p>

                <p className="text-sm text-red-500">
                  This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setCustomerToDelete(null);
                    }}
                    className="rounded-lg border border-border px-4 py-2 hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleDeleteCustomer}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </CardBody>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
