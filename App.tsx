import React, { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import LessonMap from './components/LessonMap';
import LiveSession from './components/LiveSession';
import { UserProfile, Level, Subject, Step } from './types';

interface ActiveSession {
  level: Level;
  subject: Subject;
  step: Step;
}

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isKeySelecting, setIsKeySelecting] = useState(true);
  
  // App State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    const initKey = async () => {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (hasKey) {
        setApiKey(process.env.API_KEY || 'VALID_KEY_INJECTED');
        setIsKeySelecting(false);
      } else {
        setIsKeySelecting(true);
      }
    };
    initKey();
  }, []);

  const handleKeySelection = async () => {
    try {
      await (window as any).aistudio?.openSelectKey();
      setApiKey(process.env.API_KEY || 'VALID_KEY_INJECTED');
      setIsKeySelecting(false);
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  const handleStepSelect = (level: Level, subject: Subject, step: Step) => {
    setActiveSession({ level, subject, step });
  };

  const handleSessionComplete = () => {
      if (!userProfile || !activeSession) return;

      // Mark step as completed
      const stepCompositeId = `${activeSession.subject.id}-${activeSession.step.id}`;
      const newCompletedSteps = [...userProfile.completedSteps];
      if (!newCompletedSteps.includes(stepCompositeId)) {
          newCompletedSteps.push(stepCompositeId);
      }

      // Check if Subject is completed (simple check for demo: if last step is done)
      // Real app: Check if ALL steps in subject are in newCompletedSteps
      const newCompletedSubjects = [...userProfile.completedSubjects];
      if (activeSession.step.order === 6) { // Last step
         if (!newCompletedSubjects.includes(activeSession.subject.id)) {
             newCompletedSubjects.push(activeSession.subject.id);
         }
      }

      setUserProfile({
          ...userProfile,
          completedSteps: newCompletedSteps,
          completedSubjects: newCompletedSubjects
      });

      setActiveSession(null);
  };

  const handleExitLesson = () => {
    setActiveSession(null);
  };

  if (isKeySelecting) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
           <h1 className="text-2xl font-bold mb-4 text-slate-800">Welcome to LinguoFlow</h1>
           <p className="text-slate-600 mb-6">To start your language coaching session, please select a Google Cloud API Key.</p>
           <button 
             onClick={handleKeySelection}
             className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-indigo-700 transition"
           >
             Select API Key
           </button>
           <p className="mt-4 text-xs text-slate-400">
             See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline hover:text-indigo-500">billing documentation</a> for details.
           </p>
         </div>
       </div>
     );
  }

  if (!apiKey) return null;

  // View: Live Session
  if (userProfile && activeSession) {
    return (
      <div className="h-full w-full">
        <LiveSession 
          user={userProfile}
          level={activeSession.level}
          subject={activeSession.subject}
          step={activeSession.step}
          apiKey={apiKey}
          onDisconnect={handleExitLesson}
          onComplete={handleSessionComplete}
        />
      </div>
    );
  }

  // View: Lesson Map
  if (userProfile) {
    return (
        <div className="h-full w-full">
            <LessonMap 
                user={userProfile} 
                onStepSelect={handleStepSelect} 
            />
        </div>
    );
  }

  // View: Onboarding (Default start if no profile)
  return (
    <div className="h-full w-full">
      <Onboarding onComplete={handleProfileComplete} />
    </div>
  );
};

export default App;
