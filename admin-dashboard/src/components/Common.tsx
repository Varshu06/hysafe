import React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

export const Loading = () => (
  <div className="flex h-72 items-center justify-center">
    <div className="rounded-xl border border-border bg-white px-8 py-10 text-center shadow-sm">
      <Loader2 className="mx-auto mb-4 animate-spin text-primary" size={30} />
      <p className="text-sm font-medium text-text-secondary">Loading data...</p>
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
      <Inbox className="mx-auto mb-3 text-text-secondary" size={30} />

      <h3 className="text-lg font-semibold text-text-primary">
        {title}
      </h3>

      <p className="mt-2 text-sm text-text-secondary">
        {description}
      </p>
    </div>
  </div>
);

export const ErrorState = ({ message = 'An error occurred' }: { message?: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="rounded-xl border border-danger bg-danger/10 px-8 py-10 text-center shadow-sm">
      <AlertCircle className="mx-auto mb-3 text-danger" size={30} />
      <p className="text-sm font-medium text-danger">{message}</p>
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
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    secondary: 'bg-surface text-text-secondary',
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
