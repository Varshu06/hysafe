import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { Button } from '@components/Button';
import { Loading, EmptyState } from '@components/Common';
import { customerService } from '@services/customer.service';
import { formatCurrency, formatDate } from '@utils/formatting';
import { Eye, Mail, Phone } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Customers</h1>
        <p className="text-text-secondary mt-1">
          Manage customer profiles and information
        </p>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <Loading />
        ) : customers.length === 0 ? (
          <EmptyState message="No customers found" />
        ) : (
          customers.map((customer) => (
            <Card key={customer._id} className="hover:shadow-xl">
              <CardBody className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">
                      {customer.customerType || 'Residential'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                    {customer.name?.[0]?.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Mail size={16} />
                    <span>{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Phone size={16} />
                    <span>{customer.phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-text-secondary mb-2">
                    Joined {formatDate(customer.createdAt)}
                  </p>
                  <Button
                    size="sm"
                    fullWidth
                    onClick={() => handleViewDetails(customer)}
                  >
                    <Eye size={16} /> View Details
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {selectedCustomer && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">
                Customer Details
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerOrders([]);
                }}
              >
                Close
              </Button>
            </div>
          </CardHeader>
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
                      {selectedCustomer.phone || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Email</p>
                    <p className="font-semibold text-text-primary break-all">
                      {selectedCustomer.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Type</p>
                    <p className="font-semibold text-text-primary">
                      {selectedCustomer.customerType || 'home'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Payment Terms</p>
                    <p className="font-semibold text-text-primary">
                      {selectedCustomer.paymentTerms || 'one-time'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Address</p>
                    <p className="font-semibold text-text-primary">
                      {selectedCustomer.address || 'Address not provided'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-text-primary mb-3">
                    Recent Orders ({customerOrders.length})
                  </h4>
                  {customerOrders.length === 0 ? (
                    <EmptyState message="No orders found for this customer" />
                  ) : (
                    <div className="space-y-2">
                      {customerOrders.slice(0, 5).map((order) => (
                        <div
                          key={order._id}
                          className="p-3 border border-border rounded-lg flex items-center justify-between"
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
                              {formatCurrency(order.totalPrice || 0)}
                            </p>
                            <p className="text-xs text-text-secondary capitalize">
                              {(order.status || 'pending').replaceAll('_', ' ')}
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
        </Card>
      )}
    </div>
  );
};
