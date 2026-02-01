import React, { useState } from 'react';
import { LANGUAGES } from '../constants';
import { UserProfile, ProficiencyLevel, LearningMode } from '../types';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const LEVELS: { id: ProficiencyLevel; label: string; desc: string }[] = [
  { id: 'A1', label: 'Beginner (A1)', desc: 'I know nothing / very little.' },
  { id: 'A2', label: 'Elementary (A2)', desc: 'I can have basic exchanges.' },
  { id: 'B1', label: 'Intermediate (B1)', desc: 'I can describe experiences.' },
  { id: 'B2', label: 'Upper-Int (B2)', desc: 'I speak fluently.' },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nativeLang, setNativeLang] = useState(LANGUAGES[0]);
  const [level, setLevel] = useState<ProficiencyLevel>('A1');
  const [mode, setMode] = useState<LearningMode>('assisted');

  const nextStep = () => setStep(s => s + 1);

  const handleFinish = () => {
    onComplete({
      name,
      nativeLanguage: nativeLang,
      currentLevel: level,
      mode,
      completedSubjects: [],
      completedSteps: []
    });
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 bg-slate-50 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full mb-8">
          <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        {step === 1 && (
          <div className="space-y-6 text-center">
            <h2 className="text-3xl font-bold text-slate-800">Hi! What's your name?</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type your name..."
              className="w-full text-center text-2xl p-4 border-b-2 border-slate-300 focus:border-indigo-500 outline-none bg-transparent"
              onKeyDown={(e) => e.key === 'Enter' && name && nextStep()}
            />
            <div className="pt-4">
               <label className="block text-sm font-medium text-slate-500 mb-2">My native language is:</label>
               <div className="grid grid-cols-2 gap-2">
                 {LANGUAGES.slice(0, 6).map(l => (
                    <button 
                        key={l.code}
                        onClick={() => setNativeLang(l)}
                        className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${nativeLang.code === l.code ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                        <span className="text-xl">{l.flag}</span>
                        <span className="text-sm font-medium">{l.name}</span>
                    </button>
                 ))}
               </div>
            </div>
            <button
              disabled={!name}
              onClick={nextStep}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center text-slate-800">Choose your Starting Point</h2>
            <div className="grid grid-cols-1 gap-4">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setLevel(lvl.id)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    level === lvl.id 
                    ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                    : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-bold text-lg text-slate-800">{lvl.label}</div>
                  <div className="text-slate-500">{lvl.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={nextStep} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:scale-[1.02] transition-transform">
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            <h2 className="text-3xl font-bold text-slate-800">Learning Mode</h2>
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => setMode('assisted')}
                    className={`p-6 rounded-2xl border-2 text-left relative overflow-hidden ${mode === 'assisted' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
                >
                    <div className="relative z-10">
                        <div className="font-bold text-lg">Assisted Mode</div>
                        <div className="text-sm text-slate-600">The coach will use {nativeLang.name} to explain mistakes and guide you. Best for beginners.</div>
                    </div>
                </button>
                <button
                    onClick={() => setMode('immersion')}
                    className={`p-6 rounded-2xl border-2 text-left relative overflow-hidden ${mode === 'immersion' ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                >
                    <div className="relative z-10">
                        <div className="font-bold text-lg text-red-700">Immersion Mode</div>
                        <div className="text-sm text-slate-600">Only Portuguese! The coach will explain Portuguese using simpler Portuguese. For brave learners.</div>
                    </div>
                </button>
            </div>
            <button onClick={handleFinish} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:scale-[1.02] transition-transform">
              Start Learning
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Onboarding;
