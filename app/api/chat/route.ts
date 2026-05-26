import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getLocalReports } from '@/lib/localDb';
import { handleLocalChat, ContractRecord } from '@/lib/localChatEngine';
import fs from 'fs';
import path from 'path';

const CONTRACTS_FILE = path.join(process.cwd(), 'contracts_store.json');

function getContracts(): ContractRecord[] {
  if (fs.existsSync(CONTRACTS_FILE)) {
    try {
      const data = fs.readFileSync(CONTRACTS_FILE, 'utf8');
      return JSON.parse(data) as ContractRecord[];
    } catch (e) {
      console.error('Error reading contracts inside chat API:', e);
    }
  }
  return [];
}

// Simple RAG context generator based on keywords
function generateRagContext(query: string): string {
  const q = query.toLowerCase();
  const contracts = getContracts();
  const reports = getLocalReports();

  // 1. General Stats Context
  let totalSpent = 0;
  const activeBidders = new Set<string>();
  const activeStates = new Set<string>();
  let nhCount = 0;
  let shCount = 0;

  contracts.forEach((c) => {
    totalSpent += c.contractValue;
    if (c.selectedBidder) activeBidders.add(c.selectedBidder);
    if (c.state) activeStates.add(c.state);
    if (c.category === 'NH') nhCount++;
    else shCount++;
  });

  let context = `### SYSTEM DATA CONTEXT
GENERAL SPENDING STATS:
- Total Infrastructure Contracts Value: ₹${(totalSpent / 10000000).toFixed(2)} Crores (Total: ${contracts.length} contracts)
- Active Approved Contractors: ${activeBidders.size}
- Active States Tracked: ${activeStates.size} (${Array.from(activeStates).slice(0, 10).join(', ')}...)
- National Highway (NH) Contracts: ${nhCount}
- State Highway (SH) Contracts: ${shCount}

`;

  // 2. Filter Contracts matching query keywords
  const matchedContracts = contracts.filter((c) => {
    const desc = (c.tenderDescription || '').toLowerCase();
    const ref = (c.tenderRefNo || '').toLowerCase();
    const bidder = (c.selectedBidder || '').toLowerCase();
    const state = (c.state || '').toLowerCase();
    const org = (c.organisationName || '').toLowerCase();

    return (
      desc.includes(q) ||
      ref.includes(q) ||
      bidder.includes(q) ||
      state.includes(q) ||
      org.includes(q)
    );
  });

  if (matchedContracts.length > 0) {
    context += `MATCHED CONTRACT RECORDS (Top 8 of ${matchedContracts.length} matches):
`;
    matchedContracts.slice(0, 8).forEach((c) => {
      context += `- ID: ${c.id} | Ref: ${c.tenderRefNo} | Org: ${c.organisationName} | Desc: ${c.tenderDescription} | Contractor: ${c.selectedBidder} | Value: ₹${c.contractValue.toLocaleString('en-IN')} | Year: ${c.year} | State: ${c.state} | Bids: ${c.bidsReceived} | Category: ${c.category}\n`;
    });
  } else {
    // If no direct keyword match, provide a sample of large/recent contracts
    context += `SAMPLE ACTIVE PROJECTS IN LEDGER:
`;
    contracts.slice(0, 5).forEach((c) => {
      context += `- Ref: ${c.tenderRefNo} | Desc: ${c.tenderDescription} | Contractor: ${c.selectedBidder} | Value: ₹${c.contractValue.toLocaleString('en-IN')} | State: ${c.state} | Category: ${c.category}\n`;
    });
  }

  // 3. Filter Reports/Potholes matching query
  const matchedReports = reports.filter((r) => {
    const loc = (r.location || '').toLowerCase();
    const type = (r.type || '').toLowerCase();
    const status = (r.status || '').toLowerCase();

    return loc.includes(q) || type.includes(q) || status.includes(q) || q.includes('pothole') || q.includes('report') || q.includes('road');
  });

  context += `\nCIVIC ROAD QUALITY REPORTS:
- Total reported issues: ${reports.length} (Approved: ${reports.filter(r => r.status === 'approved').length}, Pending: ${reports.filter(r => r.status === 'pending').length})
- High Severity (Impact Level 3) issues: ${reports.filter(r => r.impact_level === 3).length}
`;

  if (matchedReports.length > 0) {
    context += `MATCHED ROAD QUALITY REPORTS (Top 5):\n`;
    matchedReports.slice(0, 5).forEach((r) => {
      context += `- Type: ${r.type} | Location: ${r.location} | GPS: [${r.lat}, ${r.lng}] | Impact: ${r.impact_level}/3 | Status: ${r.status} | Reported At: ${r.created_at}\n`;
    });
  }

  return context;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid messages array' },
        { status: 400 }
      );
    }

    // 1. Get GEMINI API key from headers or env
    const clientKey = req.headers.get('x-gemini-key');
    const apiKey = clientKey || process.env.GEMINI_API_KEY;

    const userMessage = messages[messages.length - 1]?.content || '';

    // If API key is not present, fall back to the deterministic local Chat Engine
    if (!apiKey) {
      console.log('No Gemini API Key found. Operating in local-mode fallback.');
      const localResponse = handleLocalChat(userMessage);
      return NextResponse.json({
        content: localResponse,
        engine: 'Local Heuristic Engine',
      });
    }

    // 2. Initialize Gemini API Client
    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const activeQuery = userMessage;

      // Check if user requested reporting flow
      const queryLower = activeQuery.toLowerCase();
      if (queryLower.includes('report a pothole') || queryLower.includes('report issue') || queryLower.includes('report road') || queryLower.includes('create report') || queryLower === 'report') {
        return NextResponse.json({
          content: '__TRIGGER_REPORT_FLOW__',
          engine: 'Gemini AI',
        });
      }

      // Generate dynamic database context using simple keyword matching RAG
      const dbContext = generateRagContext(activeQuery);

      const systemPrompt = `You are the RoadWatch AI Civil Assistant, a premium, highly competent AI assistant designed to help citizens monitor road quality and track public spending on infrastructure.
Your tone is professional, transparent, and encouraging. You present detailed budget data and contract summaries in clean, professional Markdown tables.

Key instructions:
1. Always use the SYSTEM DATA CONTEXT provided below to answer questions about public spending, contract values, tender details, and road quality reports. Ground your answers strictly in this data.
2. If a citizen asks about a specific state, contractor, or highway segment, check the matched records in the context. Format findings in structured Markdown tables.
3. If the user asks about the overall national or state statistics, use the aggregated numbers in the context.
4. If the user asks to report a pothole or road issue, reply exactly with: "__TRIGGER_REPORT_FLOW__" (no other text).
5. If the context does not contain any details matching a specific city or contractor query, state that the record is not in the active registry database, but provide relevant similar findings or summaries instead.
6. Speak in terms of Indian Rupees (INR) using Lakhs and Crores where applicable (e.g. ₹4.5 Crores = ₹45,000,000).

CONTEXT:
${dbContext}

Answer the user's latest question with deep contextual accuracy and visually gorgeous formatting.`;

      // Structure messages for Gemini API
      const geminiMessages = [];

      // Append recent history
      const recentHistory = messages.slice(-5, -1);
      recentHistory.forEach((m) => {
        geminiMessages.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        });
      });

      // Append active user query
      geminiMessages.push({
        role: 'user',
        parts: [{ text: activeQuery }]
      });

      // Call Gemini 1.5 flash model (standard, robust, highly capable)
      const modelName = 'gemini-1.5-flash';
      const model = ai.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });

      const response = await model.generateContent({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.2, // Keep facts precise and grounded in context
          maxOutputTokens: 1024,
        }
      });

      const responseText = response.response.text() || 'I am sorry, I was unable to construct a response. Please try again.';

      return NextResponse.json({
        content: responseText.trim(),
        engine: `Gemini AI (${modelName})`,
      });
    } catch (apiErr: any) {
      console.error('Gemini API execution failed, falling back to local chat engine:', apiErr);
      const localResponse = handleLocalChat(userMessage);
      return NextResponse.json({
        content: localResponse + `\n\n*(Note: Falls back to Local Engine due to Gemini connection issue: ${apiErr.message || apiErr})*`,
        engine: 'Local Heuristic Engine (Fallback)',
      });
    }
  } catch (err: any) {
    console.error('CRITICAL CHAT ROUTE FAILURE:', err);
    return NextResponse.json(
      { error: 'Failed to process chat message', details: err.message },
      { status: 500 }
    );
  }
}
