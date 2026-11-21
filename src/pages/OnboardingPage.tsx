import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Mic,
  MicOff,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LionAvatar3D } from '../components/LionAvatar3D';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { LionState, OnboardingAnswers, UserProfile } from '../types/finance';
import { CURRENCY_CONFIG } from '../utils/currency';

interface OnboardingPageProps {
  profile: UserProfile;
  onSaveAnswers: (answers: OnboardingAnswers, completed: boolean) => Promise<void>;
  onFinishToAssistant: () => void;
}

interface QuestionSpec {
  key: keyof OnboardingAnswers;
  question: string;
  placeholder: string;
  kind: 'text' | 'number' | 'choice';
  choices?: Array<{ label: string; value: string }>;
  termTitle?: string;
  termExplanation?: string;
}

const QUESTIONS: QuestionSpec[] = [
  {
    key: 'incomeSource',
    question: 'What is your primary source of income?',
    placeholder: 'e.g. Full-time salary, freelance design, family allowance...',
    kind: 'text',
  },
  {
    key: 'monthlyEarnings',
    question: 'Approximately how much do you earn every month?',
    placeholder: 'Enter monthly take-home amount',
    kind: 'number',
    termTitle: 'Net Take-Home Income',
    termExplanation:
      'The actual amount credited to your bank account each month after taxes or payroll deductions.',
  },
  {
    key: 'incomeStability',
    question: 'Do you receive a fixed salary or variable income?',
    placeholder: '',
    kind: 'choice',
    choices: [
      { label: 'Fixed monthly salary', value: 'fixed' },
      { label: 'Variable / freelance', value: 'variable' },
      { label: 'Mixed (base + variable)', value: 'mixed' },
    ],
  },
  {
    key: 'regularExpenses',
    question: 'What are your regular monthly expenses roughly?',
    placeholder: 'Rent, groceries, utilities, commute combined',
    kind: 'number',
  },
  {
    key: 'hasLoansOrEmis',
    question: 'Do you have any existing loans or EMIs?',
    placeholder: 'e.g. Education loan ₹7,800/mo, or None',
    kind: 'text',
    termTitle: 'What is an EMI?',
    termExplanation:
      'Equated Monthly Installment: a fixed monthly payment combining loan principal and interest paid toward a loan.',
  },
  {
    key: 'monthlySavings',
    question: 'How much do you currently save in a typical month?',
    placeholder: 'Approximate monthly savings amount',
    kind: 'number',
  },
  {
    key: 'primaryGoals',
    question: 'What are your primary financial goals?',
    placeholder: 'e.g. 6-month emergency fund, higher education, buying a home...',
    kind: 'text',
  },
  {
    key: 'currentlyInvesting',
    question: 'Are you currently investing anywhere?',
    placeholder: 'e.g. Monthly SIP in index funds, Fixed Deposits, or Not yet',
    kind: 'text',
    termTitle: 'What is an Index Fund / SIP?',
    termExplanation:
      'A Systematic Investment Plan (SIP) puts a fixed amount monthly into a fund. Index funds track a broad market index and carry market risk.',
  },
  {
    key: 'riskTolerance',
    question: 'How comfortable are you with financial risks?',
    placeholder: '',
    kind: 'choice',
    choices: [
      { label: 'Conservative (prefer stability)', value: 'conservative' },
      { label: 'Moderate (balanced growth)', value: 'moderate' },
      { label: 'Growth (comfortable with swings)', value: 'growth' },
    ],
    termTitle: 'Risk Tolerance',
    termExplanation:
      'How comfortable you are seeing short-term ups and downs in investment value in exchange for potential long-term growth.',
  },
  {
    key: 'topImprovement',
    question: 'What would you most like to improve about your finances?',
    placeholder: 'e.g. Cut impulse ordering, clear debt faster, save ₹5,000 more...',
    kind: 'text',
  },
];

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  profile,
  onSaveAnswers,
  onFinishToAssistant,
}) => {
  // Find first unanswered step if returning, otherwise start at 0
  const [stepIndex, setStepIndex] = useState<number>(() => {
    const firstMissing = QUESTIONS.findIndex((q) => {
      const val = profile.onboardingAnswers[q.key];
      return val === undefined || val === '' || val === null;
    });
    return firstMissing >= 0 ? firstMissing : 0;
  });

  const [answers, setAnswers] = useState<OnboardingAnswers>(profile.onboardingAnswers || {});
  const [inputVal, setInputVal] = useState<string>(() => {
    const initial = profile.onboardingAnswers?.[QUESTIONS[stepIndex]?.key];
    return initial !== undefined && initial !== null ? String(initial) : '';
  });
  const [showTermHelp, setShowTermHelp] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentQuestion = QUESTIONS[stepIndex];
  const sym = CURRENCY_CONFIG[profile.currency].symbol;

  const voice = useVoiceAssistant({
    voiceEnabled: profile.voiceEnabled,
    speechRate: profile.speechRate,
    onFinalTranscript: (transcript) => {
      setInputVal(transcript);
    },
  });

  const [isWelcoming, setIsWelcoming] = useState(true);
  const [isCelebrating, setIsCelebrating] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsWelcoming(false), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  const lionState: LionState = voice.isListening
    ? 'listening'
    : voice.isSpeaking
    ? 'speaking'
    : saving
    ? 'thinking'
    : isCelebrating
    ? 'happy'
    : isWelcoming
    ? 'welcoming'
    : 'idle';

  const goToStep = (nextIdx: number, nextAnswers: OnboardingAnswers) => {
    setStepIndex(nextIdx);
    setShowTermHelp(false);
    const existing = nextAnswers[QUESTIONS[nextIdx].key];
    setInputVal(existing !== undefined && existing !== null ? String(existing) : '');
    if (!voice.isMuted) {
      voice.speak(QUESTIONS[nextIdx].question);
    }
  };

  const commitCurrent = async (overrideVal?: string, skipped = false) => {
    const raw = overrideVal !== undefined ? overrideVal : inputVal;
    const updated: OnboardingAnswers = { ...answers };

    if (!skipped && raw.trim() !== '') {
      if (currentQuestion.kind === 'number') {
        const parsed = Number(raw.replace(/[^0-9.]/g, ''));
        if (!Number.isNaN(parsed)) {
          (updated as Record<string, unknown>)[currentQuestion.key] = parsed;
        }
      } else {
        (updated as Record<string, unknown>)[currentQuestion.key] = raw.trim();
      }
    }

    setAnswers(updated);
    setSaving(true);
    const isLast = stepIndex === QUESTIONS.length - 1;
    await onSaveAnswers(updated, isLast || profile.onboardingCompleted);
    setSaving(false);

    if (isLast) {
      setIsCelebrating(true);
      window.setTimeout(() => onFinishToAssistant(), 900);
    } else {
      goToStep(stepIndex + 1, updated);
    }
  };

  const answeredCount = QUESTIONS.filter((q) => {
    const v = answers[q.key];
    return v !== undefined && v !== '' && v !== null;
  }).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#5C635E]">
            Question {stepIndex + 1} of {QUESTIONS.length} · {answeredCount} answered
          </p>
          <h2 className="font-display text-2xl font-semibold text-[#202321] mt-0.5">
            Personal Financial Discovery
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (voice.isMuted) {
                voice.setIsMuted(false);
                voice.speak(currentQuestion.question);
              } else {
                voice.stopSpeaking();
                voice.setIsMuted(true);
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E2DED4] text-xs font-medium text-[#202321] hover:bg-[#FAF9F6]"
          >
            {voice.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{voice.isMuted ? 'Voice Muted' : 'Read Aloud'}</span>
          </button>

          <button
            type="button"
            onClick={onFinishToAssistant}
            className="px-3.5 py-2 rounded-xl bg-[#183B32] text-white text-xs font-semibold hover:bg-[#122D26] transition-colors"
          >
            Finish Later
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-[#E3DFD5] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#183B32] transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / QUESTIONS.length) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 3D Lion Companion Stage */}
        <div className="lg:col-span-5 bg-[#EBF0E9] rounded-2xl border border-[#DCE2DA] p-5 flex flex-col justify-between min-h-[340px]">
          <div className="flex items-center justify-between text-xs text-[#5C635E]">
            <span className="font-semibold text-[#183B32]">AURION</span>
            <span>State: {lionState.charAt(0).toUpperCase() + lionState.slice(1)}</span>
          </div>
          <div className="h-[260px]">
            <LionAvatar3D
              state={lionState}
              speechPulse={voice.speechPulse}
              micLevel={voice.micLevel}
              onInteract={() => voice.speak(currentQuestion.question)}
              compact
            />
          </div>
          <p className="text-xs text-[#5C635E] leading-relaxed">
            Hello {profile.preferredName}. Answer only what you know right now—you can skip any
            question or update answers anytime.
          </p>
        </div>

        {/* Conversational Question Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E1D8] p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-[#202321] leading-snug">
                {currentQuestion.question}
              </h3>
              {currentQuestion.termExplanation && (
                <button
                  type="button"
                  onClick={() => setShowTermHelp((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F6F4EF] border border-[#E5E1D8] text-xs font-medium text-[#183B32] shrink-0 hover:bg-[#EAE6DC]"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Explain term</span>
                </button>
              )}
            </div>

            {showTermHelp && currentQuestion.termExplanation && (
              <div className="p-4 rounded-xl bg-[#F6F4EF] border border-[#E2DED4] text-xs text-[#202321] leading-relaxed">
                <div className="font-semibold text-[#183B32] mb-1">
                  {currentQuestion.termTitle}
                </div>
                <p>{currentQuestion.termExplanation}</p>
              </div>
            )}

            {currentQuestion.kind === 'choice' && currentQuestion.choices ? (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.choices.map((c) => {
                  const selected = inputVal === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setInputVal(c.value);
                        commitCurrent(c.value, false);
                      }}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-colors flex items-center justify-between ${
                        selected
                          ? 'bg-[#183B32] text-white border-[#183B32]'
                          : 'bg-[#FAF9F6] text-[#202321] border-[#DFDBD0] hover:border-[#183B32]'
                      }`}
                    >
                      <span>{c.label}</span>
                      {selected && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative flex items-center gap-2">
                  {currentQuestion.kind === 'number' && (
                    <span className="px-3.5 py-3 rounded-xl bg-[#F6F4EF] border border-[#DFDBD0] text-sm font-semibold text-[#202321]">
                      {sym}
                    </span>
                  )}
                  <input
                    type={currentQuestion.kind === 'number' ? 'number' : 'text'}
                    value={voice.isListening && voice.interimTranscript ? voice.interimTranscript : inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitCurrent(undefined, false);
                      }
                    }}
                    placeholder={currentQuestion.placeholder}
                    className="flex-1 px-4 py-3 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      voice.isListening ? voice.stopListening() : voice.startListening()
                    }
                    aria-label={voice.isListening ? 'Stop voice recording' : 'Answer by voice'}
                    className={`p-3 rounded-xl border transition-colors shrink-0 ${
                      voice.isListening
                        ? 'bg-[#991B1B] text-white border-[#991B1B]'
                        : 'bg-[#F6F4EF] text-[#183B32] border-[#DFDBD0] hover:bg-[#EAE6DC]'
                    }`}
                  >
                    {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>

                {voice.isListening && (
                  <p className="text-xs text-[#183B32] font-medium">
                    Listening... speak naturally and pause when finished.
                  </p>
                )}
                {voice.voiceError && (
                  <p className="text-xs text-[#991B1B]">{voice.voiceError}</p>
                )}
              </div>
            )}
          </div>

          {/* Step Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EAE7DF]">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => goToStep(stepIndex - 1, answers)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#DFDBD0] text-xs font-medium text-[#202321] hover:bg-[#F6F4EF] disabled:opacity-40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={() => commitCurrent('', true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-[#5C635E] hover:text-[#202321] hover:bg-[#F6F4EF]"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Skip Question</span>
              </button>

              {currentQuestion.kind !== 'choice' && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => commitCurrent(undefined, false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#183B32] hover:bg-[#122D26] text-white text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  <span>
                    {stepIndex === QUESTIONS.length - 1 ? 'Save & Finish' : 'Save & Next'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Jump Dots / Answer Review Pills */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] p-4">
        <div className="text-xs font-semibold text-[#202321] mb-3">
          Your Evolving Financial Profile (click any step to review or update)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {QUESTIONS.map((q, idx) => {
            const val = answers[q.key];
            const hasVal = val !== undefined && val !== '' && val !== null;
            return (
              <button
                key={q.key}
                type="button"
                onClick={() => goToStep(idx, answers)}
                className={`text-left p-2.5 rounded-xl border text-xs transition-colors ${
                  idx === stepIndex
                    ? 'border-[#183B32] bg-[#EBF0E9]'
                    : hasVal
                    ? 'border-[#D5DED3] bg-[#FAF9F6] hover:border-[#183B32]'
                    : 'border-[#EAE7DF] bg-white hover:border-[#C4AD7D]'
                }`}
              >
                <div className="font-semibold text-[#202321] truncate">
                  {idx + 1}. {q.key.replace(/([A-Z])/g, ' $1')}
                </div>
                <div className="text-[#5C635E] truncate mt-0.5">
                  {hasVal
                    ? q.kind === 'number'
                      ? `${sym}${Number(val).toLocaleString()}`
                      : String(val)
                    : 'Skipped / Pending'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
