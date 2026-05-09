import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { Button } from '@components/Button';
import { Badge, Loading, EmptyState } from '@components/Common';
import { inventoryService } from '@services/inventory.service';
import { formatDate } from '@utils/formatting';
import { AlertTriangle, Plus, Edit2 } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const data = await inventoryService.getAllInventory({ limit: 100 });
      const itemsArray = Array.isArray(data) ? data : data?.data || [];
      setItems(itemsArray);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Inventory</h1>
          <p className="text-text-secondary mt-1">Track and manage stock levels</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <Plus size={20} />
          Add Item
        </Button>
      </div>

      {/* Add Item Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              Add New Item
            </h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Item Name"
                className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                placeholder="Quantity"
                className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Unit (kg, L, etc)"
                className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                placeholder="Min Stock"
                className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <Button>Save</Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            Stock Items ({items.length})
          </h3>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <Loading />
          ) : items.length === 0 ? (
            <EmptyState message="No inventory items found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Min Stock
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Last Restocked
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-text-primary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isLowStock = item.quantity < item.minStock;
                    return (
                      <tr
                        key={item._id}
                        className="border-b border-border hover:bg-accent"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-text-primary">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {item.minStock} {item.unit}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isLowStock ? (
                            <Badge variant="warning" className="flex items-center gap-1 w-fit">
                              <AlertTriangle size={14} />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="success">In Stock</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {item.lastRestocked
                            ? formatDate(item.lastRestocked)
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="p-2 hover:bg-surface rounded transition-colors">
                            <Edit2 size={18} className="text-primary" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
