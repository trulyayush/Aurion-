import * as XLSX from 'xlsx';
import { ParsedTransactionDraft, Transaction } from '../types/finance';
import {
  categorizeTransaction,
  extractMerchantName,
  isDuplicateTransaction,
} from './financeEngine';

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    // Excel serial date
    const utcDays = Math.floor(raw - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  const str = String(raw).trim();
  if (!str) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    if (Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function parseNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw)
    .replace(/[₹$€£,\s]/g, '')
    .replace(/\((.*)\)/, '-$1');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function buildDraftsFromRows(
  rows: Array<Record<string, unknown>>,
  existingTransactions: Transaction[]
): ParsedTransactionDraft[] {
  const drafts: ParsedTransactionDraft[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const entries = Object.entries(row);
    const findCol = (patterns: RegExp[]): unknown => {
      for (const p of patterns) {
        const match = entries.find(([k]) => p.test(k.toLowerCase()));
        if (match && match[1] !== '' && match[1] !== undefined && match[1] !== null) {
          return match[1];
        }
      }
      return undefined;
    };

    const rawDate = findCol([/date/, /txn.*dt/, /value.*dt/, /posted/]);
    const date = normalizeDate(rawDate);
    if (!date) continue;

    const description = String(
      findCol([/desc/, /narration/, /particular/, /memo/, /details/, /remark/]) ||
        'Bank transaction'
    ).trim();

    const rawMerchant = findCol([/merchant/, /payee/, /recipient/, /vendor/]);
    const merchant = rawMerchant
      ? String(rawMerchant).trim()
      : extractMerchantName(description);

    const debit = parseNumber(findCol([/debit/, /withdrawal/, /dr/, /outflow/]));
    const credit = parseNumber(findCol([/credit/, /deposit/, /cr/, /inflow/]));
    const rawAmount = parseNumber(findCol([/amount/, /amt/, /value/]));
    const rawType = String(findCol([/type/, /dr\/cr/, /direction/]) || '').toLowerCase();
    const balance = parseNumber(findCol([/balance/, /bal/, /closing/]));

    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    if (credit !== null && credit > 0 && (debit === null || debit === 0)) {
      amount = credit;
      type = 'income';
    } else if (debit !== null && debit > 0) {
      amount = debit;
      type = 'expense';
    } else if (rawAmount !== null && rawAmount !== 0) {
      if (rawType.includes('cr') || rawType.includes('income') || rawType.includes('credit') || rawAmount > 0 && /salary|refund|deposit|credit/i.test(description)) {
        type = rawAmount < 0 ? 'expense' : 'income';
      } else if (rawType.includes('dr') || rawType.includes('debit') || rawType.includes('expense') || rawAmount < 0) {
        type = 'expense';
      } else {
        type = 'expense';
      }
      amount = Math.abs(rawAmount);
    } else {
      continue;
    }

    const { category, confidence } = categorizeTransaction(description, merchant, type);
    const dupCheck = isDuplicateTransaction(
      { date, amount, description, type },
      [...existingTransactions, ...drafts]
    );

    const isRecurring =
      category === 'Subscriptions' ||
      category === 'Rent and housing' ||
      category === 'Loan repayments' ||
      category === 'Investments';

    drafts.push({
      tempId: `draft-${i}-${Date.now()}`,
      date,
      description,
      merchant,
      amount: Math.round(amount * 100) / 100,
      type,
      balance: balance !== null ? Math.round(balance * 100) / 100 : null,
      category,
      confidence,
      isRecurring,
      isDuplicate: dupCheck.isDuplicate,
      duplicateReason: dupCheck.reason,
      selected: !dupCheck.isDuplicate,
    });
  }

  return drafts;
}

export function parseCsvTransactions(
  csvText: string,
  existingTransactions: Transaction[] = []
): ParsedTransactionDraft[] {
  const clean = csvText.replace(/^\uFEFF/, '');
  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const rows: Array<Record<string, unknown>> = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length === 0) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? '';
    });
    rows.push(obj);
  }

  return buildDraftsFromRows(rows, existingTransactions);
}

export function parseXlsxTransactions(
  buffer: ArrayBuffer,
  existingTransactions: Transaction[] = []
): ParsedTransactionDraft[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return buildDraftsFromRows(rows, existingTransactions);
}
