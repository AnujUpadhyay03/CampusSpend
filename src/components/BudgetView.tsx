import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  Edit3,
  LogOut,
  Sparkles,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import { CATEGORIES, LIVING_SETUPS } from '../constants';
import {
  toggleProTrial,
  updateCategoryCap,
  updateProfileSettings,
} from '../services/firestoreService';
import type {
  CategoryBudget,
  Expense,
  ExpenseCategory,
  LivingSetup,
  UserProfile,
} from '../types';
import { formatInr, getLocalDateKey, getMonthInfo, isSameMonth } from '../utils/format';

interface BudgetViewProps {
  uid: string;
  profile: UserProfile;
  expenses: Expense[];
  categoryBudgets: CategoryBudget[];
  onSignOut: () => void;
  onToast: (message: string) => void;
}

export function BudgetView({
  uid,
  profile,
  expenses,
  categoryBudgets,
  onSignOut,
  onToast,
}: BudgetViewProps) {
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [allowanceInput, setAllowanceInput] = useState(String(profile.monthlyAllowanceInr));
  const [savingAllowance, setSavingAllowance] = useState(false);

  const [thresholdLocal, setThresholdLocal] = useState<number>(profile.alertThresholdPercent);
  const [savingThreshold, setSavingThreshold] = useState(false);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState<string>('');
  const [savingCat, setSavingCat] = useState(false);

  const [editProfileMode, setEditProfileMode] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [cityInput, setCityInput] = useState(profile.campusCity);
  const [livingInput, setLivingInput] = useState<LivingSetup>(profile.livingSetup);
  const [savingProfile, setSavingProfile] = useState(false);

  const [togglingTrial, setTogglingTrial] = useState(false);

  const now = new Date();
  const { currentDay, daysInMonth } = getMonthInfo(now);

  const monthlyExpenses = useMemo(
    () => expenses.filter((e) => isSameMonth(e.timestampMillis, now)),
    [expenses],
  );

  const totalSpentMonth = useMemo(
    () => monthlyExpenses.reduce((sum, e) => sum + e.amountInr, 0),
    [monthlyExpenses],
  );

  const daysTracked = useMemo(() => {
    const uniqueDays = new Set<string>();
    for (const exp of monthlyExpenses) {
      uniqueDays.add(getLocalDateKey(new Date(exp.timestampMillis)));
    }
    return uniqueDays.size;
  }, [monthlyExpenses]);

  const avgPerDay = currentDay > 0 ? totalSpentMonth / currentDay : 0;
  const monthForecast = Math.round(avgPerDay * daysInMonth);

  const categorySpentMap = useMemo(() => {
    const map: Record<ExpenseCategory, number> = {
      'Food & Mess': 0,
      'Travel & Auto': 0,
      Shopping: 0,
      Subscriptions: 0,
      'Study & Books': 0,
      'Shared Hangout': 0,
      Other: 0,
    };
    for (const e of monthlyExpenses) {
      map[e.category] = (map[e.category] || 0) + e.amountInr;
    }
    return map;
  }, [monthlyExpenses]);

  const topCategory = useMemo(() => {
    let bestName: string = 'None yet';
    let bestAmount = 0;
    for (const cat of CATEGORIES) {
      const val = categorySpentMap[cat.name] || 0;
      if (val > bestAmount) {
        bestAmount = val;
        bestName = cat.name;
      }
    }
    return { name: bestName, amount: bestAmount };
  }, [categorySpentMap]);

  const budgetByCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, CategoryBudget>();
    for (const b of categoryBudgets) {
      map.set(b.category, b);
    }
    return map;
  }, [categoryBudgets]);

  const handleSaveAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(allowanceInput);
    if (!Number.isFinite(val) || val < 500) return;
    setSavingAllowance(true);
    try {
      await updateProfileSettings(uid, { monthlyAllowanceInr: val });
      onToast(`Monthly allowance updated to ${formatInr(val)}`);
      setShowAllowanceModal(false);
    } finally {
      setSavingAllowance(false);
    }
  };

  const handleSaveThreshold = async () => {
    setSavingThreshold(true);
    try {
      await updateProfileSettings(uid, { alertThresholdPercent: thresholdLocal });
      onToast(`Warning alert threshold set to ${thresholdLocal}%`);
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleSaveCategoryCap = async (
    categoryId: string,
    categoryName: ExpenseCategory,
    existsAlready: boolean,
  ) => {
    const parsed = Number(editingCatValue);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setSavingCat(true);
    try {
      await updateCategoryCap(uid, categoryId, categoryName, parsed, existsAlready);
      setEditingCatId(null);
      onToast(`${categoryName} cap updated to ${formatInr(parsed)}`);
    } finally {
      setSavingCat(false);
    }
  };

  const handleToggleProTrial = async () => {
    setTogglingTrial(true);
    try {
      const next = !profile.proTrialActive;
      await toggleProTrial(uid, next);
      onToast(
        next
          ? '30-Day CampusSpend Pro Student Beta Trial activated!'
          : 'Switched back to CampusSpend Free plan',
      );
    } finally {
      setTogglingTrial(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfileSettings(uid, {
        name: nameInput.trim() || profile.name,
        campusCity: cityInput.trim() || 'Dehradun',
        livingSetup: livingInput,
      });
      setEditProfileMode(false);
      onToast('Student profile saved');
    } finally {
      setSavingProfile(false);
    }
  };

  const warningRupees = Math.round((profile.monthlyAllowanceInr * thresholdLocal) / 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Budget & Insights</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Control your monthly allowance, category caps, alert thresholds, and student profile
        </p>
      </div>

      {/* Monthly Allowance & Alert Threshold */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">Monthly Allowance</p>
              <button
                type="button"
                onClick={() => {
                  setAllowanceInput(String(profile.monthlyAllowanceInr));
                  setShowAllowanceModal(true);
                }}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                <span>Edit Allowance</span>
              </button>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900 tabular-currency">
              {formatInr(profile.monthlyAllowanceInr)}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              Spent this month:{' '}
              <span className="font-semibold text-slate-800 tabular-currency">
                {formatInr(totalSpentMonth)}
              </span>
            </p>
          </div>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Budget Warning Alert</h2>
            </div>
            <span className="text-sm font-bold text-teal-700 tabular-currency">
              {thresholdLocal}% ({formatInr(warningRupees)})
            </span>
          </div>

          <input
            type="range"
            min={60}
            max={95}
            step={5}
            value={thresholdLocal}
            onChange={(e) => setThresholdLocal(Number(e.target.value))}
            aria-label="Budget warning alert threshold percentage"
            className="w-full accent-teal-700 cursor-pointer"
          />
          <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
            <span>60% (Early)</span>
            <span>80% (Balanced)</span>
            <span>95% (Late)</span>
          </div>

          {thresholdLocal !== profile.alertThresholdPercent && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={savingThreshold}
                onClick={handleSaveThreshold}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                {savingThreshold ? 'Saving...' : 'Save Threshold'}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Student Spending Insights */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-teal-700" />
          <h2 className="text-sm font-bold text-slate-900">Student Spending Insights</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Avg / Day</p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-currency">
              {formatInr(Math.round(avgPerDay))}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Month Forecast</p>
            <p
              className={`mt-1 text-xl font-bold tabular-currency ${
                monthForecast > profile.monthlyAllowanceInr ? 'text-rose-600' : 'text-teal-700'
              }`}
            >
              {formatInr(monthForecast)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Days Tracked</p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-currency">
              {daysTracked} / {daysInMonth}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Top Category</p>
            <p className="mt-1 text-base font-bold text-slate-900 truncate">{topCategory.name}</p>
            {topCategory.amount > 0 && (
              <p className="text-xs text-slate-500 tabular-currency">
                {formatInr(topCategory.amount)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Editable Category Caps */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Category Caps</h2>
            <p className="text-xs text-slate-500">
              Tap Edit on any category to adjust its monthly spending cap
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {CATEGORIES.map((cat) => {
            const budgetDoc = budgetByCategory.get(cat.name);
            const cap = budgetDoc?.limitInr ?? 0;
            const spent = categorySpentMap[cat.name] || 0;
            const pct = cap > 0 ? Math.round((spent / cap) * 100) : 0;
            const isEditing = editingCatId === cat.id;

            return (
              <div key={cat.id} className="px-6 py-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-xs shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm font-semibold text-slate-900">{cat.name}</span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={10000000}
                          value={editingCatValue}
                          onChange={(e) => setEditingCatValue(e.target.value)}
                          className="w-28 min-h-[36px] pl-6 pr-2.5 py-1 rounded-lg border border-teal-600 text-xs font-bold text-slate-900 tabular-currency focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={savingCat}
                        onClick={() =>
                          handleSaveCategoryCap(cat.id, cat.name, Boolean(budgetDoc))
                        }
                        className="min-h-[36px] px-3 py-1 rounded-lg bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 tabular-currency">
                        <span className="font-semibold text-slate-900">{formatInr(spent)}</span> /{' '}
                        {formatInr(cap)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatValue(String(cap));
                        }}
                        className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 100
                        ? 'bg-rose-500'
                        : pct >= 85
                          ? 'bg-amber-500'
                          : 'bg-teal-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CampusSpend Pro Beta Trial & Student Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-5 rounded-2xl border border-teal-200 bg-teal-50/50 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-700" />
                <h2 className="text-sm font-bold text-slate-900">CampusSpend Pro · ₹79/mo</h2>
              </div>
              <span className="text-xs font-semibold text-teal-800 tabular-currency">
                {profile.proTrialActive ? 'Beta Trial Active' : '30-Day Free Trial'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Try our student beta tier with semester-wide forecasting, custom category alerts, and
              priority campus tools—free for 30 days.
            </p>
          </div>

          <button
            type="button"
            disabled={togglingTrial}
            onClick={handleToggleProTrial}
            className={`mt-5 min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              profile.proTrialActive
                ? 'border border-teal-700 bg-white text-teal-800 hover:bg-teal-50'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            }`}
          >
            {profile.proTrialActive ? (
              <>
                <Check className="w-4 h-4" />
                <span>30-Day Student Beta Active (Tap to Pause)</span>
              </>
            ) : (
              <span>Start 30-Day Free Student Beta Trial</span>
            )}
          </button>
        </section>

        {/* Student Profile & Google Account */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-700" />
              <h2 className="text-sm font-bold text-slate-900">Student Profile & Google Account</h2>
            </div>

            {!editProfileMode && (
              <button
                type="button"
                onClick={() => {
                  setNameInput(profile.name);
                  setCityInput(profile.campusCity);
                  setLivingInput(profile.livingSetup);
                  setEditProfileMode(true);
                }}
                className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Edit Profile
              </button>
            )}
          </div>

          {editProfileMode ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Name
                  </label>
                  <input
                    id="prof-name"
                    type="text"
                    required
                    maxLength={80}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="prof-city" className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus / City
                  </label>
                  <input
                    id="prof-city"
                    type="text"
                    required
                    maxLength={80}
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Living Setup
                </span>
                <div className="flex flex-wrap gap-2">
                  {LIVING_SETUPS.map((setup) => (
                    <button
                      key={setup}
                      type="button"
                      onClick={() => setLivingInput(setup)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                        livingInput === setup
                          ? 'border-teal-700 bg-teal-50 text-teal-800 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {setup}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditProfileMode(false)}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-slate-500">Student Name</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{profile.name}</p>
                </div>
                <div>
                  <p className="text-slate-500">Campus / City</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{profile.campusCity}</p>
                </div>
                <div>
                  <p className="text-slate-500">Living Type</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{profile.livingSetup}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">Signed in with Google</p>
                  <p className="text-xs font-medium text-slate-800">{profile.email || 'Google Account'}</p>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Edit Monthly Allowance Dialog */}
      {showAllowanceModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-allowance-title"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 id="edit-allowance-title" className="text-base font-bold text-slate-900">
                Edit Monthly Allowance
              </h2>
              <button
                type="button"
                onClick={() => setShowAllowanceModal(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAllowance} className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="edit-allow-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Monthly Allowance (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-500">
                    ₹
                  </span>
                  <input
                    id="edit-allow-input"
                    type="number"
                    min={500}
                    max={10000000}
                    required
                    autoFocus
                    value={allowanceInput}
                    onChange={(e) => setAllowanceInput(e.target.value)}
                    className="w-full min-h-[46px] pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-lg font-bold text-slate-900 tabular-currency focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllowanceModal(false)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAllowance}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
                >
                  {savingAllowance ? 'Saving...' : 'Update Allowance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
