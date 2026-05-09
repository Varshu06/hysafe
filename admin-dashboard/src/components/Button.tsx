import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClass =
      'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2';

    const variantClass = {
      primary:
        'bg-primary text-white hover:bg-primary-dark active:scale-95 disabled:bg-gray-400',
      secondary:
        'bg-surface text-primary hover:bg-border active:scale-95 disabled:bg-gray-200',
      danger:
        'bg-danger text-white hover:bg-red-600 active:scale-95 disabled:bg-gray-400',
      success:
        'bg-success text-white hover:bg-teal-600 active:scale-95 disabled:bg-gray-400',
    };

    const sizeClass = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`
          ${baseClass}
          ${variantClass[variant]}
          ${sizeClass[size]}
          ${fullWidth ? 'w-full' : ''}
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
