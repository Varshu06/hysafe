import { Button } from '@components/Button';
import { Card, CardBody, CardHeader } from '@components/Card';
import { Badge, EmptyState, Loading } from '@components/Common';
import { staffService } from '@services/staff.service';
import { formatDate } from '@utils/formatting';
import { Edit2, Eye, MoreVertical, Plus, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from "react-dom";

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
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<any>(null);

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

  const deleteStaff = async () => {
    if (!staffToDelete) return;

    try {
      await staffService.deleteStaff(staffToDelete.userId || staffToDelete._id);

      setShowDeleteModal(false);
      setStaffToDelete(null);

      loadStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
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
  const handleViewStaff = (staff: any) => {
    setSelectedStaff(staff);
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

  const filteredStaff = staffList.filter(
    (staff) =>
      staff.name?.toLowerCase().includes(search.toLowerCase()) ||
      staff.phone?.includes(search) ||
      staff.email?.toLowerCase().includes(search.toLowerCase())
  );
  console.log(menu);
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
      {showForm &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="relative">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-text-primary">
                    {editingStaffId ? "Edit Staff" : "Add New Staff"}
                  </h2>
                </CardHeader>
              </div>
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
            </div>
          </div>,
          document.body
        )}

      {selectedStaff &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="relative">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-text-primary">
                    Staff Details
                  </h2>
                </CardHeader>

                <button
                  onClick={() => setSelectedStaff(null)}
                  className="absolute top-5 right-5 rounded-full p-2 hover:bg-gray-100"
                >
                  <X size={22} />
                </button>
              </div>

              <CardBody>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                      <p className="text-sm text-text-secondary">Name</p>
                      <p className="font-semibold text-text-primary">
                        {selectedStaff.name}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-text-secondary">Phone</p>
                      <p className="font-semibold text-text-primary">
                        {selectedStaff.phone || "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-text-secondary">Email</p>
                      <p className="font-semibold text-text-primary break-all">
                        {selectedStaff.email || "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-text-secondary">Status</p>
                      <Badge
                        variant={selectedStaff.isOnline ? "success" : "secondary"}
                      >
                        {selectedStaff.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm text-text-secondary">Role</p>
                      <p className="font-semibold text-text-primary">
                        Delivery Staff
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-text-secondary">Joined</p>
                      <p className="font-semibold text-text-primary">
                        {selectedStaff.createdAt
                          ? formatDate(selectedStaff.createdAt)
                          : "N/A"}
                      </p>
                    </div>

                  </div>
                </div>
              </CardBody>
            </div>
          </div>,
          document.body
        )}

      {/* Staff List */}
      <Card className="overflow-visible">
        <CardHeader>
          <div className="space-y-4">
            <div className="relative w-80">
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-2"
              />
            </div>

            {filteredStaff.length === 0 && (
              <h3 className="text-lg font-semibold text-text-primary">
                Staff Members (0)
              </h3>
            )}
          </div>
        </CardHeader>

        <CardBody>
          {isLoading ? (
            <Loading />
          ) : filteredStaff.length === 0 ? (
            <EmptyState description="No staff members found" />
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left">Name</th>
                    <th className="px-6 py-4 text-left">Phone</th>
                    <th className="px-6 py-4 text-left">Email</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStaff.map((staff) => (
                    <tr
                      key={staff._id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium">
                        {staff.name}
                      </td>

                      <td className="px-6 py-4">
                        {staff.phone}
                      </td>

                      <td className="px-6 py-4">
                        {staff.email || "N/A"}
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={staff.isOnline ? "success" : "secondary"}
                        >
                          {staff.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </td>

                      <td className="relative px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            setMenu(menu === (staff.userId || staff._id) ? null : (staff.userId || staff._id))
                          }
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
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenu(null)}
                  />

                  <div
                    className="fixed z-[9999] w-52 rounded-xl border bg-white shadow-xl"
                    style={{
                      top: 200,
                      left: 500,
                    }}
                  >
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-100"
                      onClick={() => {
                        const staff = staffList.find(
                          (s) => (s.userId || s._id) === menu
                        );

                        if (staff) {
                          handleViewStaff(staff);
                        }

                        setMenu(null);
                      }}
                    >
                      <Eye size={18} />
                      View Details
                    </button>

                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-100"
                      onClick={() => {
                        const staff = staffList.find(
                          (s) => (s.userId || s._id) === menu
                        );

                        if (staff) {
                          openEditForm(staff);
                        }

                        setMenu(null);
                      }}
                    >
                      <Edit2 size={18} />
                      Edit Staff
                    </button>
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        const staff = staffList.find(
                          (s) => (s.userId || s._id) === menu
                        );

                        if (staff) {
                          setStaffToDelete(staff);
                          setShowDeleteModal(true);
                        }

                        setMenu(null);
                      }}
                    >
                      <Trash2 size={18} />
                      Delete Staff
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </CardBody>
      </Card>
      {showDeleteModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
            onClick={() => {
              setShowDeleteModal(false);
              setStaffToDelete(null);
            }}
          >
            <div
              className="w-full max-w-md rounded-xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <h2 className="text-xl font-semibold text-red-600">
                  Delete Staff
                </h2>
              </CardHeader>

              <CardBody className="space-y-6">
                <p className="text-text-secondary">
                  Are you sure you want to delete
                  <span className="font-semibold text-text-primary">
                    {" "}
                    {staffToDelete?.name}
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
                      setStaffToDelete(null);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={deleteStaff}
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
