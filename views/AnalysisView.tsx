
import React, { useMemo, useState, useRef } from 'react';
import { 
  ArrowLeft, Plus, RefreshCcw, Database, Users, LineChart, 
  Search, Filter, Info, X, ChevronRight, FileSpreadsheet, 
  MessageSquare, Trash2, Zap, AlertTriangle, Target 
} from 'lucide-react';
import { DataObservation, ImpactRating } from '../types';
import { IMPACT_CONFIG } from '../constants';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, 
  ResponsiveContainer, Cell, BarChart, Bar, Legend 
} from 'recharts';

interface AnalysisViewProps {
  observations: DataObservation[];
  onAddObservations: (obs: DataObservation[]) => void;
  onResetDataset: () => void;
  onBack: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ observations, onAddObservations, onResetDataset, onBack }) => {
  const [selectedRole, setSelectedRole] = useState<string>('All Roles');
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const addFileRef = useRef<HTMLInputElement>(null);

  // Robust CSV Parser helper
  const parseCsvLine = (line: string, headers: string[]) => {
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
    const obj: any = {};
    headers.forEach((header, i) => { obj[header] = parts[i] || ""; });
    
    // Heuristic: Prefer insight_title, then title, then fallback to ID
    const insightTitle = obj.insight_title || obj.title || obj.insight_id || "Untitled Insight";
    const categoryName = obj.category_name || obj.category_id || "Uncategorized";

    return {
      sessionId: obj.session_id,
      sessionDate: obj.session_date,
      sessionName: obj.session_name,
      participantName: obj.participant_name,
      participantRole: obj.participant_role,
      insightId: obj.insight_id,
      categoryId: obj.category_id,
      categoryName: categoryName,
      insightTitle: insightTitle,
      impactRating: obj.impact_rating as any,
      selectedActions: (obj.selected_actions || "").split(/[|;]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0),
      customAction: obj.custom_action,
      notes: obj.notes
    } as DataObservation;
  };

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const newObs = lines.slice(1).map(line => parseCsvLine(line, headers));
        onAddObservations(newObs);
      } catch (err: any) { alert("Invalid CSV format"); }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const roles = useMemo(() => {
    const r = new Set<string>(observations.map(o => o.participantRole));
    return ['All Roles', ...Array.from(r).sort()];
  }, [observations]);

  const processedData = useMemo(() => {
    const filtered = selectedRole === 'All Roles' ? observations : observations.filter(o => o.participantRole === selectedRole);
    
    const insightMap: Record<string, { 
      id: string, title: string, category: string,
      votes: Record<ImpactRating, number>, total: number,
      notes: string[], actions: string[],
      sessions: Set<string>
    }> = {};

    const categoryMap: Record<string, { name: string, scoreSum: number, count: number }> = {};
    const roleStats: Record<string, Record<ImpactRating, number>> = {};
    const sessionSet = new Set<string>();
    const participantSet = new Set<string>();

    filtered.forEach(o => {
      sessionSet.add(o.sessionId);
      participantSet.add(`${o.sessionId}_${o.participantName}`);

      if (!insightMap[o.insightId]) {
        insightMap[o.insightId] = { 
          id: o.insightId, title: o.insightTitle, category: o.categoryName,
          votes: { immediate_action: 0, requires_attention: 0, nice_to_know: 0, not_relevant: 0 },
          total: 0, notes: [], actions: [], sessions: new Set()
        };
      } else {
        // UPDATE TITLE HEURISTIC: If existing title is just an ID (e.g. ins_004) and new one is longer, use the longer one
        const currentTitle = insightMap[o.insightId].title;
        if (o.insightTitle.length > currentTitle.length) {
            insightMap[o.insightId].title = o.insightTitle;
        }
      }

      const ins = insightMap[o.insightId];
      ins.votes[o.impactRating]++;
      ins.total++;
      ins.sessions.add(o.sessionId);
      if (o.notes) ins.notes.push(o.notes);
      if (o.customAction) ins.actions.push(o.customAction);
      o.selectedActions.forEach(a => ins.actions.push(a));

      if (!categoryMap[o.categoryName]) categoryMap[o.categoryName] = { name: o.categoryName, scoreSum: 0, count: 0 };
      const weights = { immediate_action: 3, requires_attention: 2, nice_to_know: 1, not_relevant: 0 };
      categoryMap[o.categoryName].scoreSum += weights[o.impactRating];
      categoryMap[o.categoryName].count++;

      if (!roleStats[o.participantRole]) roleStats[o.participantRole] = { immediate_action: 0, requires_attention: 0, nice_to_know: 0, not_relevant: 0 };
      roleStats[o.participantRole][o.impactRating]++;
    });

    const insights = Object.values(insightMap).map(ins => {
      const actionRate = (ins.votes.immediate_action + ins.votes.requires_attention) / ins.total;
      const consensus = Math.max(...Object.values(ins.votes)) / ins.total;
      const avgScore = (ins.votes.immediate_action * 3 + ins.votes.requires_attention * 2 + ins.votes.nice_to_know * 1) / ins.total;
      
      let status: 'Strong Validation' | 'Mixed' | 'Low Priority' = 'Low Priority';
      if (actionRate >= 0.6 && consensus >= 0.5) status = 'Strong Validation';
      else if (actionRate >= 0.5) status = 'Mixed';

      return { ...ins, actionRate, consensus, avgScore, status };
    });

    return {
      sessionsLoaded: sessionSet.size,
      totalParticipants: participantSet.size,
      totalEvaluations: filtered.length,
      insights,
      categories: Object.values(categoryMap).map(c => ({ name: c.name, avgScore: c.scoreSum / c.count, count: c.count })).sort((a, b) => b.avgScore - a.avgScore),
      rolesList: Object.entries(roleStats).map(([name, votes]) => ({ name, ...votes, total: votes.immediate_action + votes.requires_attention + votes.nice_to_know + votes.not_relevant })),
      overallActionRate: filtered.length > 0 ? filtered.filter(o => o.impactRating === 'immediate_action' || o.impactRating === 'requires_attention').length / filtered.length : 0
    };
  }, [observations, selectedRole]);

  const selectedInsight = useMemo(() => 
    processedData.insights.find(i => i.id === selectedInsightId), 
    [processedData.insights, selectedInsightId]
  );

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-100 pb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Research Dataset Dashboard</h2>
          </div>
          <p className="text-slate-400 font-medium">Cumulative analysis of stakeholder feedback.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="bg-transparent font-bold text-sm text-slate-700 outline-none cursor-pointer">
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={() => addFileRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
            <Plus className="w-4 h-4" /> Add Session
            <input type="file" ref={addFileRef} onChange={handleAddFile} accept=".csv" className="hidden" />
          </button>
          <button onClick={onResetDataset} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Sessions Loaded', value: processedData.sessionsLoaded, icon: <Database className="text-indigo-500" /> },
          { label: 'Total Participants', value: processedData.totalParticipants, icon: <Users className="text-emerald-500" /> },
          { label: 'Total Evaluations', value: processedData.totalEvaluations, icon: <FileSpreadsheet className="text-blue-500" /> },
          { label: 'Action Rate', value: `${(processedData.overallActionRate * 100).toFixed(0)}%`, icon: <Zap className="text-amber-500" /> },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-50 rounded-[1.25rem] flex items-center justify-center shrink-0">
              {React.cloneElement(card.icon as React.ReactElement, { className: 'w-8 h-8' })}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MAP */}
      <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
        <h3 className="text-2xl font-black text-slate-900">Insight Validation Map</h3>
        <div className="h-[450px] w-full bg-slate-50/50 rounded-3xl p-6">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="actionRate" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} label={{ value: 'Action Rate', position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 800 }} />
              <YAxis type="number" dataKey="consensus" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} label={{ value: 'Consensus', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 800 }} />
              <ZAxis type="number" dataKey="total" range={[150, 800]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                if (active && payload?.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white p-4 shadow-2xl rounded-2xl border border-slate-100 min-w-[240px]">
                      <p className="font-black text-slate-800 text-sm mb-2">{d.title}</p>
                      <p className="text-[10px] font-bold text-indigo-600 mb-1">{d.category}</p>
                      <p className="text-[10px] font-black text-slate-400">ACTION RATE: {(d.actionRate * 100).toFixed(0)}%</p>
                      <p className="text-[10px] font-black text-slate-400">CONSENSUS: {(d.consensus * 100).toFixed(0)}%</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Scatter 
                data={processedData.insights} 
                onClick={(point) => {
                  // FIX: Recharts passes the data object or it's nested in payload
                  const id = point?.id || point?.payload?.id;
                  if (id) setSelectedInsightId(id);
                }}
              >
                {processedData.insights.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.status === 'Strong Validation' ? '#10b981' : entry.status === 'Mixed' ? '#6366f1' : '#cbd5e1'} className="cursor-pointer hover:opacity-80" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
          <h3 className="text-2xl font-black text-slate-900">Strongest Opportunities</h3>
          <div className="space-y-4">
            {[...processedData.insights].sort((a, b) => b.avgScore - a.avgScore).slice(0, 10).map((ins, i) => (
              <div key={ins.id} onClick={() => setSelectedInsightId(ins.id)} className="group p-6 rounded-[2rem] bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-xl transition-all cursor-pointer flex items-center gap-6">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center font-black text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50">{i + 1}</div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-2">{ins.title}</p>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
                    {(['immediate_action', 'requires_attention', 'nice_to_know', 'not_relevant'] as ImpactRating[]).map(key => (
                       <div key={key} style={{ width: `${(ins.votes[key] / ins.total) * 100}%` }} className={IMPACT_CONFIG[key].color.replace('text', 'bg')} />
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                   <p className="text-lg font-black text-slate-800">{ins.avgScore.toFixed(1)}</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-12">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm h-fit">
            <h3 className="text-2xl font-black text-slate-900 mb-8">Category Strength</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.categories} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" domain={[0, 3]} hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm h-fit">
            <h3 className="text-2xl font-black text-slate-900 mb-8">Role Impact</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.rolesList} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip />
                  <Bar dataKey="immediate_action" stackId="a" fill="#ef4444" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="requires_attention" stackId="a" fill="#f97316" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="nice_to_know" stackId="a" fill="#3b82f6" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="not_relevant" stackId="a" fill="#94a3b8" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {selectedInsight && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setSelectedInsightId(null)}></div>
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[4rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 slide-in-from-bottom-8">
            <div className="p-12 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
               <div className="space-y-4">
                 <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">{selectedInsight.category}</span>
                 <h2 className="text-3xl font-extrabold text-slate-900 leading-tight pr-12">{selectedInsight.title}</h2>
               </div>
               <button onClick={() => setSelectedInsightId(null)} className="p-4 hover:bg-white hover:shadow-xl rounded-full text-slate-300 hover:text-slate-600 transition-all">
                 <X className="w-8 h-8" />
               </button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-12">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Action Rate', value: `${(selectedInsight.actionRate * 100).toFixed(0)}%`, icon: <Zap /> },
                    { label: 'Consensus', value: `${(selectedInsight.consensus * 100).toFixed(0)}%`, icon: <Target /> },
                    { label: 'Total Votes', value: selectedInsight.total, icon: <Users /> },
                    { label: 'Sessions', value: selectedInsight.sessions.size, icon: <Database /> },
                  ].map((s, idx) => (
                    <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                       <p className="text-2xl font-black text-slate-800">{s.value}</p>
                    </div>
                  ))}
               </div>
               <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                     <h4 className="text-xl font-black text-slate-800">Distribution</h4>
                     <div className="space-y-4">
                        {(['immediate_action', 'requires_attention', 'nice_to_know', 'not_relevant'] as ImpactRating[]).map(key => {
                           const pct = (selectedInsight.votes[key] / selectedInsight.total) * 100;
                           return (
                             <div key={key} className="space-y-1.5">
                               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                  <span className={IMPACT_CONFIG[key].color}>{IMPACT_CONFIG[key].label}</span>
                                  <span className="text-slate-400">{pct.toFixed(0)}%</span>
                               </div>
                               <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                  <div className={`h-full ${IMPACT_CONFIG[key].color.replace('text', 'bg')} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                               </div>
                             </div>
                           );
                        })}
                     </div>
                  </div>
                  <div className="space-y-6">
                     <h4 className="text-xl font-black text-slate-800">Top Proposed Actions</h4>
                     <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(selectedInsight.actions)).slice(0, 12).map((act, i) => (
                           <span key={i} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600">{act}</span>
                        ))}
                     </div>
                  </div>
               </div>
               {selectedInsight.notes.length > 0 && (
                 <div className="space-y-6 pt-6 border-t border-slate-100">
                    <h4 className="text-xl font-black text-slate-800">Stakeholder Notes</h4>
                    <div className="grid gap-4">
                       {selectedInsight.notes.slice(0, 8).map((note, i) => (
                         <div key={i} className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-3xl text-slate-700 font-medium italic text-sm">"{note}"</div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
