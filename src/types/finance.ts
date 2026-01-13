export interface Debt {
  id: string;
  user_id: string;
  name: string;
  type: string;
  lender: string | null;
  starting_balance: number;
  balance: number;
  apr: number;
  is_promo_0: boolean;
  promo_start_date: string | null;
  promo_end_date: string | null;
  post_promo_apr: number | null;
  payment_day: number | null;
  minimum_payment: number;
  planned_payment: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  user_id: string;
  debt_id: string;
  paid_on: string;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface SavingsAccount {
  id: string;
  user_id: string;
  name: string;
  provider: string | null;
  balance: number;
  aer: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsTransaction {
  id: string;
  user_id: string;
  savings_account_id: string;
  trans_on: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  note: string | null;
  created_at: string;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  monthly_amount: number;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseItem {
  id: string;
  user_id: string;
  name: string;
  monthly_amount: number;
  category: string | null;
  couples_mode?: boolean;
  renewal_date?: string | null;
  provider?: string | null;
  reminder_email?: boolean;
  reminder_sms?: boolean;
  reminder_days_before?: number;
  start_date?: string | null;
  end_date?: string | null;
  frequency?: 'monthly' | 'annual';
  created_at: string;
  updated_at: string;
}

export interface SubExpense {
  id: string;
  parent_expense_id: string;
  user_id: string;
  name: string;
  monthly_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceSummary {
  totalDebts: number;
  totalSavings: number;
  netPosition: number;
  monthlyIncoming: number;
  monthlyOutgoings: number;
  monthlySurplus: number;
}

export interface Alert {
  id: string;
  type: 'promo_ending' | 'payment_due' | 'high_apr' | 'monthly_payments' | 'upcoming_payments';
  title: string;
  description: string;
  severity: 'warning' | 'danger' | 'info';
  debtId?: string;
}

export const DEBT_TYPES = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'loan', label: 'Personal Loan' },
  { value: 'overdraft', label: 'Overdraft' },
  { value: 'bnpl', label: 'Buy Now Pay Later' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'car_finance', label: 'Car Finance' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'other', label: 'Other' },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Housing' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'transport', label: 'Transport' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'health', label: 'Health' },
  { value: 'other', label: 'Other' },
] as const;
