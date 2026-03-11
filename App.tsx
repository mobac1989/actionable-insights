
import React, { useState } from 'react';
import { UploadView } from './views/UploadView';
import { SetupView } from './views/SetupView';
import { GameView } from './views/GameView';
import { SummaryView } from './views/SummaryView';
import { Insight, SessionData, Participant } from './types';

enum View {
  UPLOAD,
  SETUP,
  GAME,
  SUMMARY
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.UPLOAD);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [csvHash, setCsvHash] = useState<string>('');
  const [session, setSession] = useState<SessionData | null>(null);

  const handleCsvLoaded = (loadedInsights: Insight[], hash: string) => {
    setInsights(loadedInsights);
    setCsvHash(hash);
    setCurrentView(View.SETUP);
  };

  const handleSessionStart = (name: string, participants: Participant[]) => {
    const newSession: SessionData = {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionName: name,
      sessionDate: new Date().toISOString(),
      participants,
      responses: {},
      insights: insights
    };
    setSession(newSession);
    setCurrentView(View.GAME);
  };

  const handleGameEnd = (finalResponses: Record<string, any>) => {
    if (session) {
      setSession({ ...session, responses: finalResponses });
      setCurrentView(View.SUMMARY);
    }
  };

  const handleExitToSummary = () => {
    if (confirm("End session and go to summary?")) {
      setCurrentView(View.SUMMARY);
    }
  };

  const handleViewPastSummary = (pastSession: SessionData) => {
    setSession(pastSession);
    setCsvHash('reconstructed-from-csv');
    setCurrentView(View.SUMMARY);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden flex flex-col">
      <main className="flex-1 px-6 pb-6 pt-6 md:px-12 md:pb-12 md:pt-6 max-w-[1400px] mx-auto w-full">
        {currentView === View.UPLOAD && (
          <UploadView 
            onCsvLoaded={handleCsvLoaded} 
            onViewPastSummary={handleViewPastSummary}
          />
        )}
        {currentView === View.SETUP && (
          <SetupView onStart={handleSessionStart} />
        )}
        {currentView === View.GAME && session && (
          <GameView 
            session={session} 
            onEnd={handleGameEnd} 
            onExit={handleExitToSummary}
          />
        )}
        {currentView === View.SUMMARY && session && (
          <SummaryView session={session} csvHash={csvHash} onReset={() => setCurrentView(View.UPLOAD)} />
        )}
      </main>
    </div>
  );
};

export default App;
