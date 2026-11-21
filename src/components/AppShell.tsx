import React from 'react';
import {
  ArrowLeftRight,
  Compass,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  Sparkles,
} from 'lucide-react';
import { AppPage, UserProfile } from '../types/finance';

interface AppShellProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  profile: UserProfile;
  onLogout: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: AppPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assistant', label: 'AI Assistant', icon: MessageSquareText },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
  { id: 'planning', label: 'Planning', icon: Compass },
  { id: 'onboarding', label: 'Financial Profile', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const PAGE_TITLES: Record<AppPage, string> = {
  welcome: 'Welcome',
  onboarding: 'Financial Discovery',
  assistant: 'AURION Assistant',
  dashboard: 'Dashboard',
  transactions: 'Transaction Manager',
  reports: 'Financial Health Report',
  planning: 'Financial Planning',
  settings: 'Profile & Settings',
};

export const AppShell: React.FC<AppShellProps> = ({
  activePage,
  onNavigate,
  profile,
  onLogout,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#183B32] p-0 md:p-4 lg:p-6 flex items-stretch justify-center">
      {/* Main Editorial Container framed inside Deep Forest Green */}
      <div className="w-full max-w-[1440px] bg-[#F6F4EF] md:rounded-[24px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-screen md:min-h-[calc(100vh-3rem)] border border-white/10">
        {/* Left Navigation Rail (Sage-Tinted Ivory) */}
        <aside className="hidden md:flex md:w-[228px] lg:w-[244px] shrink-0 bg-[#EBF0E9] border-r border-[#DCE2DA] flex-col justify-between py-6 px-4">
          <div className="space-y-8">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-3 px-3 py-1.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#183B32] rounded-lg"
            >
              <div className="w-9 h-9 rounded-xl bg-[#183B32] text-[#F6F4EF] flex items-center justify-center font-display font-bold text-base tracking-tight">
                A
              </div>
              <div>
                <div className="font-display font-bold text-lg tracking-tight text-[#202321] leading-none">
                  AURION
                </div>
                <div className="text-[11px] text-[#5C635E] mt-0.5">Personal Intelligence</div>
              </div>
            </button>

            <nav aria-label="Main navigation" className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#183B32] text-white shadow-sm'
                        : 'text-[#39423D] hover:bg-[#DFE6DD] hover:text-[#183B32]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#D8DFD5]">
            {profile.isDemo && (
              <div className="px-3 py-2 rounded-xl bg-[#F6F4EF] border border-[#DFDBD0] text-[11px] text-[#5C635E] leading-relaxed">
                Synthetic demo mode · Educational prototype
              </div>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[#5C635E] hover:text-[#202321] hover:bg-[#DFE6DD] transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F6F4EF]">
          {/* Clean 3-Zone Top Bar */}
          <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-[#E5E1D8] bg-white/80 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="md:hidden font-display font-bold text-base text-[#183B32] shrink-0">
                AURION
              </span>
              <h1 className="font-display text-lg sm:text-xl font-semibold text-[#202321] truncate">
                {PAGE_TITLES[activePage]}
              </h1>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('assistant')}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#183B32] text-white text-xs font-medium hover:bg-[#132F28] transition-colors whitespace-nowrap shrink-0"
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                <span>Ask AURION</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#F6F4EF] transition-colors text-left"
                aria-label="Open profile settings"
              >
                <div className="w-8 h-8 rounded-full bg-[#183B32] text-[#F6F4EF] flex items-center justify-center text-xs font-semibold">
                  {profile.preferredName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-xs leading-tight">
                  <div className="font-semibold text-[#202321] whitespace-nowrap">
                    {profile.preferredName}
                  </div>
                  <div className="text-[#5C635E] whitespace-nowrap">
                    {profile.currency} · {profile.isDemo ? 'Demo' : 'Local Profile'}
                  </div>
                </div>
              </button>
            </div>
          </header>

          {/* Scrollable Workspace Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
            {children}
          </main>
        </div>
      </div>

      {/* Compact Mobile Bottom Navigation (<= 15% height cap) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E5E1D8] px-1 py-1.5 flex items-center justify-around"
      >
        {(
          [
            { id: 'dashboard', label: 'Home', icon: NAV_ITEMS[0].icon },
            { id: 'assistant', label: 'AURION', icon: NAV_ITEMS[1].icon },
            { id: 'transactions', label: 'Ledger', icon: NAV_ITEMS[2].icon },
            { id: 'reports', label: 'Reports', icon: NAV_ITEMS[3].icon },
            { id: 'planning', label: 'Plan', icon: NAV_ITEMS[4].icon },
            { id: 'settings', label: 'Settings', icon: NAV_ITEMS[6].icon },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center px-1.5 py-1.5 rounded-lg text-[10px] font-medium min-w-[50px] ${
                active ? 'text-[#183B32] font-semibold' : 'text-[#5C635E]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
