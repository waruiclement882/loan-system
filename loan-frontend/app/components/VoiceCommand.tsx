"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

export default function VoiceCommand() {
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [supported, setSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      setRecognition(rec);
    }
  }, []);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  const searchAndOpenCustomer = async (name: string) => {
    setFeedback(`🔍 Searching for ${name}...`);
    try {
      const res = await fetch(`${API}/api/customers`, { headers: getHeaders() });
      const customers = await res.json();
      if (!Array.isArray(customers)) { speak('Could not search customers'); return; }

      const nameLower = name.toLowerCase();
      const match = customers.find((c: any) =>
        c.name?.toLowerCase().includes(nameLower)
      );

      if (match) {
        speak(`Opening ${match.name}`);
        setFeedback(`👤 Opening ${match.name}...`);
        router.push(`/customers/${match.id}`);
      } else {
        speak(`Customer ${name} not found`);
        setFeedback(`❌ Customer "${name}" not found`);
      }
    } catch {
      speak('Search failed');
      setFeedback('❌ Search failed');
    }
  };

  const searchAndOpenLoan = async (name: string) => {
    setFeedback(`🔍 Searching loan for ${name}...`);
    try {
      const res = await fetch(`${API}/api/loans`, { headers: getHeaders() });
      const loans = await res.json();
      if (!Array.isArray(loans)) { speak('Could not search loans'); return; }

      const nameLower = name.toLowerCase();
      const matches = loans.filter((l: any) =>
        l.customer_name?.toLowerCase().includes(nameLower)
      );

      if (matches.length === 1) {
        speak(`Opening loan for ${matches[0].customer_name}`);
        setFeedback(`📋 Opening loan #${matches[0].id} for ${matches[0].customer_name}...`);
        router.push(`/loans/${matches[0].id}`);
      } else if (matches.length > 1) {
        // Open most recent active loan
        const active = matches.find((l: any) => l.status === 'active') || matches[matches.length - 1];
        speak(`Opening loan for ${active.customer_name}`);
        setFeedback(`📋 Opening loan #${active.id} for ${active.customer_name}...`);
        router.push(`/loans/${active.id}`);
      } else {
        speak(`No loan found for ${name}`);
        setFeedback(`❌ No loan found for "${name}"`);
      }
    } catch {
      speak('Search failed');
      setFeedback('❌ Search failed');
    }
  };

  const openLoanById = (id: string) => {
    speak(`Opening loan number ${id}`);
    setFeedback(`📋 Opening Loan #${id}...`);
    router.push(`/loans/${id}`);
  };

  const processCommand = useCallback(async (command: string) => {
    const cmd = command.toLowerCase().trim();
    setTranscript(command);

    // ── Open loan of specific person ──
    // "open loan of joseph" / "show loan for mary" / "loan of peter"
    const loanOfMatch = cmd.match(/(?:open|show|view)?\s*loan\s+(?:of|for)\s+(.+)/);
    if (loanOfMatch) {
      await searchAndOpenLoan(loanOfMatch[1].trim());
      setTimeout(() => { setFeedback(""); setTranscript(""); }, 3000);
      return;
    }

    // "open joseph loan" / "show mary's loan"
    const nameFirstLoan = cmd.match(/(?:open|show|view)\s+(.+?)(?:'s)?\s+loan/);
    if (nameFirstLoan) {
      await searchAndOpenLoan(nameFirstLoan[1].trim());
      setTimeout(() => { setFeedback(""); setTranscript(""); }, 3000);
      return;
    }

    // ── Open loan by ID ──
    // "open loan 45" / "show loan number 12"
    const loanIdMatch = cmd.match(/loan\s+(?:number\s+|#)?(\d+)/);
    if (loanIdMatch) {
      openLoanById(loanIdMatch[1]);
      setTimeout(() => { setFeedback(""); setTranscript(""); }, 3000);
      return;
    }

    // ── Open customer profile ──
    // "open customer joseph" / "show profile of mary"
    const customerMatch = cmd.match(/(?:open|show|view)\s+(?:customer|profile)\s+(?:of\s+|for\s+)?(.+)/);
    if (customerMatch) {
      await searchAndOpenCustomer(customerMatch[1].trim());
      setTimeout(() => { setFeedback(""); setTranscript(""); }, 3000);
      return;
    }

    // "open joseph's profile" / "show mary profile"
    const profileMatch = cmd.match(/(?:open|show|view)\s+(.+?)(?:'s)?\s+(?:profile|account|details)/);
    if (profileMatch) {
      await searchAndOpenCustomer(profileMatch[1].trim());
      setTimeout(() => { setFeedback(""); setTranscript(""); }, 3000);
      return;
    }

    // ── Page navigation ──
    if (cmd.includes('dashboard') || cmd.includes('home')) {
      speak('Going to dashboard'); setFeedback('🏠 Dashboard'); router.push('/dashboard');
    } else if (cmd.includes('new customer') || cmd.includes('add customer') || cmd.includes('register customer')) {
      speak('Opening new customer'); setFeedback('👤 New Customer'); router.push('/customers');
    } else if (cmd.includes('customer')) {
      speak('Going to customers'); setFeedback('👥 Customers'); router.push('/customers');
    } else if (cmd.includes('new loan') || cmd.includes('create loan') || cmd.includes('add loan')) {
      speak('Opening new loan'); setFeedback('📋 New Loan'); router.push('/loans');
    } else if (cmd.includes('loan')) {
      speak('Going to loans'); setFeedback('📋 Loans'); router.push('/loans');
    } else if (cmd.includes('payment')) {
      speak('Going to payments'); setFeedback('💳 Payments'); router.push('/payments');
    } else if (cmd.includes('approval') || cmd.includes('approve')) {
      speak('Going to approvals'); setFeedback('✅ Approvals'); router.push('/approvals');
    } else if (cmd.includes('match')) {
      speak('Going to payment matching'); setFeedback('🔗 Match Payments'); router.push('/matching');
    } else if (cmd.includes('report')) {
      speak('Going to reports'); setFeedback('📊 Reports'); router.push('/reports');
    } else if (cmd.includes('arrear')) {
      speak('Going to loan arrears'); setFeedback('⚠️ Loan Arrears'); router.push('/arrears');
    } else if (cmd.includes('setting')) {
      speak('Going to settings'); setFeedback('⚙️ Settings'); router.push('/settings');
    } else if (cmd.includes('audit')) {
      speak('Going to audit logs'); setFeedback('📋 Audit Logs'); router.push('/audit');
    } else if (cmd.includes('expense')) {
      speak('Going to expenses'); setFeedback('💰 Expenses'); router.push('/expenses');
    } else if (cmd.includes('branch')) {
      speak('Going to branches'); setFeedback('🏢 Branches'); router.push('/branches');
    } else if (cmd.includes('user')) {
      speak('Going to users'); setFeedback('👥 Users'); router.push('/users');
    } else if (cmd.includes('statement')) {
      speak('Going to statements'); setFeedback('📄 Statement'); router.push('/statement');
    } else if (cmd.includes('schedule')) {
      speak('Going to schedule'); setFeedback('📅 Schedule'); router.push('/schedule');
    } else if (cmd.includes('suspense')) {
      speak('Going to suspense'); setFeedback('🔄 Suspense'); router.push('/suspense');
    } else if (cmd.includes('float')) {
      speak('Going to float'); setFeedback('💵 Float'); router.push('/float');
    } else if (cmd.includes('par')) {
      speak('Going to portfolio at risk'); setFeedback('📊 PAR'); router.push('/par');
    } else if (cmd.includes('slip')) {
      speak('Going to payment slip'); setFeedback('🧾 Payment Slip'); router.push('/slip');
    } else if (cmd.includes('collection')) {
      speak('Going to collection'); setFeedback('📋 Collection'); router.push('/collection');
    } else if (cmd.includes('logout') || cmd.includes('log out') || cmd.includes('sign out')) {
      speak('Logging out'); setFeedback('👋 Logging out...');
      setTimeout(() => { localStorage.clear(); router.push('/login'); }, 1000);
    } else if (cmd.includes('help')) {
      speak('You can say: open loan of Joseph, show loan for Mary, open loan 45, go to dashboard, customers, loans, payments, approvals, reports, arrears, settings, branches, expenses, or logout');
      setFeedback('💡 Commands: "open loan of [name]", "loan [number]", "dashboard", "customers", "loans", "reports"...');
    } else {
      speak('Command not recognized. Say help for available commands.');
      setFeedback('❓ Not recognized. Say "help" for commands.');
    }

    setTimeout(() => { setFeedback(""); setTranscript(""); }, 3000);
  }, [router]);

  const startListening = useCallback(() => {
    if (!recognition || listening) return;

    recognition.onstart = () => {
      setListening(true);
      setFeedback('🎤 Listening...');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal) processCommand(text);
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      setFeedback('❌ ' + event.error);
      setTimeout(() => setFeedback(""), 2000);
    };

    recognition.onend = () => setListening(false);
    recognition.start();
  }, [recognition, listening, processCommand]);

  const stopListening = () => {
    if (recognition) recognition.stop();
    setListening(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.ctrlKey) {
        e.preventDefault();
        if (listening) stopListening();
        else startListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listening, startListening]);

  if (!supported) return null;

  return (
    <>
      {(feedback || transcript) && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 max-w-lg text-center">
          {listening && (
            <div className="flex gap-1 shrink-0">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-1 bg-green-400 rounded-full animate-bounce"
                  style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}
          <span className="text-sm font-medium">{feedback || transcript}</span>
        </div>
      )}

      <button
        onClick={listening ? stopListening : startListening}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          listening ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse' : 'bg-green-600 hover:bg-green-700 hover:scale-105'
        }`}
        title={listening ? 'Stop (Ctrl+Space)' : 'Voice Command (Ctrl+Space)'}
      >
        {listening ? (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
          </svg>
        )}
      </button>

      <div className="fixed bottom-6 right-24 z-40 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full opacity-50 pointer-events-none">
        Ctrl+Space
      </div>
    </>
  );
}