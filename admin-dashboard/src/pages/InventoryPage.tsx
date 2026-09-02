import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { Button } from '@components/Button';
import { Badge, Loading, EmptyState } from '@components/Common';
import { inventoryService } from '@services/inventory.service';
import { formatDate } from '@utils/formatting';
import { AlertTriangle, Plus, Edit2, Trash2, X, MoreVertical } from 'lucide-react';
import { createPortal } from "react-dom";

const emptyForm = {
  name: "",
  volume: "",
  quantity: "",
  minStock: "",
  price: "",
  // default delivery charge to ""
  deliveryCharge: "",
  // availability toggle (true = available)
  available: true,
};

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [menu, setMenu] = useState<{
    id: string;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showConsumeStockModal, setShowConsumeStockModal] = useState(false);

  const [stockQuantity, setStockQuantity] = useState("");
  const [stockReason, setStockReason] = useState("");

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setIsLoading(true);

      const data = await inventoryService.getAllInventory({ limit: 100 });

      const itemsArray = Array.isArray(data) ? data : data?.data || [];

      console.table(
        itemsArray.map((item: any) => ({
          name: item.name,
          lastRestocked: item.lastRestocked,
          updatedAt: item.updatedAt,
        }))
      );

      setItems(itemsArray);
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingItemId(null);
    setFormData(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (item: any) => {
    setEditingItemId(item._id);
    setFormData({
      name: item.name || "",
      volume: item.volume || "",
      quantity: String(item.quantity ?? ""),
      minStock: String(item.minStock ?? ""),
      price: String(item.price ?? ""),
      deliveryCharge: String(item.deliveryCharge ?? "0"),
      available: item.available ?? true,
    });
    setFormError('');
    setShowForm(true);
  };


  const closeForm = () => {
    setShowForm(false);
    setEditingItemId(null);
    setFormData(emptyForm);
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.volume.trim()) {
      setFormError("Name and volume are required.");
      return;
    }

    const quantity = Number(formData.quantity);

    if (Number.isNaN(quantity) || quantity < 0) {
      setFormError("Quantity must be a valid non-negative number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        volume: formData.volume.trim(),
        quantity,
        minStock: Number(formData.minStock || 10),
        price: Number(formData.price),
        deliveryCharge: Number(formData.deliveryCharge || 0),
        available: formData.available !== undefined ? Boolean(formData.available) : undefined,
      };

      if (editingItemId) {
        await inventoryService.updateInventoryItem(editingItemId, payload);
      } else {
        await inventoryService.createInventoryItem(payload);
      }

      closeForm();
      loadInventory();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save inventory item.";

      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await inventoryService.deleteInventoryItem(itemToDelete._id);

      setShowDeleteModal(false);
      setItemToDelete(null);

      loadInventory();
    } catch (error) {
      console.error('Delete inventory item error:', error);
    }
  };
  const openAddStock = (item: any) => {
    setSelectedItem(item);
    setStockQuantity("");
    setStockReason("");
    setShowAddStockModal(true);
  };

  const openConsumeStock = (item: any) => {
    setSelectedItem(item);
    setStockQuantity("");
    setStockReason("");
    setShowConsumeStockModal(true);
  };
  const handleAddStock = async () => {
    if (!selectedItem) return;

    const qty = Number(stockQuantity);

    if (qty <= 0) return;

    await inventoryService.updateInventoryItem(selectedItem._id, {
      quantity: selectedItem.quantity + qty,
      lastRestocked: new Date(),
    });

    setShowAddStockModal(false);

    loadInventory();
  };
  const handleConsumeStock = async () => {
    if (!selectedItem) return;

    const qty = Number(stockQuantity);

    if (qty <= 0) return;

    if (qty > selectedItem.quantity) {
      alert("Not enough stock.");
      return;
    }

    await inventoryService.updateInventoryItem(selectedItem._id, {
      quantity: selectedItem.quantity - qty,
    });

    setShowConsumeStockModal(false);

    loadInventory();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Inventory</h1>
          <p className="text-text-secondary mt-1">Track and manage stock levels</p>
        </div>
        <Button
          onClick={openCreateForm}
          className="flex items-center gap-2"
        >
          <Plus size={20} />
          Add Item
        </Button>
      </div>

      {showForm &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-6"
            onClick={closeForm}
          >
            <div
              className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {editingItemId ? "Add Stock" : "Add New Item"}
                </h2>

                <button
                  onClick={closeForm}
                  className="rounded-lg p-2 hover:bg-gray-100 transition"
                >
                  <X size={20} />
                </button>
              </CardHeader>

              <CardBody>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {formError && (
                    <div className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <input
                      type="text"
                      placeholder="Item Name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((current) => ({
                          ...current,
                          name: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-primary"
                    />

                    <input
                      type="number"
                      placeholder="Quantity"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((current) => ({
                          ...current,
                          quantity: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-primary"
                      min={0}
                    />
                    <input
                      type="number"
                      placeholder="Minimum Stock"
                      value={formData.minStock}
                      onChange={(e) =>
                        setFormData((current) => ({
                          ...current,
                          minStock: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-primary"
                      min={0}
                    />

                    <input
                      type="text"
                      placeholder="Volume (20L)"
                      value={formData.volume}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          volume: e.target.value,
                        })
                      }
                      className="rounded-lg border border-border px-4 py-2"
                    />

                    <input
                      type="number"
                      placeholder="Delivery Charge"
                      value={formData.deliveryCharge}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryCharge: e.target.value,
                        })
                      }
                      className="rounded-lg border border-border px-4 py-2"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formData.available}
                        onChange={(e) =>
                          setFormData({ ...formData, available: e.target.checked })
                        }
                      />
                      <span className="text-sm">Available</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Price"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((current) => ({
                          ...current,
                          price: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-primary md:col-span-2"
                      min={0}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" isLoading={isSubmitting}>
                      {editingItemId ? "Update Item" : "Save"}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={closeForm}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardBody>
            </div>
          </div>,
          document.body
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
            <EmptyState description="No inventory items found" />
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
                      Price
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

                        <td className="px-6 py-4 text-sm font-medium">
                          ₹{Number(item.price || 0).toFixed(2)}
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
                        <td className="relative px-6 py-4 text-center">
                          <button
                            onClick={() =>
                              setMenu(menu?.id === item._id ? null : { id: item._id })
                            }
                          >
                            <MoreVertical size={18} />
                          </button>

                          {menu?.id === item._id && (
                            <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border bg-white shadow-xl">
                              <button
                                className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-100"
                                onClick={() => {
                                  openAddStock(item);
                                  setMenu(null);
                                }}
                              >
                                <Plus size={18} />
                                Add Stock
                              </button>
                              <button
                                className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-100"
                                onClick={() => {
                                  openConsumeStock(item);
                                  setMenu(null);
                                }}
                              >
                                <AlertTriangle size={18} />
                                Consume Stock
                              </button>
                              <button
                                className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-100"
                                onClick={() => {
                                  openEditForm(item);
                                  setMenu(null);
                                }}
                              >
                                <Edit2 size={18} />
                                Edit Item
                              </button>

                              <button
                                className="flex w-full items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setItemToDelete(item);
                                  setShowDeleteModal(true);
                                  setMenu(null);
                                }}
                              >
                                <Trash2 size={18} />
                                Delete Item
                              </button>
                            </div>
                          )}
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
      {showAddStockModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
            onClick={() => setShowAddStockModal(false)}
          >
            <div
              className="w-full max-w-md rounded-xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <h2 className="text-xl font-semibold">
                  Add Stock
                </h2>
              </CardHeader>

              <CardBody className="space-y-4">

                <p>
                  Current Stock:
                  <strong>
                    {" "}
                    {selectedItem?.quantity} {selectedItem?.unit}
                  </strong>
                </p>

                <input
                  type="number"
                  placeholder="Quantity"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2"
                />

                <input
                  placeholder="Reason"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2"
                />

                <div className="flex justify-end gap-2">

                  <Button
                    variant="secondary"
                    onClick={() => setShowAddStockModal(false)}
                  >
                    Cancel
                  </Button>

                  <Button onClick={handleAddStock}>
                    Add Stock
                  </Button>

                </div>

              </CardBody>
            </div>
          </div>,
          document.body
        )}
      {showConsumeStockModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
            onClick={() => setShowConsumeStockModal(false)}
          >
            <div
              className="w-full max-w-md rounded-xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <h2 className="text-xl font-semibold">
                  Consume Stock
                </h2>
              </CardHeader>

              <CardBody className="space-y-4">

                <p>
                  Current Stock:
                  <strong>
                    {" "}
                    {selectedItem?.quantity} {selectedItem?.unit}
                  </strong>
                </p>

                <input
                  type="number"
                  placeholder="Quantity Used"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2"
                />

                <input
                  placeholder="Reason"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2"
                />

                <div className="flex justify-end gap-2">

                  <Button
                    variant="secondary"
                    onClick={() => setShowConsumeStockModal(false)}
                  >
                    Cancel
                  </Button>

                  <Button onClick={handleConsumeStock}>
                    Update Stock
                  </Button>

                </div>

              </CardBody>
            </div>
          </div>,
          document.body
        )}
      {showDeleteModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-6"
            onClick={() => {
              setShowDeleteModal(false);
              setItemToDelete(null);
            }}
          >
            <div
              className="w-full max-w-md rounded-xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <h2 className="text-xl font-semibold text-red-600">
                  Delete Inventory Item
                </h2>
              </CardHeader>

              <CardBody className="space-y-6">
                <p className="text-text-secondary">
                  Are you sure you want to delete
                  <span className="font-semibold text-text-primary">
                    {" "}
                    {itemToDelete?.name}
                  </span>
                  ?
                </p>

                <p className="text-sm text-red-500">
                  This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setItemToDelete(null);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
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
