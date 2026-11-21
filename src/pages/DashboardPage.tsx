import React, { Suspense, lazy, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, FileBarChart2, FileUp } from 'lucide-react';
import {
  NewTransactionPayload,
  QuickAddTransactionModal,
} from '../components/QuickAddTransactionModal';
import { QuickActionsMenu } from '../components/QuickActionsMenu';
import {
  AppPage,
  CategoryBreakdownItem,
  CurrencyCode,
  FinancialAnalysisSummary,
  FinancialGoal,
  Transaction,
  UserProfile,
} from '../types/finance';
import { formatCurrency } from '../utils/currency';
import {
  buildMonthlyChartSeries,
  formatChangePercent,
  MonthlyChartPoint,
} from '../utils/dashboardMetrics';

const Financial3DShowcase = lazy(() =>
  import('../components/3d/Financial3DShowcase').then((m) => ({
    default: m.Financial3DShowcase,
  }))
);

interface DashboardPageProps {
  profile: UserProfile;
  analysis: FinancialAnalysisSummary;
  transactions: Transaction[];
  goals: FinancialGoal[];
  onNavigate: (page: AppPage) => void;
  onCheckGoals: () => void;
  onAddTransaction: (payload: NewTransactionPayload) => Promise<void>;
}

const CHART_PALETTE = ['#183B32', '#5C8374', '#A5B4A4', '#C4AD7D', '#8C7A5B', '#D5D1C5'];

interface CashflowTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: MonthlyChartPoint }>;
  currency: CurrencyCode;
}

const CashflowTooltip: React.FC<CashflowTooltipProps> = ({ active, payload, currency }) => {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }
  const pt = payload[0].payload;
  const getChangeTone = (pct: number | null, invertGood = false) => {
    if (pct === null || pct === 0) return 'text-[#5C635E]';
    const isPositive = pct > 0;
    const isFavorable = invertGood ? !isPositive : isPositive;
    return isFavorable ? 'text-[#183B32]' : 'text-[#991B1B]';
  };

  return (
    <div
      data-testid="cashflow-tooltip"
      className="bg-white rounded-xl border border-[#DFDBD0] shadow-lg p-3.5 min-w-[230px] text-xs space-y-2.5"
    >
      <div className="flex items-center justify-between border-b border-[#EFECE5] pb-1.5">
        <span className="font-display font-semibold text-sm text-[#202321]">{pt.label}</span>
        <span className="font-mono-num text-[11px] text-[#5C635E]">{pt.savingsRate}% saved</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-[#5C635E]">
            <span className="w-2 h-2 rounded-sm bg-[#7D9A7D]" />
            Income
          </span>
          <div className="text-right">
            <div className="font-mono-num font-semibold text-[#202321]">
              {formatCurrency(pt.income, currency)}
            </div>
            <div className={`font-mono-num text-[11px] ${getChangeTone(pt.incomeChangePct)}`}>
              {formatChangePercent(pt.incomeChangePct)}
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-[#5C635E]">
            <span className="w-2 h-2 rounded-sm bg-[#183B32]" />
            Spending
          </span>
          <div className="text-right">
            <div className="font-mono-num font-semibold text-[#202321]">
              {formatCurrency(pt.expense, currency)}
            </div>
            <div className={`font-mono-num text-[11px] ${getChangeTone(pt.expenseChangePct, true)}`}>
              {formatChangePercent(pt.expenseChangePct)}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-1.5 border-t border-[#EFECE5] flex items-center justify-between gap-4">
        <span className="text-[#5C635E]">Net Cash Flow</span>
        <span className="font-mono-num font-semibold text-[#183B32]">
          {formatCurrency(pt.net, currency)}
        </span>
      </div>
    </div>
  );
};

interface CategoryTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: CategoryBreakdownItem }>;
  currency: CurrencyCode;
}

const CategoryBreakdownTooltip: React.FC<CategoryTooltipProps> = ({
  active,
  payload,
  currency,
}) => {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }
  const item = payload[0].payload;
  return (
    <div
      data-testid="category-tooltip"
      className="bg-white rounded-xl border border-[#DFDBD0] shadow-lg p-3 text-xs space-y-1 min-w-[175px]"
    >
      <div className="font-semibold text-[#202321]">{item.category}</div>
      <div className="font-mono-num font-semibold text-sm text-[#183B32]">
        {formatCurrency(item.amount, currency)}
      </div>
      <div className="font-mono-num text-[11px] text-[#5C635E]">
        {item.percentage}% of spending · {item.count} {item.count === 1 ? 'entry' : 'entries'}
      </div>
    </div>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  profile,
  analysis,
  transactions,
  goals,
  onNavigate,
  onCheckGoals,
  onAddTransaction,
}) => {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const cur = profile.currency;
  const topCategories = analysis.categoryBreakdown.slice(0, 5);
  const recentTx = transactions.slice(0, 6);
  const monthlyChartData = useMemo(
    () => buildMonthlyChartSeries(analysis.monthlySeries),
    [analysis.monthlySeries]
  );
  const defaultTxDate =
    analysis.analysisPeriod.endDate || new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 pb-16 lg:pb-6">
      {/* Period & Data Attribution Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-[#5C635E]">
          Analysis period:{' '}
          <span className="font-medium text-[#202321]">
            {analysis.analysisPeriod.startDate || 'No records yet'}
            {analysis.analysisPeriod.endDate ? ` to ${analysis.analysisPeriod.endDate}` : ''}
          </span>{' '}
          ·{' '}
          <span className="font-mono-num font-medium text-[#202321]">
            {analysis.analysisPeriod.transactionCount}
          </span>{' '}
          transactions
          {analysis.analysisPeriod.hasSyntheticDemo ? ' · Synthetic demo data active' : ''}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E2DED4] text-xs font-semibold text-[#202321] hover:border-[#183B32] transition-colors"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Import Statement</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#183B32] text-white text-xs font-semibold hover:bg-[#122D26] transition-colors"
          >
            <FileBarChart2 className="w-3.5 h-3.5" />
            <span>Health Report</span>
          </button>
        </div>
      </div>

      {/* Empty State Banner if 0 transactions */}
      {transactions.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E1D8] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#202321]">
              Upload your first bank statement to unlock verified analytics
            </h2>
            <p className="text-sm text-[#5C635E] mt-1">
              Drop a CSV, Excel (XLSX), or PDF statement in Transaction Manager, or complete your
              conversational onboarding first.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="px-4 py-2.5 rounded-xl bg-[#183B32] text-white text-xs font-semibold shrink-0"
          >
            Upload Transactions
          </button>
        </div>
      )}

      {/* 4 Top KPI Cards (aligned with reference layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E5E1D8] p-5">
          <div className="flex items-center justify-between text-xs text-[#5C635E]">
            <span>Total Income</span>
            <span className="font-mono-num">
              {analysis.analysisPeriod.monthCount || 1} mo
            </span>
          </div>
          <div className="mt-2 font-display font-mono-num text-2xl font-semibold text-[#202321]">
            {formatCurrency(analysis.overview.totalIncome, cur)}
          </div>
          <div className="mt-1.5 text-xs text-[#5C635E]">
            Avg {formatCurrency(analysis.overview.averageMonthlyIncome, cur)} / month
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E1D8] p-5">
          <div className="flex items-center justify-between text-xs text-[#5C635E]">
            <span>Total Expenditure</span>
            <span className="font-mono-num">{analysis.categoryBreakdown.length} categories</span>
          </div>
          <div className="mt-2 font-display font-mono-num text-2xl font-semibold text-[#202321]">
            {formatCurrency(analysis.overview.totalExpense, cur)}
          </div>
          <div className="mt-1.5 text-xs text-[#5C635E]">
            Avg {formatCurrency(analysis.overview.averageMonthlyExpense, cur)} / month
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E1D8] p-5">
          <div className="flex items-center justify-between text-xs text-[#5C635E]">
            <span>Net Cash Flow</span>
            <span className="font-mono-num text-[#183B32] font-medium">
              {analysis.overview.savingsRate !== null
                ? `${analysis.overview.savingsRate}% rate`
                : 'No income'}
            </span>
          </div>
          <div className="mt-2 font-display font-mono-num text-2xl font-semibold text-[#183B32]">
            {formatCurrency(analysis.overview.netCashFlow, cur)}
          </div>
          <div className="mt-1.5 text-xs text-[#5C635E]">
            Investments recorded: {formatCurrency(analysis.overview.totalInvestments, cur)}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E1D8] p-5">
          <div className="flex items-center justify-between text-xs text-[#5C635E]">
            <span>Financial Health Score</span>
            <span className="font-semibold text-[#183B32]">{analysis.healthScore.grade}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display font-mono-num text-2xl font-semibold text-[#202321]">
              {analysis.healthScore.total}
              <span className="text-sm font-normal text-[#5C635E]"> / 100</span>
            </span>
          </div>
          <div className="mt-2.5 w-full h-2.5 bg-[#E9ECE6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#183B32] rounded-full"
              style={{ width: `${analysis.healthScore.total}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Analytics Row: Cashflow Spline + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E1D8] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#202321]">
                Cashflow Trend
              </h2>
              <p className="text-xs text-[#5C635E]">
                Verified monthly income versus total expenditure
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#5C635E]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#A5B4A4]" /> Income
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#183B32]" /> Expense
              </span>
            </div>
          </div>

          <div className="h-[260px]" data-testid="cashflow-chart-container">
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A5B4A4" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#A5B4A4" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#183B32" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#183B32" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFECE5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5C635E' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5C635E' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: '#C4AD7D', strokeWidth: 1.25, strokeDasharray: '4 4' }}
                    content={<CashflowTooltip currency={cur} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#7D9A7D"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#FFFFFF', stroke: '#7D9A7D', strokeWidth: 2 }}
                    activeDot={{ r: 5.5, fill: '#7D9A7D', stroke: '#FFFFFF', strokeWidth: 2 }}
                    fill="url(#incomeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Expense"
                    stroke="#183B32"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#FFFFFF', stroke: '#183B32', strokeWidth: 2 }}
                    activeDot={{ r: 5.5, fill: '#183B32', stroke: '#FFFFFF', strokeWidth: 2 }}
                    fill="url(#expenseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#5C635E]">
                No monthly transaction data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Expense Breakdown Donut + Top Categories */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E1D8] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-[#202321]">
              Expense Breakdown
            </h2>
            <p className="text-xs text-[#5C635E]">Distribution across top categories</p>
          </div>

          {topCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center my-3">
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategories}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {topCategories.map((entry, idx) => (
                        <Cell
                          key={entry.category}
                          fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CategoryBreakdownTooltip currency={cur} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {topCategories.map((item, idx) => (
                  <div key={item.category} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                      />
                      <span className="text-[#202321] truncate">{item.category}</span>
                    </div>
                    <span className="font-mono-num font-semibold text-[#202321] shrink-0">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-[#5C635E]">
              Import transactions to view spending categories.
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="text-xs font-semibold text-[#183B32] inline-flex items-center gap-1 hover:underline"
          >
            <span>Inspect full spending & score breakdown</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Financial Visual Showcase (Lazy-loaded) */}
      <Suspense
        fallback={
          <div className="bg-white rounded-2xl border border-[#E5E1D8] p-6 text-xs text-[#5C635E]">
            Loading 3D wealth &amp; spending topology...
          </div>
        }
      >
        <Financial3DShowcase
          analysis={analysis}
          currency={cur}
          onInspectReports={() => onNavigate('reports')}
        />
      </Suspense>

      {/* Bottom Row: Recent Transactions & Active Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E1D8] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-[#202321]">
              Recent Transactions
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-[#183B32] hover:underline"
            >
              Manage all
            </button>
          </div>

          {recentTx.length > 0 ? (
            <div className="divide-y divide-[#EFECE5]">
              {recentTx.map((tx) => (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[#202321] truncate">{tx.merchant}</div>
                    <div className="text-xs text-[#5C635E] truncate">
                      {tx.date} · {tx.category}
                      {tx.confidence === 'low' ? ' · Needs review' : ''}
                    </div>
                  </div>
                  <div
                    className={`font-mono-num font-semibold shrink-0 ${
                      tx.type === 'income' ? 'text-[#183B32]' : 'text-[#202321]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '−'}
                    {formatCurrency(tx.amount, cur)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#5C635E] py-6">No transactions recorded yet.</p>
          )}
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E1D8] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-[#202321]">
                Balances & Goals
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('planning')}
                className="text-xs font-semibold text-[#183B32] hover:underline"
              >
                Open planner
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#183B32] text-white mb-4">
              <div className="text-xs text-white/75">Latest Recorded / Estimated Balance</div>
              <div className="font-display font-mono-num text-2xl font-semibold mt-1">
                {formatCurrency(
                  analysis.overview.latestAccountBalance ??
                    analysis.forecast.currentEstimatedBalance,
                  cur
                )}
              </div>
              <div className="text-[11px] text-white/75 mt-1">
                Projected month-end (estimate):{' '}
                {formatCurrency(analysis.forecast.projectedMonthEndBalance, cur)}
              </div>
            </div>

            <div className="space-y-3">
              {goals.length > 0 ? (
                goals.slice(0, 3).map((g) => {
                  const pct = Math.min(
                    100,
                    Math.round((g.currentSavings / Math.max(1, g.targetAmount)) * 100)
                  );
                  return (
                    <div key={g.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#202321]">{g.title}</span>
                        <span className="font-mono-num text-[#5C635E]">
                          {formatCurrency(g.currentSavings, cur)} /{' '}
                          {formatCurrency(g.targetAmount, cur)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#E9ECE6] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#C4AD7D] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#5C635E]">
                  No financial goals created yet. Add one in Financial Planning.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Quick Actions Menu & Inline Add Transaction Modal */}
      <QuickActionsMenu
        onAddTransaction={() => setQuickAddOpen(true)}
        onCheckGoals={onCheckGoals}
        onViewReport={() => onNavigate('reports')}
      />

      <QuickAddTransactionModal
        open={quickAddOpen}
        currency={cur}
        defaultDate={defaultTxDate}
        onClose={() => setQuickAddOpen(false)}
        onSubmit={onAddTransaction}
      />
    </div>
  );
};
