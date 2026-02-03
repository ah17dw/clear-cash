import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface AmountDisplayProps {
  amount: number | string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showSign?: boolean;
  className?: string;
}

const AmountDisplay = React.forwardRef<HTMLSpanElement, AmountDisplayProps>(
  ({ amount, size = 'md', showSign = false, className }, ref) => {
    // Defensive: handle string numbers from Supabase
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    const safeAmount = isNaN(numericAmount) ? 0 : numericAmount;
    const isPositive = safeAmount >= 0;
    const displayAmount = showSign && isPositive ? `+${formatCurrency(safeAmount)}` : formatCurrency(safeAmount);

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
          className,
        )}
      >
        {displayAmount}
      </span>
    );
  },
);

AmountDisplay.displayName = 'AmountDisplay';

export { AmountDisplay };
export default AmountDisplay;
export type { AmountDisplayProps };
