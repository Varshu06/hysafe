import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { Button } from '@components/Button';
import { Badge, Loading, EmptyState } from '@components/Common';
import { staffService } from '@services/staff.service';
import { Trash2, Edit2, Plus } from 'lucide-react';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  isOnline: false,
};

export const StaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setIsLoading(true);
      const data = await staffService.getAllStaff({ limit: 100 });
      const staffArray = Array.isArray(data) ? data : data?.data || [];
      setStaffList(staffArray);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStaff = async (id: string) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      try {
        await staffService.deleteStaff(id);
        loadStaff();
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  };

  const openCreateForm = () => {
    setEditingStaffId(null);
    setFormData(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (staff: any) => {
    setEditingStaffId(staff.userId || staff._id);
    setFormData({
      name: staff.name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      password: '',
      isOnline: !!staff.isOnline,
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingStaffId(null);
    setFormData(emptyForm);
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError('Name and phone are required.');
      return;
    }

    if (!editingStaffId && !formData.password.trim()) {
      setFormError('Password is required when adding staff.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        isOnline: formData.isOnline,
      };

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      if (editingStaffId) {
        await staffService.updateStaff(editingStaffId, payload);
      } else {
        await staffService.createStaff(payload);
      }

      closeForm();
      loadStaff();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to save staff member.';
      setFormError(message);
      console.error('Save staff error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Staff</h1>
          <p className="text-text-secondary mt-1">Manage delivery and support staff</p>
        </div>
        <Button
          onClick={openCreateForm}
          className="flex items-center gap-2"
        >
          <Plus size={20} />
          Add Staff
        </Button>
      </div>

      {/* Add Staff Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {editingStaffId ? 'Edit Staff' : 'Add New Staff'}
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
              <input
                type="text"
                placeholder="Name"
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
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                required
              />
              <input
                type="password"
                placeholder={editingStaffId ? 'New Password (optional)' : 'Password'}
                value={formData.password}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
                required={!editingStaffId}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={formData.isOnline}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    isOnline: event.target.checked,
                  }))
                }
                className="rounded border-border"
              />
              Mark as online
            </label>
            <div className="flex gap-2">
              <Button type="submit" isLoading={isSubmitting}>
                {editingStaffId ? 'Update Staff' : 'Save'}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancel
              </Button>
            </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Staff List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            Staff Members ({staffList.length})
          </h3>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <Loading />
          ) : staffList.length === 0 ? (
            <EmptyState message="No staff members found" />
          ) : (
            <div className="space-y-3">
              {staffList.map((staff) => (
                <div
                  key={staff._id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {staff.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-text-primary">
                        {staff.name}
                      </h4>
                      <p className="text-sm text-text-secondary">
                        {staff.phone}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {staff.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={staff.isOnline ? 'success' : 'secondary'}
                    >
                      {staff.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                    <button
                      onClick={() => openEditForm(staff)}
                      className="p-2 hover:bg-surface rounded transition-colors"
                    >
                      <Edit2 size={18} className="text-primary" />
                    </button>
                    <button
                      onClick={() => deleteStaff(staff.userId || staff._id)}
                      className="p-2 hover:bg-surface rounded transition-colors"
                    >
                      <Trash2 size={18} className="text-danger" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
