import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  analyzeFinances,
  categorizeTransaction,
  extractMerchantName,
} from './src/utils/financeEngine';
import { buildDraftsFromRows } from './src/utils/documentParser';
import {
  DEMO_DEBTS,
  DEMO_GOALS,
  DEMO_ONBOARDING_ANSWERS,
  DEMO_TRANSACTIONS,
} from './src/data/demoData';
import {
  CurrencyCode,
  DebtItem,
  FinancialGoal,
  OnboardingAnswers,
  Transaction,
  UserProfile,
} from './src/types/finance';

const PORT = 3000;
const DB_PATH = path.resolve(process.cwd(), 'aurion.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize SQLite schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    preferred_name TEXT NOT NULL,
    age_group TEXT NOT NULL DEFAULT '25-34',
    occupation TEXT NOT NULL DEFAULT '',
    monthly_income REAL NOT NULL DEFAULT 0,
    country TEXT NOT NULL DEFAULT 'India',
    currency TEXT NOT NULL DEFAULT 'INR',
    experience_level TEXT NOT NULL DEFAULT 'beginner',
    is_demo INTEGER NOT NULL DEFAULT 0,
    voice_enabled INTEGER NOT NULL DEFAULT 1,
    speech_rate REAL NOT NULL DEFAULT 1.0,
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    onboarding_answers_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    merchant TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    balance REAL,
    category TEXT NOT NULL,
    confidence TEXT NOT NULL DEFAULT 'high',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    is_synthetic_demo INTEGER NOT NULL DEFAULT 0,
    source_document TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS uploaded_documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    imported_count INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL,
    is_synthetic_demo INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    principal REAL NOT NULL,
    interest_rate REAL NOT NULL,
    monthly_emi REAL NOT NULL,
    due_date_day INTEGER NOT NULL DEFAULT 5,
    is_synthetic_demo INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_savings REAL NOT NULL,
    monthly_contribution REAL NOT NULL,
    target_date TEXT NOT NULL,
    is_synthetic_demo INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    suggestions_json TEXT,
    data_notice TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPassword(password, storedSalt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAt
  );
  return token;
}

function rowToProfile(row: Record<string, unknown>): UserProfile {
  let onboardingAnswers: OnboardingAnswers = {};
  try {
    onboardingAnswers = JSON.parse(String(row.onboarding_answers_json || '{}'));
  } catch {
    onboardingAnswers = {};
  }
  return {
    id: String(row.id),
    username: String(row.username),
    preferredName: String(row.preferred_name),
    ageGroup: String(row.age_group),
    occupation: String(row.occupation),
    monthlyIncome: Number(row.monthly_income || 0),
    country: String(row.country),
    currency: (String(row.currency) as CurrencyCode) || 'INR',
    experienceLevel: (String(row.experience_level) as UserProfile['experienceLevel']) || 'beginner',
    isDemo: Boolean(row.is_demo),
    voiceEnabled: Boolean(row.voice_enabled),
    speechRate: Number(row.speech_rate || 1.0),
    onboardingCompleted: Boolean(row.onboarding_completed),
    onboardingAnswers,
    createdAt: String(row.created_at),
  };
}

function getUserFinancialBundle(userId: string) {
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | Record<string, unknown>
    | undefined;
  if (!userRow) return null;

  const profile = rowToProfile(userRow);
  const txRows = db
    .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC')
    .all(userId) as Array<Record<string, unknown>>;
  const transactions: Transaction[] = txRows.map((r) => ({
    id: String(r.id),
    date: String(r.date),
    description: String(r.description),
    merchant: String(r.merchant),
    amount: Number(r.amount),
    type: r.type as Transaction['type'],
    balance: r.balance !== null && r.balance !== undefined ? Number(r.balance) : null,
    category: r.category as Transaction['category'],
    confidence: (r.confidence as Transaction['confidence']) || 'high',
    isRecurring: Boolean(r.is_recurring),
    isSyntheticDemo: Boolean(r.is_synthetic_demo),
    sourceDocument: r.source_document ? String(r.source_document) : undefined,
    createdAt: String(r.created_at),
  }));

  const docRows = db
    .prepare('SELECT * FROM uploaded_documents WHERE user_id = ? ORDER BY uploaded_at DESC')
    .all(userId) as Array<Record<string, unknown>>;
  const documents = docRows.map((r) => ({
    id: String(r.id),
    fileName: String(r.file_name),
    fileType: r.file_type as 'csv' | 'xlsx' | 'pdf',
    rowCount: Number(r.row_count),
    importedCount: Number(r.imported_count),
    uploadedAt: String(r.uploaded_at),
    isSyntheticDemo: Boolean(r.is_synthetic_demo),
  }));

  const debtRows = db
    .prepare('SELECT * FROM debts WHERE user_id = ?')
    .all(userId) as Array<Record<string, unknown>>;
  const debts: DebtItem[] = debtRows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    principal: Number(r.principal),
    interestRate: Number(r.interest_rate),
    monthlyEmi: Number(r.monthly_emi),
    dueDateDay: Number(r.due_date_day),
    isSyntheticDemo: Boolean(r.is_synthetic_demo),
  }));

  const goalRows = db
    .prepare('SELECT * FROM goals WHERE user_id = ?')
    .all(userId) as Array<Record<string, unknown>>;
  const goals: FinancialGoal[] = goalRows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    category: r.category as FinancialGoal['category'],
    targetAmount: Number(r.target_amount),
    currentSavings: Number(r.current_savings),
    monthlyContribution: Number(r.monthly_contribution),
    targetDate: String(r.target_date),
    isSyntheticDemo: Boolean(r.is_synthetic_demo),
  }));

  const chatRows = db
    .prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId) as Array<Record<string, unknown>>;
  const messages = chatRows.map((r) => {
    let suggestions: string[] | undefined;
    try {
      suggestions = r.suggestions_json ? JSON.parse(String(r.suggestions_json)) : undefined;
    } catch {
      suggestions = undefined;
    }
    return {
      id: String(r.id),
      role: r.role as 'user' | 'assistant',
      content: String(r.content),
      suggestions,
      dataNotice: r.data_notice ? String(r.data_notice) : undefined,
      createdAt: String(r.created_at),
    };
  });

  return { profile, transactions, documents, debts, goals, messages };
}

function seedDemoDataForUser(userId: string) {
  const now = new Date().toISOString();
  const clearTables = db.transaction(() => {
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM uploaded_documents WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM debts WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);

    const insertTx = db.prepare(`
      INSERT INTO transactions (id, user_id, date, description, merchant, amount, type, balance, category, confidence, is_recurring, is_synthetic_demo, source_document, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    for (const tx of DEMO_TRANSACTIONS) {
      insertTx.run(
        `${userId}-${tx.id}`,
        userId,
        tx.date,
        tx.description,
        tx.merchant,
        tx.amount,
        tx.type,
        tx.balance ?? null,
        tx.category,
        tx.confidence,
        tx.isRecurring ? 1 : 0,
        tx.sourceDocument ?? 'demo_statement_aug_oct_2026.csv',
        now
      );
    }

    db.prepare(`
      INSERT INTO uploaded_documents (id, user_id, file_name, file_type, row_count, imported_count, uploaded_at, is_synthetic_demo)
      VALUES (?, ?, ?, 'csv', ?, ?, ?, 1)
    `).run(
      `${userId}-demo-doc`,
      userId,
      'demo_statement_aug_oct_2026.csv (Synthetic Demo)',
      DEMO_TRANSACTIONS.length,
      DEMO_TRANSACTIONS.length,
      now
    );

    const insertDebt = db.prepare(`
      INSERT INTO debts (id, user_id, name, principal, interest_rate, monthly_emi, due_date_day, is_synthetic_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    for (const d of DEMO_DEBTS) {
      insertDebt.run(`${userId}-${d.id}`, userId, d.name, d.principal, d.interestRate, d.monthlyEmi, d.dueDateDay);
    }

    const insertGoal = db.prepare(`
      INSERT INTO goals (id, user_id, title, category, target_amount, current_savings, monthly_contribution, target_date, is_synthetic_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    for (const g of DEMO_GOALS) {
      insertGoal.run(
        `${userId}-${g.id}`,
        userId,
        g.title,
        g.category,
        g.targetAmount,
        g.currentSavings,
        g.monthlyContribution,
        g.targetDate
      );
    }

    db.prepare(`
      INSERT INTO chat_messages (id, user_id, role, content, suggestions_json, data_notice, created_at)
      VALUES (?, ?, 'assistant', ?, ?, ?, ?)
    `).run(
      `${userId}-welcome-msg`,
      userId,
      `Welcome back, Aarav. I have analyzed 38 synthetic demonstration transactions from August to October 2026. Your largest expense category is Rent and housing, followed by Food and groceries, and I also detected 3 recurring subscriptions worth reviewing. Ask me anything about your spending, savings capacity, or goals.`,
      JSON.stringify([
        'Where am I wasting the most money?',
        'How can I save ₹5,000 every month?',
        'Can I start investing more right now?',
      ]),
      'Includes synthetic demonstration records for academic preview.',
      now
    );
  });

  clearTables();
}

function getOrCreateDemoUser(): string {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('demo_aarav') as
    | { id: string }
    | undefined;
  if (existing) return existing.id;

  const id = 'user-demo-aurion';
  const { hash, salt } = hashPassword(crypto.randomBytes(16).toString('hex'));
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, username, password_hash, password_salt, preferred_name, age_group, occupation, monthly_income, country, currency, experience_level, is_demo, voice_enabled, speech_rate, onboarding_completed, onboarding_answers_json, created_at)
    VALUES (?, 'demo_aarav', ?, ?, 'Aarav', '25-34', 'Product Engineer', 92000, 'India', 'INR', 'intermediate', 1, 1, 1.0, 1, ?, ?)
  `).run(id, hash, salt, JSON.stringify(DEMO_ONBOARDING_ANSWERS), now);

  seedDemoDataForUser(id);
  return id;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in server secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 30000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractGeminiErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err || fallback);
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; code?: number } };
    if (parsed?.error?.message) {
      return `AI service error (${parsed.error.code ?? 'upstream'}): ${parsed.error.message}`;
    }
  } catch {
    // Not raw JSON
  }
  return raw || fallback;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s. Please check GEMINI_API_KEY in Settings > Secrets or retry.`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

interface AuthedRequest extends Request {
  userId?: string;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const session = db
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?')
    .get(token) as { user_id: string; expires_at: number } | undefined;
  if (!session || session.expires_at < Date.now()) {
    res.status(401).json({ error: 'Session expired or invalid.' });
    return;
  }
  req.userId = session.user_id;
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Auth Routes
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const {
      username,
      password,
      preferredName,
      ageGroup,
      occupation,
      monthlyIncome,
      country,
      currency,
      experienceLevel,
    } = req.body || {};

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (exists) {
      res.status(409).json({ error: 'Username is already taken.' });
      return;
    }

    const userId = `user-${crypto.randomUUID()}`;
    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();
    const initialOnboarding: OnboardingAnswers = {
      monthlyEarnings: Number(monthlyIncome) || 0,
    };

    db.prepare(`
      INSERT INTO users (id, username, password_hash, password_salt, preferred_name, age_group, occupation, monthly_income, country, currency, experience_level, is_demo, voice_enabled, speech_rate, onboarding_completed, onboarding_answers_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 1.0, 0, ?, ?)
    `).run(
      userId,
      cleanUsername,
      hash,
      salt,
      String(preferredName || cleanUsername).trim(),
      String(ageGroup || '25-34'),
      String(occupation || 'Professional').trim(),
      Number(monthlyIncome) || 0,
      String(country || 'India').trim(),
      String(currency || 'INR'),
      String(experienceLevel || 'beginner'),
      JSON.stringify(initialOnboarding),
      now
    );

    const token = createSession(userId);
    const bundle = getUserFinancialBundle(userId);
    res.status(201).json({ token, ...bundle });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }
    const cleanUsername = String(username).trim().toLowerCase();
    const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername) as
      | Record<string, unknown>
      | undefined;
    if (
      !userRow ||
      !verifyPassword(String(password), String(userRow.password_hash), String(userRow.password_salt))
    ) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    const token = createSession(String(userRow.id));
    const bundle = getUserFinancialBundle(String(userRow.id));
    res.json({ token, ...bundle });
  });

  app.post('/api/auth/demo', (_req: Request, res: Response) => {
    const demoId = getOrCreateDemoUser();
    const token = createSession(demoId);
    const bundle = getUserFinancialBundle(demoId);
    res.json({ token, ...bundle });
  });

  app.post('/api/auth/demo-reset', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const user = db.prepare('SELECT is_demo FROM users WHERE id = ?').get(userId) as
      | { is_demo: number }
      | undefined;
    if (user?.is_demo) {
      db.prepare(`
        UPDATE users SET preferred_name = 'Aarav', age_group = '25-34', occupation = 'Product Engineer',
        monthly_income = 92000, country = 'India', currency = 'INR', experience_level = 'intermediate',
        onboarding_completed = 1, onboarding_answers_json = ? WHERE id = ?
      `).run(JSON.stringify(DEMO_ONBOARDING_ANSWERS), userId);
    }
    seedDemoDataForUser(userId);
    const bundle = getUserFinancialBundle(userId);
    res.json(bundle);
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.json({ ok: true });
  });

  // Profile & State
  app.get('/api/me', requireAuth, (req: AuthedRequest, res: Response) => {
    const bundle = getUserFinancialBundle(req.userId!);
    if (!bundle) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }
    res.json(bundle);
  });

  app.put('/api/profile', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const {
      preferredName,
      ageGroup,
      occupation,
      monthlyIncome,
      country,
      currency,
      experienceLevel,
      voiceEnabled,
      speechRate,
      onboardingCompleted,
      onboardingAnswers,
    } = req.body || {};

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    const mergedAnswers = onboardingAnswers
      ? { ...JSON.parse(String(existing.onboarding_answers_json || '{}')), ...onboardingAnswers }
      : JSON.parse(String(existing.onboarding_answers_json || '{}'));

    db.prepare(`
      UPDATE users SET
        preferred_name = ?,
        age_group = ?,
        occupation = ?,
        monthly_income = ?,
        country = ?,
        currency = ?,
        experience_level = ?,
        voice_enabled = ?,
        speech_rate = ?,
        onboarding_completed = ?,
        onboarding_answers_json = ?
      WHERE id = ?
    `).run(
      preferredName ?? existing.preferred_name,
      ageGroup ?? existing.age_group,
      occupation ?? existing.occupation,
      monthlyIncome !== undefined ? Number(monthlyIncome) : Number(existing.monthly_income),
      country ?? existing.country,
      currency ?? existing.currency,
      experienceLevel ?? existing.experience_level,
      voiceEnabled !== undefined ? (voiceEnabled ? 1 : 0) : existing.voice_enabled,
      speechRate !== undefined ? Number(speechRate) : Number(existing.speech_rate),
      onboardingCompleted !== undefined
        ? onboardingCompleted
          ? 1
          : 0
        : existing.onboarding_completed,
      JSON.stringify(mergedAnswers),
      userId
    );

    const bundle = getUserFinancialBundle(userId);
    res.json(bundle);
  });

  app.delete('/api/profile', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ ok: true });
  });

  // Transactions
  app.post('/api/transactions/import', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const { fileName, fileType, totalRows, transactions } = req.body || {};
    if (!Array.isArray(transactions) || transactions.length === 0) {
      res.status(400).json({ error: 'No transactions selected for import.' });
      return;
    }

    const now = new Date().toISOString();
    const docId = `doc-${crypto.randomUUID()}`;
    const insertTx = db.prepare(`
      INSERT INTO transactions (id, user_id, date, description, merchant, amount, type, balance, category, confidence, is_recurring, is_synthetic_demo, source_document, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const runImport = db.transaction(() => {
      for (const tx of transactions) {
        insertTx.run(
          `tx-${crypto.randomUUID()}`,
          userId,
          String(tx.date),
          String(tx.description),
          String(tx.merchant || extractMerchantName(String(tx.description))),
          Math.abs(Number(tx.amount)),
          tx.type === 'income' ? 'income' : 'expense',
          tx.balance !== null && tx.balance !== undefined ? Number(tx.balance) : null,
          String(tx.category || 'Other expenses'),
          String(tx.confidence || 'high'),
          tx.isRecurring ? 1 : 0,
          String(fileName || 'uploaded_statement'),
          now
        );
      }

      db.prepare(`
        INSERT INTO uploaded_documents (id, user_id, file_name, file_type, row_count, imported_count, uploaded_at, is_synthetic_demo)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        docId,
        userId,
        String(fileName || 'statement'),
        String(fileType || 'csv'),
        Number(totalRows || transactions.length),
        transactions.length,
        now
      );
    });

    runImport();
    const bundle = getUserFinancialBundle(userId);
    res.status(201).json(bundle);
  });

  app.post('/api/transactions', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const { date, description, merchant, amount, type, category } = req.body || {};
    const numericAmount = Math.abs(Number(amount));
    if (!date || !merchant || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'Valid date, merchant, and positive amount are required.' });
      return;
    }

    const txType = type === 'income' ? 'income' : 'expense';
    const rawDesc = String(description || merchant).trim();
    const resolvedCategory =
      txType === 'income'
        ? 'Income & Salary'
        : category || categorizeTransaction(rawDesc, String(merchant).trim(), 'expense').category;

    db.prepare(`
      INSERT INTO transactions (id, user_id, date, description, merchant, amount, type, balance, category, confidence, is_recurring, is_synthetic_demo, source_document, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 'high', 0, 0, 'Manual Quick Entry', ?)
    `).run(
      `tx-${crypto.randomUUID()}`,
      userId,
      String(date),
      rawDesc,
      String(merchant).trim(),
      numericAmount,
      txType,
      String(resolvedCategory),
      new Date().toISOString()
    );

    const bundle = getUserFinancialBundle(userId);
    res.status(201).json(bundle);
  });

  app.patch('/api/transactions/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { category, merchant, type } = req.body || {};
    const existing = db
      .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
      .get(id, userId) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    db.prepare(`
      UPDATE transactions SET
        category = ?,
        merchant = ?,
        type = ?,
        confidence = 'high'
      WHERE id = ? AND user_id = ?
    `).run(
      category ?? existing.category,
      merchant ?? existing.merchant,
      type ?? existing.type,
      id,
      userId
    );

    const bundle = getUserFinancialBundle(userId);
    res.json(bundle);
  });

  app.delete('/api/transactions/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);
    const bundle = getUserFinancialBundle(userId);
    res.json(bundle);
  });

  // Debts
  app.post('/api/debts', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const { name, principal, interestRate, monthlyEmi, dueDateDay } = req.body || {};
    if (!name || Number(principal) <= 0 || Number(monthlyEmi) <= 0) {
      res.status(400).json({ error: 'Valid loan name, principal, and monthly EMI are required.' });
      return;
    }
    db.prepare(`
      INSERT INTO debts (id, user_id, name, principal, interest_rate, monthly_emi, due_date_day, is_synthetic_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      `debt-${crypto.randomUUID()}`,
      userId,
      String(name).trim(),
      Number(principal),
      Number(interestRate || 0),
      Number(monthlyEmi),
      Number(dueDateDay || 5)
    );
    res.status(201).json(getUserFinancialBundle(userId));
  });

  app.delete('/api/debts/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    db.prepare('DELETE FROM debts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId!);
    res.json(getUserFinancialBundle(req.userId!));
  });

  // Goals
  app.post('/api/goals', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const { title, category, targetAmount, currentSavings, monthlyContribution, targetDate } =
      req.body || {};
    if (!title || Number(targetAmount) <= 0 || !targetDate) {
      res.status(400).json({ error: 'Goal title, target amount, and target date are required.' });
      return;
    }
    db.prepare(`
      INSERT INTO goals (id, user_id, title, category, target_amount, current_savings, monthly_contribution, target_date, is_synthetic_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      `goal-${crypto.randomUUID()}`,
      userId,
      String(title).trim(),
      String(category || 'Other'),
      Number(targetAmount),
      Number(currentSavings || 0),
      Number(monthlyContribution || 0),
      String(targetDate)
    );
    res.status(201).json(getUserFinancialBundle(userId));
  });

  app.patch('/api/goals/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const existing = db
      .prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?')
      .get(req.params.id, userId) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Goal not found.' });
      return;
    }
    const { currentSavings, monthlyContribution } = req.body || {};
    db.prepare(
      'UPDATE goals SET current_savings = ?, monthly_contribution = ? WHERE id = ? AND user_id = ?'
    ).run(
      currentSavings !== undefined ? Number(currentSavings) : Number(existing.current_savings),
      monthlyContribution !== undefined
        ? Number(monthlyContribution)
        : Number(existing.monthly_contribution),
      req.params.id,
      userId
    );
    res.json(getUserFinancialBundle(userId));
  });

  app.delete('/api/goals/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId!);
    res.json(getUserFinancialBundle(req.userId!));
  });

  // Server-side Gemini PDF Statement Extraction
  app.post('/api/ai/parse-pdf', requireAuth, async (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const { base64Data } = req.body || {};
    if (!base64Data || typeof base64Data !== 'string') {
      res.status(400).json({ error: 'PDF base64 data is required.' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: 'Extract every bank transaction row from this statement PDF. Return a JSON array of objects with date (YYYY-MM-DD), description, merchant, amount (positive number), type ("income" or "expense"), and balance (number or null if absent). Never invent rows that are not on the statement.',
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  description: { type: Type.STRING },
                  merchant: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                  balance: { type: Type.NUMBER, nullable: true },
                },
                required: ['date', 'description', 'amount', 'type'],
              },
            },
          },
        }),
        30000,
        'PDF statement extraction'
      );

      const extracted = JSON.parse((response.text ?? '[]').trim()) as Array<Record<string, unknown>>;
      const bundle = getUserFinancialBundle(userId);
      const drafts = buildDraftsFromRows(extracted, bundle?.transactions || []);
      res.json({ drafts });
    } catch (err) {
      const msg = extractGeminiErrorMessage(err, 'PDF extraction failed.');
      res.status(502).json({ error: msg, code: 'GEMINI_ERROR' });
    }
  });

  // Server-side Gemini Financial Intelligence Chatbot
  app.post('/api/ai/chat', requireAuth, async (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const { message } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const bundle = getUserFinancialBundle(userId);
    if (!bundle) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const userMsgId = `msg-${crypto.randomUUID()}`;
    const userCreatedAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO chat_messages (id, user_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `).run(userMsgId, userId, message.trim(), userCreatedAt);

    const analysis = analyzeFinances(
      bundle.transactions,
      bundle.profile,
      bundle.debts,
      bundle.goals
    );

    const contextPayload = {
      profile: {
        preferredName: bundle.profile.preferredName,
        occupation: bundle.profile.occupation,
        currency: bundle.profile.currency,
        monthlyIncomeUserStated: bundle.profile.monthlyIncome,
        experienceLevel: bundle.profile.experienceLevel,
        isSyntheticDemo: bundle.profile.isDemo,
        onboardingAnswers: bundle.profile.onboardingAnswers,
      },
      verifiedAnalysis: {
        analysisPeriod: analysis.analysisPeriod,
        overview: analysis.overview,
        topCategories: analysis.categoryBreakdown.slice(0, 8).map((c) => ({
          category: c.category,
          amount: c.amount,
          percentage: c.percentage,
          count: c.count,
        })),
        monthlySeries: analysis.monthlySeries,
        healthScore: {
          total: analysis.healthScore.total,
          grade: analysis.healthScore.grade,
          factors: analysis.healthScore.factors.map((f) => ({
            label: f.label,
            score: f.score,
            maxScore: f.maxScore,
          })),
        },
        subscriptionsDetected: analysis.subscriptions,
        anomaliesDetected: analysis.anomalies.slice(0, 5).map((a) => ({
          date: a.date,
          merchant: a.merchant,
          amount: a.amount,
          reason: a.anomalyReason,
        })),
        forecastSummary: {
          currentEstimatedBalance: analysis.forecast.currentEstimatedBalance,
          confirmedRecurringExpenses: analysis.forecast.confirmedRecurringExpenses,
          estimatedDiscretionaryExpenses: analysis.forecast.estimatedDiscretionaryExpenses,
          projectedMonthEndBalance: analysis.forecast.projectedMonthEndBalance,
          shortageRisk: analysis.forecast.shortageRisk,
        },
        debts: bundle.debts,
        goals: bundle.goals,
        recentTransactions: bundle.transactions.slice(0, 8).map((t) => ({
          date: t.date,
          merchant: t.merchant,
          amount: t.amount,
          type: t.type,
          category: t.category,
        })),
      },
      recentConversation: bundle.messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content.slice(0, 320),
      })),
    };

    try {
      const ai = getGeminiClient();
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `User question: "${message.trim()}"\n\nVerified User Financial Context (JSON):\n${JSON.stringify(
            contextPayload
          )}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction: `You are AURION, an intelligent, warm, articulate white lion personal finance companion.
CRITICAL ACCURACY & RESPONSIBLE AI RULES:
1. Base every statistic, category total, percentage, balance, and recommendation strictly on the Verified User Financial Context provided. NEVER invent or estimate transaction numbers that are not present. If transaction history is empty or sparse, say so transparently and refer only to user-supplied profile inputs.
2. Clearly distinguish verified transaction records from user-supplied assumptions or estimates (and note if synthetic demo records are active).
3. Use the user's configured currency (${bundle.profile.currency}).
4. Never guarantee investment returns or claim any investment is risk-free. When explaining investments (mutual funds, index funds, ETFs, fixed deposits, PPF/government savings), frame them strictly as educational information conditional on emergency reserves, debt obligations, goals, and risk tolerance, and encourage consulting a qualified financial adviser before consequential decisions.
5. Keep responses concise, structured, human-friendly, and free of jargon (or briefly explain terms if used).
6. Return JSON matching the schema with:
   - "reply": your clear conversational response (2-4 concise paragraphs or bullet points).
   - "suggestions": 3 short context-aware follow-up questions the user might ask next.
   - "dataNotice": short 1-line note citing how many transactions/months support this answer (or noting user-stated inputs only).`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                suggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                dataNotice: { type: Type.STRING },
              },
              required: ['reply', 'suggestions', 'dataNotice'],
            },
          },
        }),
        30000,
        'AURION AI assistant'
      );

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        reply?: string;
        suggestions?: string[];
        dataNotice?: string;
      };

      const assistantReply =
        parsed.reply ||
        'I reviewed your financial records, though I could not format a full answer. Please try rephrasing your question.';
      const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];
      const dataNotice =
        parsed.dataNotice ||
        `Grounded in ${analysis.analysisPeriod.transactionCount} recorded transaction(s).`;

      const botMsgId = `msg-${crypto.randomUUID()}`;
      const botCreatedAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO chat_messages (id, user_id, role, content, suggestions_json, data_notice, created_at)
        VALUES (?, ?, 'assistant', ?, ?, ?, ?)
      `).run(botMsgId, userId, assistantReply, JSON.stringify(suggestions), dataNotice, botCreatedAt);

      res.json({
        userMessage: {
          id: userMsgId,
          role: 'user',
          content: message.trim(),
          createdAt: userCreatedAt,
        },
        assistantMessage: {
          id: botMsgId,
          role: 'assistant',
          content: assistantReply,
          suggestions,
          dataNotice,
          createdAt: botCreatedAt,
        },
      });
    } catch (err) {
      const msg = extractGeminiErrorMessage(err, 'Unable to generate AI response.');
      res.status(502).json({ error: msg, code: 'GEMINI_ERROR' });
    }
  });

  app.delete('/api/chat', requireAuth, (req: AuthedRequest, res: Response) => {
    db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(req.userId!);
    res.json({ ok: true });
  });

  // Vite middleware (dev) or static serving (production)
  const distPath = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURION server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AURION server:', err);
  process.exit(1);
});
