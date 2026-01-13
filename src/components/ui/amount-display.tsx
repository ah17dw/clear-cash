import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface AmountDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showSign?: boolean;
  className?: string;
}

export const AmountDisplay = forwardRef<HTMLSpanElement, AmountDisplayProps>(
  ({ amount, size = 'md', showSign = false, className }, ref) => {
    const isPositive = amount >= 0;
    const displayAmount = showSign && isPositive ? `+${formatCurrency(amount)}` : formatCurrency(amount);
    
    return (
      <span
        ref={ref}
        className={cn(
          'font-mono',
          size === 'lg' && 'amount-large',
          size === 'md' && 'amount-medium',
          size === 'sm' && 'amount-small',
          showSign && isPositive && 'text-savings',
          showSign && !isPositive && 'text-debt',
          className
        )}
      >
        {displayAmount}
      </span>
    );
  }
);

AmountDisplay.displayName = 'AmountDisplay';
