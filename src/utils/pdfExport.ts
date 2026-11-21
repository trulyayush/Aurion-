import { jsPDF } from 'jspdf';
import { FinancialAnalysisSummary, UserProfile } from '../types/finance';
import { CURRENCY_CONFIG } from './currency';

function formatAsciiMoney(amount: number | null, profile: UserProfile): string {
  if (amount === null || Number.isNaN(amount)) return 'N/A';
  const symbol = profile.currency === 'INR' ? 'INR ' : CURRENCY_CONFIG[profile.currency].symbol;
  return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
}

export function exportFinancialReportPdf(
  analysis: FinancialAnalysisSummary,
  profile: UserProfile
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 44;
  const maxWidth = pageWidth - margin * 2;
  let y = 50;

  const ensureSpace = (needed = 60) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 50;
    }
  };

  // Header band
  doc.setFillColor(24, 59, 50); // Deep Forest Green #183B32
  doc.rect(0, 0, pageWidth, 86, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('AURION — Financial Health Report', margin, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Prepared for ${profile.preferredName} (${profile.occupation})  |  Period: ${
      analysis.analysisPeriod.startDate || 'N/A'
    } to ${analysis.analysisPeriod.endDate || 'N/A'}  |  Transactions: ${
      analysis.analysisPeriod.transactionCount
    }`,
    margin,
    60
  );

  y = 112;
  doc.setTextColor(32, 35, 33);

  if (analysis.analysisPeriod.hasSyntheticDemo) {
    doc.setFillColor(246, 244, 239);
    doc.roundedRect(margin, y - 14, maxWidth, 26, 4, 4, 'F');
    doc.setFontSize(9);
    doc.setTextColor(92, 99, 94);
    doc.text(
      'Notice: This report includes synthetic demonstration records. Educational prototype only — not certified financial advice.',
      margin + 10,
      y + 3
    );
    y += 30;
  }

  // Section A: Overview
  doc.setTextColor(24, 59, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('A. Financial Overview', margin, y);
  y += 18;

  doc.setTextColor(32, 35, 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const overviewLines = [
    `Total Recorded Income: ${formatAsciiMoney(analysis.overview.totalIncome, profile)}`,
    `Total Recorded Expenditure: ${formatAsciiMoney(analysis.overview.totalExpense, profile)}`,
    `Net Cash Flow: ${formatAsciiMoney(analysis.overview.netCashFlow, profile)}`,
    `Average Monthly Expenditure: ${formatAsciiMoney(analysis.overview.averageMonthlyExpense, profile)}`,
    `Savings Rate: ${
      analysis.overview.savingsRate !== null ? `${analysis.overview.savingsRate}%` : 'Insufficient data'
    }`,
  ];
  overviewLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 15;
  });

  y += 10;
  ensureSpace(120);

  // Section B: Financial Health Score
  doc.setTextColor(24, 59, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(
    `B. Explainable Financial Health Score: ${analysis.healthScore.total} / 100 (${analysis.healthScore.grade})`,
    margin,
    y
  );
  y += 18;

  doc.setTextColor(32, 35, 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  analysis.healthScore.factors.forEach((f) => {
    ensureSpace(34);
    doc.setFont('helvetica', 'bold');
    doc.text(`${f.label}: ${f.score}/${f.maxScore} (${f.status})`, margin, y);
    y += 13;
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(f.explanation, maxWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 12 + 4;
  });

  y += 10;
  ensureSpace(100);

  // Section C: Top Spending Categories
  doc.setTextColor(24, 59, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('C. Spending Analysis by Category', margin, y);
  y += 18;

  doc.setTextColor(32, 35, 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  analysis.categoryBreakdown.slice(0, 8).forEach((cat) => {
    ensureSpace(20);
    doc.text(
      `${cat.category}: ${formatAsciiMoney(cat.amount, profile)} (${cat.percentage}% · ${cat.count} txns)`,
      margin,
      y
    );
    y += 15;
  });

  y += 10;
  ensureSpace(120);

  // Section D: Personalized Recommendations
  doc.setTextColor(24, 59, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('D. Personalized Recommendations', margin, y);
  y += 18;

  doc.setTextColor(32, 35, 33);
  doc.setFontSize(10);
  analysis.recommendations.forEach((rec) => {
    ensureSpace(48);
    doc.setFont('helvetica', 'bold');
    doc.text(`[${rec.priority}] ${rec.title}`, margin, y);
    y += 13;
    doc.setFont('helvetica', 'normal');
    const whyLines = doc.splitTextToSize(`Why: ${rec.why}`, maxWidth);
    doc.text(whyLines, margin, y);
    y += whyLines.length * 12;
    const howLines = doc.splitTextToSize(`How: ${rec.how}`, maxWidth);
    doc.text(howLines, margin, y);
    y += howLines.length * 12 + 6;
  });

  y += 8;
  ensureSpace(100);

  // Section E: Action Plan
  doc.setTextColor(24, 59, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('E. Phased Action Plan', margin, y);
  y += 18;

  doc.setTextColor(32, 35, 33);
  doc.setFontSize(10);
  analysis.actionPlan.forEach((phase) => {
    ensureSpace(50);
    doc.setFont('helvetica', 'bold');
    doc.text(phase.horizon, margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    phase.items.forEach((item) => {
      ensureSpace(32);
      const lines = doc.splitTextToSize(`• ${item.title} — ${item.how}`, maxWidth - 10);
      doc.text(lines, margin + 8, y);
      y += lines.length * 12 + 4;
    });
  });

  // Footer disclaimer
  ensureSpace(40);
  y += 10;
  doc.setFontSize(8.5);
  doc.setTextColor(92, 99, 94);
  const disc = doc.splitTextToSize(
    'Disclaimer: AURION is an educational academic prototype. Metrics are derived deterministically from recorded transactions and user inputs. Consult a qualified financial adviser before making investment or debt decisions.',
    maxWidth
  );
  doc.text(disc, margin, y);

  doc.save(`AURION_Financial_Report_${profile.username}.pdf`);
}
