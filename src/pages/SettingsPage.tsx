import React, { useState } from 'react';
import { Download, RotateCcw, Save, Shield, Trash2 } from 'lucide-react';
import {
  CurrencyCode,
  ExperienceLevel,
  UserProfile,
} from '../types/finance';
import { FINANCIAL_GLOSSARY } from '../utils/currency';

interface SettingsPageProps {
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onExportJson: () => void;
  onResetDemo: () => Promise<void>;
  onDeleteProfile: () => Promise<void>;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  profile,
  onUpdateProfile,
  onExportJson,
  onResetDemo,
  onDeleteProfile,
  onLogout,
}) => {
  const [preferredName, setPreferredName] = useState(profile.preferredName);
  const [occupation, setOccupation] = useState(profile.occupation);
  const [ageGroup, setAgeGroup] = useState(profile.ageGroup);
  const [monthlyIncome, setMonthlyIncome] = useState(String(profile.monthlyIncome));
  const [country, setCountry] = useState(profile.country);
  const [currency, setCurrency] = useState<CurrencyCode>(profile.currency);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    profile.experienceLevel
  );
  const [voiceEnabled, setVoiceEnabled] = useState(profile.voiceEnabled);
  const [speechRate, setSpeechRate] = useState(profile.speechRate);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile({
      preferredName: preferredName.trim() || profile.preferredName,
      occupation: occupation.trim(),
      ageGroup,
      monthlyIncome: Number(monthlyIncome) || 0,
      country: country.trim(),
      currency,
      experienceLevel,
      voiceEnabled,
      speechRate,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile & Preferences Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#202321]">
              Profile & Voice Preferences
            </h2>
            {savedNotice && (
              <span className="text-xs font-semibold text-[#183B32]">Changes saved</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#202321] mb-1">
                Preferred Name
              </label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202321] mb-1">Occupation</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#202321] mb-1">Age Group</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm"
              >
                <option value="18-24">18–24</option>
                <option value="25-34">25–34</option>
                <option value="35-44">35–44</option>
                <option value="45-54">45–54</option>
                <option value="55+">55+</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202321] mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm"
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
                <option value="GBP">British Pound (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202321] mb-1">Experience</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#202321] mb-1">
                Monthly Income
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202321] mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDBD0] bg-[#FAF9F6] text-sm"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#EAE7DF] space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="voice-toggle" className="text-xs font-medium text-[#202321]">
                Enable AURION spoken voice responses (Text-to-Speech)
              </label>
              <input
                id="voice-toggle"
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#183B32]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#5C635E] mb-1">
                <span>Speech Speed</span>
                <span className="font-mono-num">{speechRate.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.3}
                step={0.05}
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="w-full accent-[#183B32]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#183B32] hover:bg-[#122D26] text-white text-xs font-semibold transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Settings</span>
          </button>
        </form>

        {/* Data Management & Safety */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-3">
            <h3 className="font-display text-base font-semibold text-[#202321]">
              Data Management
            </h3>
            <p className="text-xs text-[#5C635E] leading-relaxed">
              Signed in as <strong>@{profile.username}</strong>. Export your local financial bundle,
              restore synthetic demo records, or delete your local profile.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={onExportJson}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FAF9F6] border border-[#DFDBD0] hover:border-[#183B32] text-xs font-semibold text-[#202321] inline-flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Personal Data (JSON)</span>
              </button>

              <button
                type="button"
                onClick={onResetDemo}
                className="w-full py-2.5 px-4 rounded-xl bg-[#EBF0E9] border border-[#D4DCD2] hover:bg-[#DFE6DD] text-xs font-semibold text-[#183B32] inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset / Seed Demo Profile Data</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#DFDBD0] text-xs font-medium text-[#5C635E] hover:text-[#202321]"
              >
                Sign Out
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#FDF2F2] border border-[#F3C6C6] text-xs font-semibold text-[#991B1B] inline-flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Local Account & Data</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#F3C6C6] space-y-2 text-xs">
                  <p className="text-[#991B1B] font-medium">
                    Confirm permanent deletion of @{profile.username} and all local transactions?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onDeleteProfile}
                      className="flex-1 py-2 rounded-lg bg-[#991B1B] text-white font-semibold"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-lg bg-white border border-[#DFDBD0] text-[#202321]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-2 text-xs text-[#5C635E] leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-[#202321]">
              <Shield className="w-4 h-4 text-[#183B32]" />
              <span>Privacy & Educational Disclaimer</span>
            </div>
            <p>
              AURION is an academic educational prototype—not a registered investment adviser,
              bank, or credit scoring agency. Never share banking passwords or PINs, and consult a
              qualified financial adviser before making major investment decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Plain-English Financial Terminology Reference */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] p-6 space-y-4">
        <h3 className="font-display text-base font-semibold text-[#202321]">
          Plain-English Financial Glossary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FINANCIAL_GLOSSARY.map((item) => (
            <div key={item.term} className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE7DF]">
              <div className="text-xs font-semibold text-[#183B32]">{item.term}</div>
              <p className="text-xs text-[#5C635E] mt-1 leading-relaxed">
                {item.plainExplanation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
