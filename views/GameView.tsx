
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Save, Maximize2, CheckCircle2, PencilLine, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SessionData, Insight, Participant, ImpactRating, InsightResponses, ParticipantResponse } from '../types';
import { IMPACT_CONFIG } from '../constants';

const TypewriterText: React.FC<{ text: string; onComplete?: () => void; className?: string }> = ({ text, onComplete, className }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, onComplete]);

  return (
    <span className={`relative inline-block ${className}`}>
      <span className="invisible" aria-hidden="true">{text}</span>
      <span className="absolute top-0 left-0 w-full h-full">{displayedText}</span>
    </span>
  );
};

interface GameViewProps {
  session: SessionData;
  onEnd: (responses: Record<string, InsightResponses>) => void;
  onExit: () => void;
}

export const GameView: React.FC<GameViewProps> = ({ session, onEnd, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, InsightResponses>>(session.responses || {});
  const [completedGroupEvaluations, setCompletedGroupEvaluations] = useState<Set<string>>(new Set());
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [isSticky, setIsSticky] = useState(false);
  
  const mainTitleRef = useRef<HTMLHeadingElement>(null);
  
  const [evaluationState, setEvaluationState] = useState<{
    show: boolean;
  }>({ show: false });

  const [fullscreenImage, setFullscreenImage] = useState<boolean>(false);
  const [titleComplete, setTitleComplete] = useState(false);

  const handleTypewriterComplete = useCallback(() => {
    setTitleComplete(true);
  }, []);

  const insight = session.insights[currentIndex];
  const currentInsightResponses = useMemo(() => responses[insight?.insight_id] || {}, [responses, insight]);

  useEffect(() => {
    setTitleComplete(false);
  }, [currentIndex]);

  const allParticipantsVoted = useMemo(() => {
    return session.participants.every(p => !!currentInsightResponses[p.id]);
  }, [session.participants, currentInsightResponses]);

  const hasActionableImpact = useMemo(() => {
    return (Object.values(currentInsightResponses) as ParticipantResponse[]).some(r => 
      r.impact === 'requires_attention' || r.impact === 'immediate_action'
    );
  }, [currentInsightResponses]);

  useEffect(() => {
    if (allParticipantsVoted && hasActionableImpact && !evaluationState.show && !completedGroupEvaluations.has(insight.insight_id)) {
      setEvaluationState({ show: true });
    }
  }, [allParticipantsVoted, hasActionableImpact, currentIndex, completedGroupEvaluations, insight.insight_id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(entry.boundingClientRect.top < 0 && !entry.isIntersecting);
      },
      { 
        threshold: 0,
        rootMargin: '-80px 0px 0px 0px'
      }
    );

    if (mainTitleRef.current) {
      observer.observe(mainTitleRef.current);
    }

    return () => observer.disconnect();
  }, [currentIndex, evaluationState.show]);

  useEffect(() => {
    setImageLoadError(false);
    setIsSticky(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  const progress = ((currentIndex + 1) / session.insights.length) * 100;

  const handleImpactSelect = useCallback((participantId: string, impact: ImpactRating) => {
    setResponses(prev => ({
      ...prev,
      [insight.insight_id]: {
        ...(prev[insight.insight_id] || {}),
        [participantId]: {
          impact,
          selectedActions: [],
          customAction: "",
          notes: ""
        }
      }
    }));
    setSelectedParticipantId(null);
  }, [insight.insight_id]);

  const handleEvaluationSave = (actions: string[], custom: string) => {
    setResponses(prev => {
      const currentInsightResponses = { ...(prev[insight.insight_id] || {}) };
      
      // Find the first participant who voted for an actionable impact
      const firstActionableParticipantId = Object.keys(currentInsightResponses).find(pId => {
        const resp = currentInsightResponses[pId];
        return resp.impact === 'requires_attention' || resp.impact === 'immediate_action';
      });

      if (firstActionableParticipantId) {
        // Clear actions for all first to be safe
        Object.keys(currentInsightResponses).forEach(pId => {
          const resp = currentInsightResponses[pId];
          if (resp.impact === 'requires_attention' || resp.impact === 'immediate_action') {
            currentInsightResponses[pId] = {
              ...resp,
              selectedActions: [],
              customAction: ""
            };
          }
        });

        // Assign to the "sampled" one
        const resp = currentInsightResponses[firstActionableParticipantId];
        currentInsightResponses[firstActionableParticipantId] = {
          ...resp,
          selectedActions: actions,
          customAction: custom
        };
      }

      return {
        ...prev,
        [insight.insight_id]: currentInsightResponses
      };
    });

    setEvaluationState({ show: false });
    setCompletedGroupEvaluations(prev => new Set(prev).add(insight.insight_id));
  };

  const nextInsight = () => {
    if (currentIndex < session.insights.length - 1) {
      setTitleComplete(false);
      setCurrentIndex(currentIndex + 1);
      setSelectedParticipantId(null);
      setEvaluationState({ show: false });
    } else {
      onEnd(responses);
    }
  };

  const prevInsight = () => {
    if (currentIndex > 0) {
      setTitleComplete(false);
      setCurrentIndex(currentIndex - 1);
      setSelectedParticipantId(null);
      setEvaluationState({ show: false });
    }
  };

  const hasValidImage = useMemo(() => {
    return insight.image && insight.image.trim().length > 0 && !imageLoadError;
  }, [insight.image, imageLoadError]);

  return (
    <div className="min-h-screen flex flex-col gap-8 pb-24 text-left">
      <div className="sticky top-0 z-50 pb-1 bg-slate-50/80 backdrop-blur-md transition-all duration-300">
        <div className="bg-white p-3 md:p-4 rounded-2xl shadow-lg border border-slate-100 flex flex-col gap-2 max-w-[1300px] mx-auto w-full">
          <div className="flex justify-between items-center px-4">
            <div className="flex-1 flex justify-start">
              <button 
                onClick={prevInsight}
                disabled={currentIndex === 0}
                className={`flex items-center gap-2 font-black px-4 py-2 rounded-xl transition-all text-xs uppercase tracking-widest ${
                  currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <ChevronLeft className="w-6 h-6" /> BACK
              </button>
            </div>

            <div className="flex-[2] flex flex-col items-center justify-center relative overflow-hidden h-10">
               <div className={`absolute transition-all duration-500 transform text-center w-full px-8 ${isSticky ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90 pointer-events-none'}`}>
                  <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block mb-0">{insight.category_name}</span>
                  <h3 className="text-lg font-black text-slate-800 line-clamp-1">{insight.title}</h3>
               </div>
               
               <div className={`transition-all duration-500 flex items-center ${isSticky ? 'opacity-0 -translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                  <div className="bg-slate-50 px-4 py-1 rounded-full border border-slate-200 flex items-center shadow-inner">
                    <span className="text-indigo-600 font-black text-lg">{currentIndex + 1}</span>
                    <span className="text-slate-300 font-bold mx-2 text-sm">/</span>
                    <span className="text-slate-600 font-bold text-lg">{session.insights.length}</span>
                  </div>
               </div>
            </div>

            <div className="flex-1 flex justify-end">
              <button 
                onClick={nextInsight}
                disabled={evaluationState.show}
                className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-black text-sm shadow-lg shadow-indigo-100 transition-all active:scale-95 ${evaluationState.show ? 'opacity-20 pointer-events-none' : ''}`}
              >
                {currentIndex === session.insights.length - 1 ? 'FINISH' : 'NEXT'} <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-700 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto w-full flex flex-col gap-8 px-2">
        <div className={`grid ${hasValidImage ? 'lg:grid-cols-[2fr_1.2fr]' : 'grid-cols-1'} gap-8 items-center bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden transition-all duration-500`}>
          <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-indigo-50 rounded-full blur-[120px] opacity-40 -mr-[15rem] -mt-[15rem] pointer-events-none"></div>

          <div className="space-y-6 relative z-10 py-2 text-left">
            <div className="flex">
              <span className="bg-indigo-50 text-indigo-600 px-6 py-2 rounded-xl border border-indigo-100 text-sm font-black uppercase tracking-[0.25em] shadow-sm">
                {insight.category_name}
              </span>
            </div>
            
            <h2 
              ref={mainTitleRef}
              className={`${hasValidImage ? 'text-5xl' : 'text-6xl'} font-black text-slate-900 leading-[1.1] tracking-tight transition-opacity duration-300 ${isSticky ? 'opacity-20' : 'opacity-100'}`}
            >
              <TypewriterText 
                key={insight.insight_id}
                text={insight.title} 
                onComplete={handleTypewriterComplete} 
              />
            </h2>
            
            <motion.p 
              key={insight.insight_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: titleComplete ? 1 : 0, 
                y: titleComplete ? 0 : 10 
              }}
              transition={{ 
                duration: 0.8, 
                ease: "easeOut", 
                delay: titleComplete ? 0.2 : 0 
              }}
              className={`${hasValidImage ? 'text-2xl' : 'text-3xl'} text-slate-500 font-medium leading-relaxed max-w-5xl ${!titleComplete ? 'pointer-events-none' : ''}`}
            >
              {insight.description}
            </motion.p>
          </div>

          {hasValidImage && (
            <div className="flex items-center justify-center w-full">
              <div 
                onClick={() => setFullscreenImage(true)}
                className="relative group rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white bg-white cursor-zoom-in transition-all duration-500"
              >
                <img 
                  src={insight.image} 
                  alt={insight.title} 
                  className="block w-full h-auto max-h-[550px] object-contain opacity-95" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center transition-colors">
                    <Maximize2 className="text-white w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-12 min-h-[450px]">
          {!evaluationState.show ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                {(Object.entries(IMPACT_CONFIG) as [ImpactRating, any][]).map(([key, cfg]) => {
                  const isEnabled = selectedParticipantId !== null;
                  return (
                    <button 
                      key={key}
                      onClick={() => selectedParticipantId && handleImpactSelect(selectedParticipantId, key)}
                      disabled={!isEnabled}
                      className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all group relative overflow-hidden h-36 shadow-sm hover:shadow-xl ${
                        isEnabled 
                        ? `${cfg.bgColor} ${cfg.color.replace('text', 'border')} hover:scale-[1.02] cursor-pointer` 
                        : 'border-slate-100 bg-white opacity-40 grayscale'
                      }`}
                    >
                      <div className={`mb-4 transition-transform duration-500 group-hover:scale-110 ${cfg.color}`}>
                        {React.cloneElement(cfg.icon as React.ReactElement, { className: 'w-12 h-12' })}
                      </div>
                      <p className={`text-xl font-black uppercase tracking-widest text-center leading-tight ${cfg.color}`}>{cfg.label}</p>
                    </button>
                  );
                })}
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 mt-8">
                <div className="flex items-center justify-center gap-4 mb-8 px-2">
                  <div className="h-px bg-slate-200 flex-1 max-w-[150px]"></div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">SELECT PARTICIPANT</h4>
                  <div className="h-px bg-slate-200 flex-1 max-w-[150px]"></div>
                </div>
                
                <div className="flex flex-wrap gap-6 justify-center">
                  {session.participants.map(p => {
                    const isSelected = selectedParticipantId === p.id;
                    const hasResponded = !!currentInsightResponses[p.id];
                    const firstName = p.name.trim().split(' ')[0];
                    
                    return (
                      <button 
                        key={p.id}
                        onClick={() => setSelectedParticipantId(isSelected ? null : p.id)}
                        className={`group relative flex flex-col items-center px-10 py-6 rounded-2xl border-4 transition-all hover:-translate-y-2 active:scale-95 min-w-[240px] ${
                          isSelected 
                          ? "bg-white border-indigo-600 shadow-2xl ring-8 ring-indigo-50 z-10" 
                          : hasResponded 
                            ? "bg-slate-50 border-slate-200" 
                            : "bg-white border-slate-100 hover:border-slate-300 shadow-md"
                        }`}
                      >
                        {hasResponded && (
                          <div className="absolute -top-3 -right-3 bg-emerald-500 text-white rounded-full p-1.5 shadow-xl border-4 border-white">
                            <Check className="w-5 h-5 stroke-[5]" />
                          </div>
                        )}
                        <p className={`font-black text-3xl mb-1 ${isSelected ? 'text-indigo-600' : 'text-slate-800'}`}>{firstName}</p>
                        <p className={`text-xs uppercase font-black tracking-widest ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>{p.role}</p>
                      </button>
                    );
                  })}
                </div>

                {allParticipantsVoted && hasActionableImpact && (
                  <div className="flex justify-center mt-8">
                    <button 
                      onClick={() => setEvaluationState({ show: true })}
                      className="flex items-center gap-2 px-8 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-100 transition-all shadow-sm"
                    >
                      <PencilLine className="w-5 h-5" /> Edit Group Actions
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-500">
              <BigEvaluationPanel 
                insight={insight}
                initialResponse={(Object.values(currentInsightResponses) as ParticipantResponse[]).find(r => r.impact === 'requires_attention' || r.impact === 'immediate_action')}
                onSave={handleEvaluationSave}
                onCancel={() => setEvaluationState({ show: false })}
              />
            </div>
          )}
        </div>
      </div>

      {fullscreenImage && hasValidImage && (
          <div onClick={() => setFullscreenImage(false)} className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-10 cursor-zoom-out animate-in fade-in duration-300">
            <X className="absolute top-10 right-10 text-white w-16 h-16 cursor-pointer" />
            <img src={insight.image} alt={insight.title} className="max-w-[90vw] max-h-[90vh] object-contain rounded-3xl shadow-2xl border-4 border-white/20" />
          </div>
      )}
    </div>
  );
};

const BigEvaluationPanel: React.FC<{
  insight: Insight;
  initialResponse?: ParticipantResponse;
  onSave: (actions: string[], custom: string) => void;
  onCancel: () => void;
}> = ({ insight, initialResponse, onSave, onCancel }) => {
  const [selected, setSelected] = useState<string[]>(initialResponse?.selectedActions || []);
  const [custom, setCustom] = useState(initialResponse?.customAction || '');

  const toggleAction = (action: string) => setSelected(prev => prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full shadow-2xl border border-slate-100 space-y-8 text-left">
      <div className="flex justify-between items-center pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600`}>
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <span className={`text-lg font-black uppercase tracking-widest text-indigo-600`}>Group Action Decision</span>
        </div>
        <div className="flex gap-4">
          <button onClick={onCancel} className="px-8 py-4 rounded-xl font-black text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest text-sm">Discard</button>
          <button onClick={() => onSave(selected, custom)} className="flex items-center gap-3 px-10 py-4 rounded-xl font-black text-xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"><Save className="w-6 h-6" /> SAVE & CLOSE</button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-6">
          <h3 className="text-3xl font-black text-slate-800">How would you act on this insight?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insight.default_actions.map(action => (
              <button 
                key={action}
                onClick={() => toggleAction(action)}
                className={`text-left p-6 rounded-2xl border-2 font-bold transition-all flex items-center justify-between text-xl min-h-[5rem] ${
                  selected.includes(action) ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-slate-50/30 text-slate-500 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <span>{action}</span>
                {selected.includes(action) && <CheckCircle2 className="w-8 h-8 text-indigo-600" />}
              </button>
            ))}
            <div className={`relative rounded-2xl border-2 transition-all flex items-center overflow-hidden min-h-[5rem] ${custom.trim().length > 0 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-slate-50/30'}`}>
              <PencilLine className="absolute left-6 w-6 h-6 text-slate-300" />
              <input 
                type="text" 
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Type a unique action item..."
                className="w-full h-full bg-transparent pl-16 pr-8 font-bold text-xl outline-none placeholder:text-slate-300 text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
