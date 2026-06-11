import { type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white border-ink hover:bg-[#273247]',
  secondary: 'bg-surface text-ink border-[#cbd2df] hover:bg-[#f3f5f9]',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-[#eef2f7]',
  danger: 'bg-[#b42318] text-white border-[#b42318] hover:bg-[#912018]'
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
