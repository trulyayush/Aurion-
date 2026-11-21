import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyChartSeries, formatChangePercent } from './dashboardMetrics';

test('buildMonthlyChartSeries marks first month as baseline and computes MoM percentage changes', () => {
  const result = buildMonthlyChartSeries([
    { month: '2026-08', label: 'Aug 26', income: 90000, expense: 50000, net: 40000, savingsRate: 44.4 },
    { month: '2026-09', label: 'Sep 26', income: 90000, expense: 60000, net: 30000, savingsRate: 33.3 },
    { month: '2026-10', label: 'Oct 26', income: 99000, expense: 54000, net: 45000, savingsRate: 45.5 },
  ]);

  assert.equal(result.length, 3);
  assert.equal(result[0].incomeChangePct, null);
  assert.equal(result[0].expenseChangePct, null);

  assert.equal(result[1].incomeChangePct, 0);
  assert.equal(result[1].expenseChangePct, 20);
  assert.equal(result[1].netChangePct, -25);

  assert.equal(result[2].incomeChangePct, 10);
  assert.equal(result[2].expenseChangePct, -10);
  assert.equal(result[2].netChangePct, 50);
});

test('buildMonthlyChartSeries returns null change when previous month base is zero', () => {
  const result = buildMonthlyChartSeries([
    { month: '2026-08', label: 'Aug 26', income: 0, expense: 0, net: 0, savingsRate: 0 },
    { month: '2026-09', label: 'Sep 26', income: 50000, expense: 20000, net: 30000, savingsRate: 60 },
  ]);

  assert.equal(result[1].incomeChangePct, null);
  assert.equal(result[1].expenseChangePct, null);
});

test('formatChangePercent produces readable directional strings', () => {
  assert.equal(formatChangePercent(null), 'Baseline month');
  assert.equal(formatChangePercent(12.34), '+12.3% vs prev mo');
  assert.equal(formatChangePercent(-4.5), '-4.5% vs prev mo');
  assert.equal(formatChangePercent(0), '0.0% vs prev mo');
});
