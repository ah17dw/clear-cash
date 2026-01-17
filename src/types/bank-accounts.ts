// Bank accounts for tagging expenses and income
export const BANK_ACCOUNTS = [
  { value: 'natwest', label: 'NatWest' },
  { value: 'chase_joint', label: 'Chase Joint' },
  { value: 'cc_ms', label: 'Credit Card MS' },
  { value: 'cc_nw', label: 'Credit Card NW' },
  { value: 'cc_chase', label: 'Credit Card Chase' },
  { value: 'cc_barclays', label: 'Credit Card Barclays' },
  { value: 'loan', label: 'Loan' },
] as const;

export type BankAccountValue = typeof BANK_ACCOUNTS[number]['value'];

// Helper to get label from value
export const getBankAccountLabel = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return BANK_ACCOUNTS.find(b => b.value === value)?.label ?? value;
};
