import { CurrencyCode } from '../types/finance';

export const CURRENCY_CONFIG: Record<
  CurrencyCode,
  { symbol: string; locale: string; label: string; countryDefault: string }
> = {
  INR: {
    symbol: '₹',
    locale: 'en-IN',
    label: 'Indian Rupee (₹)',
    countryDefault: 'India',
  },
  USD: {
    symbol: '$',
    locale: 'en-US',
    label: 'US Dollar ($)',
    countryDefault: 'United States',
  },
  EUR: {
    symbol: '€',
    locale: 'de-DE',
    label: 'Euro (€)',
    countryDefault: 'Germany',
  },
  GBP: {
    symbol: '£',
    locale: 'en-GB',
    label: 'British Pound (£)',
    countryDefault: 'United Kingdom',
  },
};

export function formatCurrency(
  amount: number | null | undefined,
  currency: CurrencyCode = 'INR',
  options?: { compact?: boolean; decimals?: number }
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '—';
  }
  const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.INR;
  const decimals = options?.decimals ?? 0;

  if (options?.compact && Math.abs(amount) >= 100000) {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }

  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export const FINANCIAL_GLOSSARY: Array<{
  term: string;
  plainExplanation: string;
}> = [
  {
    term: 'EMI (Equated Monthly Installment)',
    plainExplanation:
      'A fixed monthly payment you make to a lender to pay back a loan (both the borrowed amount and interest) over an agreed period.',
  },
  {
    term: 'Savings Rate',
    plainExplanation:
      'The percentage of your income left over after paying expenses. Formula: (Income − Expenses) ÷ Income × 100.',
  },
  {
    term: 'Emergency Fund',
    plainExplanation:
      'Easily accessible cash set aside specifically for unexpected events like medical bills or job loss—typically 3 to 6 months of essential expenses.',
  },
  {
    term: 'Debt-to-Income Ratio (DTI)',
    plainExplanation:
      'The percentage of your monthly income that goes toward loan or EMI payments. Keeping it below 30–35% leaves healthy breathing room.',
  },
  {
    term: 'Snowball vs. Avalanche Method',
    plainExplanation:
      'Snowball pays off the smallest loan balance first for quick momentum. Avalanche pays off the highest interest rate loan first to minimize total interest cost.',
  },
  {
    term: 'Index Fund / ETF',
    plainExplanation:
      'A pooled investment that tracks a broad market index (like Nifty 50 or S&P 500) rather than picking individual stocks. Like all market investments, returns vary and carry risk.',
  },
  {
    term: 'SIP (Systematic Investment Plan)',
    plainExplanation:
      'Investing a fixed amount regularly (for example, monthly) into a mutual fund or index fund to build discipline over time.',
  },
];
