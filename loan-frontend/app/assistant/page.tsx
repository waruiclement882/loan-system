"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

type ToolStep = { tool: string; summary: string; error: boolean };
type Msg = { role: "user" | "assistant"; content: string; tools?: ToolStep[] };

const SUGGESTIONS = [
  "Run a full health check and tell me about any bugs or data problems",
  "Which loans are overdue, and by how much?",
  "How much did we disburse and collect this month?",
  "Are there any server errors in the last 3 days? What is causing them?",
  "Review the payment recording code for bugs",
  "Which active customers have no location pinned?",
];

const TOOL_LABEL: Record<string, string> = {
  describe_database: "Looked at the database structure",
  query_database: "Queried the data",
  data_health_check: "Ran the data health checks",
  recent_errors: "Checked recent server errors",
  list_source_files: "Listed source files",
  read_source_file: "Read code",
  search_source_code: "Searched the code",
};

const renderContent = (text: string) =>
  text.split("```").map((part, i) =>
    i % 2 === 1 ? (
      <pre key={i} className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto my-2 whitespace-pre-wrap">
        {part.replace(/^\w*\n/, "")}
      </pre>
    ) : (
      <p key={i} className="whitespace-pre-wrap">{part}</p>
    )
  );

export default function AssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [model, setModel] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    fetch(`${API}/api/ai/status`, { headers })
      .then(r => r.json())
      .then(d => { setConfigured(!!d.configured); setModel(d.model || ""); })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages([...next, { role: "assistant", content: "⚠️ " + data.error }]);
      } else {
        setMessages([...next, { role: "assistant", content: data.answer, tools: data.toolLog }]);
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "⚠️ Could not reach the server. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col" style={{ height: "calc(100vh - 2rem)" }}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-2xl font-bold text-[#04342C]">🤖 AI Assistant</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Reads your live data and code (read-only). Phone numbers, IDs and emails are masked.{model ? ` · ${model}` : ""}
            </p>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="text-sm border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50">
              New chat
            </button>
          )}
        </div>

        {configured === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 text-sm text-amber-800">
            The assistant is not switched on yet. Add <strong>ANTHROPIC_API_KEY</strong> to the backend service environment on Render, then redeploy.
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">🤖</p>
              <p className="font-semibold text-gray-700">Ask me anything about the system</p>
              <p className="text-sm text-gray-400 mb-5">Data, money, bugs, code, how things work. I look at the real thing before answering.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} disabled={configured === false}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 hover:bg-[#F0FDF4] hover:border-[#1D9E75] text-gray-700 disabled:opacity-50">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user" ? "bg-[#04342C] text-white" : "bg-gray-50 border border-gray-100 text-gray-800"
              }`}>
                {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : renderContent(m.content)}
                {m.tools && m.tools.length > 0 && (
                  <details className="mt-3 text-xs text-gray-500">
                    <summary className="cursor-pointer select-none">What I checked ({m.tools.length})</summary>
                    <ul className="mt-2 space-y-1">
                      {m.tools.map((t, j) => (
                        <li key={j} className={t.error ? "text-red-500" : ""}>
                          • {TOOL_LABEL[t.tool] || t.tool}{t.summary ? `: ${t.summary}` : ""}{t.error ? " (failed)" : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-500">
                Looking into it… checking your data and code. This can take up to a minute.
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={2}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask a question… (Enter to send, Shift+Enter for a new line)"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#1D9E75] bg-white" />
          <button onClick={() => send()} disabled={loading || !input.trim() || configured === false}
            className="bg-[#04342C] text-white px-6 rounded-xl text-sm font-medium hover:bg-[#0F6E56] disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </Layout>
  );
}
