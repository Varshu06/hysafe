import React, { useState } from 'react';
import { Menu, X, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { storage } from '@utils/storage';

const MENU_ITEMS = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Orders', path: '/orders', icon: '📦' },
  { label: 'Customers', path: '/customers', icon: '👥' },
  { label: 'Staff', path: '/staff', icon: '👔' },
  { label: 'Inventory', path: '/inventory', icon: '📚' },
];

export const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      className={`
        fixed left-0 top-0 h-screen w-64 bg-primary text-white
        transform transition-transform duration-300 z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:relative md:block
      `}
    >
      {/* Close button for mobile */}
      <button
        onClick={() => setIsOpen(false)}
        className="md:hidden absolute top-4 right-4"
      >
        <X size={24} />
      </button>

      {/* Logo */}
      <div className="p-6 border-b border-primary-light">
        <div className="flex items-center gap-2">
          <BarChart3 size={28} />
          <div>
            <h1 className="text-xl font-bold">HySafe</h1>
            <p className="text-xs text-primary-light">Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3 flex-1">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition-colors mb-2"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-primary-light">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export const Navbar = ({ onMenuToggle }: { onMenuToggle: () => void }) => {
  const { user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-border h-16 flex items-center justify-between px-6 fixed right-0 top-0 left-0 md:left-64 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 hover:bg-surface rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        <h2 className="text-lg font-semibold text-text-primary hidden md:block">
          Admin Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-surface rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-text-primary">
                {user?.name || 'Admin'}
              </p>
              <p className="text-xs text-text-secondary">{user?.email}</p>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-border p-2">
              <div className="px-4 py-2 text-sm text-text-secondary border-b border-border">
                {user?.email}
              </div>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-surface rounded transition-colors text-danger">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
