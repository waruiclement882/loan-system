"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const processCommand = useCallback((command: string) => {
    const cmd = command.toLowerCase().trim();
    setTranscript(command);

    // Navigation commands
    if (cmd.includes('dashboard') || cmd.includes('home')) {
      speak('Going to dashboard');
      setFeedback('🏠 Going to Dashboard...');
      router.push('/dashboard');
    } else if (cmd.includes('customer') && (cmd.includes('new') || cmd.includes('add') || cmd.includes('create'))) {
      speak('Opening new customer form');
      setFeedback('👤 Opening New Customer...');
      router.push('/customers');
    } else if (cmd.includes('customer')) {
      speak('Going to customers');
      setFeedback('👥 Going to Customers...');
      router.push('/customers');
    } else if (cmd.includes('new loan') || cmd.includes('create loan') || cmd.includes('add loan')) {
      speak('Opening new loan form');
      setFeedback('📋 Opening New Loan...');
      router.push('/loans');
    } else if (cmd.includes('loan')) {
      speak('Going to loans');
      setFeedback('📋 Going to Loans...');
      router.push('/loans');
    } else if (cmd.includes('payment')) {
      speak('Going to payments');
      setFeedback('💳 Going to Payments...');
      router.push('/payments');
    } else if (cmd.includes('approval') || cmd.includes('approve')) {
      speak('Going to approvals');
      setFeedback('✅ Going to Approvals...');
      router.push('/approvals');
    } else if (cmd.includes('match')) {
      speak('Going to payment matching');
      setFeedback('🔗 Going to Match Payments...');
      router.push('/matching');
    } else if (cmd.includes('report')) {
      speak('Going to reports');
      setFeedback('📊 Going to Reports...');
      router.push('/reports');
    } else if (cmd.includes('arrear')) {
      speak('Going to loan arrears');
      setFeedback('⚠️ Going to Loan Arrears...');
      router.push('/arrears');
    } else if (cmd.includes('setting')) {
      speak('Going to settings');
      setFeedback('⚙️ Going to Settings...');
      router.push('/settings');
    } else if (cmd.includes('audit')) {
      speak('Going to audit logs');
      setFeedback('📋 Going to Audit Logs...');
      router.push('/audit');
    } else if (cmd.includes('expense')) {
      speak('Going to expenses');
      setFeedback('💰 Going to Expenses...');
      router.push('/expenses');
    } else if (cmd.includes('branch')) {
      speak('Going to branches');
      setFeedback('🏢 Going to Branches...');
      router.push('/branches');
    } else if (cmd.includes('user')) {
      speak('Going to users');
      setFeedback('👥 Going to Users...');
      router.push('/users');
    } else if (cmd.includes('statement')) {
      speak('Going to statements');
      setFeedback('📄 Going to Statement...');
      router.push('/statement');
    } else if (cmd.includes('schedule')) {
      speak('Going to schedule');
      setFeedback('📅 Going to Schedule...');
      router.push('/schedule');
    } else if (cmd.includes('suspense')) {
      speak('Going to suspense');
      setFeedback('🔄 Going to Suspense...');
      router.push('/suspense');
    } else if (cmd.includes('float')) {
      speak('Going to float');
      setFeedback('💵 Going to Float...');
      router.push('/float');
    } else if (cmd.includes('logout') || cmd.includes('log out') || cmd.includes('sign out')) {
      speak('Logging out');
      setFeedback('👋 Logging out...');
      setTimeout(() => { localStorage.clear(); router.push('/login'); }, 1000);
    } else if (cmd.includes('help')) {
      speak('Available commands: dashboard, customers, loans, payments, approvals, match, reports, arrears, settings, branches, expenses, logout');
      setFeedback('💡 Say: dashboard, customers, loans, payments, approvals, match, reports, arrears, settings, branches, expenses, logout');
    } else {
      speak('Command not recognized. Say help for available commands.');
      setFeedback('❓ Command not recognized. Say "help" for commands.');
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
      if (result.isFinal) {
        processCommand(text);
      }
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      setFeedback('❌ Error: ' + event.error);
      setTimeout(() => setFeedback(""), 2000);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }, [recognition, listening, processCommand]);

  const stopListening = () => {
    if (recognition) recognition.stop();
    setListening(false);
  };

  // Keyboard shortcut - press Space on non-input elements
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
      {/* Feedback Toast */}
      {(feedback || transcript) && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 max-w-md">
          {listening && (
            <div className="flex gap-1">
              {[1,2,3].map(i => (
                <div key={i} className="w-1 bg-green-400 rounded-full animate-bounce"
                  style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}
          <span className="text-sm font-medium">{feedback || transcript}</span>
        </div>
      )}

      {/* Microphone Button */}
      <button
        onClick={listening ? stopListening : startListening}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          listening
            ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
            : 'bg-green-600 hover:bg-green-700 hover:scale-105'
        }`}
        title={listening ? 'Stop listening (Ctrl+Space)' : 'Voice command (Ctrl+Space)'}
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

      {/* Hint */}
      {!listening && (
        <div className="fixed bottom-6 right-24 z-40 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full opacity-60">
          Ctrl+Space
        </div>
      )}
    </>
  );
