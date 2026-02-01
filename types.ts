export interface Character {
  id: string;
  name: string;
  description: string;
  voiceName: string; 
  avatarColor: string;
  style: 'cute' | 'serious' | 'energetic' | 'calm';
}

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isPartial?: boolean;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type LearningMode = 'assisted' | 'immersion';
export type StepType = 'vocabulary' | 'listening' | 'reading' | 'grammar' | 'speaking' | 'challenge';

export interface Step {
  id: string;
  title: string;
  type: StepType;
  order: number;
}

export interface Subject {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  steps: Step[];
}

export interface Level {
  id: ProficiencyLevel;
  title: string;
  subjects: Subject[];
}

export interface UserProfile {
  name: string;
  nativeLanguage: LanguageOption;
  mode: LearningMode;
  // Progress Tracking
  currentLevel: ProficiencyLevel;
  completedSubjects: string[]; // IDs of completed subjects
  completedSteps: string[]; // IDs of completed steps (globally unique IDs recommended, or composite subjectId+stepId)
}

// Gemini Live API Types (Simplified for internal use)
export type LiveConfig = {
  model: string;
  systemInstruction: string;
  voiceName: string;
};
