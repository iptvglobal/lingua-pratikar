import React, { useEffect, useRef, useState } from 'react';
import { UserProfile, LiveConfig, ConnectionState, ChatMessage, Level, Subject, Step } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { generateSystemInstruction, MODEL_NAME, AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT, getCharacterForStep } from '../constants';
import { createAudioBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import AudioVisualizer from './AudioVisualizer';

interface LiveSessionProps {
  user: UserProfile;
  level: Level;
  subject: Subject;
  step: Step;
  apiKey: string;
  onDisconnect: () => void;
  onComplete: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ user, level, subject, step, apiKey, onDisconnect, onComplete }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.CONNECTING);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [turnCount, setTurnCount] = useState(0); // Track turns to prevent skipping
  
  const character = getCharacterForStep(step.type);

  // Audio Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Playback Refs
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);

  // Connection Ref
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Helper to clean thought logs from text
  const cleanText = (text: string) => {
      // Check for thought block pattern
      if (text.startsWith('🧠 thought')) {
          // If we find the closing tag, show what comes after
          const split = text.split('<ctrl95>');
          if (split.length > 1) {
              return split.slice(1).join('<ctrl95>').trim(); 
          }
          // If no closing tag yet, hide everything (it's internal thought)
          return '';
      }
      return text;
  };

  const triggerModel = (session: any) => {
      // Create a short burst of noise (200ms) to trigger VAD
      // Using 0.02 amplitude is low enough to be quiet but high enough for VAD
      const duration = AUDIO_SAMPLE_RATE_INPUT / 5; // 200ms
      const noise = new Float32Array(duration);
      for (let i = 0; i < noise.length; i++) {
          noise[i] = (Math.random() * 2 - 1) * 0.02;
      }
      const blob = createAudioBlob(noise, AUDIO_SAMPLE_RATE_INPUT);
      session.sendRealtimeInput({ media: blob });
      setIsThinking(true);
  };

  // Safety: Retry trigger if thinking times out
  useEffect(() => {
    if (!isThinking) return;
    const timer = setTimeout(() => {
        // If still thinking after 4s, the previous trigger might have been missed
        // or the model is just slow. Retrying the trigger helps wake it up.
        console.warn("Thinking state timed out (4s). Retrying trigger...");
        sessionPromiseRef.current?.then(session => {
            triggerModel(session);
        });
    }, 4000); 
    return () => clearTimeout(timer);
  }, [isThinking]);

  useEffect(() => {
    let cleanup = false;

    const startSession = async () => {
      try {
        setConnectionState(ConnectionState.CONNECTING);
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        inputContextRef.current = new AudioContextClass({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
        outputContextRef.current = new AudioContextClass({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });

        if (outputContextRef.current.state === 'suspended') {
            setNeedsInteraction(true);
        }

        const analyser = outputContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        outputAnalyserRef.current = analyser;

        const ai = new GoogleGenAI({ apiKey });
        
        const config: LiveConfig = {
          model: MODEL_NAME,
          systemInstruction: generateSystemInstruction(user, level, subject, step),
          voiceName: character.voiceName,
        };

        const sessionPromise = ai.live.connect({
          model: config.model,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } },
            },
            systemInstruction: config.systemInstruction,
            inputAudioTranscription: {}, 
            outputAudioTranscription: {},
          },
          callbacks: {
            onopen: async () => {
              if (cleanup) return;
              
              if (outputContextRef.current?.state === 'suspended') {
                  try { await outputContextRef.current.resume(); } catch (e) { setNeedsInteraction(true); }
              }
              if (inputContextRef.current?.state === 'suspended') {
                  try { await inputContextRef.current.resume(); } catch (e) { setNeedsInteraction(true); }
              }

              setConnectionState(ConnectionState.CONNECTED);
              console.log('Session Opened');

              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                
                if (!inputContextRef.current) return;

                const source = inputContextRef.current.createMediaStreamSource(stream);
                inputSourceRef.current = source;
                
                const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current = processor;

                processor.onaudioprocess = (e) => {
                  if (!isMicOn) return; 
                  const inputData = e.inputBuffer.getChannelData(0);
                  const blob = createAudioBlob(inputData, AUDIO_SAMPLE_RATE_INPUT);
                  
                  sessionPromiseRef.current?.then(session => {
                    session.sendRealtimeInput({ media: blob });
                  });
                };

                source.connect(processor);
                processor.connect(inputContextRef.current.destination);
                
                // Wait slightly for connection stability before triggering
                setTimeout(() => {
                    sessionPromiseRef.current?.then(session => {
                        triggerModel(session);
                    });
                }, 500);

              } catch (err) {
                console.error("Mic Error:", err);
                setConnectionState(ConnectionState.ERROR);
              }
            },
            onmessage: async (msg: LiveServerMessage) => {
              if (cleanup) return;
              
              const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData && outputContextRef.current) {
                setIsThinking(false);
                
                const ctx = outputContextRef.current;
                const buffer = await decodeAudioData(base64ToUint8Array(audioData), ctx, AUDIO_SAMPLE_RATE_OUTPUT);
                
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                
                if (outputAnalyserRef.current) {
                   source.connect(outputAnalyserRef.current);
                   outputAnalyserRef.current.connect(ctx.destination);
                } else {
                   source.connect(ctx.destination);
                }

                const currentTime = ctx.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                  nextStartTimeRef.current = currentTime;
                }
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                
                sourcesRef.current.add(source);
                source.onended = () => {
                  sourcesRef.current.delete(source);
                };
              }

              if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsThinking(false);
              }

              const inputTrans = msg.serverContent?.inputTranscription?.text;
              const outputTrans = msg.serverContent?.outputTranscription?.text;
              const turnComplete = msg.serverContent?.turnComplete;

              if (turnComplete) {
                setIsThinking(false);
                setTurnCount(prev => prev + 1); // Increment interaction count
              }

              if (inputTrans || outputTrans) {
                setMessages(prev => {
                  const newMsgs = [...prev];
                  if (inputTrans) {
                    setIsThinking(true); 
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === 'user' && lastMsg.isPartial) {
                       lastMsg.text += inputTrans;
                    } else {
                       newMsgs.push({ id: Date.now().toString(), role: 'user', text: inputTrans, isPartial: true });
                    }
                  }
                  if (outputTrans) {
                     const lastMsg = newMsgs[newMsgs.length - 1];
                     if (lastMsg && lastMsg.role === 'model' && lastMsg.isPartial) {
                        lastMsg.text += outputTrans;
                        lastMsg.text = cleanText(lastMsg.text); // Clean existing
                     } else {
                        newMsgs.push({ 
                            id: Date.now().toString(), 
                            role: 'model', 
                            text: cleanText(outputTrans), // Clean new
                            isPartial: true 
                        });
                     }
                  }
                  if (turnComplete) {
                     const lastMsg = newMsgs[newMsgs.length - 1];
                     if(lastMsg) lastMsg.isPartial = false;
                  }
                  return newMsgs;
                });
              }
            },
            onclose: () => {
              if(!cleanup) {
                setConnectionState(ConnectionState.DISCONNECTED);
                setIsThinking(false);
              }
            },
            onerror: (err) => {
              console.error(err);
              setConnectionState(ConnectionState.ERROR);
              setIsThinking(false);
            }
          }
        });

        sessionPromiseRef.current = sessionPromise;

      } catch (e) {
        console.error("Setup Error", e);
        setConnectionState(ConnectionState.ERROR);
        setIsThinking(false);
      }
    };

    startSession();

    return () => {
      cleanup = true;
      sessionPromiseRef.current?.then(s => s.close());
      streamRef.current?.getTracks().forEach(t => t.stop());
      inputContextRef.current?.close();
      outputContextRef.current?.close();
      sourcesRef.current.forEach(s => s.stop());
    };
  }, [apiKey, user, level, subject, step, character]);

  const isMicOnRef = useRef(isMicOn);
  useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);
  useEffect(() => {
    if (scriptProcessorRef.current) {
       scriptProcessorRef.current.onaudioprocess = (e) => {
          if (!isMicOnRef.current) return; 
          const inputData = e.inputBuffer.getChannelData(0);
          const blob = createAudioBlob(inputData, AUDIO_SAMPLE_RATE_INPUT);
          sessionPromiseRef.current?.then(session => {
             session.sendRealtimeInput({ media: blob });
          });
       };
    }
  }, []);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleStartInteraction = async () => {
      if (outputContextRef.current?.state === 'suspended') await outputContextRef.current.resume();
      if (inputContextRef.current?.state === 'suspended') await inputContextRef.current.resume();
      setNeedsInteraction(false);
      sessionPromiseRef.current?.then(session => triggerModel(session));
  };

  // Allow completion only after sufficient interaction (3 turns)
  const canComplete = turnCount >= 3;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {needsInteraction && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <button 
                onClick={handleStartInteraction}
                className="bg-indigo-600 text-white font-bold text-xl px-8 py-4 rounded-full shadow-2xl animate-pulse hover:scale-105 transition-transform"
              >
                  Tap to Start Session 🎙️
              </button>
          </div>
      )}

      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${character.avatarColor} flex items-center justify-center text-white font-bold border-2 border-white shadow`}>
            {character.name[0]}
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-slate-800 leading-tight">{subject.title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
               <span className="bg-indigo-100 text-indigo-700 px-2 rounded-md font-bold">{step.title}</span>
               <span>•</span>
               <span>Coach {character.name}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={onDisconnect}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
            >
                Exit
            </button>
            <button 
                onClick={canComplete ? onComplete : undefined}
                disabled={!canComplete}
                className={`px-4 py-2 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                    canComplete 
                    ? 'bg-green-500 hover:bg-green-600 shadow-green-200 cursor-pointer' 
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
            >
                {canComplete ? 'Complete Lesson' : `Pratice more (${3 - turnCount})`}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center">
        
        <div 
          ref={chatContainerRef}
          className="absolute top-0 left-0 right-0 h-[65%] overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide opacity-80"
          style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
        >
            {messages.length === 0 && (
                <div className="text-center mt-10 text-slate-400 text-sm">
                    Conversation will appear here...
                </div>
            )}
          {messages.map((msg, idx) => {
             // Skip empty messages (e.g. filtered thought logs)
             if (!msg.text) return null;
             return (
                 <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                       msg.role === 'user' 
                       ? 'bg-indigo-500 text-white rounded-tr-none' 
                       : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}>
                       {msg.text}
                    </div>
                 </div>
             );
          })}
          
          {isThinking && (
             <div className="flex w-full justify-start animate-pulse">
                <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-tl-none px-4 py-3 text-sm shadow-sm flex items-center gap-2">
                   <div className="flex gap-1">
                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                   </div>
                   <span>Thinking...</span>
                </div>
             </div>
          )}
        </div>

        <div className="w-full h-48 flex items-center justify-center z-10 mt-auto mb-20">
           <div className="w-full max-w-lg h-full p-8">
             <AudioVisualizer 
                analyser={outputAnalyserRef.current} 
                isActive={connectionState === ConnectionState.CONNECTED && !isThinking}
                barColor={character.avatarColor.includes('pink') ? '#f43f5e' : character.avatarColor.includes('blue') ? '#6366f1' : '#10b981'} 
             />
           </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40 flex flex-col gap-4">
             <div className="flex gap-2">
                 <input 
                    type="text" 
                    disabled
                    placeholder="Voice only mode (Text not supported)"
                    className="flex-1 bg-slate-100 border-none rounded-full px-4 py-3 text-sm text-slate-400 cursor-not-allowed outline-none"
                 />
                 <button 
                    disabled
                    className="bg-slate-300 text-white rounded-full w-10 h-10 flex items-center justify-center cursor-not-allowed"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                 </button>
             </div>

             <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                <button
                    onClick={async () => {
                        if (outputContextRef.current?.state === 'suspended') await outputContextRef.current.resume();
                        if (inputContextRef.current?.state === 'suspended') await inputContextRef.current.resume();
                        setIsMicOn(!isMicOn);
                    }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transform transition active:scale-95 ${
                    isMicOn 
                    ? 'bg-indigo-600 text-white border-4 border-white' 
                    : 'bg-red-500 text-white border-4 border-white'
                    }`}
                >
                    {isMicOn ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    )}
                </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default LiveSession;