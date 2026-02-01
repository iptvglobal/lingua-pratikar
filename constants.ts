import { Character, LanguageOption, Level, StepType, UserProfile, Subject, Step } from './types';

export const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

// 1. CHARACTERS MAPPED TO ROLES
export const CHARACTERS: Record<string, Character> = {
  sofia: {
    id: 'sofia',
    name: 'Sofia',
    description: 'Soft fluffy female voice 🌸. Best for Vocabulary.',
    voiceName: 'Puck', 
    avatarColor: 'from-pink-300 to-rose-400',
    style: 'cute'
  },
  ines: {
    id: 'ines',
    name: 'Inês',
    description: 'Clear, calm teacher. Best for Grammar & Reading.',
    voiceName: 'Kore', 
    avatarColor: 'from-blue-400 to-indigo-500',
    style: 'calm'
  },
  miguel: {
    id: 'miguel',
    name: 'Miguel',
    description: 'Friendly male. Best for Speaking & Listening.',
    voiceName: 'Fenrir',
    avatarColor: 'from-green-500 to-teal-600',
    style: 'energetic'
  },
  rui: {
    id: 'rui',
    name: 'Rui',
    description: 'Energetic, gamified. Best for Challenges.',
    voiceName: 'Zephyr',
    avatarColor: 'from-orange-500 to-red-600',
    style: 'serious'
  }
};

// Helper to get character by step type
export const getCharacterForStep = (type: StepType): Character => {
  switch (type) {
    case 'vocabulary': return CHARACTERS.sofia;
    case 'grammar': 
    case 'reading': return CHARACTERS.ines;
    case 'speaking':
    case 'listening': return CHARACTERS.miguel;
    case 'challenge': return CHARACTERS.rui;
    default: return CHARACTERS.miguel;
  }
};

export const LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'pt-PT', name: 'Portuguese (Native)', flag: '🇵🇹' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦' },
];

// 2. CURRICULUM STRUCTURE
const STANDARD_STEPS: Step[] = [
  { id: 'step-1', order: 1, type: 'vocabulary', title: 'Vocabulário' },
  { id: 'step-2', order: 2, type: 'listening', title: 'Escuta' },
  { id: 'step-3', order: 3, type: 'reading', title: 'Leitura' },
  { id: 'step-4', order: 4, type: 'grammar', title: 'Gramática' },
  { id: 'step-5', order: 5, type: 'speaking', title: 'Fala' },
  { id: 'step-6', order: 6, type: 'challenge', title: 'Mini-Teste' },
];

export const CURRICULUM: Level[] = [
  {
    id: 'A1',
    title: 'A1 – Beginner',
    subjects: [
      { id: 'a1-intro', title: 'Apresentações Pessoais', description: 'Introduce yourself', icon: '👋', color: 'bg-green-500', steps: STANDARD_STEPS },
      { id: 'a1-greetings', title: 'Cumprimentos Diários', description: 'Hello, Goodbye, How are you', icon: '☀️', color: 'bg-yellow-500', steps: STANDARD_STEPS },
      { id: 'a1-numbers', title: 'Números e Tempo', description: 'Counting and telling time', icon: '⏰', color: 'bg-blue-500', steps: STANDARD_STEPS },
      { id: 'a1-family', title: 'Família e Amigos', description: 'Talking about family', icon: '👨‍👩‍👧', color: 'bg-purple-500', steps: STANDARD_STEPS },
      { id: 'a1-food', title: 'Comida e Bebidas', description: 'Ordering food', icon: '🍔', color: 'bg-red-500', steps: STANDARD_STEPS },
      { id: 'a1-routine', title: 'Rotina Diária', description: 'Daily habits', icon: '📅', color: 'bg-indigo-500', steps: STANDARD_STEPS },
      { id: 'a1-places', title: 'Direções e Lugares', description: 'Where is the library?', icon: '🗺️', color: 'bg-teal-500', steps: STANDARD_STEPS },
      { id: 'a1-shopping', title: 'Compras Básicas', description: 'Buying things', icon: '🛍️', color: 'bg-pink-500', steps: STANDARD_STEPS },
    ]
  },
  {
    id: 'A2',
    title: 'A2 – Elementary',
    subjects: [
      { id: 'a2-work', title: 'Trabalho', description: 'Professions', icon: '💼', color: 'bg-slate-500', steps: STANDARD_STEPS },
       // ... simplified for demo
    ]
  },
  { id: 'B1', title: 'B1 – Intermediate', subjects: [] },
  { id: 'B2', title: 'B2 – Upper-Intermediate', subjects: [] },
  { id: 'C1', title: 'C1 – Advanced', subjects: [] },
];

export const AUDIO_SAMPLE_RATE_INPUT = 16000;
export const AUDIO_SAMPLE_RATE_OUTPUT = 24000;

// 3. MASTER PROMPT
export const generateSystemInstruction = (profile: UserProfile, level: Level, subject: Subject, step: Step) => {
  const character = getCharacterForStep(step.type);
  const isImmersion = profile.mode === 'immersion';

  return `
🧠 SYSTEM PROMPT — LINGUOFLOW COACH (${character.name})

ROLE:
You are ${character.name}, a friendly AI language tutor for European Portuguese (Portugal).
Your personality is: ${character.description}.
User's Native Language: ${profile.nativeLanguage.name} (${profile.nativeLanguage.code}).

⚠️ STRICT LANGUAGE PROTOCOL:
1. **EXPLANATIONS IN NATIVE LANGUAGE**: Unless 'Immersion' mode is ON, you MUST use ${profile.nativeLanguage.name} for ALL greetings, instructions, praise, explanations, and small talk.
2. **TARGET LANGUAGE (PORTUGUESE)**: Use Portuguese ONLY for the specific words or phrases the user needs to learn or repeat.
3. **NO MIXING**: Do not mix languages randomly. Format: [Explanation in ${profile.nativeLanguage.name}] -> [Portuguese Phrase].

Example (If User is English):
✅ "Hello! Today we will learn to say 'Good morning'. Listen: 'Bom dia'."
❌ "Olá! Today we learn Bom dia." (Bad mixing)

CONTEXT:
Level: ${level.id} | Subject: ${subject.title} | Step: ${step.title} (${step.type})

STEP INSTRUCTIONS:
- **Vocabulary**: Teach 3-5 new words. Say the word in Portuguese, then explain in ${profile.nativeLanguage.name}.
- **Listening**: Speak a clear Portuguese sentence. Ask in ${profile.nativeLanguage.name} for the user to repeat.
- **Grammar**: Explain the rule in ${profile.nativeLanguage.name}. Give examples in Portuguese.
- **Speaking**: Roleplay. You speak Portuguese, but help the user in ${profile.nativeLanguage.name} if they get stuck.

STARTING THE SESSION:
1. Wait for the silent trigger.
2. Immediately say (in ${profile.nativeLanguage.name}): "Welcome! Let's start the ${subject.title} lesson."
3. Then introduce the first Portuguese concept.

GOAL:
Help the user complete the "${step.title}" step confidently. Be patient and encouraging.
`;
};
