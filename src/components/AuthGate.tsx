import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, BellRing, IndianRupee, Users } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { StudentHeroIllustration } from './Illustrations';

export function AuthGate() {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      const rawMsg = err instanceof Error ? err.message : '';
      const host = typeof window !== 'undefined' ? window.location.hostname : '';

      if (code === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
        setErrorMsg(
          `This domain (${host}) is not authorized for Firebase sign-in yet. Add "${host}" in Firebase Console → Authentication → Settings → Authorized domains.`,
        );
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Sign-in popup was blocked by your browser. Please allow popups and try again.');
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in was cancelled before completing.');
      } else {
        setErrorMsg(rawMsg || 'Unable to sign in with Google. Please try again.');
      }
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-base">
              ₹
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">CampusSpend</span>
          </div>
          <span className="text-xs font-medium text-slate-500 hidden sm:inline whitespace-nowrap">
            Student Allowance & Expense Tracker
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-teal-700">
                Built for college & hostel life
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
                Stretch your monthly allowance without end-of-month stress.
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                Track daily UPI, cash, and card spends in seconds, monitor category caps, and split
                hostel or canteen bills with friends.
              </p>

              <div className="mt-6 space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Safe Daily Limit</p>
                    <p className="text-xs text-slate-600">
                      Know exactly how much you can safely spend today based on days left in the month.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Early Overspending Alerts</p>
                    <p className="text-xs text-slate-600">
                      Get timely warnings at your chosen threshold before your allowance runs dry.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Hostel & Friend Splits</p>
                    <p className="text-xs text-slate-600">
                      Split shared meals or cab rides and settle balances with one tap.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              {errorMsg && (
                <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700">
                  {errorMsg}
                </div>
              )}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                <span>{signingIn ? 'Signing in...' : 'Continue with Google'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="mt-2.5 text-xs text-slate-500 text-center">
                Your budget & expenses are synced privately to your Google account.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
            <StudentHeroIllustration className="w-full h-auto" />
            <div className="mt-6 grid grid-cols-3 gap-4 pt-5 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Quick Logging</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">1-Tap Chai & Mess</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Payment Modes</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">UPI · Cash · Card</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Currency</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900 tabular-currency">₹ INR (en-IN)</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 px-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        CampusSpend · Simple student personal finance
      </footer>
    </div>
  );
}
