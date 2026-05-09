import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { Button } from '@components/Button';
import { Loading, EmptyState } from '@components/Common';
import { customerService } from '@services/customer.service';
import { formatDate } from '@utils/formatting';
import { Eye, Mail, Phone } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

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
                  <Button size="sm" fullWidth>
                    <Eye size={16} /> View Details
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
