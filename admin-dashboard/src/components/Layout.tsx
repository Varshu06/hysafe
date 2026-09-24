import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Boxes,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  Repeat,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AdminNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from '@services/notification.service';
import { socketService } from '@services/socket.service';
import hysafeLogo from '../../../src/assets/logo1.png';

const MENU_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Orders', path: '/orders', icon: ShoppingBag },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Staff', path: '/staff', icon: UserCog },
  { label: 'Inventory', path: '/inventory', icon: Boxes },
  { label: 'Recurring Deliveries', path: '/recurring-deliveries', icon: Repeat },
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
        border-r border-border bg-secondary text-text-primary shadow-[8px_0_30px_rgba(15,23,42,0.06)]
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}
    >
      <button
        onClick={() => setIsOpen(false)}
        className="absolute right-4 top-4 rounded-full p-2 text-text-secondary hover:bg-accent hover:text-text-primary md:hidden"
      >
        <X size={20} />
      </button>

      <div className="border-b border-border/70 bg-gradient-to-b from-accent to-secondary px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white shadow-sm ring-1 ring-border">
            <img src={hysafeLogo} alt="HySafe" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-text-primary">HySafe</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="rounded-2xl border border-border bg-accent px-4 py-3 text-sm text-text-primary">
          <p className="font-semibold text-text-primary">Live dashboard</p>
          <p className="mt-1 text-xs text-text-secondary">Monitor orders, customers, staff, and inventory in one place.</p>
        </div>
      </div>

      <nav className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
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
                ? 'bg-accent text-primary ring-1 ring-border'
                : 'text-text-secondary hover:bg-accent hover:text-text-primary'
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                active ? 'bg-primary text-white' : 'bg-surface text-text-secondary group-hover:bg-accent group-hover:text-primary'
              }`}
            >
              <Icon size={18} />
            </span>
            <span className="flex-1">{item.label}</span>
            <ChevronRight size={16} className={active ? 'text-primary' : 'text-text-secondary'} />
          </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/70 bg-secondary p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/20"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export const Navbar = ({ onMenuToggle }: { onMenuToggle: () => void }) => {
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState('');
  const notificationRef = useRef<HTMLDivElement>(null);
  const loadNotifications = useCallback(async () => {
    try { const data = await getNotifications(); setNotifications(data.notifications.filter(item => !item.isRead)); setUnreadCount(data.unreadCount); setNotificationError(''); }
    catch { setNotificationError('Unable to load notifications.'); }
  }, []);
  useEffect(() => { void loadNotifications(); }, [loadNotifications]);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!notificationRef.current?.contains(target)) setNotificationsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setNotificationsOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown); };
  }, []);
  useEffect(() => {
    const handleNotificationCreated = () => { void loadNotifications(); };
    socketService.on('notification-created', handleNotificationCreated);
    return () => socketService.off('notification-created', handleNotificationCreated);
  }, [loadNotifications]);
  const markRead = async (item: AdminNotification) => {
    try { if (!item.isRead) await markNotificationRead(item._id); setNotifications(rows => rows.filter(row => row._id !== item._id)); setUnreadCount(count => Math.max(0, count - (item.isRead ? 0 : 1))); }
    catch { setNotificationError('Unable to update notification.'); }
  };

  return (
    <nav className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-secondary/90 px-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-xl p-2 text-text-secondary hover:bg-accent md:hidden"
        >
          <Menu size={24} />
        </button>
        <div className="hidden md:block">
          <h2 className="text-lg font-semibold text-text-primary">Admin Dashboard</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationRef}>
          <button aria-label="Notifications" onClick={() => { setNotificationsOpen(open => !open); void loadNotifications(); }} className="relative hidden rounded-xl p-2 text-text-secondary hover:bg-accent md:inline-flex">
            <Bell size={20} />{unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {notificationsOpen && <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-secondary shadow-xl">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3"><strong>Notifications</strong>{unreadCount > 0 && <button className="text-xs font-semibold text-primary" onClick={async () => { try { await markAllNotificationsRead(); setNotifications([]); setUnreadCount(0); setNotificationError(''); } catch { setNotificationError('Unable to update notifications.'); } }}>Mark all as read</button>}</div>
            {notificationError ? <p className="p-4 text-sm text-danger">{notificationError}</p> : notifications.length ? <div className="max-h-80 overflow-y-auto">{notifications.map(item => <button key={item._id} onClick={async () => { await markRead(item); if (item.orderId) { setNotificationsOpen(false); navigate(`/orders?orderId=${encodeURIComponent(item.orderId)}`); } }} className={`block w-full border-b border-border/70 px-4 py-3 text-left text-sm hover:bg-accent ${item.isRead ? '' : 'bg-accent'}`}><span className="font-semibold">{item.title || (item.type === 'admin_new_order' ? 'New order' : item.type)}</span>{item.message && <span className="mt-1 block text-text-secondary">{item.message}</span>}<span className="mt-1 block text-xs text-text-secondary">{new Date(item.createdAt).toLocaleString()}</span></button>)}</div> : <p className="p-4 text-sm text-text-secondary">No notifications yet.</p>}
          </div>}
        </div>
      </div>
    </nav>
  );
};
