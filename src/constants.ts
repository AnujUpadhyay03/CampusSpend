import type { ExpenseCategory, LivingSetup, PaymentMethod } from './types';

export interface CategoryMeta {
  id: string;
  name: ExpenseCategory;
  shortName: string;
  color: string;
  bgLight: string;
  textDark: string;
  defaultRatio: number;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'food_mess',
    name: 'Food & Mess',
    shortName: 'Food',
    color: '#0F766E',
    bgLight: 'bg-teal-50',
    textDark: 'text-teal-800',
    defaultRatio: 0.35,
  },
  {
    id: 'travel_auto',
    name: 'Travel & Auto',
    shortName: 'Travel',
    color: '#0284C7',
    bgLight: 'bg-sky-50',
    textDark: 'text-sky-800',
    defaultRatio: 0.15,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    shortName: 'Shopping',
    color: '#D97706',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-800',
    defaultRatio: 0.15,
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    shortName: 'Subs',
    color: '#7C3AED',
    bgLight: 'bg-violet-50',
    textDark: 'text-violet-800',
    defaultRatio: 0.08,
  },
  {
    id: 'study_books',
    name: 'Study & Books',
    shortName: 'Study',
    color: '#2563EB',
    bgLight: 'bg-blue-50',
    textDark: 'text-blue-800',
    defaultRatio: 0.12,
  },
  {
    id: 'shared_hangout',
    name: 'Shared Hangout',
    shortName: 'Hangout',
    color: '#DB2777',
    bgLight: 'bg-pink-50',
    textDark: 'text-pink-800',
    defaultRatio: 0.10,
  },
  {
    id: 'other',
    name: 'Other',
    shortName: 'Other',
    color: '#64748B',
    bgLight: 'bg-slate-100',
    textDark: 'text-slate-700',
    defaultRatio: 0.05,
  },
];

export const CATEGORY_MAP: Record<ExpenseCategory, CategoryMeta> = CATEGORIES.reduce(
  (acc, item) => {
    acc[item.name] = item;
    return acc;
  },
  {} as Record<ExpenseCategory, CategoryMeta>,
);

export const LIVING_SETUPS: LivingSetup[] = ['Hostel / PG', 'Shared Flat', 'Day Scholar'];

export const ALLOWANCE_PRESETS = [5000, 8000, 12000];

export const QUICK_INCREMENTS = [20, 50, 100, 200, 500];

export interface QuickTapPreset {
  id: string;
  title: string;
  amountInr: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
}

export const QUICK_STUDENT_TAPS: QuickTapPreset[] = [
  {
    id: 'chai',
    title: 'Chai & Snacks',
    amountInr: 30,
    category: 'Food & Mess',
    paymentMethod: 'UPI',
  },
  {
    id: 'lunch',
    title: 'Canteen Lunch',
    amountInr: 90,
    category: 'Food & Mess',
    paymentMethod: 'UPI',
  },
  {
    id: 'auto',
    title: 'Auto Ride',
    amountInr: 40,
    category: 'Travel & Auto',
    paymentMethod: 'UPI',
  },
  {
    id: 'print',
    title: 'Stationery / Printouts',
    amountInr: 50,
    category: 'Study & Books',
    paymentMethod: 'CASH',
  },
  {
    id: 'coffee',
    title: 'Tapri Cold Coffee',
    amountInr: 70,
    category: 'Shared Hangout',
    paymentMethod: 'UPI',
  },
];

export function computeDefaultCategoryCaps(monthlyAllowanceInr: number): Array<{
  id: string;
  category: ExpenseCategory;
  limitInr: number;
}> {
  const safeAllowance = Math.max(500, Math.round(monthlyAllowanceInr));
  let allocated = 0;

  return CATEGORIES.map((cat, idx) => {
    if (idx === CATEGORIES.length - 1) {
      const remaining = Math.max(100, safeAllowance - allocated);
      return { id: cat.id, category: cat.name, limitInr: remaining };
    }
    const raw = safeAllowance * cat.defaultRatio;
    const rounded = Math.max(100, Math.round(raw / 50) * 50);
    allocated += rounded;
    return { id: cat.id, category: cat.name, limitInr: rounded };
  });
}
