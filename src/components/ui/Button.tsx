import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-elbro-100 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-elbro-950 text-elbro-100 hover:bg-elbro-900 active:bg-elbro-950',
      secondary: 'bg-elbro-100 text-elbro-950 hover:bg-elbro-400 active:bg-elbro-100',
      ghost: 'bg-transparent text-elbro-100 hover:bg-elbro-900/50 active:bg-elbro-900/30',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
      outline: 'border-2 border-elbro-950 text-elbro-950 hover:bg-elbro-950 hover:text-elbro-100 active:bg-elbro-900',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm gap-1.5 min-h-[36px]',
      md: 'px-6 py-3 text-base gap-2 min-h-[44px]',
      lg: 'px-8 py-4 text-lg gap-2 min-h-[52px]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';