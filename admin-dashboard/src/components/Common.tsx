import React from 'react';

export const Loading = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-text-secondary">Loading...</p>
    </div>
  </div>
);

export const EmptyState = ({ message = 'No data found' }: { message?: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <p className="text-2xl mb-2">📭</p>
      <p className="text-text-secondary">{message}</p>
    </div>
  </div>
);

export const ErrorState = ({ message = 'An error occurred' }: { message?: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <p className="text-2xl mb-2">❌</p>
      <p className="text-danger">{message}</p>
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
      className={`px-3 py-1 rounded-full text-xs font-semibold ${variantClass[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Divider = () => <div className="border-t border-border my-4" />;
