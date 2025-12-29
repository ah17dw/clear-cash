import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface AmountDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showSign?: boolean;
  className?: string;
}

export function AmountDisplay({ 
  amount, 
  size = 'md', 
  showSign = false,
  className 
}: AmountDisplayProps) {
  const isPositive = amount >= 0;
  const displayAmount = showSign && isPositive ? `+${formatCurrency(amount)}` : formatCurrency(amount);
  
  return (
    <span
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
