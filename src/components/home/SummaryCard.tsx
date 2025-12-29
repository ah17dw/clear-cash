import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'savings' | 'debt';
  className?: string;
}

export function SummaryCard({ 
  title, 
  icon, 
  children, 
  variant = 'default',
  className 
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        'finance-card animate-fade-in',
        variant === 'savings' && 'finance-card-savings',
        variant === 'debt' && 'finance-card-debt',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}
