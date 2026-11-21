import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeFinances,
  calculateDebtStrategies,
  calculateGoalMetrics,
  categorizeTransaction,
  detectSubscriptionsAndRecurring,
  isDuplicateTransaction,
  runWhatIfSimulation,
} from './financeEngine';
import { parseCsvTransactions } from './documentParser';
import { DEMO_DEBTS, DEMO_GOALS, DEMO_TRANSACTIONS, SAMPLE_UPLOAD_CSV } from '../data/demoData';
import { UserProfile } from '../types/finance';

const mockProfile: UserProfile = {
  id: 'u1',
  username: 'aryan',
  preferredName: 'Aryan',
  ageGroup: '25-34',
  occupation: 'Software Engineer',
  monthlyIncome: 92000,
  country: 'India',
  currency: 'INR',
  experienceLevel: 'intermediate',
  isDemo: true,
  voiceEnabled: true,
  speechRate: 1,
  onboardingCompleted: true,
  onboardingAnswers: {
    riskTolerance: 'moderate',
    monthlySavings: 22000,
    regularExpenses: 54000,
  },
  createdAt: '2026-08-01',
};

test('categorizeTransaction classifies common merchants accurately and flags ambiguous transfers', () => {
  const swiggy = categorizeTransaction('UPI SWIGGY ORDER', 'Swiggy', 'expense');
  assert.equal(swiggy.category, 'Food and groceries');
  assert.equal(swiggy.confidence, 'high');

  const netflix = categorizeTransaction('CARD NETFLIX INDIA', 'Netflix', 'expense');
  assert.equal(netflix.category, 'Subscriptions');
  assert.equal(netflix.confidence, 'high');

  const ambiguous = categorizeTransaction('UPI/884921/MISC TRANSFER', 'Local', 'expense');
  assert.equal(ambiguous.category, 'Other expenses');
  assert.equal(ambiguous.confidence, 'low');
});

test('isDuplicateTransaction catches identical date, amount, and matching description', () => {
  const dup = isDuplicateTransaction(
    {
      date: '2026-08-09',
      amount: 649,
      description: 'CARD NETFLIX INDIA SUBSCRIPTION',
      type: 'expense',
    },
    DEMO_TRANSACTIONS
  );
  assert.equal(dup.isDuplicate, true);

  const unique = isDuplicateTransaction(
    {
      date: '2026-11-15',
      amount: 649,
      description: 'CARD NETFLIX INDIA SUBSCRIPTION',
      type: 'expense',
    },
    DEMO_TRANSACTIONS
  );
  assert.equal(unique.isDuplicate, false);
});

test('detectSubscriptionsAndRecurring finds Netflix, Cult.fit, and Spotify across demo months', () => {
  const subs = detectSubscriptionsAndRecurring(DEMO_TRANSACTIONS);
  const names = subs.map((s) => s.merchant.toLowerCase());
  assert.ok(names.some((n) => n.includes('netflix')));
  assert.ok(names.some((n) => n.includes('cult')));
  assert.ok(names.some((n) => n.includes('spotify')));
});

test('analyzeFinances computes deterministic totals and explainable health score out of 100', () => {
  const report = analyzeFinances(DEMO_TRANSACTIONS, mockProfile, DEMO_DEBTS, DEMO_GOALS);
  assert.equal(report.analysisPeriod.transactionCount, DEMO_TRANSACTIONS.length);
  assert.equal(report.overview.totalIncome, 276000);
  assert.ok(report.overview.totalExpense > 0);
  assert.ok(report.healthScore.total >= 0 && report.healthScore.total <= 100);
  assert.equal(report.healthScore.factors.length, 5);
  assert.equal(report.actionPlan.length, 4);
});

test('calculateDebtStrategies shows Avalanche saves equal or more interest than Snowball', () => {
  const result = calculateDebtStrategies(DEMO_DEBTS, 3000);
  assert.equal(result.totalOutstanding, 287000);
  assert.ok(result.avalanche.totalInterestPaid <= result.snowball.totalInterestPaid);
  assert.ok(result.avalanche.monthsToPayoff > 0);
});

test('calculateGoalMetrics computes required monthly savings accurately', () => {
  const metrics = calculateGoalMetrics(DEMO_GOALS[0]);
  assert.equal(metrics.remainingAmount, 320000 - 162979);
  assert.ok(metrics.requiredMonthlySavings > 0);
  assert.ok(metrics.progressPercent >= 50);
});

test('runWhatIfSimulation increases projected surplus when discretionary spending is cut', () => {
  const analysis = analyzeFinances(DEMO_TRANSACTIONS, mockProfile, DEMO_DEBTS, DEMO_GOALS);
  const sim = runWhatIfSimulation(analysis, DEMO_GOALS, {
    discretionaryCutPercent: 20,
    extraMonthlySavings: 3000,
    monthlyInvestmentShift: 5000,
    incomeChangePercent: 0,
  });
  assert.ok(sim.simulatedMonthlySurplus > sim.baselineMonthlySurplus);
  assert.equal(sim.projectionSeries.length, 12);
});

test('parseCsvTransactions parses sample CSV and flags uncertain entries', () => {
  const drafts = parseCsvTransactions(SAMPLE_UPLOAD_CSV, DEMO_TRANSACTIONS);
  assert.equal(drafts.length, 8);
  const uncertain = drafts.filter((d) => d.confidence === 'low');
  assert.ok(uncertain.length >= 1);
  assert.equal(drafts[0].type, 'income');
  assert.equal(drafts[0].amount, 92000);
});
