import React from 'react';
import { Home, ListOrdered, PieChart, Plus, Users } from 'lucide-react';
import type { NavTab, UserProfile } from '../types';

interface AppShellProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddExpense: () => void;
  profile: UserProfile;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'expenses', label: 'Expenses', icon: ListOrdered },
  { id: 'splits', label: 'Splits', icon: Users },
  { id: 'budget', label: 'Budget', icon: PieChart },
];

export function AppShell({
  activeTab,
  onSelectTab,
  onOpenAddExpense,
  profile,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop / Tablet Sidebar Rail */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-base shrink-0">
            ₹
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            CampusSpend
          </span>
        </div>

        <div className="px-4 pt-5 pb-3">
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Log Expense</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-teal-50 text-teal-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-teal-700' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onSelectTab('budget')}
            className="w-full text-left rounded-xl p-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <p className="text-sm font-semibold text-slate-900 truncate">{profile.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {profile.campusCity} · {profile.livingSetup}
            </p>
          </button>
        </div>
      </aside>

      {/* Mobile Compact Header */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
            ₹
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">CampusSpend</span>
        </div>

        <button
          type="button"
          onClick={onOpenAddExpense}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Log Expense</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 pb-20 md:pb-10">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 h-16 grid grid-cols-4 items-center px-2"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer ${
                active ? 'text-teal-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] leading-none whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
