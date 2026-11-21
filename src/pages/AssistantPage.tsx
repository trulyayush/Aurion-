import React, { useEffect, useRef, useState } from 'react';
import {
  FileUp,
  Mic,
  MicOff,
  Pause,
  Play,
  Send,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LionAvatar3D } from '../components/LionAvatar3D';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import {
  AppPage,
  ChatMessage,
  FinancialAnalysisSummary,
  FinancialGoal,
  LionState,
  UserProfile,
} from '../types/finance';
import { formatCurrency } from '../utils/currency';

interface AssistantPageProps {
  profile: UserProfile;
  analysis: FinancialAnalysisSummary;
  goals?: FinancialGoal[];
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<ChatMessage | null>;
  onClearChat: () => Promise<void>;
  onNavigate: (page: AppPage) => void;
  aiError: string | null;
}

const DEFAULT_SUGGESTIONS = [
  'Where am I wasting the most money?',
  'How can I save ₹5,000 every month?',
  'Can I start investing right now?',
  'Explain my Financial Health Score',
];

export const AssistantPage: React.FC<AssistantPageProps> = ({
  profile,
  analysis,
  goals = [],
  messages,
  onSendMessage,
  onClearChat,
  onNavigate,
  aiError,
}) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isWelcoming, setIsWelcoming] = useState(true);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const hasAchievedGoal = goals.some(
    (g) => g.targetAmount > 0 && g.currentSavings >= g.targetAmount
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setIsWelcoming(false), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasAchievedGoal) return;
    setIsCelebrating(true);
    const timer = window.setTimeout(() => setIsCelebrating(false), 3200);
    return () => window.clearTimeout(timer);
  }, [hasAchievedGoal]);

  const voice = useVoiceAssistant({
    voiceEnabled: profile.voiceEnabled,
    speechRate: profile.speechRate,
    onFinalTranscript: (transcript) => {
      setInput(transcript);
      handleSubmitText(transcript);
    },
  });

  const lionState: LionState = voice.isListening
    ? 'listening'
    : isThinking
    ? 'thinking'
    : voice.isSpeaking
    ? 'speaking'
    : isCelebrating
    ? 'happy'
    : isWelcoming
    ? 'welcoming'
    : 'idle';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isThinking]);

  const handleSubmitText = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isThinking) return;
    setInput('');
    setIsThinking(true);
    const assistantMsg = await onSendMessage(text);
    setIsThinking(false);
    if (assistantMsg && !voice.isMuted) {
      voice.speak(assistantMsg.content);
    }
  };

  const latestSuggestions =
    [...messages].reverse().find((m) => m.role === 'assistant' && m.suggestions?.length)
      ?.suggestions || DEFAULT_SUGGESTIONS;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[620px]">
      {/* Left Interactive 3D Lion Stage */}
      <div className="lg:col-span-5 bg-[#EBF0E9] rounded-2xl border border-[#DCE2DA] p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-base text-[#202321]">
              AURION Companion
            </h2>
            <p className="text-xs text-[#5C635E]">
              State:{' '}
              <span className="font-semibold text-[#183B32]">
                {lionState.charAt(0).toUpperCase() + lionState.slice(1)}
              </span>{' '}
              · {analysis.analysisPeriod.transactionCount} transactions loaded
            </p>
          </div>

          {/* Voice Playback Controls */}
          <div className="flex items-center gap-1.5">
            {voice.isSpeaking && (
              <button
                type="button"
                onClick={voice.togglePauseSpeech}
                aria-label={voice.isPaused ? 'Resume voice response' : 'Pause voice response'}
                className="p-2 rounded-xl bg-white border border-[#DCE2DA] text-[#183B32] hover:bg-[#FAF9F6]"
              >
                {voice.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (voice.isMuted) {
                  voice.setIsMuted(false);
                } else {
                  voice.stopSpeaking();
                  voice.setIsMuted(true);
                }
              }}
              aria-label={voice.isMuted ? 'Unmute AURION voice' : 'Mute AURION voice'}
              className="p-2 rounded-xl bg-white border border-[#DCE2DA] text-[#202321] hover:bg-[#FAF9F6]"
            >
              {voice.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 3D Canvas Viewport */}
        <div className="relative h-[300px] sm:h-[340px] my-2">
          <LionAvatar3D
            state={lionState}
            speechPulse={voice.speechPulse}
            micLevel={voice.micLevel}
            onInteract={() => {
              const summary = `You have ${analysis.analysisPeriod.transactionCount} recorded transactions, a net cash flow of ${formatCurrency(
                analysis.overview.netCashFlow,
                profile.currency
              )}, and a financial health score of ${analysis.healthScore.total} out of 100.`;
              voice.speak(summary);
              if (hasAchievedGoal) {
                setIsCelebrating(true);
                window.setTimeout(() => setIsCelebrating(false), 2600);
              }
            }}
          />
        </div>

        {/* Verified Data Snapshot + Quick Document Upload */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border border-[#DCE2DA] grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[#5C635E]">Net Cash Flow</div>
              <div className="font-mono-num font-semibold text-sm text-[#202321] mt-0.5">
                {formatCurrency(analysis.overview.netCashFlow, profile.currency)}
              </div>
            </div>
            <div>
              <div className="text-[#5C635E]">Health Score</div>
              <div className="font-mono-num font-semibold text-sm text-[#183B32] mt-0.5">
                {analysis.healthScore.total} / 100 ({analysis.healthScore.grade})
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FAF9F6] border border-[#D4DCD2] text-xs font-semibold text-[#183B32] inline-flex items-center justify-center gap-2 transition-colors"
          >
            <FileUp className="w-4 h-4" />
            <span>Upload Bank Statement (CSV, XLSX, PDF)</span>
          </button>
        </div>
      </div>

      {/* Right Conversational Chat Interface */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E1D8] flex flex-col overflow-hidden min-h-[540px] max-h-[760px]">
        <div className="px-5 py-3.5 border-b border-[#EAE7DF] flex items-center justify-between gap-4">
          <div className="text-xs text-[#5C635E]">
            Grounded in {analysis.analysisPeriod.transactionCount} verified transactions
            {analysis.analysisPeriod.hasSyntheticDemo ? ' (includes synthetic demo data)' : ''}
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                voice.stopSpeaking();
                onClearChat();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C635E] hover:text-[#991B1B]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Thread</span>
            </button>
          )}
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="py-10 text-center max-w-md mx-auto space-y-3">
              <h3 className="font-display text-lg font-semibold text-[#202321]">
                Ask AURION about your money
              </h3>
              <p className="text-sm text-[#5C635E] leading-relaxed">
                Ask where your money goes, how to reach a savings target, what financial terms
                mean, or whether your emergency reserve is ready for investing.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#183B32] text-white'
                      : 'bg-[#F6F4EF] text-[#202321] border border-[#E5E1D8]'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>
                  {msg.role === 'assistant' && msg.dataNotice && (
                    <div className="mt-2 pt-2 border-t border-[#E2DED4] flex items-center justify-between gap-3 text-[11px] text-[#5C635E]">
                      <span>{msg.dataNotice}</span>
                      {voice.ttsSupported && (
                        <button
                          type="button"
                          onClick={() => voice.speak(msg.content)}
                          className="text-[#183B32] font-medium hover:underline shrink-0"
                        >
                          Listen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isThinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-[#F6F4EF] border border-[#E5E1D8] text-xs text-[#5C635E]">
                AURION is analyzing your financial records...
              </div>
            </div>
          )}

          {aiError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F3C6C6] text-xs text-[#991B1B]"
            >
              {aiError}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested Prompts & Input Bar */}
        <div className="p-4 border-t border-[#EAE7DF] bg-[#FAF9F6] space-y-3">
          <div className="flex flex-wrap gap-2">
            {latestSuggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isThinking}
                onClick={() => handleSubmitText(prompt)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#DFDBD0] hover:border-[#183B32] text-xs font-medium text-[#202321] transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {voice.voiceError && (
            <div className="text-xs text-[#991B1B]">{voice.voiceError}</div>
          )}
          {voice.isListening && (
            <div className="text-xs text-[#183B32] font-medium">
              Listening: {voice.interimTranscript || 'Speak clearly into your microphone...'}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitText();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => {
                if (voice.isListening) voice.stopListening();
                else voice.startListening();
              }}
              aria-label={voice.isListening ? 'Stop microphone' : 'Click to speak'}
              title={voice.speechSupported ? 'Click or hold to speak' : 'Voice input unsupported in browser'}
              className={`p-3 rounded-xl border transition-colors shrink-0 ${
                voice.isListening
                  ? 'bg-[#991B1B] text-white border-[#991B1B]'
                  : 'bg-white text-[#183B32] border-[#DFDBD0] hover:bg-[#EBF0E9]'
              }`}
            >
              {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={voice.isListening && voice.interimTranscript ? voice.interimTranscript : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AURION about your spending, savings, debt, or goals..."
              aria-label="Message AURION"
              className="flex-1 px-4 py-3 rounded-xl border border-[#DFDBD0] bg-white text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
            />

            <button
              type="submit"
              disabled={isThinking || (!input.trim() && !voice.interimTranscript.trim())}
              aria-label="Send message"
              className="px-4 py-3 rounded-xl bg-[#183B32] hover:bg-[#122D26] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
