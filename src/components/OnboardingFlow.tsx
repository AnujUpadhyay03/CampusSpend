import React, { useState } from 'react';
import { BellRing, Check, GraduationCap, MapPin } from 'lucide-react';
import { ALLOWANCE_PRESETS, computeDefaultCategoryCaps, LIVING_SETUPS } from '../constants';
import { completeOnboarding } from '../services/firestoreService';
import type { LivingSetup } from '../types';
import { formatInr } from '../utils/format';
import { StudentHeroIllustration } from './Illustrations';

interface OnboardingFlowProps {
  uid: string;
  initialName: string;
  email: string;
  onSignOut: () => void;
}

export function OnboardingFlow({ uid, initialName, email, onSignOut }: OnboardingFlowProps) {
  const [name, setName] = useState(initialName || 'Student');
  const [campusCity, setCampusCity] = useState('Dehradun');
  const [livingSetup, setLivingSetup] = useState<LivingSetup>('Hostel / PG');
  const [monthlyAllowance, setMonthlyAllowance] = useState<number>(8000);
  const [customAllowanceText, setCustomAllowanceText] = useState<string>('8000');
  const [alertThreshold, setAlertThreshold] = useState<number>(80);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const previewCaps = computeDefaultCategoryCaps(monthlyAllowance);
  const thresholdRupees = Math.round((monthlyAllowance * alertThreshold) / 100);

  const handleSelectPreset = (amount: number) => {
    setMonthlyAllowance(amount);
    setCustomAllowanceText(String(amount));
  };

  const handleCustomChange = (val: string) => {
    setCustomAllowanceText(val);
    const parsed = Number(val);
    if (Number.isFinite(parsed) && parsed > 0) {
      setMonthlyAllowance(Math.min(10000000, Math.round(parsed)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!Number.isFinite(monthlyAllowance) || monthlyAllowance < 500) {
      setErrorMsg('Monthly allowance should be at least ₹500.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await completeOnboarding(uid, {
        name: name.trim(),
        email,
        campusCity: campusCity.trim() || 'Dehradun',
        livingSetup,
        monthlyAllowanceInr: monthlyAllowance,
        alertThresholdPercent: alertThreshold,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save your setup.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold">
              ₹
            </div>
            <span className="text-lg font-bold text-slate-900">CampusSpend</span>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-100 bg-teal-50/40">
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
              <p className="text-xs font-semibold text-teal-700">Step 1 of 1 · Student Setup</p>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
                Set up your monthly student budget
              </h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                We will pre-fill smart category caps across Food & Mess, Travel, Study, and Hangouts
                based on your monthly allowance. You can customize any cap anytime.
              </p>
            </div>
            <div className="lg:col-span-5 p-4 sm:p-6 flex items-center justify-center">
              <StudentHeroIllustration className="w-full max-w-[300px] h-auto" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="ob-name" className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Your Name
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="ob-name"
                    type="text"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Anuj Upadhyay"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ob-city" className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Campus / City
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="ob-city"
                    type="text"
                    required
                    maxLength={80}
                    value={campusCity}
                    onChange={(e) => setCampusCity(e.target.value)}
                    placeholder="Dehradun"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-800 mb-2">Living Setup</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LIVING_SETUPS.map((setup) => {
                  const active = livingSetup === setup;
                  return (
                    <button
                      key={setup}
                      type="button"
                      onClick={() => setLivingSetup(setup)}
                      className={`min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'border-teal-700 bg-teal-50 text-teal-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {active && <Check className="w-4 h-4 text-teal-700" />}
                      <span>{setup}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <div>
                <label
                  htmlFor="ob-allowance"
                  className="block text-sm font-semibold text-slate-800 mb-2"
                >
                  Monthly Allowance (₹)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {ALLOWANCE_PRESETS.map((preset) => {
                    const active = monthlyAllowance === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`min-h-[40px] px-4 py-2 rounded-xl border text-xs font-semibold tabular-currency transition-colors whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {formatInr(preset)}
                      </button>
                    );
                  })}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 tabular-currency">
                    ₹
                  </span>
                  <input
                    id="ob-allowance"
                    type="number"
                    min={500}
                    max={10000000}
                    required
                    value={customAllowanceText}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    className="w-full min-h-[44px] pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 tabular-currency focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="ob-threshold"
                    className="text-sm font-semibold text-slate-800 flex items-center gap-2"
                  >
                    <BellRing className="w-4 h-4 text-amber-600" />
                    Early Warning Alert
                  </label>
                  <span className="text-sm font-bold text-teal-700 tabular-currency">
                    {alertThreshold}% ({formatInr(thresholdRupees)})
                  </span>
                </div>
                <input
                  id="ob-threshold"
                  type="range"
                  min={60}
                  max={95}
                  step={5}
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(Number(e.target.value))}
                  className="w-full accent-teal-700 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1 tabular-currency">
                  <span>60%</span>
                  <span>80% (Recommended)</span>
                  <span>95%</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-700">
                  Auto-seeded Category Caps Preview
                </p>
                <p className="text-xs text-slate-500 tabular-currency">
                  Total {formatInr(monthlyAllowance)}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {previewCaps.map((cap) => (
                  <div
                    key={cap.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2"
                  >
                    <p className="text-xs text-slate-600 truncate">{cap.category}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900 tabular-currency">
                      {formatInr(cap.limitInr)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {submitting ? 'Creating Your Workspace...' : 'Start Tracking with CampusSpend'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
