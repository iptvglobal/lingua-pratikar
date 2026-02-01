import React, { useRef, useLayoutEffect, useState } from 'react';
import { CURRICULUM, getCharacterForStep } from '../constants';
import { UserProfile, Subject, Step, Level } from '../types';

interface LessonMapProps {
  user: UserProfile;
  onStepSelect: (level: Level, subject: Subject, step: Step) => void;
}

const STEP_HEIGHT = 120; // Height of each step row in pixels for SVG calculation

const LessonMap: React.FC<LessonMapProps> = ({ user, onStepSelect }) => {
  // Flatten the curriculum into a linear list of steps for rendering the continuous path
  const allSteps = React.useMemo(() => {
    const stepsList: { 
        level: Level; 
        subject: Subject; 
        step: Step; 
        globalIndex: number;
        isSubjectStart: boolean;
        isLevelStart: boolean;
    }[] = [];

    let gIndex = 0;
    CURRICULUM.forEach((level) => {
        level.subjects.forEach((subject, sIdx) => {
            subject.steps.forEach((step, stepIdx) => {
                stepsList.push({
                    level,
                    subject,
                    step,
                    globalIndex: gIndex,
                    isSubjectStart: stepIdx === 0,
                    isLevelStart: sIdx === 0 && stepIdx === 0
                });
                gIndex++;
            });
        });
    });
    return stepsList;
  }, []);

  // Helper to check completion
  const isCompleted = (subjectId: string, stepId: string) => 
     user.completedSteps.includes(`${subjectId}-${stepId}`);

  // Helper to check unlock status (Strict locking)
  const isUnlocked = (index: number) => {
      if (index === 0) return true;
      const prevStepObj = allSteps[index - 1];
      return isCompleted(prevStepObj.subject.id, prevStepObj.step.id);
  };

  // Scroll to current active step on mount
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
      // Find first unlocked but not completed step
      const activeIndex = allSteps.findIndex((item, idx) => isUnlocked(idx) && !isCompleted(item.subject.id, item.step.id));
      if (activeIndex !== -1 && scrollRef.current) {
          const yPos = activeIndex * STEP_HEIGHT;
          // Scroll with some padding from top
          scrollRef.current.scrollTo({ top: yPos - 200, behavior: 'smooth' });
      }
  }, [allSteps, user.completedSteps]);

  const getXOffset = (index: number) => Math.sin(index * 0.7) * 75; // Snake curve

  return (
    <div className="h-full bg-[#111111] text-white flex flex-col font-sans relative overflow-hidden">
      
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-[#111111]/90 backdrop-blur-sm border-b border-[#222] px-4 py-3 flex justify-between items-center">
         <div className="flex items-center gap-3">
            <span className="text-2xl border border-[#333] rounded-md px-1 bg-[#222]">{user.nativeLanguage.flag}</span>
         </div>
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
                <span className="text-orange-500 text-xl">🔥</span>
                <span className="font-bold text-orange-500">1</span>
             </div>
             <div className="flex items-center gap-1.5">
                <span className="text-blue-400 text-xl">💎</span>
                <span className="font-bold text-blue-400">450</span>
             </div>
         </div>
      </div>

      {/* Scrollable Path */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32 pt-20 relative scrollbar-hide">
         
         {/* SVG Path Background */}
         <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ height: allSteps.length * STEP_HEIGHT + 200 }}>
             <path 
                d={allSteps.map((_, i) => {
                    if (i === 0) return `M ${window.innerWidth / 2 + getXOffset(0)} ${i * STEP_HEIGHT + 80}`;
                    const x = window.innerWidth / 2 + getXOffset(i);
                    const y = i * STEP_HEIGHT + 80; // +80 for initial padding
                    // Bezier curve to next point
                    const prevX = window.innerWidth / 2 + getXOffset(i - 1);
                    const prevY = (i - 1) * STEP_HEIGHT + 80;
                    const cY = (prevY + y) / 2;
                    return `C ${prevX} ${cY}, ${x} ${cY}, ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#374151"
                strokeWidth="8"
                strokeDasharray="16 16"
                strokeLinecap="round"
             />
         </svg>

         {allSteps.map((item, index) => {
             const unlocked = isUnlocked(index);
             const completed = isCompleted(item.subject.id, item.step.id);
             const xOffset = getXOffset(index);
             
             // Colors matching screenshot vibe
             let bgClass = "bg-[#2b2b2b] border-[#444]"; // Locked
             let iconClass = "text-[#555] opacity-50";
             let shadowClass = "shadow-none";

             if (completed) {
                 bgClass = "bg-[#FFC800] border-[#E5B400]"; // Gold
                 iconClass = "text-[#8A6D00]";
                 shadowClass = "shadow-[0_4px_0_0_#B38D00]";
             } else if (unlocked) {
                 // Active colors based on type
                 if (item.step.type === 'vocabulary') {
                     bgClass = "bg-[#a855f7] border-[#9333ea]"; // Purple
                     shadowClass = "shadow-[0_4px_0_0_#7e22ce]";
                 } else if (item.step.type === 'grammar') {
                     bgClass = "bg-[#3b82f6] border-[#2563eb]"; // Blue
                     shadowClass = "shadow-[0_4px_0_0_#1d4ed8]";
                 } else if (item.step.type === 'speaking') {
                     bgClass = "bg-[#f97316] border-[#ea580c]"; // Orange
                     shadowClass = "shadow-[0_4px_0_0_#c2410c]";
                 } else {
                     bgClass = "bg-[#22c55e] border-[#16a34a]"; // Green
                     shadowClass = "shadow-[0_4px_0_0_#15803d]";
                 }
                 iconClass = "text-white";
             }

             return (
                 <React.Fragment key={`${item.subject.id}-${item.step.id}`}>
                     {/* Level/Subject Headers */}
                     {item.isLevelStart && (
                         <div className="w-full flex justify-center mb-8 mt-4 z-10 relative">
                             <div className="bg-[#111] border border-[#333] px-6 py-2 rounded-xl text-lg font-bold text-white shadow-lg">
                                 {item.level.title}
                             </div>
                         </div>
                     )}
                     
                     {item.isSubjectStart && !item.isLevelStart && (
                         <div className="w-full flex justify-center mb-4 mt-2 z-10 relative">
                             <div className="bg-[#111] border border-[#333] px-4 py-1 rounded-lg text-sm font-bold text-gray-400 shadow">
                                 {item.subject.title}
                             </div>
                         </div>
                     )}

                     {/* The Step Node */}
                     <div 
                        className="relative z-10 flex justify-center items-center"
                        style={{ height: STEP_HEIGHT, transform: `translateX(${xOffset}px)` }}
                     >
                        {/* Floating Label for Active Lesson */}
                        {unlocked && !completed && (
                            <div className="absolute -top-12 animate-bounce z-20">
                                <div className="bg-white text-black font-bold text-sm px-3 py-2 rounded-xl shadow-lg relative border-2 border-gray-200">
                                    {item.step.type.toUpperCase()}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-3 bg-white border-b-2 border-r-2 border-gray-200 rotate-45"></div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => unlocked ? onStepSelect(item.level, item.subject, item.step) : null}
                            disabled={!unlocked}
                            className={`w-20 h-20 rounded-full border-b-[6px] flex items-center justify-center transition-all active:border-b-0 active:translate-y-1.5 ${bgClass} ${shadowClass} ${!unlocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {!unlocked ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-gray-500">
                                    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                                </svg>
                            ) : completed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-10 h-10 ${iconClass}`}>
                                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-9a.75.75 0 011.06-1.06l5.353 8.03 8.493-12.734a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <span className={`text-3xl ${iconClass}`}>
                                    {item.step.type === 'vocabulary' && '⚡'}
                                    {item.step.type === 'grammar' && '📖'}
                                    {item.step.type === 'listening' && '👂'}
                                    {item.step.type === 'speaking' && '🗣️'}
                                    {item.step.type === 'reading' && '👓'}
                                    {item.step.type === 'challenge' && '🏆'}
                                </span>
                            )}
                        </button>
                     </div>
                 </React.Fragment>
             );
         })}

         <div className="text-center text-gray-600 mt-8 mb-20 font-bold tracking-widest uppercase text-xs">
             More coming soon
         </div>
      </div>

      {/* Bottom Nav Bar */}
      <div className="absolute bottom-0 w-full bg-[#111] border-t border-[#222] h-20 flex justify-around items-center z-50 px-2 pb-2">
         <button className="flex flex-col items-center gap-1 p-2 w-20">
             <div className="w-10 h-8 rounded-full border-2 border-blue-500 bg-blue-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-500">
                    <path d="M11.25 4.533A9.707 9.707 0 006 3.066a9.75 9.75 0 000 13.392.75.75 0 00.53.914 9.716 9.716 0 004.72 1.378v-8.217zM12.75 18.75v-8.217a9.716 9.716 0 004.72-1.378.75.75 0 00.53-.914 9.75 9.75 0 000-13.392 9.707 9.707 0 00-5.25 1.467z" />
                </svg>
             </div>
             <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">Lessons</span>
         </button>
         
         <button className="flex flex-col items-center gap-1 p-2 w-20 opacity-50 hover:opacity-100 transition-opacity">
             <div className="w-10 h-8 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-gray-400">
                    <path fillRule="evenodd" d="M15.5 5.5a2.5 2.5 0 10-5 0V8.2a2.5 2.5 0 105 0V5.5zM7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                 </svg>
             </div>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Profile</span>
         </button>

         <button className="flex flex-col items-center gap-1 p-2 w-20 opacity-50 hover:opacity-100 transition-opacity">
            <div className="w-10 h-8 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-gray-400">
                    <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                </svg>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">More</span>
         </button>
      </div>
    </div>
  );
};

export default LessonMap;