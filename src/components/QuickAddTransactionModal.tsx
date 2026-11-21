import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  ALL_CATEGORIES,
  CurrencyCode,
  TransactionCategory,
  TransactionType,
} from '../types/finance';
import { CURRENCY_CONFIG } from '../utils/currency';

export interface NewTransactionPayload {
  date: string;
  merchant: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
}

interface QuickAddTransactionModalProps {
  open: boolean;
  currency: CurrencyCode;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (payload: NewTransactionPayload) => Promise<void>;
}

export const QuickAddTransactionModal: React.FC<QuickAddTransactionModalProps> = ({
  open,
  currency,
  defaultDate,
  onClose,
  onSubmit,
}) => {
  const [date, setDate] = useState(defaultDate);
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<TransactionCategory>('Food and groceries');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(defaultDate);
      setError(null);
    }
  }, [open, defaultDate]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const sym = CURRENCY_CONFIG[currency].symbol;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!merchant.trim()) {
      setError('Please enter a merchant or source name.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!date) {
      setError('Please select a transaction date.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        date,
        merchant: merchant.trim(),
        description: description.trim() || merchant.trim(),
        amount: parsedAmount,
        type,
        category: type === 'income' ? 'Income & Salary' : category,
      });
      setMerchant('');
      setDescription('');
      setAmount('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#183B32]/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-tx-title"
        className="w-full max-w-md bg-white rounded-2xl border border-[#DFDBD0] shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#EFECE5] pb-3">
          <div>
            <h2
              id="quick-add-tx-title"
              className="font-display text-lg font-semibold text-[#202321]"
            >
              Add Transaction
            </h2>
            <p className="text-xs text-[#5C635E]">
              Record an income or expense entry directly into your ledger
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Add Transaction modal"
            className="p-2 rounded-lg text-[#5C635E] hover:bg-[#F6F4EF] hover:text-[#202321]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-[#FDF2F2] border border-[#F3C6C6] text-xs text-[#991B1B]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="qa-type" className="block text-xs font-medium text-[#202321] mb-1">
                Type
              </label>
              <select
                id="qa-type"
                value={type}
                onChange={(e) => {
                  const next = e.target.value as TransactionType;
                  setType(next);
                  if (next === 'income') setCategory('Income & Salary');
                  else if (category === 'Income & Salary') setCategory('Food and groceries');
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label htmlFor="qa-date" className="block text-xs font-medium text-[#202321] mb-1">
                Date
              </label>
              <input
                id="qa-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="qa-merchant"
                className="block text-xs font-medium text-[#202321] mb-1"
              >
                Merchant / Source *
              </label>
              <input
                id="qa-merchant"
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. Blue Tokai Coffee"
                className="w-full px-3 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                required
              />
            </div>
            <div>
              <label htmlFor="qa-amount" className="block text-xs font-medium text-[#202321] mb-1">
                Amount ({sym}) *
              </label>
              <input
                id="qa-amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 450"
                className="w-full px-3 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] font-mono-num focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="qa-category" className="block text-xs font-medium text-[#202321] mb-1">
              Category
            </label>
            <select
              id="qa-category"
              value={type === 'income' ? 'Income & Salary' : category}
              disabled={type === 'income'}
              onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32] disabled:opacity-60"
            >
              {ALL_CATEGORIES.filter((c) => (type === 'income' ? c === 'Income & Salary' : c !== 'Income & Salary')).map(
                (cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label htmlFor="qa-desc" className="block text-xs font-medium text-[#202321] mb-1">
              Note / Description
            </label>
            <input
              id="qa-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#DFDBD0] text-xs font-semibold text-[#5C635E] hover:text-[#202321] hover:bg-[#F6F4EF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#183B32] hover:bg-[#122D26] text-white text-xs font-semibold disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
