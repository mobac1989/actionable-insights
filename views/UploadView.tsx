
import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, History, Sparkles, Target, Zap, ArrowRight, ChevronRight } from 'lucide-react';
import { Insight, SessionData, Participant, ImpactRating } from '../types';

interface UploadViewProps {
  onCsvLoaded: (insights: Insight[], hash: string) => void;
  onViewPastSummary: (session: SessionData) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onCsvLoaded, onViewPastSummary }) => {
  const [error, setError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const parseInsightsCsv = (content: string): Insight[] => {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) throw new Error("File is empty or too short");

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const required = ['insight_id', 'category_id', 'category_name', 'title'];
    const missing = required.filter(r => !headers.includes(r));
    
    if (missing.length > 0) {
      throw new Error(`Invalid Database Format. Missing columns: ${missing.join(', ')}`);
    }

    return lines.slice(1).map((line) => {
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = parts[i] || "";
      });
      
      return {
        ...obj,
        default_actions: (obj.default_actions || "").split('|').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      } as Insight;
    });
  };

  const handleNewSessionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const insights = parseInsightsCsv(text);
        onCsvLoaded(insights, `hash_${text.length}`);
      } catch (err: any) { setError(err.message); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-20 py-16 animate-in fade-in slide-in-from-bottom-6 duration-1000 max-w-5xl mx-auto">
      
      {/* Hero Header */}
      <div className="text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-[0.2em] border border-indigo-100 shadow-sm animate-bounce">
           <Sparkles className="w-4 h-4" /> Insight to Action
        </div>
        <div className="space-y-4">
          <h1 className="text-7xl font-black text-slate-900 tracking-tight leading-tight">
            Actionable Insights <br />
            <span className="text-indigo-600">Workshop Tool</span>
          </h1>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-3xl flex flex-col items-center space-y-8">
        
        {/* Primary CTA: Start New */}
        <div 
          onClick={() => csvInputRef.current?.click()}
          className="w-full relative group bg-white border border-slate-200 rounded-[3rem] p-16 flex flex-col items-center text-center cursor-pointer hover:border-indigo-400 hover:shadow-[0_40px_80px_-15px_rgba(79,70,229,0.15)] transition-all duration-500 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-700 opacity-40 pointer-events-none" />
          
          <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-200 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
            <Zap className="w-12 h-12 text-white fill-white" />
          </div>
          
          <div className="space-y-3 mb-10">
            <h3 className="text-4xl font-black text-slate-800 tracking-tight">Launch New Workshop</h3>
            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-sm">
              Upload your <span className="font-mono font-bold text-slate-600">insights_db.csv</span> to start a live team evaluation session.
            </p>
          </div>
          
          <div className="flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-indigo-100 group-hover:bg-indigo-700 transition-all">
            Begin Session <ArrowRight className="w-5 h-5" />
          </div>
          
          <input type="file" ref={csvInputRef} onChange={handleNewSessionUpload} accept=".csv" className="hidden" />
        </div>

      </div>

      {/* Trust/Feature Indicators */}
      <div className="flex flex-wrap justify-center gap-16 pt-8">
         {[
           { icon: <Target className="w-6 h-6" />, text: "Priority Alignment" },
           { icon: <Sparkles className="w-6 h-6" />, text: "Action Focused" },
           { icon: <FileText className="w-6 h-6" />, text: "Instant Summaries" },
         ].map((f, i) => (
           <div key={i} className="flex items-center gap-4 text-slate-300 font-bold uppercase tracking-[0.2em] text-[10px]">
             <div className="p-2 bg-slate-50 rounded-lg">{f.icon}</div>
             {f.text}
           </div>
         ))}
      </div>

      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 px-8 py-5 rounded-[2rem] animate-in shake duration-500 shadow-2xl shadow-red-100/50 z-50">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};
