import React, { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@components/Card";
import { Button } from "@components/Button";
import { Badge, Loading, EmptyState } from "@components/Common";
import { inventoryService } from "@services/inventory.service";
import { API_BASE_URL } from "@utils/api";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { getImageUrl } from "@/utils/formatting";

const emptyForm = {
  name: "",
  description: "",
  quantity: "",
  price: "",
  available: true,
  image: "",
};

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formAvailable, setFormAvailable] = useState(true);

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
      console.error("Error loading inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingItemId(null);
    setFormData(emptyForm);
    setFormFile(null);
    setFormAvailable(true);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (item: any) => {
    setEditingItemId(item._id);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      quantity: String(item.quantity ?? ""),
      price: String(item.price ?? ""),
      available: item.available ?? true,
      image: item.image || "",
    });
    setFormFile(null);
    setFormAvailable(item.available ?? true);
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItemId(null);
    setFormData(emptyForm);
    setFormError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Item name is required.");
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
        description: formData.description.trim(),
        quantity,
        price: formData.price.trim() ? Number(formData.price) : 0,
        available: formAvailable,
      };

      if (formFile) {
        (payload as any).image = formFile;
      }

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
      console.error("Save inventory item error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) {
      return;
    }

    try {
      await inventoryService.deleteInventoryItem(id);
      loadInventory();
    } catch (error) {
      console.error("Delete inventory item error:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Inventory</h1>
          <p className="text-text-secondary mt-1">
            Track and manage stock levels
          </p>
        </div>
        <Button onClick={openCreateForm} className="flex items-center gap-2">
          <Plus size={20} />
          Add Item
        </Button>
      </div>

      {/* Add Item Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {editingItemId ? "Edit Item" : "Add New Item"}
            </h3>
          </CardHeader>
          <CardBody>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {formError && (
                <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Item Name
                  </label>
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Price
                  </label>
                  <input
                    type="number"
                    placeholder="Price"
                    value={formData.price}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                    min={0}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Quantity
                  </label>
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={formData.quantity}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                    className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                    min={0}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Available
                  </label>
                  <select
                    value={formAvailable ? "true" : "false"}
                    onChange={(event) =>
                      setFormAvailable(event.target.value === "true")
                    }
                    className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Available</option>
                    <option value="false">Not Available</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Description
                  </label>
                  <textarea
                    placeholder="Description"
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary min-h-[120px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files ? e.target.files[0] : null;
                      setFormFile(f);
                    }}
                    className="border border-border rounded-lg px-2 py-1"
                  />
                  {formFile ? (
                    <img
                      src={URL.createObjectURL(formFile)}
                      alt="Preview"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : formData.image ? (
                    <img
                      src={getImageUrl(formData.image)}
                      alt="Current"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" isLoading={isSubmitting}>
                  {editingItemId ? "Update Item" : "Save"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
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
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-text-primary">
                      Available
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-text-primary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    return (
                      <tr
                        key={item._id}
                        className="border-b border-border hover:bg-accent"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-text-primary flex items-center gap-3">
                          <span>{item.name}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {item.image ? (
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-surface" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {item.description || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm">₹{item.price}</td>
                        <td className="px-6 py-4 text-sm">
                          {item.available ? (
                            <Badge variant="success">Yes</Badge>
                          ) : (
                            <Badge variant="danger">No</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditForm(item)}
                              className="p-2 hover:bg-surface rounded transition-colors"
                            >
                              <Edit2 size={18} className="text-primary" />
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="p-2 hover:bg-surface rounded transition-colors"
                            >
                              <Trash2 size={18} className="text-danger" />
                            </button>
                          </div>
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
