import React, { useState } from 'react';
import {
  Bell,
  Boxes,
  ChevronRight,
  Droplets,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const MENU_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Orders', path: '/orders', icon: ShoppingBag },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Staff', path: '/staff', icon: UserCog },
  { label: 'Inventory', path: '/inventory', icon: Boxes },
];

export const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col overflow-hidden
        border-r border-slate-200 bg-white text-slate-900 shadow-[8px_0_30px_rgba(15,23,42,0.06)]
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}
    >
      <button
        onClick={() => setIsOpen(false)}
        className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden"
      >
        <X size={20} />
      </button>

      <div className="border-b border-slate-100 px-6 py-6 bg-gradient-to-b from-cyan-50 to-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-200/80">
            <Droplets size={24} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">HySafe Admin</h1>
            <p className="text-xs text-slate-500">Operations console</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Live dashboard</p>
          <p className="mt-1 text-xs text-slate-600">Monitor orders, customers, staff, and inventory in one place.</p>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);

          return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setIsOpen(false)}
            className={`group mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                active ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
              }`}
            >
              <Icon size={18} />
            </span>
            <span className="flex-1">{item.label}</span>
            <ChevronRight size={16} className={active ? 'text-cyan-600' : 'text-slate-400'} />
          </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4 bg-white">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export const Navbar = ({ onMenuToggle }: { onMenuToggle: () => void }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <Menu size={24} />
        </button>
        <div className="hidden md:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">HySafe</p>
          <h2 className="text-lg font-semibold text-slate-900">Admin Dashboard</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 md:inline-flex">
          <Bell size={20} />
        </button>
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-700 text-sm font-semibold text-white shadow-sm">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-slate-900">
                {user?.name || 'Admin'}
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
                {user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="w-full rounded-xl px-4 py-3 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
