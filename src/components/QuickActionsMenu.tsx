import React, { useEffect, useRef, useState } from 'react';
import { FileBarChart2, Plus, PlusCircle, Target, X } from 'lucide-react';

interface QuickActionsMenuProps {
  onAddTransaction: () => void;
  onCheckGoals: () => void;
  onViewReport: () => void;
}

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  onAddTransaction,
  onCheckGoals,
  onViewReport,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const actions = [
    {
      id: 'add-transaction',
      label: 'Add Transaction',
      description: 'Log income or expense',
      icon: PlusCircle,
      onClick: () => {
        setOpen(false);
        onAddTransaction();
      },
    },
    {
      id: 'check-goals',
      label: 'Check Goals',
      description: 'Review savings targets',
      icon: Target,
      onClick: () => {
        setOpen(false);
        onCheckGoals();
      },
    },
    {
      id: 'view-report',
      label: 'View Report',
      description: 'Open financial health report',
      icon: FileBarChart2,
      onClick: () => {
        setOpen(false);
        onViewReport();
      },
    },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed bottom-20 right-4 lg:bottom-7 lg:right-7 z-30 flex flex-col items-end gap-2.5"
    >
      {open && (
        <div
          role="menu"
          aria-label="Quick Actions"
          className="w-60 bg-white rounded-2xl border border-[#DFDBD0] shadow-xl p-2 space-y-1 transition-all duration-150"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[#5C635E] border-b border-[#EFECE5]">
            Quick Actions
          </div>
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#F6F4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#183B32] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#EBF0E9] text-[#183B32] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#202321] whitespace-nowrap">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-[#5C635E] truncate">{item.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? 'Close Quick Actions menu' : 'Open Quick Actions menu'}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#183B32] hover:bg-[#122D26] text-[#F6F4EF] text-xs font-semibold shadow-lg border border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4AD7D] transition-all duration-150 whitespace-nowrap"
      >
        {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        <span>Quick Actions</span>
      </button>
    </div>
  );
};
