import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Plus, Trash2 } from 'lucide-react';
import {
  DebtItem,
  FinancialAnalysisSummary,
  FinancialGoal,
  UserProfile,
  WhatIfParams,
} from '../types/finance';
import { CURRENCY_CONFIG, formatCurrency } from '../utils/currency';
import {
  calculateDebtStrategies,
  calculateGoalMetrics,
  runWhatIfSimulation,
} from '../utils/financeEngine';

const GoalObject3D = lazy(() =>
  import('../components/3d/GoalObject3D').then((m) => ({
    default: m.GoalObject3D,
  }))
);

export type PlanningTab = 'forecast' | 'subscriptions' | 'debt' | 'goals' | 'whatif';

interface PlanningPageProps {
  profile: UserProfile;
  analysis: FinancialAnalysisSummary;
  debts: DebtItem[];
  goals: FinancialGoal[];
  initialTab?: PlanningTab;
  onAddDebt: (debt: Omit<DebtItem, 'id'>) => Promise<void>;
  onDeleteDebt: (id: string) => Promise<void>;
  onAddGoal: (goal: Omit<FinancialGoal, 'id'>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
}

export const PlanningPage: React.FC<PlanningPageProps> = ({
  profile,
  analysis,
  debts,
  goals,
  initialTab = 'forecast',
  onAddDebt,
  onDeleteDebt,
  onAddGoal,
  onDeleteGoal,
}) => {
  const [tab, setTab] = useState<PlanningTab>(initialTab);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const cur = profile.currency;
  const sym = CURRENCY_CONFIG[cur].symbol;

  // Debt Form & Extra Payment State
  const [extraDebtPay, setExtraDebtPay] = useState(2000);
  const [debtName, setDebtName] = useState('');
  const [debtPrincipal, setDebtPrincipal] = useState('');
  const [debtRate, setDebtRate] = useState('');
  const [debtEmi, setDebtEmi] = useState('');

  // Goal Form & Selected 3D Preview State
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCat, setGoalCat] = useState<FinancialGoal['category']>('Emergency Fund');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalMonthly, setGoalMonthly] = useState('');
  const [goalDate, setGoalDate] = useState('2027-12-01');

  const activeGoal3D = useMemo(() => {
    if (goals.length === 0) return null;
    return goals.find((g) => g.id === selectedGoalId) ?? goals[0];
  }, [goals, selectedGoalId]);

  // What-If Simulator State
  const [whatIf, setWhatIf] = useState<WhatIfParams>({
    discretionaryCutPercent: 15,
    extraMonthlySavings: 3000,
    monthlyInvestmentShift: 5000,
    incomeChangePercent: 0,
  });

  const debtReport = useMemo(
    () => calculateDebtStrategies(debts, extraDebtPay),
    [debts, extraDebtPay]
  );

  const debtChartData = useMemo(() => {
    const map = new Map<number, { month: number; snowball?: number; avalanche?: number }>();
    debtReport.snowball.schedule.forEach((pt) => {
      map.set(pt.month, { ...(map.get(pt.month) || { month: pt.month }), snowball: pt.remainingBalance });
    });
    debtReport.avalanche.schedule.forEach((pt) => {
      map.set(pt.month, { ...(map.get(pt.month) || { month: pt.month }), avalanche: pt.remainingBalance });
    });
    return Array.from(map.values()).sort((a, b) => a.month - b.month);
  }, [debtReport]);

  const whatIfResult = useMemo(
    () => runWhatIfSimulation(analysis, goals, whatIf),
    [analysis, goals, whatIf]
  );

  const handleDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtName.trim() || Number(debtPrincipal) <= 0 || Number(debtEmi) <= 0) return;
    await onAddDebt({
      name: debtName.trim(),
      principal: Number(debtPrincipal),
      interestRate: Number(debtRate) || 0,
      monthlyEmi: Number(debtEmi),
      dueDateDay: 5,
    });
    setDebtName('');
    setDebtPrincipal('');
    setDebtRate('');
    setDebtEmi('');
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || Number(goalTarget) <= 0 || !goalDate) return;
    await onAddGoal({
      title: goalTitle.trim(),
      category: goalCat,
      targetAmount: Number(goalTarget),
      currentSavings: Number(goalCurrent) || 0,
      monthlyContribution: Number(goalMonthly) || 0,
      targetDate: goalDate,
    });
    setGoalTitle('');
    setGoalTarget('');
    setGoalCurrent('');
    setGoalMonthly('');
  };

  const monthlyIncomeEst =
    analysis.overview.averageMonthlyIncome || profile.monthlyIncome || 0;
  const dtiRatio =
    monthlyIncomeEst > 0
      ? Math.round((debtReport.totalMonthlyEmi / monthlyIncomeEst) * 1000) / 10
      : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Segmented Feature Navigation */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] p-2 flex flex-wrap gap-1.5">
        {(
          [
            { id: 'forecast', label: 'Cash Flow Forecast' },
            { id: 'subscriptions', label: 'Subscription Leaks' },
            { id: 'debt', label: 'Smart Debt Planner' },
            { id: 'goals', label: 'Goal-Based Planner' },
            { id: 'whatif', label: 'What-If Simulator' },
          ] as Array<{ id: PlanningTab; label: string }>
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === item.id
                ? 'bg-[#183B32] text-white'
                : 'text-[#5C635E] hover:text-[#202321] hover:bg-[#F6F4EF]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Feature 1: Predictive Cash Flow Forecasting */}
      {tab === 'forecast' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E5E1D8] p-5">
              <div className="text-xs text-[#5C635E]">Starting / Current Balance</div>
              <div className="font-mono-num text-xl font-semibold text-[#202321] mt-1">
                {formatCurrency(analysis.forecast.currentEstimatedBalance, cur)}
              </div>
              <div className="text-[11px] text-[#5C635E] mt-1">Verified latest / baseline</div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E1D8] p-5">
              <div className="text-xs text-[#5C635E]">Confirmed Recurring Outflows</div>
              <div className="font-mono-num text-xl font-semibold text-[#202321] mt-1">
                {formatCurrency(analysis.forecast.confirmedRecurringExpenses, cur)}
              </div>
              <div className="text-[11px] text-[#5C635E] mt-1">Rent, EMIs & subscriptions</div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E1D8] p-5">
              <div className="text-xs text-[#5C635E]">Estimated Variable Spend</div>
              <div className="font-mono-num text-xl font-semibold text-[#202321] mt-1">
                {formatCurrency(analysis.forecast.estimatedDiscretionaryExpenses, cur)}
              </div>
              <div className="text-[11px] text-[#5C635E] mt-1">Estimate from history</div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E1D8] p-5">
              <div className="text-xs text-[#5C635E]">Projected Month-End Balance</div>
              <div
                className={`font-mono-num text-xl font-semibold mt-1 ${
                  analysis.forecast.shortageRisk ? 'text-[#991B1B]' : 'text-[#183B32]'
                }`}
              >
                {formatCurrency(analysis.forecast.projectedMonthEndBalance, cur)}
              </div>
              <div className="text-[11px] text-[#5C635E] mt-1">
                {analysis.forecast.shortageRisk
                  ? `Potential cash shortage of ${formatCurrency(analysis.forecast.shortageAmount, cur)}`
                  : `Estimate · ${analysis.forecast.confidenceLabel} confidence`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E1D8] p-6">
              <h3 className="font-display text-base font-semibold text-[#202321]">
                Projected Cash Trajectory (Confirmed vs. Full Estimate)
              </h3>
              <p className="text-xs text-[#5C635E] mb-4">
                Clearly separates confirmed recurring commitments from variable spending estimates.
              </p>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysis.forecast.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFECE5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5C635E' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#5C635E' }} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0), cur)} />
                    <Area
                      type="monotone"
                      dataKey="confirmedOnlyBalance"
                      name="After Confirmed Recurring Only"
                      stroke="#A5B4A4"
                      fill="#A5B4A4"
                      fillOpacity={0.22}
                    />
                    <Area
                      type="monotone"
                      dataKey="projectedBalance"
                      name="Projected Balance (Incl. Variable Estimate)"
                      stroke="#183B32"
                      fill="#183B32"
                      fillOpacity={0.18}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-4">
              <h3 className="font-display text-base font-semibold text-[#202321]">
                Forecast Assumptions & Limitations
              </h3>
              <div className="text-xs text-[#5C635E]">
                Confidence level:{' '}
                <strong className="text-[#183B32]">{analysis.forecast.confidenceLabel}</strong>
              </div>
              <ul className="space-y-2.5 text-xs text-[#202321] list-disc pl-4 leading-relaxed">
                {analysis.forecast.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Feature 2: Subscription & Expense Leak Detector */}
      {tab === 'subscriptions' && (
        <div className="bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#202321]">
                Subscription & Recurring Expense Leak Detector
              </h3>
              <p className="text-xs text-[#5C635E] mt-0.5">
                Automatically detects recurring charges from your transaction history. AURION never
                cancels payments or accesses your bank automatically.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#5C635E]">Total Estimated Annual Recurring</div>
              <div className="font-mono-num text-lg font-semibold text-[#183B32]">
                {formatCurrency(
                  analysis.subscriptions.reduce((s, r) => s + r.annualCost, 0),
                  cur
                )}
              </div>
            </div>
          </div>

          {analysis.subscriptions.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#5C635E]">
              Upload at least 2 months of statements to detect recurring subscriptions automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EAE7DF] text-[#5C635E]">
                    <th className="py-2.5 pr-4">Subscription / Service</th>
                    <th className="py-2.5 pr-4">Frequency</th>
                    <th className="py-2.5 pr-4">Approx. Monthly</th>
                    <th className="py-2.5 pr-4">Est. Annual Cost</th>
                    <th className="py-2.5 pr-4">Last Payment</th>
                    <th className="py-2.5">Review Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EFE9]">
                  {analysis.subscriptions.map((sub) => (
                    <tr key={sub.merchant} className={sub.reviewSuggested ? 'bg-[#FEF9EC]' : ''}>
                      <td className="py-3 pr-4 font-semibold text-[#202321]">{sub.merchant}</td>
                      <td className="py-3 pr-4 text-[#5C635E]">
                        {sub.frequency} ({sub.occurrences}x)
                      </td>
                      <td className="py-3 pr-4 font-mono-num">
                        {formatCurrency(sub.monthlyCost, cur)}
                      </td>
                      <td className="py-3 pr-4 font-mono-num font-semibold text-[#202321]">
                        {formatCurrency(sub.annualCost, cur)}
                      </td>
                      <td className="py-3 pr-4 font-mono-num">{sub.lastPaymentDate}</td>
                      <td className="py-3 text-[#202321]">
                        {sub.reviewSuggested ? (
                          <span className="font-medium text-[#92400E]">
                            Review candidate · {sub.reviewReason}
                          </span>
                        ) : (
                          <span className="text-[#5C635E]">{sub.reviewReason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Feature 3: Smart Debt Management Planner */}
      {tab === 'debt' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-5">
              <h3 className="font-display text-base font-semibold text-[#202321]">
                Loans & EMIs ({debts.length})
              </h3>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF]">
                  <div className="text-[#5C635E]">Total Debt</div>
                  <div className="font-mono-num font-semibold text-sm text-[#202321] mt-0.5">
                    {formatCurrency(debtReport.totalOutstanding, cur)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF]">
                  <div className="text-[#5C635E]">Monthly EMI</div>
                  <div className="font-mono-num font-semibold text-sm text-[#202321] mt-0.5">
                    {formatCurrency(debtReport.totalMonthlyEmi, cur)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF]">
                  <div className="text-[#5C635E]">DTI Ratio</div>
                  <div className="font-mono-num font-semibold text-sm text-[#183B32] mt-0.5">
                    {dtiRatio !== null ? `${dtiRatio}%` : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {debts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#202321]">{d.name}</div>
                      <div className="text-[#5C635E] font-mono-num mt-0.5">
                        Bal: {formatCurrency(d.principal, cur)} · {d.interestRate}% APR · EMI{' '}
                        {formatCurrency(d.monthlyEmi, cur)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteDebt(d.id)}
                      aria-label={`Remove loan ${d.name}`}
                      className="p-1.5 text-[#5C635E] hover:text-[#991B1B]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleDebtSubmit} className="pt-4 border-t border-[#EAE7DF] space-y-3">
                <div className="text-xs font-semibold text-[#202321]">Add Loan / EMI</div>
                <input
                  type="text"
                  value={debtName}
                  onChange={(e) => setDebtName(e.target.value)}
                  placeholder="Loan name (e.g. Car Loan)"
                  className="w-full px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs"
                  required
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="1"
                    value={debtPrincipal}
                    onChange={(e) => setDebtPrincipal(e.target.value)}
                    placeholder={`Balance (${sym})`}
                    className="px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs"
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={debtRate}
                    onChange={(e) => setDebtRate(e.target.value)}
                    placeholder="APR %"
                    className="px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    value={debtEmi}
                    onChange={(e) => setDebtEmi(e.target.value)}
                    placeholder={`EMI (${sym})`}
                    className="px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#183B32] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Loan</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-semibold text-[#202321]">
                    Snowball vs. Avalanche Repayment Comparison
                  </h3>
                  <p className="text-xs text-[#5C635E]">
                    Illustrative simulation assuming consistent payments
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor="extra-debt-pay" className="text-[#5C635E]">
                    Extra monthly ({sym}):
                  </label>
                  <input
                    id="extra-debt-pay"
                    type="number"
                    min="0"
                    step="500"
                    value={extraDebtPay}
                    onChange={(e) => setExtraDebtPay(Number(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-[#DFDBD0] font-mono-num text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF] space-y-1">
                  <div className="font-semibold text-[#202321]">Snowball (Smallest Balance First)</div>
                  <div className="font-mono-num text-base font-bold text-[#202321]">
                    {debtReport.snowball.monthsToPayoff} months ·{' '}
                    {formatCurrency(debtReport.snowball.totalInterestPaid, cur)} interest
                  </div>
                  <div className="text-[#5C635E]">
                    Order: {debtReport.snowball.payoffOrder.join(' → ') || 'N/A'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#EBF0E9] border border-[#D4DCD2] space-y-1">
                  <div className="font-semibold text-[#183B32]">Avalanche (Highest APR First)</div>
                  <div className="font-mono-num text-base font-bold text-[#183B32]">
                    {debtReport.avalanche.monthsToPayoff} months ·{' '}
                    {formatCurrency(debtReport.avalanche.totalInterestPaid, cur)} interest
                  </div>
                  <div className="text-[#5C635E]">
                    Order: {debtReport.avalanche.payoffOrder.join(' → ') || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="h-[220px]">
                {debtChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={debtChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFECE5" vertical={false} />
                      <XAxis dataKey="month" tickFormatter={(m) => `M${m}`} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0), cur)} />
                      <Line
                        type="monotone"
                        dataKey="snowball"
                        name="Snowball Balance"
                        stroke="#C4AD7D"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="avalanche"
                        name="Avalanche Balance"
                        stroke="#183B32"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-[#5C635E]">
                    Add at least one loan to view payoff schedules.
                  </div>
                )}
              </div>

              <p className="text-xs text-[#5C635E] leading-relaxed">
                <strong>Guidance:</strong> Avalanche minimizes total interest cost (saving{' '}
                {formatCurrency(
                  Math.max(
                    0,
                    debtReport.snowball.totalInterestPaid - debtReport.avalanche.totalInterestPaid
                  ),
                  cur
                )}{' '}
                in this illustration). Snowball can still be helpful if knocking out a smaller
                balance quickly keeps you motivated.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feature 4: Goal-Based Financial Planner */}
      {tab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E1D8] p-6">
            <h3 className="font-display text-base font-semibold text-[#202321] mb-4">
              Create Financial Goal
            </h3>
            <form onSubmit={handleGoalSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#202321] mb-1">Goal Title</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Emergency Fund, Masters Tuition"
                  className="w-full px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#202321] mb-1">Category</label>
                <select
                  value={goalCat}
                  onChange={(e) => setGoalCat(e.target.value as FinancialGoal['category'])}
                  className="w-full px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs"
                >
                  <option value="Emergency Fund">Emergency Fund</option>
                  <option value="Vehicle">Buying a Vehicle</option>
                  <option value="Home">Purchasing a House</option>
                  <option value="Education">Higher Education</option>
                  <option value="Travel">International Travel</option>
                  <option value="Retirement">Retirement Planning</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#202321] mb-1">
                    Target ({sym})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    placeholder="300000"
                    className="w-full px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#202321] mb-1">
                    Saved So Far ({sym})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#202321] mb-1">
                    Monthly Capacity ({sym})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={goalMonthly}
                    onChange={(e) => setGoalMonthly(e.target.value)}
                    placeholder="10000"
                    className="w-full px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#202321] mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-xs"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#183B32] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Financial Goal</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 space-y-4">
            {activeGoal3D && (
              <Suspense
                fallback={
                  <div className="bg-[#EBF0E9] rounded-2xl border border-[#DCE2DA] p-5 text-xs text-[#5C635E]">
                    Loading 3D goal sculpture...
                  </div>
                }
              >
                <GoalObject3D goal={activeGoal3D} currency={cur} />
              </Suspense>
            )}

            {goals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E1D8] p-8 text-center text-sm text-[#5C635E]">
                No financial goals yet. Create your first goal on the left to calculate required
                monthly savings.
              </div>
            ) : (
              goals.map((g) => {
                const m = calculateGoalMetrics(g);
                const isSelected3D = activeGoal3D?.id === g.id;
                return (
                  <div
                    key={g.id}
                    className={`bg-white rounded-2xl border p-5 space-y-3 transition-colors ${
                      isSelected3D ? 'border-[#183B32]' : 'border-[#E5E1D8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs text-[#5C635E]">
                          {g.category} · Target Date {g.targetDate}
                        </div>
                        <h4 className="font-display text-base font-semibold text-[#202321]">
                          {g.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedGoalId(g.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                            isSelected3D
                              ? 'bg-[#183B32] text-white border-[#183B32]'
                              : 'bg-[#FAF9F6] text-[#183B32] border-[#DFDBD0] hover:border-[#183B32]'
                          }`}
                        >
                          {isSelected3D ? 'Active in 3D' : 'View in 3D'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteGoal(g.id)}
                          aria-label={`Delete goal ${g.title}`}
                          className="p-1.5 text-[#5C635E] hover:text-[#991B1B]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-[#EFECE5] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#183B32] rounded-full"
                        style={{ width: `${m.progressPercent}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      <div>
                        <div className="text-[#5C635E]">Saved / Target</div>
                        <div className="font-mono-num font-semibold text-[#202321]">
                          {formatCurrency(g.currentSavings, cur)} /{' '}
                          {formatCurrency(g.targetAmount, cur)} ({m.progressPercent}%)
                        </div>
                      </div>
                      <div>
                        <div className="text-[#5C635E]">Required / Month</div>
                        <div className="font-mono-num font-semibold text-[#183B32]">
                          {formatCurrency(m.requiredMonthlySavings, cur)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#5C635E]">Your Monthly Capacity</div>
                        <div className="font-mono-num font-semibold text-[#202321]">
                          {formatCurrency(g.monthlyContribution, cur)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#5C635E]">Pace Status</div>
                        <div
                          className={`font-semibold ${
                            m.onTrack ? 'text-[#183B32]' : 'text-[#92400E]'
                          }`}
                        >
                          {m.onTrack
                            ? 'On Track'
                            : `Short by ${formatCurrency(
                                m.requiredMonthlySavings - g.monthlyContribution,
                                cur
                              )}/mo`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Feature 5: What-If Financial Simulator */}
      {tab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-5">
            <div>
              <h3 className="font-display text-base font-semibold text-[#202321]">
                What-If Financial Simulator
              </h3>
              <p className="text-xs text-[#5C635E] mt-0.5">
                Experiment with hypothetical changes. All simulated outcomes are estimates, not
                guaranteed financial results.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-medium text-[#202321] mb-1">
                  <span>Reduce discretionary spending</span>
                  <span className="font-mono-num text-[#183B32]">
                    -{whatIf.discretionaryCutPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={whatIf.discretionaryCutPercent}
                  onChange={(e) =>
                    setWhatIf((p) => ({ ...p, discretionaryCutPercent: Number(e.target.value) }))
                  }
                  className="w-full accent-[#183B32]"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-[#202321] mb-1">
                  <span>Save extra every month</span>
                  <span className="font-mono-num text-[#183B32]">
                    +{formatCurrency(whatIf.extraMonthlySavings, cur)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25000}
                  step={500}
                  value={whatIf.extraMonthlySavings}
                  onChange={(e) =>
                    setWhatIf((p) => ({ ...p, extraMonthlySavings: Number(e.target.value) }))
                  }
                  className="w-full accent-[#183B32]"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-[#202321] mb-1">
                  <span>Illustrative monthly investment allocation</span>
                  <span className="font-mono-num text-[#183B32]">
                    {formatCurrency(whatIf.monthlyInvestmentShift, cur)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30000}
                  step={1000}
                  value={whatIf.monthlyInvestmentShift}
                  onChange={(e) =>
                    setWhatIf((p) => ({ ...p, monthlyInvestmentShift: Number(e.target.value) }))
                  }
                  className="w-full accent-[#183B32]"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-[#202321] mb-1">
                  <span>Income change scenario</span>
                  <span className="font-mono-num text-[#183B32]">
                    {whatIf.incomeChangePercent >= 0 ? '+' : ''}
                    {whatIf.incomeChangePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={5}
                  value={whatIf.incomeChangePercent}
                  onChange={(e) =>
                    setWhatIf((p) => ({ ...p, incomeChangePercent: Number(e.target.value) }))
                  }
                  className="w-full accent-[#183B32]"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#FAF9F6]">
                <div className="text-[#5C635E]">Simulated Monthly Surplus (Estimate)</div>
                <div className="font-mono-num text-lg font-bold text-[#183B32] mt-1">
                  {formatCurrency(whatIfResult.simulatedMonthlySurplus, cur)}
                </div>
                <div className="text-[#5C635E]">
                  Delta: {whatIfResult.monthlyDelta >= 0 ? '+' : ''}
                  {formatCurrency(whatIfResult.monthlyDelta, cur)}/mo
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF9F6]">
                <div className="text-[#5C635E]">12-Month Cumulative Estimate</div>
                <div className="font-mono-num text-lg font-bold text-[#202321] mt-1">
                  {formatCurrency(whatIfResult.simulated12MonthSavings, cur)}
                </div>
                <div className="text-[#5C635E]">
                  vs {formatCurrency(whatIfResult.baseline12MonthSavings, cur)} baseline
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#EBF0E9]">
                <div className="text-[#5C635E]">Estimated Goal Acceleration</div>
                <div className="font-mono-num text-lg font-bold text-[#183B32] mt-1">
                  {whatIfResult.goalAccelerationMonths !== null
                    ? `${whatIfResult.goalAccelerationMonths} mo faster`
                    : 'Add a goal'}
                </div>
                <div className="text-[#5C635E]">Illustrative estimate only</div>
              </div>
            </div>

            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={whatIfResult.projectionSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFECE5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0), cur)} />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    name="Baseline Cumulative"
                    stroke="#A5B4A4"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="simulated"
                    name="Simulated Estimate"
                    stroke="#183B32"
                    strokeWidth={2.5}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
