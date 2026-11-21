import { MonthlyComparisonPoint } from '../types/finance';

export interface MonthlyChartPoint extends MonthlyComparisonPoint {
  incomeChangePct: number | null;
  expenseChangePct: number | null;
  netChangePct: number | null;
}

function calcPercentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

export function buildMonthlyChartSeries(
  monthlySeries: MonthlyComparisonPoint[]
): MonthlyChartPoint[] {
  return monthlySeries.map((point, index) => {
    if (index === 0) {
      return {
        ...point,
        incomeChangePct: null,
        expenseChangePct: null,
        netChangePct: null,
      };
    }

    const prev = monthlySeries[index - 1];
    return {
      ...point,
      incomeChangePct: calcPercentChange(point.income, prev.income),
      expenseChangePct: calcPercentChange(point.expense, prev.expense),
      netChangePct: calcPercentChange(point.net, prev.net),
    };
  });
}

export function formatChangePercent(pct: number | null): string {
  if (pct === null) return 'Baseline month';
  if (pct > 0) return `+${pct.toFixed(1)}% vs prev mo`;
  if (pct < 0) return `${pct.toFixed(1)}% vs prev mo`;
  return '0.0% vs prev mo';
}
