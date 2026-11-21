import {
  ActionPlanPhase,
  CashFlowForecast,
  CategoryBreakdownItem,
  ConfidenceLevel,
  DebtItem,
  DebtStrategyResult,
  FinancialAnalysisSummary,
  FinancialGoal,
  HealthScoreFactor,
  MonthlyComparisonPoint,
  SubscriptionLeak,
  Transaction,
  TransactionCategory,
  TransactionType,
  UserProfile,
  WhatIfParams,
  WhatIfResult,
} from '../types/finance';

const CATEGORY_RULES: Array<{
  category: TransactionCategory;
  keywords: string[];
}> = [
  {
    category: 'Income & Salary',
    keywords: [
      'salary',
      'payroll',
      'stipend',
      'freelance',
      'dividend',
      'interest credit',
      'refund',
      'bonus',
      'payout',
      'neft cr',
      'imps cr',
    ],
  },
  {
    category: 'Rent and housing',
    keywords: [
      'rent',
      'landlord',
      'housing',
      'maintenance',
      'society',
      'nobroker',
      'apartment',
      'lease',
    ],
  },
  {
    category: 'Loan repayments',
    keywords: [
      'emi',
      'loan',
      'mortgage',
      'repayment',
      'hdfc loan',
      'bajaj finserv',
      'credit card bill',
    ],
  },
  {
    category: 'Investments',
    keywords: [
      'sip',
      'mutual fund',
      'zerodha',
      'groww',
      'kuvera',
      'ppf',
      'nps',
      'etf',
      'index fund',
      'fd ',
      'fixed deposit',
      'coin',
    ],
  },
  {
    category: 'Subscriptions',
    keywords: [
      'netflix',
      'spotify',
      'prime',
      'youtube',
      'icloud',
      'adobe',
      'chatgpt',
      'notion',
      'hotstar',
      'gym',
      'membership',
      'subscription',
      'cult.fit',
    ],
  },
  {
    category: 'Food and groceries',
    keywords: [
      'swiggy',
      'zomato',
      'zepto',
      'blinkit',
      'bigbasket',
      'instamart',
      'dmart',
      'grocery',
      'supermarket',
      'cafe',
      'coffee',
      'starbucks',
      'restaurant',
      'bakery',
      'food',
      'dining',
    ],
  },
  {
    category: 'Transportation',
    keywords: [
      'uber',
      'ola',
      'rapido',
      'metro',
      'fuel',
      'petrol',
      'diesel',
      'shell',
      'hpcl',
      'iocl',
      'fastag',
      'parking',
      'cab',
      'auto',
    ],
  },
  {
    category: 'Utilities and bills',
    keywords: [
      'electricity',
      'bescom',
      'tata power',
      'airtel',
      'jio',
      'broadband',
      'wifi',
      'water bill',
      'gas',
      'recharge',
      'mobile bill',
      'postpaid',
      'utility',
    ],
  },
  {
    category: 'Healthcare',
    keywords: [
      'pharmacy',
      'apollo',
      'pharmeasy',
      '1mg',
      'hospital',
      'clinic',
      'doctor',
      'dental',
      'diagnostic',
      'medical',
      'health',
    ],
  },
  {
    category: 'Education',
    keywords: [
      'tuition',
      'coursera',
      'udemy',
      'university',
      'college',
      'books',
      'kindle',
      'course',
      'school',
      'exam fee',
    ],
  },
  {
    category: 'Travel',
    keywords: [
      'indigo',
      'air india',
      'vistara',
      'makemytrip',
      'irctc',
      'hotel',
      'airbnb',
      'flight',
      'booking.com',
      'resort',
    ],
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon',
      'flipkart',
      'myntra',
      'ajio',
      'zara',
      'uniqlo',
      'nykaa',
      'ikea',
      'decathlon',
      'electronics',
      'croma',
      'apple store',
    ],
  },
  {
    category: 'Entertainment',
    keywords: [
      'bookmyshow',
      'pvr',
      'inox',
      'cinema',
      'movie',
      'concert',
      'gaming',
      'steam',
      'playstation',
      'bowling',
    ],
  },
];

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function extractMerchantName(description: string): string {
  const cleaned = description
    .replace(/^(upi|pos|imps|neft|ach|ecs|auto-debit)[\/:\-\s]+/i, '')
    .replace(/\b\d{4,}\b/g, '')
    .replace(/[\/|@#_*]+/g, ' ')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 3);
  if (words.length === 0) return 'Unknown Merchant';
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function matchesKeyword(haystack: string, keyword: string): boolean {
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
}

export function categorizeTransaction(
  description: string,
  merchant: string,
  type: TransactionType
): { category: TransactionCategory; confidence: ConfidenceLevel } {
  const combined = `${normalizeText(description)} ${normalizeText(merchant)}`;

  if (type === 'income') {
    for (const kw of CATEGORY_RULES[0].keywords) {
      if (matchesKeyword(combined, kw)) {
        return { category: 'Income & Salary', confidence: 'high' };
      }
    }
    return { category: 'Income & Salary', confidence: 'medium' };
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.category === 'Income & Salary') continue;
    for (const kw of rule.keywords) {
      if (matchesKeyword(combined, kw)) {
        return { category: rule.category, confidence: 'high' };
      }
    }
  }

  // Fallback heuristics for ambiguous descriptions like "UPI/849201/Transfer"
  if (/\b(transfer|upi|payment|pos|misc|unknown|cash|atm)\b/.test(combined)) {
    return { category: 'Other expenses', confidence: 'low' };
  }

  return { category: 'Other expenses', confidence: 'low' };
}

export function isDuplicateTransaction(
  candidate: { date: string; amount: number; description: string; type: TransactionType },
  existing: Array<{ date: string; amount: number; description: string; type: TransactionType }>
): { isDuplicate: boolean; reason?: string } {
  const normCandidate = normalizeText(candidate.description);
  for (const item of existing) {
    if (
      item.date === candidate.date &&
      Math.abs(item.amount - candidate.amount) < 0.01 &&
      item.type === candidate.type
    ) {
      const normItem = normalizeText(item.description);
      if (
        normItem === normCandidate ||
        normItem.includes(normCandidate.slice(0, 10)) ||
        normCandidate.includes(normItem.slice(0, 10))
      ) {
        return {
          isDuplicate: true,
          reason: `Matches existing transaction on ${item.date} for ${item.amount}`,
        };
      }
    }
  }
  return { isDuplicate: false };
}

export function detectSubscriptionsAndRecurring(
  transactions: Transaction[]
): SubscriptionLeak[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const groups = new Map<string, Transaction[]>();

  for (const tx of expenses) {
    const key = normalizeText(tx.merchant || extractMerchantName(tx.description));
    if (!key || key === 'unknown merchant') continue;
    const arr = groups.get(key) || [];
    arr.push(tx);
    groups.set(key, arr);
  }

  const leaks: SubscriptionLeak[] = [];

  for (const [, list] of groups.entries()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const amounts = sorted.map((t) => t.amount);
    const avgAmount = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const withinTolerance = amounts.every(
      (a) => Math.abs(a - avgAmount) / Math.max(avgAmount, 1) <= 0.12
    );

    const isExplicitSub = sorted.some(
      (t) => t.category === 'Subscriptions' || t.isRecurring
    );

    if (!withinTolerance && !isExplicitSub) continue;

    // Estimate cadence from day differences
    let avgGapDays = 30;
    if (sorted.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const d1 = new Date(sorted[i - 1].date).getTime();
        const d2 = new Date(sorted[i].date).getTime();
        const days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        if (days > 0) diffs.push(days);
      }
      if (diffs.length > 0) {
        avgGapDays = diffs.reduce((s, d) => s + d, 0) / diffs.length;
      }
    }

    let frequency: 'Monthly' | 'Weekly' | 'Quarterly' = 'Monthly';
    let monthlyMultiplier = 1;
    if (avgGapDays <= 10) {
      frequency = 'Weekly';
      monthlyMultiplier = 4.33;
    } else if (avgGapDays >= 70) {
      frequency = 'Quarterly';
      monthlyMultiplier = 1 / 3;
    }

    // Only flag discretionary / subscription / utility / entertainment / fitness recurring bills
    const primaryCat = sorted[sorted.length - 1].category;
    if (primaryCat === 'Rent and housing' || primaryCat === 'Loan repayments' || primaryCat === 'Investments') {
      continue;
    }

    const monthlyCost = Math.round(avgAmount * monthlyMultiplier);
    const annualCost = Math.round(monthlyCost * 12);
    const isEssentialUtility = primaryCat === 'Utilities and bills';
    const reviewSuggested =
      !isEssentialUtility &&
      (primaryCat === 'Subscriptions' || primaryCat === 'Entertainment' || monthlyCost >= 400);

    leaks.push({
      merchant: sorted[sorted.length - 1].merchant || extractMerchantName(sorted[0].description),
      frequency,
      monthlyCost,
      annualCost,
      lastPaymentDate: sorted[sorted.length - 1].date,
      occurrences: sorted.length,
      reviewSuggested,
      reviewReason: reviewSuggested
        ? `Repeated ${frequency.toLowerCase()} charge totaling ~${annualCost.toLocaleString()} per year.`
        : `Recurring ${primaryCat.toLowerCase()} bill.`,
    });
  }

  return leaks.sort((a, b) => b.annualCost - a.annualCost);
}

export function detectSpendingAnomalies(transactions: Transaction[]): Transaction[] {
  const expenses = transactions.filter(
    (t) => t.type === 'expense' && t.category !== 'Rent and housing' && t.category !== 'Investments' && t.category !== 'Loan repayments'
  );
  if (expenses.length < 5) return [];

  const byCategory = new Map<string, number[]>();
  for (const tx of expenses) {
    const arr = byCategory.get(tx.category) || [];
    arr.push(tx.amount);
    byCategory.set(tx.category, arr);
  }

  const flagged: Transaction[] = [];
  for (const tx of expenses) {
    const peers = byCategory.get(tx.category) || [];
    if (peers.length < 3) continue;
    const avg = peers.reduce((s, v) => s + v, 0) / peers.length;
    if (tx.amount > avg * 2.1 && tx.amount > 1500) {
      flagged.push({
        ...tx,
        isAnomaly: true,
        anomalyReason: `${Math.round((tx.amount / avg) * 10) / 10}× higher than your typical ${tx.category.toLowerCase()} transaction.`,
      });
    }
  }
  return flagged.sort((a, b) => b.amount - a.amount);
}

function getMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function calculateCashFlowForecast(
  transactions: Transaction[],
  profile: UserProfile | null,
  subscriptions: SubscriptionLeak[],
  debts: DebtItem[]
): CashFlowForecast {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const latestWithBalance = [...sorted].reverse().find((t) => typeof t.balance === 'number');

  // Group by month to estimate monthly baseline
  const months = new Map<string, { income: number; expense: number }>();
  for (const tx of sorted) {
    const ym = tx.date.slice(0, 7);
    const entry = months.get(ym) || { income: 0, expense: 0 };
    if (tx.type === 'income') entry.income += tx.amount;
    else entry.expense += tx.amount;
    months.set(ym, entry);
  }

  const monthValues = Array.from(months.values());
  const avgIncome =
    monthValues.length > 0
      ? monthValues.reduce((s, m) => s + m.income, 0) / monthValues.length
      : profile?.monthlyIncome || 0;
  const avgExpense =
    monthValues.length > 0
      ? monthValues.reduce((s, m) => s + m.expense, 0) / monthValues.length
      : profile?.onboardingAnswers?.regularExpenses || 0;

  const currentEstimatedBalance =
    latestWithBalance?.balance ??
    Math.max(0, (profile?.onboardingAnswers?.monthlySavings ?? 25000) * 2);

  // Confirmed recurring expenses = rent + loan EMIs + detected subscriptions
  const rentTxs = sorted.filter(
    (t) => t.type === 'expense' && t.category === 'Rent and housing'
  );
  const avgRent =
    rentTxs.length > 0
      ? rentTxs.reduce((s, t) => s + t.amount, 0) / Math.max(1, months.size)
      : 0;

  const totalDebtEmis = debts.reduce((s, d) => s + d.monthlyEmi, 0);
  const subMonthly = subscriptions.reduce((s, sub) => s + sub.monthlyCost, 0);

  const confirmedRecurringExpenses = Math.round(avgRent + totalDebtEmis + subMonthly);
  const estimatedDiscretionaryExpenses = Math.max(
    0,
    Math.round(avgExpense - confirmedRecurringExpenses)
  );
  const confirmedUpcomingIncome = Math.round(
    avgIncome > 0 ? avgIncome : profile?.monthlyIncome || 0
  );

  const projectedMonthEndBalance = Math.round(
    currentEstimatedBalance +
      confirmedUpcomingIncome -
      confirmedRecurringExpenses -
      estimatedDiscretionaryExpenses
  );

  const shortageRisk = projectedMonthEndBalance < 0;
  const shortageAmount = shortageRisk ? Math.abs(projectedMonthEndBalance) : 0;

  const confidenceLabel: CashFlowForecast['confidenceLabel'] =
    months.size >= 3 && sorted.length >= 25
      ? 'Higher'
      : months.size >= 1 && sorted.length >= 8
      ? 'Moderate'
      : 'Low';

  const assumptions = [
    `Based on ${sorted.length} recorded transaction${sorted.length === 1 ? '' : 's'} across ${Math.max(1, months.size)} month(s).`,
    `Confirmed recurring commitments include detected subscriptions (${subMonthly.toLocaleString()}), rent averages, and ${debts.length} entered loan EMI(s).`,
    `Variable spending is estimated from historical non-recurring outflows and may vary with seasonal spending.`,
  ];

  const timeline: CashFlowForecast['timeline'] = [
    {
      label: 'Current',
      projectedBalance: Math.round(currentEstimatedBalance),
      confirmedOnlyBalance: Math.round(currentEstimatedBalance),
      kind: 'verified',
    },
    {
      label: '+15 Days',
      projectedBalance: Math.round(
        currentEstimatedBalance +
          confirmedUpcomingIncome * 0.5 -
          confirmedRecurringExpenses * 0.6 -
          estimatedDiscretionaryExpenses * 0.5
      ),
      confirmedOnlyBalance: Math.round(
        currentEstimatedBalance + confirmedUpcomingIncome * 0.5 - confirmedRecurringExpenses * 0.6
      ),
      kind: 'estimate',
    },
    {
      label: 'Month End',
      projectedBalance: projectedMonthEndBalance,
      confirmedOnlyBalance: Math.round(
        currentEstimatedBalance + confirmedUpcomingIncome - confirmedRecurringExpenses
      ),
      kind: 'estimate',
    },
    {
      label: '+60 Days',
      projectedBalance: Math.round(
        projectedMonthEndBalance +
          (confirmedUpcomingIncome - confirmedRecurringExpenses - estimatedDiscretionaryExpenses)
      ),
      confirmedOnlyBalance: Math.round(
        currentEstimatedBalance + (confirmedUpcomingIncome - confirmedRecurringExpenses) * 2
      ),
      kind: 'estimate',
    },
  ];

  return {
    currentEstimatedBalance: Math.round(currentEstimatedBalance),
    confirmedUpcomingIncome,
    confirmedRecurringExpenses,
    estimatedDiscretionaryExpenses,
    projectedMonthEndBalance,
    shortageRisk,
    shortageAmount,
    confidenceLabel,
    assumptions,
    timeline,
  };
}

export function calculateDebtStrategies(
  debts: DebtItem[],
  extraMonthlyPayment = 0
): {
  totalOutstanding: number;
  totalMonthlyEmi: number;
  snowball: DebtStrategyResult;
  avalanche: DebtStrategyResult;
} {
  const activeDebts = debts.filter((d) => d.principal > 0 && d.monthlyEmi > 0);
  const totalOutstanding = activeDebts.reduce((s, d) => s + d.principal, 0);
  const totalMonthlyEmi = activeDebts.reduce((s, d) => s + d.monthlyEmi, 0);

  const simulate = (strategy: 'snowball' | 'avalanche'): DebtStrategyResult => {
    if (activeDebts.length === 0) {
      return {
        strategy,
        monthsToPayoff: 0,
        totalInterestPaid: 0,
        totalPaid: 0,
        payoffOrder: [],
        schedule: [],
      };
    }

    const state = activeDebts.map((d) => ({
      ...d,
      balance: d.principal,
    }));

    const payoffOrder: string[] = [];
    const schedule: Array<{ month: number; remainingBalance: number }> = [
      { month: 0, remainingBalance: Math.round(totalOutstanding) },
    ];

    let totalInterestPaid = 0;
    let totalPaid = 0;
    let month = 0;
    const maxMonths = 360;

    while (state.some((d) => d.balance > 0.01) && month < maxMonths) {
      month++;
      // Accrue monthly interest
      for (const d of state) {
        if (d.balance <= 0.01) continue;
        const monthlyInterest = (d.balance * (d.interestRate / 100)) / 12;
        d.balance += monthlyInterest;
        totalInterestPaid += monthlyInterest;
      }

      // Calculate available pool = sum of all active EMIs + freed EMIs + extra
      let pool = activeDebts.reduce((s, d) => s + d.monthlyEmi, 0) + Math.max(0, extraMonthlyPayment);

      // Pay minimum EMIs first on unpaid loans
      for (const d of state) {
        if (d.balance <= 0.01) continue;
        const pay = Math.min(d.balance, d.monthlyEmi);
        d.balance -= pay;
        totalPaid += pay;
        pool -= pay;
        if (d.balance <= 0.01 && !payoffOrder.includes(d.name)) {
          payoffOrder.push(d.name);
        }
      }

      // Direct remaining snowball/avalanche surplus to priority debt
      while (pool > 0.01 && state.some((d) => d.balance > 0.01)) {
        const remaining = state.filter((d) => d.balance > 0.01);
        remaining.sort((a, b) =>
          strategy === 'snowball'
            ? a.balance - b.balance
            : b.interestRate - a.interestRate
        );
        const target = remaining[0];
        const extra = Math.min(target.balance, pool);
        target.balance -= extra;
        totalPaid += extra;
        pool -= extra;
        if (target.balance <= 0.01 && !payoffOrder.includes(target.name)) {
          payoffOrder.push(target.name);
        }
      }

      const remainingTotal = state.reduce((s, d) => s + Math.max(0, d.balance), 0);
      if (month % 3 === 0 || remainingTotal <= 0.01) {
        schedule.push({ month, remainingBalance: Math.round(remainingTotal) });
      }
    }

    return {
      strategy,
      monthsToPayoff: month,
      totalInterestPaid: Math.round(totalInterestPaid),
      totalPaid: Math.round(totalPaid),
      payoffOrder,
      schedule,
    };
  };

  return {
    totalOutstanding: Math.round(totalOutstanding),
    totalMonthlyEmi: Math.round(totalMonthlyEmi),
    snowball: simulate('snowball'),
    avalanche: simulate('avalanche'),
  };
}

export function calculateGoalMetrics(goal: FinancialGoal): {
  remainingAmount: number;
  progressPercent: number;
  monthsRemaining: number;
  requiredMonthlySavings: number;
  onTrack: boolean;
  projectedMonthsAtCurrentRate: number | null;
} {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentSavings);
  const progressPercent =
    goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentSavings / goal.targetAmount) * 100))
      : 0;

  const now = new Date();
  const target = new Date(goal.targetDate);
  const diffMonths = Math.max(
    1,
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  );

  const requiredMonthlySavings = Math.ceil(remainingAmount / diffMonths);
  const onTrack = goal.monthlyContribution >= requiredMonthlySavings || remainingAmount === 0;
  const projectedMonthsAtCurrentRate =
    remainingAmount === 0
      ? 0
      : goal.monthlyContribution > 0
      ? Math.ceil(remainingAmount / goal.monthlyContribution)
      : null;

  return {
    remainingAmount,
    progressPercent,
    monthsRemaining: diffMonths,
    requiredMonthlySavings,
    onTrack,
    projectedMonthsAtCurrentRate,
  };
}

export function runWhatIfSimulation(
  analysis: FinancialAnalysisSummary,
  goals: FinancialGoal[],
  params: WhatIfParams
): WhatIfResult {
  const monthlyIncome = Math.max(0, analysis.overview.averageMonthlyIncome);
  const monthlyExpense = Math.max(0, analysis.overview.averageMonthlyExpense);

  // Discretionary categories eligible for reduction
  const discretionaryCats = new Set<TransactionCategory>([
    'Food and groceries',
    'Shopping',
    'Entertainment',
    'Subscriptions',
    'Travel',
  ]);
  const monthCount = Math.max(1, analysis.analysisPeriod.monthCount);
  const monthlyDiscretionary =
    analysis.categoryBreakdown
      .filter((c) => discretionaryCats.has(c.category))
      .reduce((s, c) => s + c.amount, 0) / monthCount;

  const baselineMonthlySurplus = Math.round(monthlyIncome - monthlyExpense);
  const adjustedIncome = monthlyIncome * (1 + params.incomeChangePercent / 100);
  const expenseSavings = monthlyDiscretionary * (params.discretionaryCutPercent / 100);
  const adjustedExpense = Math.max(0, monthlyExpense - expenseSavings);
  const simulatedMonthlySurplus = Math.round(
    adjustedIncome - adjustedExpense + params.extraMonthlySavings
  );

  const monthlyDelta = simulatedMonthlySurplus - baselineMonthlySurplus;
  const baseline12MonthSavings = baselineMonthlySurplus * 12;
  const simulated12MonthSavings = simulatedMonthlySurplus * 12;

  // Estimate goal acceleration on first active goal
  let goalAccelerationMonths: number | null = null;
  const activeGoal = goals.find((g) => g.targetAmount > g.currentSavings);
  if (activeGoal && activeGoal.monthlyContribution > 0) {
    const remaining = activeGoal.targetAmount - activeGoal.currentSavings;
    const baseMonths = Math.ceil(remaining / activeGoal.monthlyContribution);
    const boostedRate = Math.max(
      1,
      activeGoal.monthlyContribution + Math.max(0, monthlyDelta)
    );
    const simMonths = Math.ceil(remaining / boostedRate);
    goalAccelerationMonths = Math.max(0, baseMonths - simMonths);
  }

  const projectionSeries = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    return {
      month: `M${m}`,
      baseline: Math.round(baselineMonthlySurplus * m),
      simulated: Math.round((simulatedMonthlySurplus + params.monthlyInvestmentShift * 0.08) * m),
    };
  });

  return {
    baselineMonthlySurplus,
    simulatedMonthlySurplus,
    monthlyDelta,
    baseline12MonthSavings,
    simulated12MonthSavings,
    goalAccelerationMonths,
    projectionSeries,
  };
}

export function analyzeFinances(
  transactions: Transaction[],
  profile: UserProfile | null,
  debts: DebtItem[],
  goals: FinancialGoal[]
): FinancialAnalysisSummary {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const hasSyntheticDemo =
    Boolean(profile?.isDemo) || sorted.some((t) => Boolean(t.isSyntheticDemo));

  const startDate = sorted.length > 0 ? sorted[0].date : null;
  const endDate = sorted.length > 0 ? sorted[sorted.length - 1].date : null;

  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const tx of sorted) {
    const ym = tx.date.slice(0, 7);
    const bucket = monthMap.get(ym) || { income: 0, expense: 0 };
    if (tx.type === 'income') bucket.income += tx.amount;
    else bucket.expense += tx.amount;
    monthMap.set(ym, bucket);
  }

  const monthKeys = Array.from(monthMap.keys()).sort();
  const monthCount = Math.max(1, monthKeys.length);

  const monthlySeries: MonthlyComparisonPoint[] = monthKeys.map((ym) => {
    const { income, expense } = monthMap.get(ym)!;
    const net = income - expense;
    const savingsRate = income > 0 ? Math.round((net / income) * 1000) / 10 : 0;
    return {
      month: ym,
      label: getMonthLabel(ym),
      income: Math.round(income),
      expense: Math.round(expense),
      net: Math.round(net),
      savingsRate,
    };
  });

  const totalIncome = Math.round(
    sorted.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  );
  const totalExpense = Math.round(
    sorted.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );
  const totalInvestments = Math.round(
    sorted
      .filter((t) => t.type === 'expense' && t.category === 'Investments')
      .reduce((s, t) => s + t.amount, 0)
  );
  const netCashFlow = totalIncome - totalExpense;

  const averageMonthlyIncome =
    sorted.length > 0
      ? Math.round(totalIncome / monthCount)
      : profile?.monthlyIncome || 0;
  const averageMonthlyExpense =
    sorted.length > 0
      ? Math.round(totalExpense / monthCount)
      : profile?.onboardingAnswers?.regularExpenses || 0;

  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - (totalExpense - totalInvestments)) / totalIncome) * 1000) / 10
      : null;

  const latestBalanceTx = [...sorted].reverse().find((t) => typeof t.balance === 'number');
  const latestAccountBalance = latestBalanceTx?.balance ?? null;

  // Category breakdown (expenses)
  const catTotals = new Map<TransactionCategory, { amount: number; count: number }>();
  for (const tx of sorted) {
    if (tx.type !== 'expense') continue;
    const cur = catTotals.get(tx.category) || { amount: 0, count: 0 };
    cur.amount += tx.amount;
    cur.count += 1;
    catTotals.set(tx.category, cur);
  }

  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(catTotals.entries())
    .map(([category, data]) => ({
      category,
      amount: Math.round(data.amount),
      percentage: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 1000) / 10 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const subscriptions = detectSubscriptionsAndRecurring(sorted);
  const anomalies = detectSpendingAnomalies(sorted);
  const uncertainCount = sorted.filter((t) => t.confidence === 'low').length;
  const forecast = calculateCashFlowForecast(sorted, profile, subscriptions, debts);

  // Explainable Financial Health Score (0-100)
  const effectiveMonthlyIncome =
    averageMonthlyIncome > 0 ? averageMonthlyIncome : profile?.monthlyIncome || 0;
  const effectiveMonthlySavings =
    sorted.length > 0
      ? Math.max(0, averageMonthlyIncome - (averageMonthlyExpense - totalInvestments / monthCount))
      : profile?.onboardingAnswers?.monthlySavings || 0;
  const effectiveSavingsRate =
    effectiveMonthlyIncome > 0
      ? (effectiveMonthlySavings / effectiveMonthlyIncome) * 100
      : 0;

  // Factor 1: Savings Behavior (25 pts)
  const savingsScore = Math.min(25, Math.max(4, Math.round((effectiveSavingsRate / 25) * 25)));
  // Factor 2: Expense Management (25 pts)
  const expenseRatio =
    effectiveMonthlyIncome > 0 ? averageMonthlyExpense / effectiveMonthlyIncome : 0.85;
  const expenseScore =
    expenseRatio <= 0.55
      ? 25
      : expenseRatio <= 0.75
      ? 20
      : expenseRatio <= 0.9
      ? 14
      : 8;
  // Factor 3: Debt Obligations (20 pts)
  const monthlyEmi = debts.reduce((s, d) => s + d.monthlyEmi, 0);
  const dti = effectiveMonthlyIncome > 0 ? (monthlyEmi / effectiveMonthlyIncome) * 100 : 0;
  const debtScore =
    debts.length === 0 ? 20 : dti <= 15 ? 18 : dti <= 30 ? 14 : dti <= 45 ? 9 : 4;
  // Factor 4: Emergency Fund Preparedness (15 pts)
  const liquidReserve = latestAccountBalance ?? (profile?.onboardingAnswers?.monthlySavings ?? 0) * 2;
  const monthsCovered =
    averageMonthlyExpense > 0 ? liquidReserve / averageMonthlyExpense : 0;
  const emergencyScore =
    monthsCovered >= 6 ? 15 : monthsCovered >= 3 ? 12 : monthsCovered >= 1 ? 8 : 4;
  // Factor 5: Financial Goal Progress (15 pts)
  const avgGoalProgress =
    goals.length > 0
      ? goals.reduce((s, g) => s + Math.min(100, (g.currentSavings / Math.max(1, g.targetAmount)) * 100), 0) /
        goals.length
      : 0;
  const goalScore =
    goals.length === 0
      ? 5
      : avgGoalProgress >= 50
      ? 15
      : avgGoalProgress >= 20
      ? 12
      : 8;

  const totalScore = Math.min(
    100,
    savingsScore + expenseScore + debtScore + emergencyScore + goalScore
  );

  const grade: FinancialAnalysisSummary['healthScore']['grade'] =
    totalScore >= 80
      ? 'Excellent'
      : totalScore >= 65
      ? 'Good'
      : totalScore >= 45
      ? 'Fair'
      : 'Needs Attention';

  const factors: HealthScoreFactor[] = [
    {
      key: 'savings',
      label: 'Savings Behavior',
      score: savingsScore,
      maxScore: 25,
      status: savingsScore >= 19 ? 'Strong' : savingsScore >= 12 ? 'Moderate' : 'Needs Focus',
      explanation: `Estimated savings rate of ${Math.round(effectiveSavingsRate)}% against a 25% benchmark.`,
    },
    {
      key: 'expenses',
      label: 'Expense Management',
      score: expenseScore,
      maxScore: 25,
      status: expenseScore >= 19 ? 'Strong' : expenseScore >= 14 ? 'Moderate' : 'Needs Focus',
      explanation: `Monthly outflow ratio is ${Math.round(expenseRatio * 100)}% of monthly income.`,
    },
    {
      key: 'debt',
      label: 'Debt Obligations',
      score: debtScore,
      maxScore: 20,
      status: debtScore >= 15 ? 'Strong' : debtScore >= 10 ? 'Moderate' : 'Needs Focus',
      explanation:
        debts.length === 0
          ? 'No active loans or EMIs recorded.'
          : `Monthly EMIs represent ${Math.round(dti)}% debt-to-income ratio.`,
    },
    {
      key: 'emergency',
      label: 'Emergency Fund Preparedness',
      score: emergencyScore,
      maxScore: 15,
      status: emergencyScore >= 12 ? 'Strong' : emergencyScore >= 8 ? 'Moderate' : 'Needs Focus',
      explanation: `Available balance covers roughly ${monthsCovered.toFixed(1)} months of average spending (3–6 months target).`,
    },
    {
      key: 'goals',
      label: 'Financial Goal Progress',
      score: goalScore,
      maxScore: 15,
      status: goalScore >= 12 ? 'Strong' : goalScore >= 8 ? 'Moderate' : 'Needs Focus',
      explanation:
        goals.length === 0
          ? 'No active financial goals defined yet.'
          : `Average progress of ${Math.round(avgGoalProgress)}% across ${goals.length} active goal(s).`,
    },
  ];

  // Personalized Recommendations
  const recommendations: FinancialAnalysisSummary['recommendations'] = [];
  const topDiscretionary = categoryBreakdown.find(
    (c) =>
      c.category !== 'Rent and housing' &&
      c.category !== 'Investments' &&
      c.category !== 'Loan repayments'
  );

  if (topDiscretionary && topDiscretionary.percentage >= 15) {
    recommendations.push({
      title: `Trim ${topDiscretionary.category} by 15%`,
      why: `${topDiscretionary.category} is your largest non-fixed spending category at ${topDiscretionary.percentage}% of expenses.`,
      how: `Set a weekly cap for ${topDiscretionary.category.toLowerCase()} and review smaller repeat orders before checkout.`,
      priority: 'High',
    });
  }

  const reviewSubs = subscriptions.filter((s) => s.reviewSuggested);
  if (reviewSubs.length > 0) {
    const subAnnual = reviewSubs.reduce((s, r) => s + r.annualCost, 0);
    recommendations.push({
      title: `Audit ${reviewSubs.length} discretionary subscription(s)`,
      why: `Detected recurring charges (${reviewSubs.map((s) => s.merchant).join(', ')}) costing roughly ${subAnnual.toLocaleString()} annually.`,
      how: `Pause or downgrade services you used fewer than twice in the past month.`,
      priority: 'High',
    });
  }

  if (monthsCovered < 3) {
    recommendations.push({
      title: 'Build a 3-month emergency reserve',
      why: `Your visible liquid balance covers ${monthsCovered.toFixed(1)} months of expenses, below the 3–6 month safety cushion.`,
      how: `Automate a transfer into a separate high-liquidity savings account or liquid fund on payday before discretionary spending.`,
      priority: 'High',
    });
  }

  if (debts.length > 0 && dti > 20) {
    recommendations.push({
      title: 'Accelerate highest-interest debt payoff',
      why: `Debt repayments consume ${Math.round(dti)}% of your monthly income.`,
      how: `Use the Avalanche tab in Financial Planning to direct extra surplus toward your highest-APR loan.`,
      priority: 'Medium',
    });
  }

  if (profile?.onboardingAnswers?.riskTolerance) {
    const risk = profile.onboardingAnswers.riskTolerance;
    recommendations.push({
      title: `Align investments with your ${risk} risk profile`,
      why: `With a ${risk} comfort level and once emergency reserves are funded, structured long-term investing helps beat inflation.`,
      how:
        risk === 'conservative'
          ? 'Explore educational comparisons of Fixed Deposits, government-backed PPF/Treasury savings, and short-duration debt funds.'
          : risk === 'moderate'
          ? 'Explore balanced index funds, large-cap ETFs, and diversified mutual funds via disciplined monthly SIPs (returns are market-linked and never guaranteed).'
          : 'Explore diversified equity index funds and broad ETFs with a 5+ year horizon, keeping emergency cash separate (consult a qualified adviser before investing).',
      priority: 'Foundational',
    });
  }

  const actionPlan: ActionPlanPhase[] = [
    {
      horizon: 'Next 7 Days',
      items: [
        {
          title: 'Confirm uncategorized transactions',
          why:
            uncertainCount > 0
              ? `${uncertainCount} transaction(s) have low categorization confidence.`
              : 'Clean transaction categorization keeps monthly budgets accurate.',
          how: 'Open Transaction Manager and verify any "Other expenses" entries.',
        },
        {
          title: 'Review recurring subscriptions',
          why: `${subscriptions.length} recurring charge(s) were detected across your statement history.`,
          how: 'Check the Subscription & Expense Leak Detector and mark unused services to cancel manually.',
        },
      ],
    },
    {
      horizon: 'Next 30 Days',
      items: [
        {
          title: 'Lock in a payday savings transfer',
          why: `Your current calculated savings rate is ${savingsRate !== null ? `${savingsRate}%` : 'not yet established from transactions'}.`,
          how: 'Move a fixed target amount into savings or an emergency reserve on salary day.',
        },
        {
          title: 'Run a 15% discretionary cap experiment',
          why: topDiscretionary
            ? `${topDiscretionary.category} accounts for ${topDiscretionary.percentage}% of recorded spending.`
            : 'Controlling variable spend increases monthly surplus quickly.',
          how: 'Use the What-If Financial Simulator to preview the 12-month impact.',
        },
      ],
    },
    {
      horizon: 'Next 3 Months',
      items: [
        {
          title: 'Reach 3 months of emergency coverage',
          why: 'Protects your goals and prevents high-interest borrowing during income dips.',
          how: 'Track liquid balance progress in the Goal-Based Financial Planner.',
        },
        {
          title: 'Optimize loan repayment strategy',
          why:
            debts.length > 0
              ? `You currently manage ${debts.length} active debt obligation(s).`
              : 'Staying debt-light preserves compounding capacity.',
          how: 'Compare Snowball vs. Avalanche interest savings in the Debt Planner.',
        },
      ],
    },
    {
      horizon: 'Next 6 Months',
      items: [
        {
          title: 'Reassess investment & goal allocation',
          why: 'As cash reserves stabilize, excess monthly surplus can be directed toward long-term goals.',
          how: 'Review educational options (index funds, ETFs, PPF/FDs) with a qualified financial adviser based on your horizon.',
        },
      ],
    },
  ];

  return {
    analysisPeriod: {
      startDate,
      endDate,
      monthCount: sorted.length > 0 ? monthKeys.length : 0,
      transactionCount: sorted.length,
      hasSyntheticDemo,
    },
    overview: {
      totalIncome,
      totalExpense,
      netCashFlow,
      totalInvestments,
      averageMonthlyExpense: Math.round(averageMonthlyExpense),
      averageMonthlyIncome: Math.round(averageMonthlyIncome),
      savingsRate,
      latestAccountBalance,
    },
    categoryBreakdown,
    monthlySeries,
    healthScore: {
      total: totalScore,
      grade,
      factors,
      disclaimer:
        'Educational financial health indicator calculated deterministically from your profile and uploaded records. Not an official credit score or certified financial advice.',
    },
    subscriptions,
    anomalies,
    uncertainCount,
    forecast,
    recommendations,
    actionPlan,
  };
}
