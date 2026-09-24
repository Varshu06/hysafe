import React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

export const Loading = () => (
  <div className="flex h-72 items-center justify-center">
    <div className="rounded-xl border border-border bg-white px-8 py-10 text-center shadow-sm">
      <Loader2 className="mx-auto mb-4 animate-spin text-primary" size={30} />
      <p className="text-sm font-medium text-slate-500">Loading data...</p>
    </div>
  </div>
);
export const EmptyState = ({
  title = "No Data",
  description = "No data found",
}: {
  title?: string;
  description?: string;
}) => (
  <div className="flex h-64 items-center justify-center">
    <div className="rounded-xl border border-dashed border-border bg-white px-8 py-10 text-center shadow-sm">
      <Inbox className="mx-auto mb-3 text-slate-400" size={30} />

      <h3 className="text-lg font-semibold text-slate-700">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  </div>
);

export const ErrorState = ({ message = 'An error occurred' }: { message?: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-8 py-10 text-center shadow-sm">
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
    primary: 'bg-accent text-primary',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    secondary: 'bg-slate-100 text-slate-700',
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
