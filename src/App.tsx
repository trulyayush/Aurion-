import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { AurionLoadingScreen } from './components/3d/AurionLoadingScreen';
import { ThreeSceneProvider } from './components/3d/ThreeSceneContext';
import { NewTransactionPayload } from './components/QuickAddTransactionModal';
import { AssistantPage } from './pages/AssistantPage';
import { DashboardPage } from './pages/DashboardPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PlanningPage, PlanningTab } from './pages/PlanningPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { WelcomePage } from './pages/WelcomePage';
import {
  AppPage,
  ChatMessage,
  CurrencyCode,
  DebtItem,
  ExperienceLevel,
  FinancialGoal,
  OnboardingAnswers,
  ParsedTransactionDraft,
  Transaction,
  TransactionCategory,
  UploadedDocumentRecord,
  UserProfile,
} from './types/finance';
import { analyzeFinances } from './utils/financeEngine';
import {
  canDismissLoadingScreen,
  getLoadingTimingConfig,
  LoadingReadinessSignals,
  resolveLoadingStage,
} from './utils/loadingSequence';
import { prefersReducedMotion } from './utils/threeStudio';

interface UserBundle {
  profile: UserProfile;
  transactions: Transaction[];
  documents: UploadedDocumentRecord[];
  debts: DebtItem[];
  goals: FinancialGoal[];
  messages: ChatMessage[];
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [bundle, setBundle] = useState<UserBundle | null>(null);
  const [page, setPage] = useState<AppPage>('welcome');
  const [planningTab, setPlanningTab] = useState<PlanningTab>('forecast');
  const [authError, setAuthError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const loadingTiming = useMemo(() => getLoadingTimingConfig(reducedMotion), [reducedMotion]);
  const [introPhase, setIntroPhase] = useState<'active' | 'exiting' | 'done'>('active');
  const [loadingSignals, setLoadingSignals] = useState<LoadingReadinessSignals>({
    fontsReady: false,
    scene3dReady: false,
    workspaceReady: false,
    minDurationElapsed: false,
  });
  const introDoneTriggeredRef = useRef(false);

  // Track real browser font readiness, document load, minimum reveal window, and asset safety cap
  useEffect(() => {
    let cancelled = false;
    const isAutostart =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('autostart') === '1';

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          if (!cancelled) {
            setLoadingSignals((prev) => ({ ...prev, fontsReady: true }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLoadingSignals((prev) => ({ ...prev, fontsReady: true }));
          }
        });
    } else {
      setLoadingSignals((prev) => ({ ...prev, fontsReady: true }));
    }

    if (!isAutostart) {
      const markDocReady = () => {
        if (!cancelled) {
          setLoadingSignals((prev) => ({ ...prev, workspaceReady: true }));
        }
      };
      if (typeof document !== 'undefined' && document.readyState === 'complete') {
        markDocReady();
      } else if (typeof window !== 'undefined') {
        window.addEventListener('load', markDocReady, { once: true });
      } else {
        markDocReady();
      }
    }

    const minTimer = window.setTimeout(() => {
      if (!cancelled) {
        setLoadingSignals((prev) => ({ ...prev, minDurationElapsed: true }));
      }
    }, loadingTiming.minDisplayMs);

    // Safety fallback so a slow/blocked 3D or font asset never blocks app entry indefinitely
    const safetyTimer = window.setTimeout(() => {
      if (!cancelled) {
        setLoadingSignals((prev) => ({
          ...prev,
          fontsReady: true,
          scene3dReady: true,
          workspaceReady: true,
        }));
      }
    }, loadingTiming.assetFallbackMs);

    return () => {
      cancelled = true;
      window.clearTimeout(minTimer);
      window.clearTimeout(safetyTimer);
    };
  }, [loadingTiming.assetFallbackMs, loadingTiming.minDisplayMs]);

  const handleLoadingSceneReady = useCallback(() => {
    setLoadingSignals((prev) => (prev.scene3dReady ? prev : { ...prev, scene3dReady: true }));
  }, []);

  const handleLoadingExitComplete = useCallback(() => {
    if (introDoneTriggeredRef.current) return;
    introDoneTriggeredRef.current = true;
    setIntroPhase('done');
  }, []);

  useEffect(() => {
    if (introPhase !== 'active') return;
    if (!canDismissLoadingScreen(loadingSignals)) return;

    const settleMs = reducedMotion ? 100 : 320;
    const settleTimer = window.setTimeout(() => {
      setIntroPhase('exiting');
    }, settleMs);
    return () => window.clearTimeout(settleTimer);
  }, [introPhase, loadingSignals, reducedMotion]);

  useEffect(() => {
    if (introPhase !== 'exiting') return;
    const backupTimer = window.setTimeout(() => {
      handleLoadingExitComplete();
    }, loadingTiming.exitDurationMs + 160);
    return () => window.clearTimeout(backupTimer);
  }, [handleLoadingExitComplete, introPhase, loadingTiming.exitDurationMs]);

  const loadingStage = useMemo(() => resolveLoadingStage(loadingSignals), [loadingSignals]);

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string>),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, { ...init, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }
      return data;
    },
    [token]
  );

  const applyBundle = useCallback((data: UserBundle & { token?: string }) => {
    if (data.token) setToken(data.token);
    setBundle({
      profile: data.profile,
      transactions: data.transactions || [],
      documents: data.documents || [],
      debts: data.debts || [],
      goals: data.goals || [],
      messages: data.messages || [],
    });
  }, []);

  const handleStartDemo = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to start demo profile');
      applyBundle(data);
      setPage('dashboard');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to start demo profile');
    } finally {
      setIsLoading(false);
      setLoadingSignals((prev) => ({ ...prev, workspaceReady: true }));
    }
  }, [applyBundle]);

  // Support ?autostart=1 to jump directly into the populated demo workspace
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !token) {
      handleStartDemo();
    }
  }, [handleStartDemo, token]);

  const handleRegister = async (payload: {
    username: string;
    password: string;
    preferredName: string;
    ageGroup: string;
    occupation: string;
    monthlyIncome: number;
    country: string;
    currency: CurrencyCode;
    experienceLevel: ExperienceLevel;
  }) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      applyBundle(data);
      setPage('onboarding');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign in failed');
      applyBundle(data);
      setPage(data.profile?.onboardingCompleted ? 'dashboard' : 'onboarding');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setToken(null);
    setBundle(null);
    setAiError(null);
    setPage('welcome');
  };

  const handleSaveOnboarding = async (answers: OnboardingAnswers, completed: boolean) => {
    const data = await authedFetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        onboardingAnswers: answers,
        onboardingCompleted: completed,
        monthlyIncome:
          answers.monthlyEarnings !== undefined
            ? answers.monthlyEarnings
            : bundle?.profile.monthlyIncome,
      }),
    });
    applyBundle(data);
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    const data = await authedFetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    applyBundle(data);
  };

  const handleParsePdf = async (
    fileName: string,
    base64Data: string
  ): Promise<ParsedTransactionDraft[]> => {
    const data = await authedFetch('/api/ai/parse-pdf', {
      method: 'POST',
      body: JSON.stringify({ fileName, base64Data }),
    });
    return data.drafts || [];
  };

  const handleConfirmImport = async (payload: {
    fileName: string;
    fileType: 'csv' | 'xlsx' | 'pdf';
    totalRows: number;
    transactions: ParsedTransactionDraft[];
  }) => {
    const data = await authedFetch('/api/transactions/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    applyBundle(data);
  };

  const handleAddTransaction = async (payload: NewTransactionPayload) => {
    const data = await authedFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    applyBundle(data);
  };

  const handleUpdateCategory = async (id: string, category: TransactionCategory) => {
    const data = await authedFetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ category }),
    });
    applyBundle(data);
  };

  const handleDeleteTransaction = async (id: string) => {
    const data = await authedFetch(`/api/transactions/${id}`, { method: 'DELETE' });
    applyBundle(data);
  };

  const handleAddDebt = async (debt: Omit<DebtItem, 'id'>) => {
    const data = await authedFetch('/api/debts', {
      method: 'POST',
      body: JSON.stringify(debt),
    });
    applyBundle(data);
  };

  const handleDeleteDebt = async (id: string) => {
    const data = await authedFetch(`/api/debts/${id}`, { method: 'DELETE' });
    applyBundle(data);
  };

  const handleAddGoal = async (goal: Omit<FinancialGoal, 'id'>) => {
    const data = await authedFetch('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
    applyBundle(data);
  };

  const handleDeleteGoal = async (id: string) => {
    const data = await authedFetch(`/api/goals/${id}`, { method: 'DELETE' });
    applyBundle(data);
  };

  const handleSendMessage = async (text: string): Promise<ChatMessage | null> => {
    setAiError(null);
    const optimisticUser: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setBundle((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticUser] } : prev
    );

    try {
      const data = await authedFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      setBundle((prev) => {
        if (!prev) return prev;
        const withoutOpt = prev.messages.filter((m) => m.id !== optimisticUser.id);
        return {
          ...prev,
          messages: [...withoutOpt, data.userMessage, data.assistantMessage],
        };
      });
      return data.assistantMessage as ChatMessage;
    } catch (err) {
      setAiError(
        err instanceof Error
          ? `AURION AI connection notice: ${err.message}`
          : 'Unable to reach Gemini AI service.'
      );
      return null;
    }
  };

  const handleClearChat = async () => {
    await authedFetch('/api/chat', { method: 'DELETE' });
    setBundle((prev) => (prev ? { ...prev, messages: [] } : prev));
  };

  const handleResetDemo = async () => {
    const data = await authedFetch('/api/auth/demo-reset', { method: 'POST' });
    applyBundle(data);
  };

  const handleDeleteProfile = async () => {
    await authedFetch('/api/profile', { method: 'DELETE' });
    setToken(null);
    setBundle(null);
    setPage('welcome');
  };

  const handleExportJson = () => {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurion_export_${bundle.profile.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const analysis = useMemo(() => {
    if (!bundle) return null;
    return analyzeFinances(
      bundle.transactions,
      bundle.profile,
      bundle.debts,
      bundle.goals
    );
  }, [bundle]);

  return (
    <ThreeSceneProvider>
      {introPhase !== 'done' && (
        <AurionLoadingScreen
          stage={loadingStage}
          isExiting={introPhase === 'exiting'}
          onSceneReady={handleLoadingSceneReady}
          onExitComplete={handleLoadingExitComplete}
        />
      )}

      {!bundle || !token || page === 'welcome' ? (
        <WelcomePage
          onRegister={handleRegister}
          onLogin={handleLogin}
          onStartDemo={handleStartDemo}
          authError={authError}
          isLoading={isLoading}
        />
      ) : (
        <AppShell
          activePage={page}
          onNavigate={(nextPage) => {
            if (nextPage === 'planning') setPlanningTab('forecast');
            setPage(nextPage);
          }}
          profile={bundle.profile}
          onLogout={handleLogout}
        >
          {page === 'onboarding' && (
            <OnboardingPage
              profile={bundle.profile}
              onSaveAnswers={handleSaveOnboarding}
              onFinishToAssistant={() => setPage('assistant')}
            />
          )}

          {page === 'assistant' && analysis && (
            <AssistantPage
              profile={bundle.profile}
              analysis={analysis}
              goals={bundle.goals}
              messages={bundle.messages}
              onSendMessage={handleSendMessage}
              onClearChat={handleClearChat}
              onNavigate={setPage}
              aiError={aiError}
            />
          )}

          {page === 'dashboard' && analysis && (
            <DashboardPage
              profile={bundle.profile}
              analysis={analysis}
              transactions={bundle.transactions}
              goals={bundle.goals}
              onNavigate={(nextPage) => {
                if (nextPage === 'planning') setPlanningTab('forecast');
                setPage(nextPage);
              }}
              onCheckGoals={() => {
                setPlanningTab('goals');
                setPage('planning');
              }}
              onAddTransaction={handleAddTransaction}
            />
          )}

          {page === 'transactions' && (
            <TransactionsPage
              profile={bundle.profile}
              transactions={bundle.transactions}
              documents={bundle.documents}
              onParsePdf={handleParsePdf}
              onConfirmImport={handleConfirmImport}
              onUpdateCategory={handleUpdateCategory}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {page === 'reports' && analysis && (
            <ReportsPage profile={bundle.profile} analysis={analysis} />
          )}

          {page === 'planning' && analysis && (
            <PlanningPage
              profile={bundle.profile}
              analysis={analysis}
              debts={bundle.debts}
              goals={bundle.goals}
              initialTab={planningTab}
              onAddDebt={handleAddDebt}
              onDeleteDebt={handleDeleteDebt}
              onAddGoal={handleAddGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {page === 'settings' && (
            <SettingsPage
              profile={bundle.profile}
              onUpdateProfile={handleUpdateProfile}
              onExportJson={handleExportJson}
              onResetDemo={handleResetDemo}
              onDeleteProfile={handleDeleteProfile}
              onLogout={handleLogout}
            />
          )}
        </AppShell>
      )}
    </ThreeSceneProvider>
  );
}
