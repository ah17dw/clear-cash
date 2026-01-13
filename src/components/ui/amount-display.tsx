import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface AmountDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showSign?: boolean;
  className?: string;
}

const AmountDisplay = React.forwardRef<HTMLSpanElement, AmountDisplayProps>(
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
