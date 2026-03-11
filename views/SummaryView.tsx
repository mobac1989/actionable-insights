
import React, { useMemo } from 'react';
import { Download, CheckCircle2, RefreshCcw, FileJson, Table, Zap, Users, Target, ShieldAlert, Award } from 'lucide-react';
import { SessionData, ImpactRating, ParticipantResponse } from '../types';
import { IMPACT_CONFIG } from '../constants';

interface SummaryViewProps {
  session: SessionData;
  csvHash: string;
  onReset: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ session, csvHash, onReset }) => {
  
  const metrics = useMemo(() => {
    const weights = { immediate_action: 3, requires_attention: 2, nice_to_know: 1, not_relevant: 0 };
    
    // Calculate which insights were actually evaluated and which triggered action
    const evaluatedInsights = session.insights.filter(ins => {
      const insResponses = session.responses[ins.insight_id] || {};
      return Object.keys(insResponses).length > 0;
    });

    const actionableInsights = evaluatedInsights.filter(ins => {
      const insResponses = session.responses[ins.insight_id] || {};
      return Object.values(insResponses).some((r: any) => 
        r.impact === 'immediate_action' || r.impact === 'requires_attention'
      );
    });

    const insightScores = evaluatedInsights.map(ins => {
      const insResponses = session.responses[ins.insight_id] || {};
      const participants = Object.values(insResponses) as ParticipantResponse[];
      const distribution: Record<ImpactRating, number> = { not_relevant: 0, nice_to_know: 0, requires_attention: 0, immediate_action: 0 };
      let insightScore = 0;

      participants.forEach(p => {
        distribution[p.impact]++;
        insightScore += weights[p.impact];
      });

      return {
        id: ins.insight_id,
        title: ins.title,
        category: ins.category_name,
        score: insightScore,
        distribution,
        totalVotes: participants.length
      };
    });

    const topInsights = [...insightScores].sort((a, b) => b.score - a.score).slice(0, 5);

    const catStats: Record<string, { immediate: number; irrelevant: number }> = {};
    insightScores.forEach(ins => {
      if (!catStats[ins.category]) catStats[ins.category] = { immediate: 0, irrelevant: 0 };
      catStats[ins.category].immediate += ins.distribution.immediate_action;
      catStats[ins.category].irrelevant += ins.distribution.not_relevant;
    });

    const categories = Object.entries(catStats);
    const topImmediateCat = categories.length > 0 ? categories.sort((a, b) => b[1].immediate - a[1].immediate)[0][0] : "N/A";

    return {
      evaluatedCount: evaluatedInsights.length,
      actionableRate: evaluatedInsights.length > 0 ? (actionableInsights.length / evaluatedInsights.length) * 100 : 0,
      participantCount: session.participants.length,
      topInsights,
      topImmediateCat
    };
  }, [session]);

  const exportResultsCsv = () => {
    // Added insight_title and category_name to headers
    const headers = [
      'session_id', 'session_date', 'session_name', 'participant_name', 'participant_role', 
      'insight_id', 'insight_title', 'category_id', 'category_name', 'impact_rating', 
      'selected_actions', 'custom_action', 'notes'
    ];
    const rows: string[][] = [];
    session.insights.forEach(ins => {
      const insResponses = session.responses[ins.insight_id] || {};
      session.participants.forEach(p => {
        const resp = insResponses[p.id];
        if (resp) {
          rows.push([
            session.sessionId, 
            session.sessionDate, 
            session.sessionName, 
            p.name, 
            p.role, 
            ins.insight_id, 
            ins.title, 
            ins.category_id, 
            ins.category_name, 
            resp.impact, 
            resp.selectedActions.join('|'), 
            resp.customAction, 
            resp.notes.replace(/\n/g, ' ')
          ]);
        }
      });
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_results_${session.sessionId}.csv`;
    a.click();
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-24 animate-in fade-in duration-1000 pb-24 pt-16">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col items-center text-center space-y-12">
        <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-[0.4em] text-xs">
                <CheckCircle2 className="w-4 h-4" /> Session Concluded
            </div>
            <h2 className="text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">Workshop Summary</h2>
            <p className="text-xl text-slate-400 font-medium max-w-none mx-auto leading-relaxed whitespace-nowrap">
                Analysis of {metrics.evaluatedCount} evaluated insights across {metrics.participantCount} stakeholders to guide upcoming product development.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {[
                { label: 'Evaluated Insights', value: metrics.evaluatedCount, icon: <Target className="w-7 h-7 text-indigo-500" /> },
                { label: 'Active Participants', value: metrics.participantCount, icon: <Users className="w-7 h-7 text-emerald-500" /> },
                { label: 'Triggered Action', value: `${metrics.actionableRate.toFixed(0)}%`, icon: <Zap className="w-7 h-7 text-amber-500" /> },
            ].map((m, i) => (
                <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 flex flex-col items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="p-4 bg-slate-50 rounded-2xl">{m.icon}</div>
                    <p className="text-6xl font-bold text-slate-900 tracking-tighter">{m.value}</p>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{m.label}</p>
                </div>
            ))}
        </div>
      </div>

      {/* INSIGHTS LIST */}
      <div className="space-y-12">
          <div className="flex items-center justify-center gap-6 border-b border-slate-100 pb-10">
              <Award className="w-10 h-10 text-indigo-600" />
              <h3 className="text-4xl font-bold text-slate-900 tracking-tight text-center">Priority Insights</h3>
          </div>

          <div className="space-y-8">
              {metrics.topInsights.map((ins, idx) => (
                  <div key={ins.id} className="bg-white p-10 rounded-[2.5rem] border border-slate-100/40 shadow-sm hover:shadow-xl hover:translate-x-2 transition-all duration-500 flex items-center gap-12 group animate-in slide-in-from-bottom-6" style={{ animationDelay: `${idx * 150}ms` }}>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center font-bold text-xl text-indigo-600 group-hover:bg-indigo-100 transition-all shrink-0 shadow-sm">
                          {idx + 1}
                      </div>
                      <div className="flex-1 space-y-5">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-8">
                              <h4 className="text-2xl font-bold text-slate-800 leading-tight">{ins.title}</h4>
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 bg-slate-50/80 px-4 py-2 rounded-full border border-slate-100/60 self-start whitespace-nowrap">
                                  {ins.category}
                              </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                              {(['immediate_action', 'requires_attention', 'nice_to_know', 'not_relevant'] as ImpactRating[]).map(key => {
                                  const count = ins.distribution[key];
                                  if (count === 0) return null;
                                  const cfg = IMPACT_CONFIG[key];
                                  return (
                                      <div key={key} className="flex items-center gap-3">
                                          <div className={`w-2 h-2 rounded-full ${cfg.color.replace('text', 'bg')}`} />
                                          <span className="text-xs font-semibold text-slate-500">{count} {cfg.label}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* STRATEGIC PRIORITY SECTION */}
      <div className="w-full">
          <div className="bg-white p-14 rounded-[3.5rem] border border-indigo-100 flex flex-col items-center text-center space-y-8 shadow-sm w-full mx-auto">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm">
                  <Zap className="w-8 h-8 text-indigo-500" />
              </div>
              <div className="space-y-4">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-[0.4em]">Strategic Priority</p>
                <p className="text-4xl font-bold text-slate-800 leading-tight tracking-tight">
                    <span className="text-indigo-600">{metrics.topImmediateCat}</span> emerged as the strongest action-driving category in this session.
                </p>
              </div>
          </div>
      </div>

      {/* EXPORT SECTION */}
      <div className="bg-white p-16 rounded-[4rem] border border-slate-100 shadow-2xl space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h3 className="text-4xl font-bold text-slate-900 tracking-tight">Export Session Results</h3>
              <p className="text-lg text-slate-400 font-medium whitespace-nowrap">Capture the results of this session for your research documentation and product planning.</p>
          </div>
          
          <div className="flex justify-center max-w-xl mx-auto">
              <button 
                  onClick={exportResultsCsv}
                  className="w-full flex items-center justify-between p-10 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:scale-[1.02] rounded-[3rem] border border-slate-100 hover:border-indigo-100 transition-all duration-500 group"
              >
                  <div className="flex items-center gap-8">
                      <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-sm flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                        <Table className="w-7 h-7 text-slate-300 group-hover:text-indigo-600" />
                      </div>
                      <div className="text-left">
                          <p className="font-bold text-slate-800 text-2xl tracking-tight">Feedback Report</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Complete CSV Export</p>
                      </div>
                  </div>
                  <Download className="w-5 h-5 text-slate-200 group-hover:text-indigo-500" />
              </button>
          </div>

          <div className="flex justify-center pt-8">
              <button 
                  onClick={onReset}
                  className="px-14 py-6 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-[0.25em] text-sm hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all flex items-center gap-4 active:scale-95"
              >
                  <RefreshCcw className="w-5 h-5" /> Start New Session
              </button>
          </div>
      </div>
    </div>
  );
};
