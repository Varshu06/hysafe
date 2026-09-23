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
      'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2';

    const variantClass = {
      primary:
        'bg-gradient-to-r from-cyan-600 to-sky-700 text-white shadow-sm hover:from-cyan-700 hover:to-sky-800 active:scale-[0.98] disabled:bg-gray-400',
      secondary:
        'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:bg-gray-200',
      danger:
        'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-[0.98] disabled:bg-gray-400',
      success:
        'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] disabled:bg-gray-400',
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
