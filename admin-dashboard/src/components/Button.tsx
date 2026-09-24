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
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2';

    const variantClass = {
      primary:
        'bg-primary text-white shadow-sm hover:bg-primary-dark active:scale-[0.98] disabled:bg-text-secondary',
      secondary:
        'border border-border bg-secondary text-text-primary shadow-sm hover:border-primary hover:bg-accent active:scale-[0.98] disabled:bg-surface',
      danger:
        'bg-danger text-white shadow-sm hover:bg-danger/90 active:scale-[0.98] disabled:bg-text-secondary',
      success:
        'bg-success text-white shadow-sm hover:bg-success/90 active:scale-[0.98] disabled:bg-text-secondary',
    };

    const sizeClass = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm md:text-base',
      lg: 'px-6 py-3 text-base',
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
