export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type LionState = 'welcoming' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy';

export type AppPage =
  | 'welcome'
  | 'onboarding'
  | 'assistant'
  | 'dashboard'
  | 'transactions'
  | 'reports'
  | 'planning'
  | 'settings';

export type TransactionCategory =
  | 'Income & Salary'
  | 'Food and groceries'
  | 'Transportation'
  | 'Shopping'
  | 'Entertainment'
  | 'Rent and housing'
  | 'Education'
  | 'Healthcare'
  | 'Utilities and bills'
  | 'Travel'
  | 'Subscriptions'
  | 'Investments'
  | 'Loan repayments'
  | 'Other expenses';

export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'Food and groceries',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Rent and housing',
  'Education',
  'Healthcare',
  'Utilities and bills',
  'Travel',
  'Subscriptions',
  'Investments',
  'Loan repayments',
  'Other expenses',
];

export const ALL_CATEGORIES: TransactionCategory[] = [
  'Income & Salary',
  ...EXPENSE_CATEGORIES,
];

export type TransactionType = 'income' | 'expense';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface UserProfile {
  id: string;
  username: string;
  preferredName: string;
  ageGroup: string;
  occupation: string;
  monthlyIncome: number;
  country: string;
  currency: CurrencyCode;
  experienceLevel: ExperienceLevel;
  isDemo: boolean;
  voiceEnabled: boolean;
  speechRate: number;
  onboardingCompleted: boolean;
  onboardingAnswers: OnboardingAnswers;
  createdAt: string;
}

export interface OnboardingAnswers {
  incomeSource?: string;
  monthlyEarnings?: number;
  incomeStability?: 'fixed' | 'variable' | 'mixed';
  regularExpenses?: number;
  hasLoansOrEmis?: string;
  monthlySavings?: number;
  primaryGoals?: string;
  currentlyInvesting?: string;
  riskTolerance?: 'conservative' | 'moderate' | 'growth';
  topImprovement?: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  merchant: string;
  amount: number; // positive number
  type: TransactionType;
  balance?: number | null;
  category: TransactionCategory;
  confidence: ConfidenceLevel;
  isRecurring: boolean;
  isAnomaly?: boolean;
  anomalyReason?: string;
  isSyntheticDemo?: boolean;
  sourceDocument?: string;
  createdAt?: string;
}

export interface ParsedTransactionDraft {
  tempId: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  type: TransactionType;
  balance: number | null;
  category: TransactionCategory;
  confidence: ConfidenceLevel;
  isRecurring: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  selected: boolean;
}

export interface UploadedDocumentRecord {
  id: string;
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'pdf';
  rowCount: number;
  importedCount: number;
  uploadedAt: string;
  isSyntheticDemo?: boolean;
}

export interface DebtItem {
  id: string;
  name: string;
  principal: number;
  interestRate: number; // annual %
  monthlyEmi: number;
  dueDateDay: number;
  isSyntheticDemo?: boolean;
}

export interface FinancialGoal {
  id: string;
  title: string;
  category:
    | 'Vehicle'
    | 'Home'
    | 'Education'
    | 'Travel'
    | 'Emergency Fund'
    | 'Retirement'
    | 'Other';
  targetAmount: number;
  currentSavings: number;
  monthlyContribution: number;
  targetDate: string; // YYYY-MM-DD
  isSyntheticDemo?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  dataNotice?: string;
  createdAt: string;
}

export interface CategoryBreakdownItem {
  category: TransactionCategory;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyComparisonPoint {
  month: string; // YYYY-MM
  label: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
}

export interface HealthScoreFactor {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  status: 'Strong' | 'Moderate' | 'Needs Focus';
  explanation: string;
}

export interface SubscriptionLeak {
  merchant: string;
  frequency: 'Monthly' | 'Weekly' | 'Quarterly';
  monthlyCost: number;
  annualCost: number;
  lastPaymentDate: string;
  occurrences: number;
  reviewSuggested: boolean;
  reviewReason: string;
}

export interface CashFlowForecast {
  currentEstimatedBalance: number;
  confirmedUpcomingIncome: number;
  confirmedRecurringExpenses: number;
  estimatedDiscretionaryExpenses: number;
  projectedMonthEndBalance: number;
  shortageRisk: boolean;
  shortageAmount: number;
  confidenceLabel: 'Low' | 'Moderate' | 'Higher';
  assumptions: string[];
  timeline: Array<{
    label: string;
    projectedBalance: number;
    confirmedOnlyBalance: number;
    kind: 'verified' | 'estimate';
  }>;
}

export interface DebtStrategyResult {
  strategy: 'snowball' | 'avalanche';
  monthsToPayoff: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffOrder: string[];
  schedule: Array<{
    month: number;
    remainingBalance: number;
  }>;
}

export interface ActionPlanPhase {
  horizon: 'Next 7 Days' | 'Next 30 Days' | 'Next 3 Months' | 'Next 6 Months';
  items: Array<{
    title: string;
    why: string;
    how: string;
  }>;
}

export interface FinancialAnalysisSummary {
  analysisPeriod: {
    startDate: string | null;
    endDate: string | null;
    monthCount: number;
    transactionCount: number;
    hasSyntheticDemo: boolean;
  };
  overview: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    totalInvestments: number;
    averageMonthlyExpense: number;
    averageMonthlyIncome: number;
    savingsRate: number | null;
    latestAccountBalance: number | null;
  };
  categoryBreakdown: CategoryBreakdownItem[];
  monthlySeries: MonthlyComparisonPoint[];
  healthScore: {
    total: number;
    grade: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
    factors: HealthScoreFactor[];
    disclaimer: string;
  };
  subscriptions: SubscriptionLeak[];
  anomalies: Transaction[];
  uncertainCount: number;
  forecast: CashFlowForecast;
  recommendations: Array<{
    title: string;
    why: string;
    how: string;
    priority: 'High' | 'Medium' | 'Foundational';
  }>;
  actionPlan: ActionPlanPhase[];
}

export interface WhatIfParams {
  discretionaryCutPercent: number; // 0 to 50
  extraMonthlySavings: number;
  monthlyInvestmentShift: number;
  incomeChangePercent: number; // -30 to +30
}

export interface WhatIfResult {
  baselineMonthlySurplus: number;
  simulatedMonthlySurplus: number;
  monthlyDelta: number;
  baseline12MonthSavings: number;
  simulated12MonthSavings: number;
  goalAccelerationMonths: number | null;
  projectionSeries: Array<{
    month: string;
    baseline: number;
    simulated: number;
  }>;
}
