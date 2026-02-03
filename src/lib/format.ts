import { format, parseISO, differenceInDays } from 'date-fns';

export function formatCurrency(amount: number | string | null | undefined): string {
  // Defensive handling: Supabase sometimes returns numeric strings
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  
  if (isNaN(numericAmount)) {
    return '£0.00';
  }
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'dd/MM/yyyy');
}

export function formatDateShort(dateString: string): string {
  return format(parseISO(dateString), 'dd MMM yyyy');
}

export function getDaysUntil(dateString: string): number {
  return differenceInDays(parseISO(dateString), new Date());
}

export function getNextPaymentDate(paymentDay: number): Date {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let nextPaymentDate = new Date(currentYear, currentMonth, paymentDay);
  
  if (today.getDate() > paymentDay) {
    nextPaymentDate = new Date(currentYear, currentMonth + 1, paymentDay);
  }
  
  return nextPaymentDate;
}

export function getDaysUntilPayment(paymentDay: number): number {
  const nextPayment = getNextPaymentDate(paymentDay);
  return differenceInDays(nextPayment, new Date());
}
