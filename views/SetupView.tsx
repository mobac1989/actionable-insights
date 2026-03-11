
import React, { useState } from 'react';
import { Users, Plus, Trash2, ArrowRight, ChevronDown, Check } from 'lucide-react';
import { Participant } from '../types';
import { ROLES } from '../constants';

interface SetupViewProps {
  onStart: (sessionName: string, participants: Participant[]) => void;
}

const RoleDropdown: React.FC<{ 
  value: string; 
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // A role is "custom" if it's not in the predefined list (excluding "Other")
  const isCustom = !ROLES.filter(r => r !== 'Other').includes(value);
  const displayValue = isCustom ? 'Other' : value;

  return (
    <div className="relative w-48 shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border-2 border-slate-100 rounded-xl px-4 py-3 font-semibold text-slate-600 bg-white hover:border-indigo-400 transition-all outline-none"
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
            {ROLES.map(role => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  // If "Other" is selected, we clear the value if it was a predefined role, 
                  // or keep it if it was already custom. If switching from predefined to Other, 
                  // we set it to 'Other' initially so the input shows up.
                  if (role === 'Other') {
                    if (!isCustom) onChange('Other');
                  } else {
                    onChange(role);
                  }
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-indigo-50 text-left font-semibold text-slate-600 transition-colors"
              >
                {role}
                {role === displayValue && <Check className="w-4 h-4 text-indigo-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const SetupView: React.FC<SetupViewProps> = ({ onStart }) => {
  const [sessionName, setSessionName] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: '', role: ROLES[0] },
  ]);

  const addParticipant = () => {
    if (participants.length < 10) {
      setParticipants([...participants, { id: Date.now().toString(), name: '', role: ROLES[0] }]);
    }
  };

  const removeParticipant = (id: string) => {
    if (participants.length > 1) {
      setParticipants(participants.filter(p => p.id !== id));
    }
  };

  const updateParticipant = (id: string, field: keyof Participant, value: string) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const isValid = sessionName.trim() !== '' && 
                  participants.every(p => p.name.trim() !== '') && 
                  participants.length >= 1 && 
                  participants.length <= 10;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100">
        <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50 rounded-t-[2rem]">
          <h2 className="text-3xl font-extrabold text-slate-800 mb-8 flex items-center gap-3">
            <Users className="w-10 h-10 text-indigo-600" />
            Session Configuration
          </h2>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Project / Customer Name</label>
            <input 
              type="text" 
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g. Brixton Tower"
              className="w-full text-2xl font-bold border-2 border-slate-200 rounded-2xl px-6 py-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-8">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-700">Participants (1-10)</h3>
              <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase">
                {participants.length} / 10 Selected
              </span>
            </div>

            <div className="grid gap-4">
              {participants.map((p, idx) => (
                <div key={p.id} className="flex gap-4 items-start animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 shrink-0 mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex gap-4 items-center">
                      <input 
                        type="text" 
                        value={p.name}
                        onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                        placeholder="Participant Name"
                        className="flex-1 border-2 border-slate-100 rounded-xl px-4 py-3 font-semibold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                      />
                      <RoleDropdown 
                        value={p.role}
                        onChange={(val) => updateParticipant(p.id, 'role', val)}
                      />
                      <button 
                        onClick={() => removeParticipant(p.id)}
                        disabled={participants.length <= 1}
                        className="p-3 text-slate-300 hover:text-red-500 disabled:opacity-0 transition-all shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {(!ROLES.filter(r => r !== 'Other').includes(p.role)) && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <input 
                          type="text"
                          value={p.role === 'Other' ? '' : p.role}
                          onChange={(e) => updateParticipant(p.id, 'role', e.target.value)}
                          placeholder="Specify custom role..."
                          className="w-full border-2 border-slate-100 rounded-xl px-4 py-2 font-semibold focus:border-indigo-400 outline-none bg-slate-50/50"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {participants.length < 10 && (
                <button 
                  onClick={addParticipant}
                  className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-4 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all font-bold"
                >
                  <Plus className="w-5 h-5" /> Add Participant
                </button>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => onStart(sessionName, participants)}
              disabled={!isValid}
              className={`flex items-center gap-3 px-10 py-5 rounded-2xl text-xl font-black transition-all shadow-lg ${
                isValid 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 shadow-indigo-200' 
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              Start Workshop <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
