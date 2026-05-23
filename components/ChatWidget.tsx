'use client';

import React, { useState, useEffect, useRef } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  engine?: string;
};

type ReportingState = {
  step: 'idle' | 'type' | 'image' | 'landmark' | 'gps' | 'submitting' | 'success';
  type?: 'pothole' | 'streetlight' | 'traffic_signal' | 'open_drainage';
  image?: File;
  landmark?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  autoAddress?: string;
};

const SUGGESTIONS = [
  { label: '📊 Spending Stats', text: 'Show me total spending statistics' },
  { label: '🛣️ NH-44 Contracts', text: 'Search contracts for NH-44' },
  { label: '🚨 Budget Overruns', text: 'Are there any budget overruns or audit flags?' },
  { label: '⚠️ Report a Pothole', text: 'Report a pothole' },
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 **Welcome to the RoadWatch AI Civil Assistant!**\n\nI can help you monitor local road quality, check public spending records (CPPP & NHAI), analyze budgets/contractors, and report road safety hazards in real-time.\n\n*Type **"help"** for options, or select a suggestion chip to start!*`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState('Local Heuristic Engine');

  // Reporting Flow State
  const [reporting, setReporting] = useState<ReportingState>({ step: 'idle' });

  // Settings Panel
  const [showSettings, setShowSettings] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [localKeyStatus, setLocalKeyStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize custom key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('roadwatch_gemini_key');
      if (savedKey) {
        setCustomKey(savedKey);
        setLocalKeyStatus(true);
      }
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, reporting.step]);

  const handleSaveKey = () => {
    if (typeof window !== 'undefined') {
      if (customKey.trim()) {
        localStorage.setItem('roadwatch_gemini_key', customKey.trim());
        setLocalKeyStatus(true);
      } else {
        localStorage.removeItem('roadwatch_gemini_key');
        setLocalKeyStatus(false);
      }
      setShowSettings(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // User Message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Pass user-supplied key in headers if it exists
      const savedKey = localStorage.getItem('roadwatch_gemini_key');
      if (savedKey) {
        headers['x-gemini-key'] = savedKey;
      }

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      conversationHistory.push({ role: 'user', content: text });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: conversationHistory }),
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      if (data.content === '__TRIGGER_REPORT_FLOW__') {
        // Intercept and launch reporting wizard
        setReporting({ step: 'type' });
        setMessages((prev) => [
          ...prev,
          {
            id: `assist-${Date.now()}`,
            role: 'assistant',
            content: `🚧 **Starting Guided Reporting Flow**\n\nI will guide you step-by-step to report this issue and file it on our public tracker. Let's begin!\n\n**Step 1: Select the issue type below:**`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      setEngine(data.engine || 'Local Heuristic Engine');
      setMessages((prev) => [
        ...prev,
        {
          id: `assist-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
          engine: data.engine,
        },
      ]);
    } catch (err: any) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `assist-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Sorry, I failed to fetch an answer due to a network disruption. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  /* Guided Reporting Handlers */
  const handleSelectType = (type: ReportingState['type']) => {
    setReporting((prev) => ({ ...prev, step: 'image', type }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReporting((prev) => ({ ...prev, step: 'landmark', image: file }));
    }
  };

  const handleLandmarkSubmit = (landmarkStr: string) => {
    setReporting((prev) => ({ ...prev, step: 'gps', landmark: landmarkStr }));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      // Fallback
      setReporting((prev) => ({
        ...prev,
        step: 'submitting',
        lat: 13.0827,
        lng: 80.2707,
        accuracy: 10,
        autoAddress: 'Chennai, Tamil Nadu (Procedural Fallback)',
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = Math.abs(pos.coords.latitude);
        const longitude = Math.abs(pos.coords.longitude);
        const acc = Math.round(pos.coords.accuracy);

        let resolvedAddress = 'GPS Reported Area';
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );
          const data = await res.json();
          if (data.status === 'OK' && data.results?.length) {
            resolvedAddress = data.results[0].formatted_address;
          }
        } catch {
          resolvedAddress = `Location at Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
        }

        setReporting((prev) => ({
          ...prev,
          step: 'submitting',
          lat: latitude,
          lng: longitude,
          accuracy: acc,
          autoAddress: resolvedAddress,
        }));
      },
      () => {
        alert('Permission to retrieve coordinates was denied.');
        // Fallback
        setReporting((prev) => ({
          ...prev,
          step: 'submitting',
          lat: 13.0827,
          lng: 80.2707,
          accuracy: 15,
          autoAddress: 'Default City Coordinates',
        }));
      },
      { enableHighAccuracy: true }
    );
  };

  // Submit report to server API
  useEffect(() => {
    if (reporting.step === 'submitting') {
      const submitData = async () => {
        try {
          const finalLocation = reporting.landmark
            ? `(${reporting.landmark}) ${reporting.autoAddress || 'GPS Location'}`
            : (reporting.autoAddress || 'GPS Location');

          const formData = new FormData();
          formData.append('image', reporting.image!);
          formData.append('location', finalLocation);
          formData.append('lat', String(reporting.lat || 13.0827));
          formData.append('lng', String(reporting.lng || 80.2707));
          formData.append('type', reporting.type!);
          formData.append('impact_level', '2'); // Default Medium

          // Call API
          const res = await fetch('/api/report/create', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Server rejected submission');
          }

          setReporting((prev) => ({ ...prev, step: 'success' }));
          setMessages((prev) => [
            ...prev,
            {
              id: `reporting-success-${Date.now()}`,
              role: 'assistant',
              content: `🎉 **Civic Report Filed Successfully!**\n\nYour report regarding a **${reporting.type?.toUpperCase()}** at *${finalLocation}* has been submitted.\n\nIt has been logged in our local database as a pending issue and is awaiting automated validation. Once approved, it will be mapped instantly.\n\nThank you for making our roads safer! 🛣️`,
              timestamp: new Date(),
            },
          ]);
        } catch (err: any) {
          console.error(err);
          setReporting({ step: 'idle' });
          setMessages((prev) => [
            ...prev,
            {
              id: `reporting-failed-${Date.now()}`,
              role: 'assistant',
              content: `⚠️ **Report Submission Failed**: ${err.message || 'Network error'}. Standard chat resumed.`,
              timestamp: new Date(),
            },
          ]);
        }
      };
      submitData();
    }
  }, [reporting.step]);

  // Clean Markdown Renderer (Very basic, handles tables, bullet lists, strong tags)
  const renderMessageContent = (content: string) => {
    if (!content || content === '__TRIGGER_REPORT_FLOW__') return null;

    const lines = content.split('\n');
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const parsedElements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check Table boundary
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const parts = trimmed.split('|').map((p) => p.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);

        if (!inTable) {
          inTable = true;
          tableHeaders = parts;
          tableRows = [];
        } else {
          // If it's a separator line like |:---|:---|
          if (parts.every((p) => p.startsWith(':') || p.startsWith('-') || p.endsWith('-'))) {
            // skip separator
            return;
          }
          tableRows.push(parts);
        }
        return;
      }

      // Close Table if we were in one and current line is not table
      if (inTable && (!trimmed.startsWith('|') || !trimmed.endsWith('|'))) {
        inTable = false;
        parsedElements.push(
          <div key={`table-${idx}`} className="my-3 overflow-x-auto w-full">
            <table className="min-w-full text-xs text-left border border-slate-700 bg-slate-900/60 rounded">
              <thead className="bg-slate-800 border-b border-slate-700 text-slate-200">
                <tr>
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="px-3 py-2 font-semibold">
                      {parseInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {tableRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-slate-800/40">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 max-w-[200px] truncate">
                        {parseInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      // Standard render
      if (trimmed.startsWith('###')) {
        parsedElements.push(
          <h4 key={idx} className="text-sm font-bold text-cyan-400 mt-4 mb-2">
            {parseInlineMarkdown(trimmed.replace('###', ''))}
          </h4>
        );
      } else if (trimmed.startsWith('##')) {
        parsedElements.push(
          <h3 key={idx} className="text-base font-bold text-white mt-4 mb-2 border-b border-slate-700/60 pb-1">
            {parseInlineMarkdown(trimmed.replace('##', ''))}
          </h3>
        );
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        parsedElements.push(
          <li key={idx} className="ml-4 list-disc text-xs my-1 text-slate-300">
            {parseInlineMarkdown(trimmed.substring(1).trim())}
          </li>
        );
      } else if (trimmed) {
        parsedElements.push(
          <p key={idx} className="text-xs my-2 text-slate-200 leading-relaxed">
            {parseInlineMarkdown(trimmed)}
          </p>
        );
      } else {
        parsedElements.push(<div key={idx} className="h-2" />);
      }
    });

    // Catch trailing open tables
    if (inTable) {
      parsedElements.push(
        <div key="table-end" className="my-3 overflow-x-auto w-full">
          <table className="min-w-full text-xs text-left border border-slate-700 bg-slate-900/60 rounded">
            <thead className="bg-slate-800 border-b border-slate-700 text-slate-200">
              <tr>
                {tableHeaders.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-semibold">
                    {parseInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {tableRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-slate-800/40">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2">
                      {parseInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return parsedElements;
  };

  // Safe inline formatter (handles **bold**, *italic*, `code`)
  const parseInlineMarkdown = (text: string) => {
    if (typeof text !== 'string') return null;
    let parts: React.ReactNode[] = [text];

    // **bold**
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return part;
      const subParts = part.split(/\*\*(.*?)\*\*/g);
      return subParts.map((sub, i) => (i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{sub}</strong> : sub));
    });

    // *italic*
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return part;
      const subParts = part.split(/\*(.*?)\*/g);
      return subParts.map((sub, i) => (i % 2 === 1 ? <em key={i} className="italic">{sub}</em> : sub));
    });

    // `code`
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return part;
      const subParts = part.split(/`(.*?)`/g);
      return subParts.map((sub, i) => (i % 2 === 1 ? <code key={i} className="px-1 py-0.5 rounded bg-slate-800 font-mono text-cyan-400 border border-slate-700 text-[10px]">{sub}</code> : sub));
    });

    return <>{parts}</>;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-mono">
      {/* FLOATING ACTION TRIGGER */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center h-14 w-14 rounded-full bg-cyan-500 text-black shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer"
          style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}
          aria-label="Open Civil Chatbot"
        >
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-[#020817] animate-ping" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-[#020817]" />
          
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* CHAT MAIN BOX */}
      {isOpen && (
        <div
          className="flex flex-col h-[550px] w-[400px] bg-[#0b1329]/95 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden scale-in-chat"
          style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), 0 0 3px rgba(6, 182, 212, 0.15)' }}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0f1d3a] border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">RoadWatch Civil AI</h3>
                <p className="text-[10px] text-cyan-400 font-semibold uppercase">{engine}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Settings Gear */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Collapse Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* SETTINGS DRAWER */}
          {showSettings && (
            <div className="bg-[#0c1830] border-b border-slate-700/50 p-4 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center space-x-1">
                <span>⚙️ Chatbot API Config</span>
              </h4>
              <p className="text-[10px] text-slate-400">
                To test advanced Gemini models, enter your API key. If empty, the app defaults to the offline local parser.
              </p>
              <div>
                <label className="block text-[10px] text-slate-300 font-bold mb-1">GEMINI API KEY:</label>
                <input
                  type="password"
                  placeholder={localKeyStatus ? "🔑 Saved in local storage" : "Enter Gemini Key..."}
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full text-xs rounded bg-slate-900 border border-slate-700 p-2 text-white placeholder-slate-500 font-sans focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400">
                  Status: {localKeyStatus ? <span className="text-emerald-400">Custom LLM Active</span> : <span className="text-cyan-400">Local Parser Active</span>}
                </span>
                <button
                  onClick={handleSaveKey}
                  className="bg-cyan-500 text-black text-xs font-bold px-3 py-1.5 rounded hover:bg-cyan-400 transition cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          )}

          {/* CHAT MESSAGES BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Avatar Label */}
                <span className="text-[9px] text-slate-400 mb-1">
                  {m.role === 'user' ? 'YOU' : 'CIVIC ASSISTANT'} • {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                {/* Message Bubble */}
                <div
                  className={`p-3 rounded-2xl ${
                    m.role === 'user'
                      ? 'bg-cyan-500 text-black rounded-tr-none'
                      : 'bg-[#0f1d3a] text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}

            {/* Guided Reporting Interactive UI */}
            {reporting.step !== 'idle' && reporting.step !== 'success' && (
              <div className="mr-auto w-full max-w-[85%] border border-cyan-500/40 rounded-2xl bg-cyan-950/20 p-4 space-y-4">
                <span className="text-[9px] font-bold text-cyan-400 block tracking-wider uppercase">Guided Issue Filing</span>

                {/* STEP 1: SELECT ISSUE TYPE */}
                {reporting.step === 'type' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-300">Select issue type:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['pothole', 'streetlight', 'traffic_signal', 'open_drainage'].map((t) => (
                        <button
                          key={t}
                          onClick={() => handleSelectType(t as any)}
                          className="bg-slate-900 border border-slate-700 rounded p-2 text-left text-xs hover:border-cyan-400 transition hover:bg-slate-800 cursor-pointer capitalize text-slate-200"
                        >
                          ⚠️ {t.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 2: UPLOAD IMAGE */}
                {reporting.step === 'image' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-300">Please upload a photo of the <b>{reporting.type?.replace('_', ' ')}</b>:</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg text-xs hover:border-cyan-500 transition text-slate-300 flex flex-col items-center justify-center space-y-1 cursor-pointer"
                    >
                      <span>📸 Capture / Choose Photo</span>
                      <span className="text-[9px] text-slate-500">jpeg/png formats</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {/* STEP 3: NEAREST LANDMARK */}
                {reporting.step === 'landmark' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-300">Nearest landmark (optional):</p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const val = (e.currentTarget.elements.namedItem('landmark') as HTMLInputElement).value;
                        handleLandmarkSubmit(val);
                      }}
                      className="flex space-x-2"
                    >
                      <input
                        name="landmark"
                        type="text"
                        placeholder="e.g. Opp central school..."
                        className="flex-1 text-xs rounded bg-slate-900 border border-slate-700 p-2 text-white"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-cyan-500 text-black px-3 rounded text-xs font-bold hover:bg-cyan-400 cursor-pointer"
                      >
                        Next
                      </button>
                    </form>
                  </div>
                )}

                {/* STEP 4: GEOLOCATION ACCURACY */}
                {reporting.step === 'gps' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-300">Tag precise location via device GPS:</p>
                    <button
                      onClick={handleDetectLocation}
                      className="w-full py-2 bg-cyan-500 text-black text-xs font-bold rounded flex items-center justify-center space-x-1 hover:bg-cyan-400 cursor-pointer"
                    >
                      <span>📍 Detect Coordinates</span>
                    </button>
                  </div>
                )}

                {/* STEP 5: SUBMITTING / LOADER */}
                {reporting.step === 'submitting' && (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <span className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-cyan-400 font-bold">Uploading civic report offline/online...</p>
                  </div>
                )}
              </div>
            )}

            {/* AI Typing loader */}
            {loading && (
              <div className="mr-auto items-start max-w-[85%] space-y-1">
                <span className="text-[9px] text-slate-400">CIVIC ASSISTANT • typing...</span>
                <div className="p-3 rounded-2xl bg-[#0f1d3a] border border-slate-800 rounded-tl-none flex space-x-1 items-center h-8">
                  <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* CHAT INPUT AREA */}
          {reporting.step === 'idle' && (
            <div className="p-3 bg-[#0a1122] border-t border-slate-800 space-y-2">
              {/* SUGGESTION CHIPS */}
              {messages.length === 1 && (
                <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                  {SUGGESTIONS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip.text)}
                      className="flex-shrink-0 text-[10px] bg-slate-900 border border-slate-700/80 hover:border-cyan-400/60 rounded-full px-3 py-1 text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder="Ask about tenders, budget, road quality..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 text-xs rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white placeholder-slate-500 font-sans focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="flex items-center justify-center h-9 w-9 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
