import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neon' | 'success' | 'warning' | 'danger' | 'neutral';
}

export function Badge({ children, className, variant = 'neon', ...props }: BadgeProps) {
  const variants = {
    neon: 'bg-[var(--gym-primary)] text-black font-black uppercase shadow-neon-subtle',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold',
    neutral: 'bg-[#1F1F24] text-zinc-300 border border-white/10 font-bold',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full px-3 py-1 text-[10px] tracking-wider',
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
