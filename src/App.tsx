import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AppShell } from './components/AppShell';
import { AuthGate } from './components/AuthGate';
import { BudgetView } from './components/BudgetView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ExpenseModal } from './components/ExpenseModal';
import { ExpensesView } from './components/ExpensesView';
import { HomeView } from './components/HomeView';
import { OnboardingFlow } from './components/OnboardingFlow';
import { SplitsView } from './components/SplitsView';
import { auth } from './firebase';
import {
  subscribeCategoryBudgets,
  subscribeExpenses,
  subscribeFriends,
  subscribeSplits,
  subscribeUserProfile,
} from './services/firestoreService';
import type {
  BillSplit,
  CategoryBudget,
  Expense,
  Friend,
  NavTab,
  UserProfile,
} from './types';

function CampusSpendApp() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [splits, setSplits] = useState<BillSplit[]>([]);

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  if (asyncError) {
    throw asyncError;
  }

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (!user) {
        setProfile(null);
        setProfileLoaded(false);
        setExpenses([]);
        setCategoryBudgets([]);
        setFriends([]);
        setSplits([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !authUser) return;

    const uid = authUser.uid;
    const handleSubError = (err: unknown) => {
      setAsyncError(err instanceof Error ? err : new Error(String(err)));
    };

    const unsubProfile = subscribeUserProfile(
      uid,
      (p) => {
        setProfile(p);
        setProfileLoaded(true);
      },
      handleSubError,
    );

    const unsubExpenses = subscribeExpenses(uid, setExpenses, handleSubError);
    const unsubBudgets = subscribeCategoryBudgets(uid, setCategoryBudgets, handleSubError);
    const unsubFriends = subscribeFriends(uid, setFriends, handleSubError);
    const unsubSplits = subscribeSplits(uid, setSplits, handleSubError);

    return () => {
      unsubProfile();
      unsubExpenses();
      unsubBudgets();
      unsubFriends();
      unsubSplits();
    };
  }, [authReady, authUser]);

  const handleSignOut = async () => {
    await signOut(auth);
    setActiveTab('home');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <div className="w-5 h-5 rounded-full border-2 border-teal-700 border-t-transparent animate-spin" />
          <span>Loading CampusSpend...</span>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthGate />;
  }

  if (!profileLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <div className="w-5 h-5 rounded-full border-2 border-teal-700 border-t-transparent animate-spin" />
          <span>Syncing your student ledger...</span>
        </div>
      </div>
    );
  }

  if (!profile || !profile.onboardingCompleted) {
    return (
      <OnboardingFlow
        uid={authUser.uid}
        initialName={authUser.displayName || 'Student'}
        email={authUser.email || ''}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddExpense={() => {
          setEditingExpense(null);
          setExpenseModalOpen(true);
        }}
        profile={profile}
      >
        {activeTab === 'home' && (
          <HomeView
            uid={authUser.uid}
            profile={profile}
            expenses={expenses}
            categoryBudgets={categoryBudgets}
            splits={splits}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setExpenseModalOpen(true);
            }}
            onNavigateSplits={() => setActiveTab('splits')}
            onNavigateExpenses={() => setActiveTab('expenses')}
            onToast={showToast}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            expenses={expenses}
            onOpenAdd={() => {
              setEditingExpense(null);
              setExpenseModalOpen(true);
            }}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setExpenseModalOpen(true);
            }}
            onToast={showToast}
          />
        )}

        {activeTab === 'splits' && (
          <SplitsView
            uid={authUser.uid}
            friends={friends}
            splits={splits}
            onToast={showToast}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetView
            uid={authUser.uid}
            profile={profile}
            expenses={expenses}
            categoryBudgets={categoryBudgets}
            onSignOut={handleSignOut}
            onToast={showToast}
          />
        )}
      </AppShell>

      <ExpenseModal
        isOpen={expenseModalOpen}
        uid={authUser.uid}
        editingExpense={editingExpense}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSaved={showToast}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-medium shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CampusSpendApp />
    </ErrorBoundary>
  );
}
