import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@components/Card';
import { Button } from '@components/Button';
import { Badge, Loading, EmptyState } from '@components/Common';
import { staffService } from '@services/staff.service';
import { formatDate } from '@utils/formatting';
import { Trash2, Edit2, Plus } from 'lucide-react';

export const StaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Staff</h1>
          <p className="text-text-secondary mt-1">Manage delivery and support staff</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
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
              Add New Staff
            </h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Name"
                className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
              />
              <input
                type="email"
                placeholder="Email"
                className="border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary"
              />
              <input
                type="tel"
                placeholder="Phone"
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
                    <button className="p-2 hover:bg-surface rounded transition-colors">
                      <Edit2 size={18} className="text-primary" />
                    </button>
                    <button
                      onClick={() => deleteStaff(staff._id)}
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
