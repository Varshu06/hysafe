import React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

export const Loading = () => (
  <div className="flex h-72 items-center justify-center">
    <div className="rounded-3xl border border-slate-200 bg-white/80 px-8 py-10 text-center shadow-sm backdrop-blur-sm">
      <Loader2 className="mx-auto mb-4 animate-spin text-primary" size={30} />
      <p className="text-sm font-medium text-slate-500">Loading data...</p>
    </div>
  </div>
);

export const EmptyState = ({ message = 'No data found' }: { message?: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 px-8 py-10 text-center shadow-sm">
      <Inbox className="mx-auto mb-3 text-slate-400" size={30} />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  </div>
);

export const ErrorState = ({ message = 'An error occurred' }: { message?: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="rounded-3xl border border-rose-200 bg-rose-50/80 px-8 py-10 text-center shadow-sm">
      <AlertCircle className="mx-auto mb-3 text-rose-500" size={30} />
      <p className="text-sm font-medium text-rose-700">{message}</p>
    </div>
  </div>
);

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
}) => {
  const variantClass = {
    primary: 'bg-primary text-white',
    success: 'bg-success text-white',
    warning: 'bg-warning text-white',
    danger: 'bg-danger text-white',
    secondary: 'bg-surface text-primary',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variantClass[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Divider = () => <div className="border-t border-border my-4" />;
