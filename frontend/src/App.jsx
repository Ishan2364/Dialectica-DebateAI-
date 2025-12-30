import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { Swords, Gavel, Loader2, Trophy, Mic2, Download, Settings2, Users, Info, X, Lightbulb, BarChart3, Target, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebateStream } from './useDebateStream';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PERSONAS = ["Default", "The Data Scientist", "The Philosopher", "The Debunker", "The Futurist", "The Humanist"];

const PERSONA_DESCRIPTIONS = {
  "Default": "Balanced debater using logic and standard rhetoric.",
  "The Data Scientist": "Uses empirical evidence, stats, and tables. Cold and analytical.",
  "The Philosopher": "Focuses on ethics, morality, and first principles. Abstract reasoning.",
  "The Debunker": "Aggressive and skeptical. Attacks logical fallacies and weak points.",
  "The Futurist": "Speculative and visionary. Focuses on long-term consequences.",
  "The Humanist": "Emotional and empathetic. Focuses on human impact and stories."
};


const findVerdictData = (obj) => {
  if (!obj || typeof obj !== 'object') return null;

  // 1. Found the Holy Grail (The actual data object)
  if (obj.scores && obj.rationale) {
    // Sanity check: ensure scores isn't empty
    if (Object.keys(obj.scores).length === 0) return null;
    return obj;
  }

  // 2. Deep Search: Check 'winner' key or 'verdict' key
  if (obj.winner && typeof obj.winner === 'object') {
    return findVerdictData(obj.winner);
  }
  
  // 3. Last Resort: Check all keys (shallow)
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (obj[key].scores && obj[key].rationale) return obj[key];
    }
  }

  return null;
};

// --- UPDATED DATA NORMALIZER (Fixes Missing Fields) ---
const normalizeWinnerData = (raw) => {
  console.log("RAW DATA IN:", raw);

  const data = findVerdictData(raw);
  
  if (!data) return null;

  // 1. Sanitize Scores
  const safeScores = data.scores || {};
  ["Agent A", "Agent B"].forEach(agent => {
      if (!safeScores[agent]) safeScores[agent] = { logic: 0, persuasion: 0, aggression: 0 };
      
      // Ensure they are numbers
      ["logic", "persuasion", "aggression"].forEach(m => {
          safeScores[agent][m] = Number(safeScores[agent][m]) || 0;
      });
  });

  // 2. Construct Final Object (INCLUDING NEW FIELDS)
  const finalResult = {
      winner: typeof data.winner === 'string' ? data.winner : "Agent A",
      
      // Text Fields
      summary: data.summary || "No summary available.",
      rationale: data.rationale || "No rationale.",
      conclusion: data.conclusion || "No conclusion.",
      
      // Stats
      scores: safeScores,
      
      // Lists (Ensure they exist to prevent crashes)
      key_points: data.key_points || { "Agent A": [], "Agent B": [] },
      strengths: data.strengths || { "Agent A": [], "Agent B": [] },
      weaknesses: data.weaknesses || { "Agent A": [], "Agent B": [] }
  };

  console.log("NORMALIZED RESULT:", finalResult);
  return finalResult;
};

// --- PDF HELPER ---
const cleanMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^> (.*$)/gim, '$1')
    .replace(/\|/g, ' ')
    .replace(/-{3,}/g, '');
};

// --- UPDATED PDF GENERATOR ---
const generatePDF = (topic, messages, rawWinner) => {
  // 1. Get Clean Data
  const data = normalizeWinnerData(rawWinner);
  if (!data) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Helper for centered text
  const centerText = (text, y) => {
    const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // --- PAGE 1: EXECUTIVE SUMMARY & ANALYSIS ---
  
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(40, 44, 52);
  centerText("Grand Debate Executive Report", 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  centerText(`Motion: ${topic}`, 30);

  let currentY = 45;

  // 1. Executive Summary
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("1. Executive Summary", 14, currentY);
  currentY += 7;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryLines = doc.splitTextToSize(data.summary || "No summary available.", 180);
  doc.text(summaryLines, 14, currentY);
  currentY += (summaryLines.length * 5) + 10;

  // 2. Scorecard Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("2. Official Scorecard", 14, currentY);
  currentY += 5;

  const scores = data.scores;
  autoTable(doc, {
    startY: currentY,
    head: [['Metric', 'Agent A', 'Agent B']],
    body: [
      ['Logic', scores["Agent A"].logic, scores["Agent B"].logic],
      ['Persuasion', scores["Agent A"].persuasion, scores["Agent B"].persuasion],
      ['Aggression', scores["Agent A"].aggression, scores["Agent B"].aggression],
      ['FINAL SCORE', 
       Math.round((scores["Agent A"].logic + scores["Agent A"].persuasion)/2), 
       Math.round((scores["Agent B"].logic + scores["Agent B"].persuasion)/2)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [66, 133, 244] }, // Blue header
    styles: { halign: 'center' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
  });
  
  currentY = doc.lastAutoTable.finalY + 15;

  // 3. Deep Dive Analysis (Strengths & Weaknesses)
  doc.setFontSize(14);
  doc.text("3. Strategic Analysis", 14, currentY);
  currentY += 7;

  // Agent A Section
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 53, 69); // Red color
  doc.text("Agent A Profile:", 14, currentY);
  currentY += 5;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.setFontSize(10);
  
  const strA = (data.strengths["Agent A"] || []).map(s => `+ ${s}`).join("\n");
  const weakA = (data.weaknesses["Agent A"] || []).map(w => `- ${w}`).join("\n");
  
  const splitStrA = doc.splitTextToSize(strA || "No data", 180);
  doc.text(splitStrA, 14, currentY);
  currentY += (splitStrA.length * 5) + 5;
  
  const splitWeakA = doc.splitTextToSize(weakA || "No data", 180);
  doc.text(splitWeakA, 14, currentY);
  currentY += (splitWeakA.length * 5) + 10;

  // Agent B Section
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 110, 253); // Blue color
  doc.text("Agent B Profile:", 14, currentY);
  currentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.setFontSize(10);
  
  const strB = (data.strengths["Agent B"] || []).map(s => `+ ${s}`).join("\n");
  const weakB = (data.weaknesses["Agent B"] || []).map(w => `- ${w}`).join("\n");

  const splitStrB = doc.splitTextToSize(strB || "No data", 180);
  doc.text(splitStrB, 14, currentY);
  currentY += (splitStrB.length * 5) + 5;
  
  const splitWeakB = doc.splitTextToSize(weakB || "No data", 180);
  doc.text(splitWeakB, 14, currentY);
  
  // --- PAGE 2: TRANSCRIPT ---
  doc.addPage();
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("4. Verbatim Transcript", 14, 20);

  const tableData = messages.map(msg => [msg.sender.toUpperCase(), cleanMarkdown(msg.content)]);
  
  autoTable(doc, {
    startY: 25,
    head: [['Speaker', 'Argument']],
    body: tableData,
    theme: 'striped',
    styles: { cellPadding: 4, fontSize: 9, overflow: 'linebreak' },
    headStyles: { fillColor: [33, 37, 41] }, // Dark header
    columnStyles: { 0: { cellWidth: 30, fontStyle: 'bold' } }
  });

  // Final Conclusion Footer
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100);
  const conclusion = doc.splitTextToSize(`FINAL VERDICT: ${data.conclusion}`, 180);
  doc.text(conclusion, 14, finalY);

  // Save
  doc.save('debate_full_report.pdf');
};

const PersonaModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f111a] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        <h3 className="text-xl font-bold text-white mb-6 font-sans flex items-center gap-2"><Info className="w-5 h-5 text-indigo-400" /> Persona Guide</h3>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {Object.entries(PERSONA_DESCRIPTIONS).map(([name, desc]) => (
            <div key={name} className="flex gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="w-1 bg-indigo-500 rounded-full"></div>
              <div>
                <h4 className="text-sm font-bold text-indigo-400 uppercase">{name}</h4>
                <p className="text-xs text-slate-300 mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- UPDATED ANALYTICS DASHBOARD ---
const AnalysisDashboard = ({ isOpen, onClose, normalizedWinner }) => {
  if (!isOpen || !normalizedWinner) return null;
  
  const w = normalizedWinner;
  const scores = w.scores;
  
  // Safe access to lists (in case backend v1 is still running)
  const strengths = w.strengths || w.key_points || { "Agent A": [], "Agent B": [] };
  const weaknesses = w.weaknesses || { "Agent A": [], "Agent B": [] };
  
  const radarData = [
    { subject: 'Logic', A: scores["Agent A"]?.logic || 0, B: scores["Agent B"]?.logic || 0, fullMark: 100 },
    { subject: 'Persuasion', A: scores["Agent A"]?.persuasion || 0, B: scores["Agent B"]?.persuasion || 0, fullMark: 100 },
    { subject: 'Aggression', A: scores["Agent A"]?.aggression || 0, B: scores["Agent B"]?.aggression || 0, fullMark: 100 },
  ];

  const totalA = ((scores["Agent A"]?.logic || 0) + (scores["Agent A"]?.persuasion || 0)) / 2;
  const totalB = ((scores["Agent B"]?.logic || 0) + (scores["Agent B"]?.persuasion || 0)) / 2;

  return (
    <div className="fixed inset-0 bg-[#0b0c15]/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-7xl h-full max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1e293b]">
          <div>
            <h2 className="text-2xl font-bold text-white font-sans flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-emerald-400" /> 
              Comprehensive Analysis
            </h2>
            <p className="text-sm text-slate-400">Executive Debate Report</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* 1. EXECUTIVE SUMMARY */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 rounded-xl p-6 shadow-lg">
             <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Executive Summary
             </h3>
             <p className="text-slate-200 text-sm leading-relaxed">{w.summary || w.rationale}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COL: SCORES & CHART */}
            <div className="lg:col-span-1 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-xl text-center">
                    <div className="text-xs font-bold text-red-400 uppercase mb-1">Agent A</div>
                    <div className="text-3xl font-black text-white">{Math.round(totalA)}</div>
                  </div>
                  <div className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-xl text-center">
                    <div className="text-xs font-bold text-blue-400 uppercase mb-1">Agent B</div>
                    <div className="text-3xl font-black text-white">{Math.round(totalB)}</div>
                  </div>
               </div>

               <div className="bg-white/5 border border-white/5 rounded-xl p-4 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                      <Radar name="Agent A" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                      <Radar name="Agent B" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      <Legend />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    </RadarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* RIGHT COL: DEEP DIVE */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* STRENGTHS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border-l-4 border-red-500 rounded-r-xl p-5">
                   <h4 className="text-red-400 font-bold uppercase text-xs mb-3 flex items-center gap-2">
                     <Target className="w-4 h-4" /> Agent A: Strengths
                   </h4>
                   <ul className="space-y-2">
                     {strengths["Agent A"]?.map((pt, i) => (
                       <li key={i} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-red-500/50">✓</span> {pt}</li>
                     )) || <li className="text-slate-500 italic">No data.</li>}
                   </ul>
                </div>
                <div className="bg-white/5 border-l-4 border-blue-500 rounded-r-xl p-5">
                   <h4 className="text-blue-400 font-bold uppercase text-xs mb-3 flex items-center gap-2">
                     <ShieldAlert className="w-4 h-4" /> Agent B: Strengths
                   </h4>
                   <ul className="space-y-2">
                     {strengths["Agent B"]?.map((pt, i) => (
                       <li key={i} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-blue-500/50">✓</span> {pt}</li>
                     )) || <li className="text-slate-500 italic">No data.</li>}
                   </ul>
                </div>
              </div>

              {/* WEAKNESSES ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-5">
                   <h4 className="text-red-300/70 font-bold uppercase text-xs mb-3">Agent A: Weaknesses</h4>
                   <ul className="space-y-2">
                     {weaknesses["Agent A"]?.map((pt, i) => (
                       <li key={i} className="text-sm text-slate-400 flex items-start gap-2"><span className="text-red-500/30">x</span> {pt}</li>
                     )) || <li className="text-slate-500 italic">No data.</li>}
                   </ul>
                </div>
                <div className="bg-blue-900/10 border border-blue-900/30 rounded-xl p-5">
                   <h4 className="text-blue-300/70 font-bold uppercase text-xs mb-3">Agent B: Weaknesses</h4>
                   <ul className="space-y-2">
                     {weaknesses["Agent B"]?.map((pt, i) => (
                       <li key={i} className="text-sm text-slate-400 flex items-start gap-2"><span className="text-blue-500/30">x</span> {pt}</li>
                     )) || <li className="text-slate-500 italic">No data.</li>}
                   </ul>
                </div>
              </div>

              {/* RATIONALE & CONCLUSION */}
              <div className="space-y-4">
                 <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-xl">
                   <h4 className="text-amber-500 font-bold uppercase text-xs mb-2 flex items-center gap-2">
                     <Gavel className="w-4 h-4" /> Why {w.winner} Won
                   </h4>
                   <p className="text-slate-300 text-sm italic">"{w.rationale}"</p>
                 </div>
                 
                 {w.conclusion && (
                   <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl">
                     <h4 className="text-slate-400 font-bold uppercase text-xs mb-2">Final Conclusion</h4>
                     <p className="text-slate-300 text-sm">{w.conclusion}</p>
                   </div>
                 )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


function App() {
  const [topic, setTopic] = useState('');
  const [agentA, setAgentA] = useState('Default');
  const [agentB, setAgentB] = useState('Default');
  const [rounds, setRounds] = useState(6);
  const [showModal, setShowModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  
  const { messages, status, winner: rawWinner, startDebate } = useDebateStream();
  
  // Use the robust normalization function
  const winner = useMemo(() => normalizeWinnerData(rawWinner), [rawWinner]);

  const chatContainerRef = useRef(null);

  useLayoutEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (messages.length > 0 && (distanceToBottom < 150 || messages.length === 1)) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, winner]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    startDebate(topic, agentA, agentB, rounds);
  };

  return (
    <div className="h-screen bg-[#0b0c15] text-slate-200 font-sans flex flex-col overflow-hidden">
      <PersonaModal isOpen={showModal} onClose={() => setShowModal(false)} />
      {/* Pass normalized winner to dashboard */}
      <AnalysisDashboard isOpen={showDashboard} onClose={() => setShowDashboard(false)} normalizedWinner={winner} />

      {/* HEADER */}
      <header className="h-16 border-b border-white/10 bg-[#0f111a] flex items-center justify-between px-6 shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">Dialectica AI</h1>
            <p className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-semibold">Live Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-black/30 px-6 py-2 rounded-full border border-white/5">
           <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
           <span className="text-xs font-mono uppercase text-slate-400">
             {status === 'idle' ? 'STANDBY' : status === 'active' ? 'ON AIR' : 'CONCLUDED'}
           </span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <div className="absolute inset-0 stage-light pointer-events-none"></div>

        {/* LEFT PANEL */}
        <div className="w-[400px] xl:w-[450px] bg-[#0f111a]/90 backdrop-blur-md border-r border-white/5 flex flex-col overflow-y-auto shrink-0 z-10">
          <div className="p-6 space-y-8">
            <div className="glass-card rounded-xl p-6 space-y-6">
              
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3 text-amber-500">
                  <Settings2 className="w-5 h-5" />
                  <h2 className="text-sm font-bold uppercase tracking-widest font-sans">Setup</h2>
                </div>
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 hover:text-white transition-colors bg-white/5 px-3 py-1 rounded-full"
                >
                  <Info className="w-3 h-3" /> Personas
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Motion (Topic)</label>
                <input
                  type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Is AI dangerous?" disabled={status === 'active'}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-sm text-white focus:border-amber-500/50 outline-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-red-500" />
                        <span className="text-[10px] font-bold text-red-400 uppercase">Agent A</span>
                    </div>
                    <select value={agentA} onChange={(e) => setAgentA(e.target.value)} disabled={status === 'active'} className="w-full bg-black/40 border border-white/10 text-xs rounded p-2 text-slate-200 outline-none focus:border-red-500">
                      {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                 </div>
                 <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase">Agent B</span>
                    </div>
                    <select value={agentB} onChange={(e) => setAgentB(e.target.value)} disabled={status === 'active'} className="w-full bg-black/40 border border-white/10 text-xs rounded p-2 text-slate-200 outline-none focus:border-blue-500">
                      {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                 </div>
              </div>

              <div className="pt-2">
                <label className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                  <span>Duration</span><span className="text-white">{rounds} Turns</span>
                </label>
                <input 
                  type="range" min="4" max="16" step="2" value={rounds} 
                  onChange={(e) => setRounds(parseInt(e.target.value))} disabled={status === 'active'}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <button
                onClick={handleSubmit} disabled={status === 'active' || !topic}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-amber-900/20 disabled:opacity-50 uppercase tracking-wider text-xs"
              >
                {status === 'active' ? <Loader2 className="animate-spin w-4 h-4" /> : <Gavel className="w-4 h-4" />}
                {status === 'active' ? 'Session in Progress' : 'Call to Order'}
              </button>
            </div>

            <AnimatePresence>
              {winner && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-b from-[#1a1500] to-[#0f111a]">
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                       <Trophy className="w-6 h-6 text-amber-400" />
                       <div>
                          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Winner Declared</div>
                          {/* THE SAFETY FIX: Ensure winner name is a STRING */}
                          <div className="text-xl font-bold text-white font-sans">{winner.winner}</div>
                       </div>
                    </div>
                    
                    <button 
                      onClick={() => setShowDashboard(true)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 group"
                    >
                      <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      VIEW FULL ANALYSIS
                    </button>

                    <button 
                      onClick={() => generatePDF(topic, messages, rawWinner)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white py-3 rounded-lg flex items-center justify-center gap-2 uppercase tracking-wider transition-colors"
                    >
                      <Download className="w-3 h-3" /> Download PDF Report
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT PANEL (CHAT) */}
        <div className="flex-1 flex flex-col relative z-10">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-8 scroll-smooth">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-white/20">
                <Mic2 className="w-24 h-24 mb-6" />
                <h3 className="text-3xl font-bold font-sans opacity-50">The Stage is Empty</h3>
              </div>
            )}

            <AnimatePresence mode='popLayout'>
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.isAgentA ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[70%] group`}>
                    <div className={`flex items-center gap-2 mb-2 ${msg.isAgentA ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                        msg.isAgentA ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {msg.isAgentA ? agentA : agentB}
                      </span>
                    </div>

                    <div className={`p-6 rounded-2xl shadow-sm border ${
                      msg.isAgentA
                        ? 'bg-[#1e293b] border-slate-700 text-slate-200 rounded-tl-none'
                        : 'bg-[#1e293b] border-slate-700 text-slate-200 rounded-tr-none'
                    }`}>
                      <div className="text-sm leading-relaxed font-sans text-left">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            blockquote: ({node, ...props}) => (
                              <div className="my-4 p-4 border-l-4 border-amber-500 bg-amber-500/10 rounded-r-lg not-italic text-amber-100 flex gap-3 items-start">
                                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                                <div className="text-base">{props.children}</div>
                              </div>
                            ),
                            table: ({node, ...props}) => (
                              <div className="my-4 overflow-x-auto rounded-lg border border-white/10 shadow-lg">
                                <table className="w-full text-sm text-left text-slate-300 bg-white/5" {...props} />
                              </div>
                            ),
                            thead: ({node, ...props}) => <thead className="text-xs uppercase bg-black/40 text-slate-400" {...props} />,
                            th: ({node, ...props}) => <th className="px-6 py-3 border-b border-white/10 font-bold tracking-wider" {...props} />,
                            td: ({node, ...props}) => <td className="px-6 py-4 border-b border-white/5 whitespace-nowrap" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;