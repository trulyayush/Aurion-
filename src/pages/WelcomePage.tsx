import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { LionAvatar3D } from '../components/LionAvatar3D';
import { CurrencyCode, ExperienceLevel, LionState } from '../types/finance';
import { CURRENCY_CONFIG } from '../utils/currency';

interface WelcomePageProps {
  onRegister: (payload: {
    username: string;
    password: string;
    preferredName: string;
    ageGroup: string;
    occupation: string;
    monthlyIncome: number;
    country: string;
    currency: CurrencyCode;
    experienceLevel: ExperienceLevel;
  }) => Promise<void>;
  onLogin: (username: string, password: string) => Promise<void>;
  onStartDemo: () => Promise<void>;
  authError: string | null;
  isLoading: boolean;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onRegister,
  onLogin,
  onStartDemo,
  authError,
  isLoading,
}) => {
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [lionState, setLionState] = useState<LionState>('idle');
  const [greetingText, setGreetingText] = useState(
    'Hello, I am AURION. Share a few basics or explore the demo profile and we will map out your finances together.'
  );

  // Create profile form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [ageGroup, setAgeGroup] = useState('25-34');
  const [occupation, setOccupation] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [country, setCountry] = useState('India');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLionTap = () => {
    setLionState('speaking');
    setGreetingText(
      'Nice to meet you. I analyze your real statements, explain trends clearly, and never guess numbers.'
    );
    window.setTimeout(() => setLionState('idle'), 2400);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (username.trim().length < 3) {
      setLocalError('Please choose a username of at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Please enter a password of at least 6 characters.');
      return;
    }
    if (!preferredName.trim()) {
      setLocalError('Please enter your preferred name.');
      return;
    }
    await onRegister({
      username: username.trim(),
      password,
      preferredName: preferredName.trim(),
      ageGroup,
      occupation: occupation.trim() || 'Professional',
      monthlyIncome: Number(monthlyIncome) || 0,
      country: country.trim() || CURRENCY_CONFIG[currency].countryDefault,
      currency,
      experienceLevel,
    });
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!username.trim() || !password) {
      setLocalError('Please enter both username and password.');
      return;
    }
    await onLogin(username.trim(), password);
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#183B32] p-3 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-[1320px] bg-[#F6F4EF] rounded-[24px] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-white/10">
        {/* Left Showcase Stage: 3D White Lion Avatar */}
        <div className="lg:col-span-5 bg-[#EBF0E9] p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#DCE2DA]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#183B32] text-[#F6F4EF] flex items-center justify-center font-display font-bold text-base">
                A
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-[#202321]">
                AURION
              </span>
            </div>
            <span className="text-xs text-[#5C635E] font-medium">3D Finance Companion</span>
          </div>

          <div className="relative h-[320px] sm:h-[380px] lg:h-[420px] my-4">
            <LionAvatar3D state={lionState} onInteract={handleLionTap} />
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-[#E2E6DF] shadow-sm">
              <p className="text-sm text-[#202321] leading-relaxed">{greetingText}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-[#5C635E]">
                <span>Interactive 3D White Lion · Click avatar to interact</span>
              </div>
            </div>

            <div className="pt-1">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#202321] tracking-tight text-balance">
                Understand your money. Master your future.
              </h1>
              <p className="mt-2 text-sm text-[#5C635E] leading-relaxed">
                Natural voice and text conversations, bank statement analysis, deterministic health
                scoring, and scenario planning in one calm workspace.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Minimal Onboarding & Profile Creation */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 bg-white flex flex-col justify-between">
          <div className="max-w-xl w-full mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAE7DF] pb-4">
              <div className="inline-flex p-1 bg-[#F6F4EF] rounded-xl border border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('create');
                    setLocalError(null);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    mode === 'create'
                      ? 'bg-[#183B32] text-white'
                      : 'text-[#5C635E] hover:text-[#202321]'
                  }`}
                >
                  Create Local Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setLocalError(null);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    mode === 'signin'
                      ? 'bg-[#183B32] text-white'
                      : 'text-[#5C635E] hover:text-[#202321]'
                  }`}
                >
                  Sign In
                </button>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={onStartDemo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F6F4EF] hover:bg-[#EAE6DC] border border-[#DFDBD0] text-xs font-semibold text-[#183B32] transition-colors whitespace-nowrap disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explore Demo Profile</span>
              </button>
            </div>

            {displayError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F3C6C6] text-xs text-[#991B1B]"
              >
                {displayError}
              </div>
            )}

            {mode === 'create' ? (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-username" className="block text-xs font-medium text-[#202321] mb-1.5">
                      Username *
                    </label>
                    <input
                      id="reg-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. priya_k"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-medium text-[#202321] mb-1.5">
                      Password *
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-name" className="block text-xs font-medium text-[#202321] mb-1.5">
                      Preferred Name *
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      value={preferredName}
                      onChange={(e) => setPreferredName(e.target.value)}
                      placeholder="How AURION should address you"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-age" className="block text-xs font-medium text-[#202321] mb-1.5">
                      Age Group
                    </label>
                    <select
                      id="reg-age"
                      value={ageGroup}
                      onChange={(e) => setAgeGroup(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                    >
                      <option value="18-24">18–24</option>
                      <option value="25-34">25–34</option>
                      <option value="35-44">35–44</option>
                      <option value="45-54">45–54</option>
                      <option value="55+">55+</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-occupation" className="block text-xs font-medium text-[#202321] mb-1.5">
                      Occupation
                    </label>
                    <input
                      id="reg-occupation"
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Designer, Student, Analyst"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-income" className="block text-xs font-medium text-[#202321] mb-1.5">
                      Monthly Income ({CURRENCY_CONFIG[currency].symbol})
                    </label>
                    <input
                      id="reg-income"
                      type="number"
                      min="0"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      placeholder="e.g. 75000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="reg-country" className="block text-xs font-medium text-[#202321] mb-1.5">
                      Country
                    </label>
                    <input
                      id="reg-country"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-currency" className="block text-xs font-medium text-[#202321] mb-1.5">
                      Preferred Currency
                    </label>
                    <select
                      id="reg-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="reg-exp" className="block text-xs font-medium text-[#202321] mb-1.5">
                      Experience Level
                    </label>
                    <select
                      id="reg-exp"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-5 rounded-xl bg-[#183B32] hover:bg-[#122D26] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  <span>{isLoading ? 'Creating profile...' : 'Create Profile & Meet AURION'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignInSubmit} className="space-y-4 py-4">
                <div>
                  <label htmlFor="login-username" className="block text-xs font-medium text-[#202321] mb-1.5">
                    Username
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your local username"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-xs font-medium text-[#202321] mb-1.5">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm text-[#202321] focus:outline-none focus:ring-2 focus:ring-[#183B32]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-5 rounded-xl bg-[#183B32] hover:bg-[#122D26] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isLoading ? 'Signing in...' : 'Continue to AURION'}</span>
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-[#EAE7DF] flex items-start gap-3 text-xs text-[#5C635E] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#183B32] shrink-0 mt-0.5" />
              <p>
                <strong>Academic Prototype Notice:</strong> Profiles are persisted locally in SQLite
                with salted cryptographic password hashing (<code className="font-mono">scrypt</code>)
                for demonstration purposes—not production banking authentication. Do not enter bank
                PINs or confidential credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
