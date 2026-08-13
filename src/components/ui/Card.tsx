import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({ children, className, glow = false, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-3xl bg-[#141418] p-6 border border-white/5 shadow-2xl transition-all',
          glow && 'border-[var(--gym-primary)]/40 shadow-[0_0_20px_rgba(204,255,0,0.15)]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
