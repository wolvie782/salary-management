'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatMoney, formatUsdCompact, countryName } from '../../lib/format';

// ---------------------------------------------------------------------------
// Intent routing — maps natural-language patterns to analytics API calls.
// In production this layer would be replaced by LLM function-calling;
// the response schema stays identical so the swap is a one-line change.
// ---------------------------------------------------------------------------

type AnswerRow = Record<string, string | number>;

interface Answer {
  text: string;
  rows?: AnswerRow[];
  columns?: string[];
  comingSoon?: boolean;
}

async function routeQuestion(q: string): Promise<Answer> {
  const lq = q.toLowerCase();

  // Total payroll
  if (/total.*(payroll|compensation|salary|spend)/i.test(q) && !/department|country|average|median/i.test(q)) {
    const o = await api.overview();
    return { text: `The total annual payroll is **${formatUsdCompact(o.totalAnnualPayrollUsd)} USD** covering ${o.paidHeadcount.toLocaleString()} employees on payroll (out of ${o.headcount.toLocaleString()} total).` };
  }

  // Headcount / total employees
  if (/how many.*(employee|people|staff|headcount)|total.*(employee|headcount)/i.test(q)) {
    const o = await api.overview();
    return { text: `There are **${o.headcount.toLocaleString()} employees** in total. **${o.activeCount.toLocaleString()}** are currently active.` };
  }

  // Average salary
  if (/average.*(salary|pay|compensation)/i.test(q) && !/department|country/i.test(q)) {
    const o = await api.overview();
    return { text: `The average annual salary across all employees (normalized to USD) is **${formatUsdCompact(o.averageSalaryUsd)}**.` };
  }

  // Median salary
  if (/median.*(salary|pay|compensation)/i.test(q)) {
    const o = await api.overview();
    return {
      text: o.medianSalaryUsd !== null
        ? `The median annual salary is **${formatUsdCompact(o.medianSalaryUsd)} USD**. The median is a better indicator of typical pay than the average since it isn't skewed by outliers.`
        : 'Median salary data is not available.',
    };
  }

  // Department payroll / by department
  if (/department/i.test(q)) {
    const rows = await api.byDepartment();
    const sorted = [...rows].sort((a, b) => b.totalUsd - a.totalUsd);
    if (/highest|most|top/i.test(q)) {
      const top = sorted[0];
      return { text: `**${top.department}** has the highest payroll at **${formatUsdCompact(top.totalUsd)} USD** per year with ${top.headcount} employees (avg ${formatUsdCompact(top.averageUsd)}).` };
    }
    return {
      text: `Here is the payroll breakdown by department (${rows.length} departments, sorted by total):`,
      columns: ['Department', 'Employees', 'Total Payroll (USD)', 'Avg Salary (USD)'],
      rows: sorted.map((r) => ({
        Department: r.department,
        Employees: r.headcount,
        'Total Payroll (USD)': formatUsdCompact(r.totalUsd),
        'Avg Salary (USD)': formatUsdCompact(r.averageUsd),
      })),
    };
  }

  // Country payroll / by country
  if (/country|countries|region/i.test(q)) {
    const rows = await api.byCountry();
    const sorted = [...rows].sort((a, b) => b.averageUsd - a.averageUsd);
    if (/highest|most|top/i.test(q)) {
      const top = sorted[0];
      return { text: `**${countryName(top.country)}** has the highest average salary at **${formatUsdCompact(top.averageUsd)} USD** per year (${top.headcount} employees).` };
    }
    return {
      text: `Average salary by country (sorted by average USD equivalent):`,
      columns: ['Country', 'Employees', 'Avg Salary (USD)'],
      rows: sorted.map((r) => ({
        Country: countryName(r.country),
        Employees: r.headcount,
        'Avg Salary (USD)': formatUsdCompact(r.averageUsd),
      })),
    };
  }

  // Top earners
  if (/top.*(earn|paid|salary)|highest.*(earn|paid|salary)|who.*(earn|paid) most/i.test(q)) {
    const earners = await api.topEarners(10);
    return {
      text: `The top 10 highest-paid employees by annual compensation (USD equivalent):`,
      columns: ['Rank', 'Name', 'Title', 'Country', 'USD Salary'],
      rows: earners.map((e, i) => ({
        Rank: i + 1,
        Name: e.name,
        Title: e.jobTitle,
        Country: countryName(e.country),
        'USD Salary': formatMoney(e.usd, 'USD'),
      })),
    };
  }

  // Distribution
  if (/distribution|band|bracket|range/i.test(q)) {
    const dist = await api.distribution();
    return {
      text: `Salary distribution across ${dist.buckets.reduce((s, b) => s + b.count, 0)} employees on payroll:`,
      columns: ['Salary Band (USD)', 'Employees'],
      rows: dist.buckets.map((b) => ({ 'Salary Band (USD)': b.label, Employees: b.count })),
    };
  }

  // Fallback — coming soon
  return {
    text: `I understand you're asking about "${q}". Advanced natural-language compensation analytics powered by AI are coming soon. Currently I can answer questions about total payroll, headcount, average/median salary, department breakdowns, country comparisons, top earners, and salary distribution.`,
    comingSoon: true,
  };
}

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  'What is our total annual payroll?',
  'How many employees do we have?',
  'What is the average salary?',
  'What is the median salary?',
  'Show payroll by department',
  'Which department has the highest payroll?',
  'Show average salary by country',
  'Who are the top 10 highest-paid employees?',
  'Show the salary distribution',
  'Which country has the highest average salary?',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = 'user' | 'assistant';

interface Message {
  id: number;
  role: Role;
  content: string;
  answer?: Answer;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

let msgId = 0;

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: ++msgId,
      role: 'assistant',
      content: 'Hello! I can answer questions about ACME\'s compensation data. Try one of the suggested questions below, or ask your own.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = { id: ++msgId, role: 'user', content: question };
    const thinkingMsg: Message = { id: ++msgId, role: 'assistant', content: '', loading: true };
    setMessages((m) => [...m, userMsg, thinkingMsg]);

    try {
      const answer = await routeQuestion(question);
      setMessages((m) =>
        m.map((msg) => msg.id === thinkingMsg.id ? { ...msg, loading: false, content: answer.text, answer } : msg)
      );
    } catch {
      setMessages((m) =>
        m.map((msg) => msg.id === thinkingMsg.id ? { ...msg, loading: false, content: 'Sorry, I couldn\'t fetch that data. Please try again.' } : msg)
      );
    } finally {
      setLoading(false);
    }
  }

  function renderMarkdown(text: string) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">HR Assistant</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              AI-powered · Coming Soon
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Ask questions about compensation data in plain English. Currently using rule-based routing — LLM-powered intent classification coming in the next release.
          </p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path d="M10 2a.75.75 0 0 1 .75.75v.258a33.186 33.186 0 0 1 6.668 2.754l-.508.837A32.712 32.712 0 0 0 11 4.133V5.9l5.472 1.093A.75.75 0 0 1 17 7.72v.59l-7 1.167-7-1.167V7.72a.75.75 0 0 1 .528-.727L9 5.9V4.133a32.712 32.712 0 0 0-5.91 2.466l-.508-.837A33.186 33.186 0 0 1 9.25 3.008V2.75A.75.75 0 0 1 10 2ZM3.5 9.956l5.985.997.015.002.015-.002L15.5 9.956v3.169l-1.26 2.835a.75.75 0 0 1-.985.38L10 14.902l-3.255 1.438a.75.75 0 0 1-.985-.38L4.5 13.125v.956a.75.75 0 0 1-1.5 0V9.956H3.5Z" />
                </svg>
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
            }`}>
              {msg.loading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  Thinking…
                </div>
              ) : (
                <>
                  <p dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  {msg.answer?.rows && msg.answer.columns && (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            {msg.answer.columns.map((col) => (
                              <th key={col} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.answer.rows.map((row, ri) => (
                            <tr key={ri} className="border-t border-slate-100 hover:bg-slate-50">
                              {msg.answer!.columns!.map((col) => (
                                <td key={col} className="px-3 py-2 text-slate-700 whitespace-nowrap">{row[col]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {msg.answer?.comingSoon && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                      </svg>
                      Advanced AI analysis coming soon
                    </div>
                  )}
                </>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 mt-0.5 text-xs font-bold">
                HR
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="mt-3 shrink-0">
        <div className="mb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.slice(0, 5).map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.slice(5).map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="shrink-0 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about compensation data…"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.199-7.187.75.75 0 0 0 0-1.063A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
          Ask
        </button>
      </form>
    </main>
  );
}
