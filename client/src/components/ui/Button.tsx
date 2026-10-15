import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-300 uppercase tracking-widest text-xs select-none disabled:opacity-50 disabled:cursor-not-allowed group';

  const sizeStyles = {
    sm: 'px-4 py-2 text-[11px] gap-2 rounded-full',
    md: 'px-6 py-3 text-xs gap-2.5 rounded-full',
    lg: 'px-8 py-4 text-xs gap-3 rounded-full',
  };

  const variantStyles = {
    primary: 'bg-white text-black hover:bg-zinc-200 active:scale-[0.98] border border-white',
    secondary: 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-100 backdrop-blur-md border border-zinc-700/60 hover:border-zinc-500 active:scale-[0.98]',
    outline: 'border border-zinc-700 hover:border-zinc-300 text-zinc-300 hover:text-white bg-transparent hover:bg-white/[0.04] active:scale-[0.98]',
    ghost: 'text-zinc-400 hover:text-white hover:bg-white/5 active:scale-[0.98]',
    danger: 'bg-zinc-900 text-red-400 border border-red-500/30 hover:bg-red-500/10 active:scale-[0.98]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="transition-transform duration-300 group-hover:-translate-x-0.5">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="transition-transform duration-300 group-hover:translate-x-0.5">{icon}</span>}
    </button>
  );
};
