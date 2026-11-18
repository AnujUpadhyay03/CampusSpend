import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { CATEGORIES, QUICK_INCREMENTS } from '../constants';
import { createExpense, removeExpense, updateExpense } from '../services/firestoreService';
import type { Expense, ExpenseCategory, PaymentMethod } from '../types';
import { formatInr, toDatetimeLocalValue } from '../utils/format';

interface ExpenseModalProps {
  isOpen: boolean;
  uid: string;
  editingExpense: Expense | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const PAYMENT_MODES: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'UPI', label: 'UPI' },
  { id: 'CASH', label: 'Cash' },
  { id: 'CARD', label: 'Card' },
];

export function ExpenseModal({
  isOpen,
  uid,
  editingExpense,
  onClose,
  onSaved,
}: ExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Mess');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [note, setNote] = useState('');
  const [dateTimeText, setDateTimeText] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmountText(String(editingExpense.amountInr));
      setCategory(editingExpense.category);
      setPaymentMethod(editingExpense.paymentMethod);
      setNote(editingExpense.note || '');
      setDateTimeText(toDatetimeLocalValue(editingExpense.timestampMillis));
    } else {
      setTitle('');
      setAmountText('');
      setCategory('Food & Mess');
      setPaymentMethod('UPI');
      setNote('');
      setDateTimeText(toDatetimeLocalValue(Date.now()));
    }
    setConfirmDelete(false);
    setErrorMsg(null);
  }, [isOpen, editingExpense]);

  if (!isOpen) return null;

  const handleQuickIncrement = (delta: number) => {
    const current = Number(amountText);
    const next = (Number.isFinite(current) && current > 0 ? current : 0) + delta;
    setAmountText(String(next));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amountText);
    if (!title.trim()) {
      setErrorMsg('Please enter what you spent on.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Enter an amount greater than ₹0.');
      return;
    }

    const parsedTimestamp = dateTimeText ? new Date(dateTimeText).getTime() : Date.now();
    const safeTimestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now();

    setSaving(true);
    setErrorMsg(null);
    try {
      if (editingExpense) {
        await updateExpense(uid, editingExpense.id, {
          title: title.trim(),
          amountInr: parsedAmount,
          category,
          paymentMethod,
          note: note.trim(),
          timestampMillis: safeTimestamp,
        });
        onSaved(`Updated "${title.trim()}"`);
      } else {
        await createExpense(uid, {
          title: title.trim(),
          amountInr: parsedAmount,
          category,
          paymentMethod,
          note: note.trim(),
          timestampMillis: safeTimestamp,
        });
        onSaved(`Logged ${formatInr(parsedAmount)} for ${title.trim()}`);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingExpense) return;
    setSaving(true);
    try {
      await removeExpense(uid, editingExpense.id);
      onSaved(`Deleted "${editingExpense.title}"`);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to delete expense.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h2 id="expense-modal-title" className="text-base font-bold text-slate-900">
            {editingExpense ? 'Edit Expense' : 'Log New Expense'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="exp-amount" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-500 tabular-currency">
                ₹
              </span>
              <input
                id="exp-amount"
                type="number"
                step="any"
                min={1}
                max={10000000}
                required
                autoFocus={!editingExpense}
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="0"
                className="w-full min-h-[48px] pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xl font-bold text-slate-900 tabular-currency focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {QUICK_INCREMENTS.map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => handleQuickIncrement(inc)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-800 text-xs font-semibold text-slate-700 tabular-currency transition-colors cursor-pointer whitespace-nowrap"
                >
                  +₹{inc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="exp-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
              What did you spend on?
            </label>
            <input
              id="exp-title"
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mess Lunch, Maggi at Tapri, Auto to Campus"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Category</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const active = category === cat.name;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-medium text-left transition-colors truncate cursor-pointer ${
                      active
                        ? 'border-teal-700 bg-teal-50 text-teal-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Mode
              </span>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                {PAYMENT_MODES.map((pm) => {
                  const active = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-white text-teal-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="exp-dt" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date & Time
              </label>
              <input
                id="exp-dt"
                type="datetime-local"
                value={dateTimeText}
                onChange={(e) => setDateTimeText(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="exp-note" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Note (Optional)
            </label>
            <input
              id="exp-note"
              type="text"
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Roommate split, semester book, etc."
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {editingExpense ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {saving ? 'Saving...' : editingExpense ? 'Save Changes' : 'Save Expense'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
