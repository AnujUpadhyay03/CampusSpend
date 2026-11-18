import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Flame,
  Plus,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP, QUICK_STUDENT_TAPS, type QuickTapPreset } from '../constants';
import { checkInStreak, createExpense } from '../services/firestoreService';
import type {
  BillSplit,
  CategoryBudget,
  Expense,
  ExpenseCategory,
  UserProfile,
} from '../types';
import {
  formatCompactInr,
  formatDateTimeShort,
  formatInr,
  getLocalDateKey,
  getMonthInfo,
  isSameDay,
  isSameMonth,
} from '../utils/format';

interface HomeViewProps {
  uid: string;
  profile: UserProfile;
  expenses: Expense[];
  categoryBudgets: CategoryBudget[];
  splits: BillSplit[];
  onEditExpense: (expense: Expense) => void;
  onNavigateSplits: () => void;
  onNavigateExpenses: () => void;
  onToast: (message: string) => void;
}

export function HomeView({
  uid,
  profile,
  expenses,
  categoryBudgets,
  splits,
  onEditExpense,
  onNavigateSplits,
  onNavigateExpenses,
  onToast,
}: HomeViewProps) {
  const [loggingTapId, setLoggingTapId] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const now = new Date();
  const { daysLeftIncludingToday, monthLabel } = getMonthInfo(now);
  const todayKey = getLocalDateKey(now);
  const streakCount = Math.min(7, Math.max(1, profile.streakDays ?? 1));
  const checkedInToday = profile.lastCheckInDate === todayKey;

  const monthlyExpenses = useMemo(
    () => expenses.filter((e) => isSameMonth(e.timestampMillis, now)),
    [expenses],
  );

  const totalSpentMonth = useMemo(
    () => monthlyExpenses.reduce((sum, e) => sum + e.amountInr, 0),
    [monthlyExpenses],
  );

  const todaySpent = useMemo(
    () =>
      monthlyExpenses
        .filter((e) => isSameDay(e.timestampMillis, now))
        .reduce((sum, e) => sum + e.amountInr, 0),
    [monthlyExpenses],
  );

  const allowance = profile.monthlyAllowanceInr || 8000;
  const remaining = allowance - totalSpentMonth;
  const spentPercent = allowance > 0 ? Math.round((totalSpentMonth / allowance) * 100) : 0;
  const safeDailyLimit = Math.max(0, remaining) / daysLeftIncludingToday;

  const isExceeded = remaining < 0;
  const isWarning = !isExceeded && spentPercent >= profile.alertThresholdPercent;

  // Per-category spending & warnings
  const categoryStats = useMemo(() => {
    const spentMap: Record<ExpenseCategory, number> = {
      'Food & Mess': 0,
      'Travel & Auto': 0,
      Shopping: 0,
      Subscriptions: 0,
      'Study & Books': 0,
      'Shared Hangout': 0,
      Other: 0,
    };
    for (const exp of monthlyExpenses) {
      spentMap[exp.category] = (spentMap[exp.category] || 0) + exp.amountInr;
    }

    const capMap = new Map<ExpenseCategory, number>();
    for (const b of categoryBudgets) {
      capMap.set(b.category, b.limitInr);
    }

    return CATEGORIES.map((cat) => {
      const spent = spentMap[cat.name] || 0;
      const cap = capMap.get(cat.name) ?? 0;
      const pct = cap > 0 ? Math.round((spent / cap) * 100) : 0;
      return {
        ...cat,
        spent,
        cap,
        pct,
        shareOfMonth: totalSpentMonth > 0 ? (spent / totalSpentMonth) * 100 : 0,
      };
    });
  }, [monthlyExpenses, categoryBudgets, totalSpentMonth]);

  const categoryAlerts = useMemo(
    () => categoryStats.filter((c) => c.cap > 0 && c.pct >= 90),
    [categoryStats],
  );

  // Splits net balances
  const { owedToYou, youOwe } = useMemo(() => {
    let receivable = 0;
    let payable = 0;
    for (const split of splits) {
      if (split.paidBy === 'ME') {
        for (const s of split.shares) {
          if (!s.settled) receivable += s.amountInr;
        }
      } else {
        const myRecord = split.shares.find((s) => s.friendId === split.payerFriendId);
        const settled = myRecord ? myRecord.settled : split.shares.every((s) => s.settled);
        if (!settled) payable += split.myShareInr;
      }
    }
    return { owedToYou: receivable, youOwe: payable };
  }, [splits]);

  // 7-Day Spend Pace
  const sevenDayPace = useMemo(() => {
    const days: Array<{ label: string; total: number; isToday: boolean }> = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const dayTotal = expenses
        .filter((e) => isSameDay(e.timestampMillis, d))
        .reduce((sum, e) => sum + e.amountInr, 0);
      days.push({
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        total: dayTotal,
        isToday: offset === 0,
      });
    }
    return days;
  }, [expenses]);

  const upiPercent = useMemo(() => {
    if (totalSpentMonth <= 0) return 0;
    const upiTotal = monthlyExpenses
      .filter((e) => e.paymentMethod === 'UPI')
      .reduce((sum, e) => sum + e.amountInr, 0);
    return Math.round((upiTotal / totalSpentMonth) * 100);
  }, [monthlyExpenses, totalSpentMonth]);

  const maxChartValue = useMemo(() => {
    const peakDay = Math.max(...sevenDayPace.map((d) => d.total), 0);
    return Math.max(peakDay, safeDailyLimit, 200);
  }, [sevenDayPace, safeDailyLimit]);

  const safeLineBottomPct = Math.min(95, Math.max(5, (safeDailyLimit / maxChartValue) * 100));

  const handleQuickTap = async (preset: QuickTapPreset) => {
    setLoggingTapId(preset.id);
    try {
      await createExpense(uid, {
        title: preset.title,
        amountInr: preset.amountInr,
        category: preset.category,
        paymentMethod: preset.paymentMethod,
        note: 'Quick Student Tap',
      });
      onToast(`Logged ${formatInr(preset.amountInr)} for ${preset.title}`);
    } finally {
      setLoggingTapId(null);
    }
  };

  const handleStreakClick = async () => {
    if (checkingIn) return;
    setCheckingIn(true);
    try {
      const updated = await checkInStreak(uid, profile.streakDays ?? 1, profile.lastCheckInDate);
      if (updated) {
        onToast('Daily budget check-in recorded!');
      } else {
        onToast(`Checked in today · ${streakCount}/7d streak active`);
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const recentExpenses = expenses.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Hi, {profile.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 flex items-center gap-2">
            <span>{profile.campusCity}</span>
            <span aria-hidden="true">·</span>
            <span>{profile.livingSetup}</span>
            <span aria-hidden="true">·</span>
            <span>{monthLabel}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleStreakClick}
          disabled={checkingIn}
          className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            checkedInToday
              ? 'border-teal-200 bg-teal-50 text-teal-800'
              : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
          title="Click to record today's budget check-in"
        >
          <Flame className="w-4 h-4 shrink-0" />
          <span className="tabular-currency">{streakCount}/7d streak</span>
        </button>
      </div>

      {/* Timely Spending Alert Banners */}
      {isExceeded && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3"
        >
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-rose-900">
              Monthly allowance exceeded by {formatInr(Math.abs(remaining))}
            </p>
            <p className="mt-0.5 text-xs text-rose-700">
              You have spent {formatInr(totalSpentMonth)} of your {formatInr(allowance)} monthly
              budget. Pause non-essential spends or settle pending friend splits.
            </p>
          </div>
        </div>
      )}

      {isWarning && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">
              Early Warning: {spentPercent}% of monthly allowance used
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              You crossed your {profile.alertThresholdPercent}% alert threshold. Keep daily spends
              under {formatInr(safeDailyLimit)} for the next {daysLeftIncludingToday} day(s).
            </p>
          </div>
        </div>
      )}

      {categoryAlerts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-slate-800">
              Category cap alert:{' '}
              {categoryAlerts
                .map((c) => `${c.name} (${c.pct}%)`)
                .join(', ')}
            </p>
          </div>
          <span className="text-xs text-slate-500">Review in Budget</span>
        </div>
      )}

      {/* Remaining This Month Hero Card + Splits Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section className="lg:col-span-8 rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#115E59] text-white p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs sm:text-sm font-medium text-teal-100">Remaining This Month</p>
              <span className="text-xs font-medium text-teal-100 tabular-currency whitespace-nowrap">
                {daysLeftIncludingToday} {daysLeftIncludingToday === 1 ? 'day' : 'days'} left
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-currency">
                {isExceeded ? `-${formatInr(Math.abs(remaining))}` : formatInr(remaining)}
              </p>
              <span className="text-xs font-medium text-teal-100 tabular-currency">
                {spentPercent}% of allowance spent
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-2.5 w-full rounded-full bg-teal-950/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isExceeded
                    ? 'bg-rose-400'
                    : isWarning
                      ? 'bg-amber-400'
                      : 'bg-emerald-300'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, spentPercent))}%` }}
              />
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-teal-100/80">Total Spent</p>
              <p className="mt-0.5 text-base font-bold tabular-currency">
                {formatInr(totalSpentMonth)}
              </p>
            </div>
            <div>
              <p className="text-xs text-teal-100/80">Safe Daily Limit</p>
              <p className="mt-0.5 text-base font-bold tabular-currency">
                {formatInr(safeDailyLimit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-teal-100/80">Today&apos;s Spend</p>
              <p className="mt-0.5 text-base font-bold tabular-currency">
                {formatInr(todaySpent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-teal-100/80">Monthly Allowance</p>
              <p className="mt-0.5 text-base font-bold tabular-currency">
                {formatInr(allowance)}
              </p>
            </div>
          </div>
        </section>

        {/* Hostel & Friend Splits Summary Card */}
        <section className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Hostel & Friend Splits</h2>
              <Users className="w-4 h-4 text-teal-700" />
            </div>
            <p className="mt-1 text-xs text-slate-500">Unsettled canteen & room bills</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3.5">
                <p className="text-xs font-medium text-emerald-800">Owed to you</p>
                <p className="mt-1 text-lg font-bold text-emerald-700 tabular-currency">
                  {formatInr(owedToYou)}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-3.5">
                <p className="text-xs font-medium text-rose-800">You owe</p>
                <p className="mt-1 text-lg font-bold text-rose-600 tabular-currency">
                  {formatInr(youOwe)}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateSplits}
            className="mt-5 w-full min-h-[42px] inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            <span>Manage & Settle Splits</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </button>
        </section>
      </div>

      {/* Quick Student Tap Strip */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Quick Student Tap</h2>
            <p className="text-xs text-slate-500">1-click logging for everyday campus spends</p>
          </div>
        </div>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {QUICK_STUDENT_TAPS.map((preset) => {
            const busy = loggingTapId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={busy}
                onClick={() => handleQuickTap(preset)}
                className="shrink-0 min-h-[44px] inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                  {preset.title}
                </span>
                <span className="text-xs font-bold text-teal-700 tabular-currency whitespace-nowrap">
                  {busy ? '...' : formatInr(preset.amountInr)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 7-Day Spend Pace + Where Your Money Goes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 7-Day Spend Pace Chart */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">7-Day Spend Pace</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Dashed line shows Safe Daily Limit ({formatInr(safeDailyLimit)})
              </p>
            </div>
            <span className="text-xs font-semibold text-teal-700 tabular-currency whitespace-nowrap">
              {upiPercent}% UPI
            </span>
          </div>

          <div className="mt-6 relative h-44 flex items-end justify-between gap-2 pt-4">
            {/* Dashed Safe Daily Limit Reference Line */}
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500/80 pointer-events-none z-10"
              style={{ bottom: `${safeLineBottomPct}%` }}
            >
              <span className="absolute -top-5 right-0 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded tabular-currency">
                Safe {formatCompactInr(safeDailyLimit)}
              </span>
            </div>

            {sevenDayPace.map((day) => {
              const heightPct = Math.max(4, Math.round((day.total / maxChartValue) * 100));
              const overLimit = safeDailyLimit > 0 && day.total > safeDailyLimit;
              return (
                <div
                  key={day.label}
                  className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group"
                >
                  <span className="text-[10px] font-medium text-slate-500 tabular-currency opacity-85 group-hover:opacity-100">
                    {day.total > 0 ? formatCompactInr(day.total) : '₹0'}
                  </span>
                  <div className="w-full max-w-[34px] flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        overLimit
                          ? 'bg-rose-500'
                          : day.isToday
                            ? 'bg-teal-700'
                            : 'bg-teal-500/75'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${day.label}: ${formatInr(day.total)}`}
                    />
                  </div>
                  <span
                    className={`text-[11px] whitespace-nowrap ${
                      day.isToday ? 'font-bold text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Where Your Money Goes */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Where Your Money Goes</h2>
              <p className="mt-0.5 text-xs text-slate-500">This month&apos;s category share</p>
            </div>
            <span className="text-xs font-semibold text-slate-700 tabular-currency">
              {formatInr(totalSpentMonth)}
            </span>
          </div>

          {/* Stacked Proportion Bar */}
          <div className="mt-4 h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
            {totalSpentMonth > 0 ? (
              categoryStats
                .filter((c) => c.spent > 0)
                .map((c) => (
                  <div
                    key={c.id}
                    style={{ width: `${c.shareOfMonth}%`, backgroundColor: c.color }}
                    title={`${c.name}: ${formatInr(c.spent)}`}
                  />
                ))
            ) : (
              <div className="w-full bg-slate-200" />
            )}
          </div>

          <div className="mt-4 space-y-2.5">
            {categoryStats
              .slice()
              .sort((a, b) => b.spent - a.spent)
              .slice(0, 5)
              .map((cat) => (
                <div key={cat.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium text-slate-800 truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 tabular-currency">
                    <span className="text-slate-500">
                      {totalSpentMonth > 0 ? `${Math.round(cat.shareOfMonth)}%` : '0%'}
                    </span>
                    <span className="font-semibold text-slate-900 w-20 text-right">
                      {formatInr(cat.spent)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>

      {/* Recent Expenses */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recent Expenses</h2>
          <button
            type="button"
            onClick={onNavigateExpenses}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-900">No expenses logged yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Use Quick Student Tap above or tap Log Expense to record your first spend.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentExpenses.map((exp) => {
              const catMeta = CATEGORY_MAP[exp.category];
              return (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => onEditExpense(exp)}
                  className="w-full px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{exp.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      <span style={{ color: catMeta?.color || '#0F766E' }} className="font-medium">
                        {exp.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{exp.paymentMethod}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDateTimeShort(exp.timestampMillis)}</span>
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 tabular-currency shrink-0">
                    {formatInr(exp.amountInr)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
