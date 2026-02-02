
import React, { useEffect, useState, useMemo } from 'react';
import { databaseService } from '../services/databaseService';
import { SessionRecord, JourneyStep, Question } from '../types';
import { QUESTIONS, UI_TEXT } from '../constants';

interface AdminDashboardProps {
  onClose: () => void;
  lang: 'en' | 'ar';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, lang }) => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const t = UI_TEXT[lang];

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const data = await databaseService.getSessions();
    setSessions(data);
    setLoading(false);
  };

  const avgBalance = sessions.length > 0 
    ? Math.round(sessions.reduce((acc, s) => acc + s.yinYangBalance, 0) / sessions.length)
    : 50;

  const essenceKeywords = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => {
      s.responses.forEach(r => {
        if (r.elaboration) {
          const words = r.elaboration.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/);
          words.forEach(w => {
            if (w.length > 4) counts[w] = (counts[w] || 0) + 1;
          });
        }
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [sessions]);

  const downloadCSV = () => {
    if (sessions.length === 0) return;
    
    const headers = [
      "Timestamp", "Name", "Language", "Total Duration (s)", "Yin (%)", "Yang (%)", "Stability", "Creativity", "Depth",
      ...QUESTIONS.flatMap(q => [`Q${q.id} Answer`, `Q${q.id} Time (s)`, `Q${q.id} Elaboration`])
    ];

    const rows = sessions.map(s => {
      const perQuestionData = QUESTIONS.flatMap(q => {
        const resp = s.responses.find(r => r.questionId === q.id);
        return [
          (resp?.answer || "").replace(/,/g, ';'),
          ((resp?.timeTakenMs || 0) / 1000).toFixed(2),
          (resp?.elaboration || "").replace(/,/g, ';').replace(/\n/g, ' ')
        ];
      });

      return [
        new Date(s.timestamp).toLocaleString(),
        s.fullName.replace(/,/g, ''),
        s.language,
        ((s.totalDurationMs || 0) / 1000).toFixed(1),
        s.yinYangBalance,
        100 - s.yinYangBalance,
        s.stability,
        s.creativity,
        s.depth,
        ...perQuestionData
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `hayam_full_audit_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (id: string) => {
    if (deleteId) return; // Prevent expanding while deleting
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteId === id) {
      await databaseService.deleteSession(id);
      setDeleteId(null);
      loadSessions();
    } else {
      setDeleteId(id);
    }
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] overflow-y-auto animate-fade-in p-4 md:p-16">
      <div className="max-w-7xl mx-auto space-y-12 pb-24">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-8 gap-8">
          <div>
            <h1 className="text-xs tracking-[0.8em] uppercase opacity-40 mb-2 font-bold">Owner Portal</h1>
            <h2 className="text-3xl md:text-4xl font-playfair italic">Collective Souls Repository</h2>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={downloadCSV}
              className="px-6 py-2 border border-white/10 hover:border-white/40 transition-all text-[10px] tracking-widest uppercase bg-white/5"
            >
              Export Full Audit (CSV)
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2 border border-white/10 hover:border-white transition-all text-[10px] tracking-widest uppercase"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          <div className="p-6 bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-[9px] tracking-widest uppercase opacity-40">Journeys</span>
            <div className="text-4xl font-light">{sessions.length}</div>
          </div>
          <div className="p-6 bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-[9px] tracking-widest uppercase opacity-40">Avg Balance</span>
            <div className="text-4xl font-light">{avgBalance}% Yin</div>
          </div>
          <div className="col-span-2 p-6 bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-[9px] tracking-widest uppercase opacity-40">Persistence</span>
            <div className="flex items-center gap-4 pt-2">
              <div className={`w-2 h-2 rounded-full ${sessions.some(s => s.id?.includes('fallback')) ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
              <div className="text-lg font-light opacity-60 uppercase tracking-tighter">
                {sessions.some(s => s.id?.includes('fallback')) ? 'Local Only' : 'Live Cloud (Connected)'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-3 space-y-6">
            <h3 className="text-xs tracking-[0.4em] uppercase opacity-40">Session Audit Logs</h3>
            {loading ? (
              <div className="text-center py-20 opacity-20">Syncing with Void...</div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session, idx) => {
                  const id = session.id || idx.toString();
                  const isExpanded = expandedId === id;
                  const isDeleting = deleteId === id;
                  const totalSecs = ((session.totalDurationMs || 0) / 1000).toFixed(1);

                  return (
                    <div key={id} className={`border border-white/5 transition-all duration-500 ${isExpanded ? 'bg-white/[0.03] border-white/20' : 'bg-white/[0.01] hover:bg-white/[0.02]'}`}>
                      <div 
                        onClick={() => toggleExpand(id)}
                        className="p-6 flex flex-wrap items-center justify-between gap-6 cursor-pointer relative group"
                      >
                        <div className="min-w-[140px]">
                          <div className="text-[10px] opacity-40 font-mono mb-1">{new Date(session.timestamp).toLocaleString()}</div>
                          <div className="text-sm font-medium tracking-wide uppercase">{session.fullName || 'Anonymous'}</div>
                        </div>
                        
                        <div className="flex items-center gap-8 md:gap-12">
                          <div className="text-center">
                            <div className="text-[9px] uppercase tracking-widest opacity-30 mb-1">Duality</div>
                            <div className="text-lg font-light">{session.yinYangBalance}% Yin</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[9px] uppercase tracking-widest opacity-30 mb-1">Time</div>
                            <div className="text-lg font-light">{totalSecs}s</div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {isDeleting ? (
                              <div className="flex gap-2 animate-fade-in">
                                <button 
                                  onClick={(e) => handleDelete(e, id)}
                                  className="px-3 py-1 bg-red-900/30 text-red-500 border border-red-500/50 text-[8px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                >
                                  {t.confirmDelete}
                                </button>
                                <button 
                                  onClick={cancelDelete}
                                  className="px-3 py-1 bg-white/5 text-[8px] uppercase tracking-widest hover:bg-white/10"
                                >
                                  {t.cancel}
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={(e) => handleDelete(e, id)}
                                className="opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity p-2 text-[8px] uppercase tracking-widest border border-white/10 bg-white/5"
                              >
                                {t.delete}
                              </button>
                            )}
                            <div className="hidden md:block text-[18px] opacity-20 ml-4">{isExpanded ? '−' : '+'}</div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-6 pb-8 animate-fade-in border-t border-white/5 pt-8 space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {QUESTIONS.map(q => {
                              const resp = session.responses.find(r => r.questionId === q.id);
                              const hesitated = (resp?.timeTakenMs || 0) > 10000;
                              
                              return (
                                <div key={q.id} className="space-y-2 p-4 bg-black/40 border border-white/[0.03]">
                                  <div className="flex justify-between items-center text-[8px] tracking-[0.2em] uppercase opacity-30">
                                    <span>Inquiry {q.id} ({q.pillar})</span>
                                    <span className={hesitated ? 'text-amber-500 font-bold' : ''}>
                                      {((resp?.timeTakenMs || 0) / 1000).toFixed(1)}s
                                    </span>
                                  </div>
                                  <div className="text-[10px] opacity-40 italic mb-1 line-clamp-1">{q.text}</div>
                                  <div className="text-xs text-white/90 border-l border-white/10 pl-2">
                                    {resp?.answer}
                                  </div>
                                  {resp?.elaboration && (
                                    <div className="text-[9px] text-emerald-500/60 bg-emerald-500/5 p-2 mt-2 leading-relaxed">
                                      "{resp.elaboration}"
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {sessions.length === 0 && (
                  <div className="text-center py-20 opacity-20 italic">The repository is currently silent.</div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-12">
            <div className="p-8 bg-white/[0.02] border border-white/5 space-y-6 sticky top-8">
              <h3 className="text-xs tracking-[0.4em] uppercase opacity-40">Collective Essence</h3>
              <div className="space-y-4">
                {essenceKeywords.length > 0 ? (
                  essenceKeywords.map(([word, count], i) => (
                    <div key={word} className="flex justify-between items-center group">
                      <span className="text-sm font-light opacity-60 group-hover:opacity-100 transition-opacity">
                        {word}
                      </span>
                      <div className="flex items-center gap-4">
                        <div className="h-[2px] bg-white/10 w-24 overflow-hidden">
                          <div className="h-full bg-white opacity-30" style={{ width: `${(count / sessions.length) * 100}%` }} />
                        </div>
                        <span className="text-[10px] opacity-40">{count}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs opacity-20 italic">Awaiting patterns.</div>
                )}
              </div>

              <div className="pt-8 border-t border-white/5 space-y-4">
                <h3 className="text-xs tracking-[0.4em] uppercase opacity-40">Owner Note</h3>
                <p className="text-[10px] opacity-40 leading-relaxed uppercase tracking-wider">
                  Deletion is permanent. If connected to Supabase, records will be removed from the cloud immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
