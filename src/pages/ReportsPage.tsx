import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Info } from 'lucide-react';
import { FinancialAnalysisSummary, UserProfile } from '../types/finance';
import { formatCurrency } from '../utils/currency';
import { exportFinancialReportPdf } from '../utils/pdfExport';

interface ReportsPageProps {
  profile: UserProfile;
  analysis: FinancialAnalysisSummary;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ profile, analysis }) => {
  const cur = profile.currency;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & PDF Export */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[#5C635E]">
            Analysis Period: {analysis.analysisPeriod.startDate || 'N/A'} to{' '}
            {analysis.analysisPeriod.endDate || 'N/A'} ·{' '}
            <span className="font-mono-num font-medium">
              {analysis.analysisPeriod.transactionCount}
            </span>{' '}
            transactions analyzed
            {analysis.analysisPeriod.hasSyntheticDemo ? ' · Includes synthetic demo data' : ''}
          </div>
          <h2 className="font-display text-2xl font-semibold text-[#202321] mt-1">
            Comprehensive Financial Health Report
          </h2>
        </div>

        <button
          type="button"
          onClick={() => exportFinancialReportPdf(analysis, profile)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#183B32] hover:bg-[#122D26] text-white text-xs font-semibold transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF Report</span>
        </button>
      </div>

      {/* Data Transparency Callout */}
      <div className="p-4 rounded-xl bg-[#EBF0E9] border border-[#D4DCD2] flex items-start gap-3 text-xs text-[#202321] leading-relaxed">
        <Info className="w-4 h-4 text-[#183B32] shrink-0 mt-0.5" />
        <div>
          <strong>Data Integrity & Methodology:</strong> All metrics below are calculated
          deterministically from your {analysis.analysisPeriod.transactionCount} recorded
          transactions and stated profile preferences. Missing months or unuploaded accounts are not
          extrapolated as confirmed facts. AURION is an educational prototype, not a credit bureau or
          certified financial planner.
        </div>
      </div>

      {/* Section A: Financial Overview */}
      <section className="bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold text-[#202321]">
          A. Financial Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF]">
            <div className="text-[11px] text-[#5C635E]">Recorded Income</div>
            <div className="font-mono-num font-semibold text-base text-[#202321] mt-1">
              {formatCurrency(analysis.overview.totalIncome, cur)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF]">
            <div className="text-[11px] text-[#5C635E]">Recorded Expense</div>
            <div className="font-mono-num font-semibold text-base text-[#202321] mt-1">
              {formatCurrency(analysis.overview.totalExpense, cur)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF]">
            <div className="text-[11px] text-[#5C635E]">Net Cash Flow</div>
            <div className="font-mono-num font-semibold text-base text-[#183B32] mt-1">
              {formatCurrency(analysis.overview.netCashFlow, cur)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF]">
            <div className="text-[11px] text-[#5C635E]">Avg Monthly Spend</div>
            <div className="font-mono-num font-semibold text-base text-[#202321] mt-1">
              {formatCurrency(analysis.overview.averageMonthlyExpense, cur)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF]">
            <div className="text-[11px] text-[#5C635E]">Savings Rate</div>
            <div className="font-mono-num font-semibold text-base text-[#183B32] mt-1">
              {analysis.overview.savingsRate !== null
                ? `${analysis.overview.savingsRate}%`
                : 'N/A'}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF]">
            <div className="text-[11px] text-[#5C635E]">Investments Outflow</div>
            <div className="font-mono-num font-semibold text-base text-[#202321] mt-1">
              {formatCurrency(analysis.overview.totalInvestments, cur)}
            </div>
          </div>
        </div>
      </section>

      {/* Section B & C: Spending Analysis + Monthly Income vs Expense */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#202321]">
            B. Category Spending Analysis
          </h3>
          {analysis.categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {analysis.categoryBreakdown.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#202321]">
                      {c.category} ({c.count} txns)
                    </span>
                    <span className="font-mono-num font-semibold text-[#202321]">
                      {formatCurrency(c.amount, cur)} · {c.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#EFECE5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#183B32] rounded-full"
                      style={{ width: `${Math.min(100, c.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#5C635E]">No expenditure data available.</p>
          )}

          {analysis.anomalies.length > 0 && (
            <div className="pt-4 border-t border-[#EAE7DF]">
              <h4 className="text-xs font-semibold text-[#202321] mb-2">
                Unusual Spending Patterns Detected ({analysis.anomalies.length})
              </h4>
              <div className="space-y-2">
                {analysis.anomalies.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-xl bg-[#FEF9EC] border border-[#F3E1B0] text-xs"
                  >
                    <div className="font-medium text-[#202321]">
                      {a.merchant} — {formatCurrency(a.amount, cur)} ({a.date})
                    </div>
                    <div className="text-[#5C635E]">{a.anomalyReason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="lg:col-span-6 bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#202321]">
            C. Income vs. Expenditure Comparison
          </h3>
          <div className="h-[260px]">
            {analysis.monthlySeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFECE5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5C635E' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5C635E' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0), cur)} />
                  <Bar dataKey="income" name="Income" fill="#A5B4A4" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#183B32" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#5C635E]">
                No monthly data available.
              </div>
            )}
          </div>
          <div className="divide-y divide-[#EFECE5] text-xs">
            {analysis.monthlySeries.map((m) => (
              <div key={m.month} className="py-2 flex items-center justify-between">
                <span className="font-medium text-[#202321]">{m.label}</span>
                <span className="font-mono-num text-[#5C635E]">
                  Net {m.net >= 0 ? 'Surplus' : 'Deficit'}:{' '}
                  <strong className="text-[#202321]">{formatCurrency(m.net, cur)}</strong> (
                  {m.savingsRate}% rate)
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Section D: Explainable Financial Health Score */}
      <section className="bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-[#202321]">
              D. Explainable Financial Health Score
            </h3>
            <p className="text-xs text-[#5C635E] mt-0.5">{analysis.healthScore.disclaimer}</p>
          </div>
          <div className="text-right">
            <div className="font-display font-mono-num text-3xl font-bold text-[#183B32]">
              {analysis.healthScore.total} / 100
            </div>
            <div className="text-xs font-semibold text-[#5C635E]">
              {analysis.healthScore.grade}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {analysis.healthScore.factors.map((f) => (
            <div
              key={f.key}
              className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF] flex flex-col justify-between space-y-2"
            >
              <div>
                <div className="text-xs font-semibold text-[#202321]">{f.label}</div>
                <div className="font-mono-num text-lg font-bold text-[#183B32] mt-1">
                  {f.score} / {f.maxScore}
                </div>
                <div className="text-[11px] font-medium text-[#5C635E]">{f.status}</div>
              </div>
              <p className="text-[11px] text-[#5C635E] leading-relaxed">{f.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section E & F: Personalized Recommendations & Phased Action Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#202321]">
            E. Personalized Recommendations
          </h3>
          <div className="space-y-3">
            {analysis.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF] space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-[#202321]">{rec.title}</span>
                  <span className="text-[11px] font-semibold text-[#183B32] shrink-0">
                    {rec.priority}
                  </span>
                </div>
                <p className="text-xs text-[#5C635E]">
                  <strong>Why:</strong> {rec.why}
                </p>
                <p className="text-xs text-[#202321]">
                  <strong>How:</strong> {rec.how}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-[#202321]">
            F. Practical Action Plan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {analysis.actionPlan.map((phase) => (
              <div
                key={phase.horizon}
                className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF] space-y-3"
              >
                <div className="font-display font-semibold text-sm text-[#183B32]">
                  {phase.horizon}
                </div>
                <div className="space-y-2.5">
                  {phase.items.map((item, i) => (
                    <div key={i} className="text-xs space-y-0.5">
                      <div className="font-semibold text-[#202321]">{item.title}</div>
                      <div className="text-[#5C635E]">{item.why}</div>
                      <div className="text-[#183B32] font-medium">{item.how}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
