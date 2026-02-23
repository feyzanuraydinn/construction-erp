import React, { ButtonHTMLAttributes, ReactNode, memo } from 'react';
import type { IconType } from 'react-icons';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'ghost'
  | 'ghost-danger'
  | 'ghost-success'
  | 'ghost-warning'
  | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconType;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700',
  secondary:
    'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:active:bg-gray-500',
  success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  warning: 'bg-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:active:bg-gray-600',
  'ghost-danger':
    'bg-transparent text-gray-500 hover:text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 dark:active:bg-red-900/30',
  'ghost-success':
    'bg-transparent text-gray-500 hover:text-green-600 hover:bg-green-50 active:bg-green-100 dark:text-gray-400 dark:hover:text-green-400 dark:hover:bg-green-900/20 dark:active:bg-green-900/30',
  'ghost-warning':
    'bg-transparent text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 active:bg-yellow-100 dark:text-gray-400 dark:hover:text-yellow-400 dark:hover:bg-yellow-900/20 dark:active:bg-yellow-900/30',
  outline:
    'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
  icon: 'p-2',
};

export const Button = memo(function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  className = '',
  ...props
}: ButtonProps) {
  const isIconOnly = size === 'icon' || (Icon && !children);
  const iconSize = size === 'xs' ? 14 : size === 'sm' ? 16 : 18;

  // Auto-derive aria-label from title for icon-only buttons (accessibility)
  const ariaLabel = isIconOnly && !props['aria-label'] && props.title
    ? props.title
    : props['aria-label'];

  return (
    <button
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg font-medium transition-all duration-200
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      {...props}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : isIconOnly && Icon ? (
        <Icon size={iconSize} />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={iconSize} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={iconSize} />}
        </>
      )}
    </button>
  );
});
