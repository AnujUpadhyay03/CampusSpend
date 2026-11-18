import React, { useMemo, useState } from 'react';
import { Copy, Plus, Search, Share2 } from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP } from '../constants';
import type { Expense, ExpenseCategory, PaymentMethod } from '../types';
import { formatDateTimeShort, formatInr } from '../utils/format';

interface ExpensesViewProps {
  expenses: Expense[];
  onOpenAdd: () => void;
  onEditExpense: (expense: Expense) => void;
  onToast: (message: string) => void;
}

const PAYMENT_FILTERS: Array<'ALL' | PaymentMethod> = ['ALL', 'UPI', 'CASH', 'CARD'];

export function ExpensesView({
  expenses,
  onOpenAdd,
  onEditExpense,
  onToast,
}: ExpensesViewProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ExpenseCategory>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<'ALL' | PaymentMethod>('ALL');

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return expenses.filter((exp) => {
      if (selectedCategory !== 'ALL' && exp.category !== selectedCategory) return false;
      if (selectedPayment !== 'ALL' && exp.paymentMethod !== selectedPayment) return false;
      if (q) {
        const hay = `${exp.title} ${exp.note} ${exp.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, searchText, selectedCategory, selectedPayment]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amountInr, 0),
    [filtered],
  );

  const handleShareOrCopy = async () => {
    const lines = filtered.slice(0, 25).map(
      (e) =>
        `• ${e.title} (${e.category} · ${e.paymentMethod}) — ${formatInr(e.amountInr)} [${formatDateTimeShort(e.timestampMillis)}]`,
    );
    const summaryText = `CampusSpend Expense Summary\nEntries: ${filtered.length} | Total: ${formatInr(filteredTotal)}\n\n${lines.join('\n')}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'CampusSpend Expense Summary',
          text: summaryText,
        });
        return;
      } catch {
        // User cancelled or unsupported; fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(summaryText);
      onToast('Expense summary copied to clipboard');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expenses Ledger</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 tabular-currency">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} · Total{' '}
            <span className="font-semibold text-slate-900">{formatInr(filteredTotal)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleShareOrCopy}
            disabled={filtered.length === 0}
            className="min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <Share2 className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>Share / Copy Summary</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdd}
            className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search title, note, or category..."
              className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
            {PAYMENT_FILTERS.map((pm) => {
              const active = selectedPayment === pm;
              const label = pm === 'ALL' ? 'All Modes' : pm === 'CASH' ? 'Cash' : pm === 'CARD' ? 'Card' : 'UPI';
              return (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setSelectedPayment(pm)}
                  className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    active ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`shrink-0 min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'border-teal-700 bg-teal-50 text-teal-800 font-semibold'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.name;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`shrink-0 min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-teal-700 bg-teal-50 text-teal-800 font-semibold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expense List */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-900">No matching expenses</p>
            <p className="mt-1 text-xs text-slate-500">
              {expenses.length === 0
                ? 'Start logging your daily UPI, cash, or card spends.'
                : 'Try clearing your search or switching category/payment filters.'}
            </p>
            <button
              type="button"
              onClick={onOpenAdd}
              className="mt-4 min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log First Expense</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((exp) => {
              const catMeta = CATEGORY_MAP[exp.category];
              return (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => onEditExpense(exp)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: catMeta?.color || '#0F766E' }}
                      />
                      <p className="text-sm font-semibold text-slate-900 truncate">{exp.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-slate-700">{exp.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{exp.paymentMethod}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDateTimeShort(exp.timestampMillis)}</span>
                      {exp.note && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-600 truncate max-w-[260px]">{exp.note}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <span className="text-sm sm:text-base font-bold text-slate-900 tabular-currency shrink-0">
                    {formatInr(exp.amountInr)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
