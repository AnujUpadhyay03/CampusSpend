export type LivingSetup = 'Hostel / PG' | 'Shared Flat' | 'Day Scholar';

export type ExpenseCategory =
  | 'Food & Mess'
  | 'Travel & Auto'
  | 'Shopping'
  | 'Subscriptions'
  | 'Study & Books'
  | 'Shared Hangout'
  | 'Other';

export type PaymentMethod = 'UPI' | 'CASH' | 'CARD';

export type NavTab = 'home' | 'expenses' | 'splits' | 'budget';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  campusCity: string;
  livingSetup: LivingSetup;
  monthlyAllowanceInr: number;
  alertThresholdPercent: number;
  onboardingCompleted: boolean;
  proTrialActive: boolean;
  proTrialStartedAtMillis?: number;
  streakDays?: number;
  lastCheckInDate?: string;
}

export interface Expense {
  id: string;
  ownerId: string;
  title: string;
  amountInr: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  note: string;
  timestampMillis: number;
  splitId?: string;
}

export interface CategoryBudget {
  id: string;
  ownerId: string;
  category: ExpenseCategory;
  limitInr: number;
}

export interface Friend {
  id: string;
  ownerId: string;
  name: string;
  hostelOrTag: string;
  upiHandle?: string;
}

export interface SplitShare {
  friendId: string;
  friendName: string;
  amountInr: number;
  settled: boolean;
}

export interface BillSplit {
  id: string;
  ownerId: string;
  title: string;
  totalAmountInr: number;
  paidBy: 'ME' | 'FRIEND';
  payerFriendId?: string;
  payerName: string;
  includeMyShare: boolean;
  myShareInr: number;
  linkedExpenseId?: string;
  shares: SplitShare[];
  timestampMillis: number;
}
