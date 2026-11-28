"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";

// ─────────────────────────────────────────────────────────────────────────────
// EDIT HERE: the words on the page.
// Photos go in loan-frontend/public/images/  ->  hero.jpg, band.jpg, about.jpg
// Company name, phone, email, address, paybill and account number come from
// Settings inside the system, so change those there, not here.
// ─────────────────────────────────────────────────────────────────────────────
const COPY = {
  heroTitle: "Money for your business, paid back one week at a time.",
  heroText:
    "Clear terms, a written weekly plan, and an SMS every time we record a payment. Talk to us and we will walk you through each step.",
  services: [
    { title: "Funding for your business", text: "Short-term loans for stock, tools and everyday running costs, repaid in weekly instalments." },
    { title: "A plan you can read", text: "Every loan comes with a week-by-week schedule that shows what is due and when." },
    { title: "Pay from your phone", text: "Pay through KCB Paybill. We send you an SMS when your payment is recorded." },
    { title: "Statements and payment slips", text: "Ask for a loan statement or payment slip at any time and see exactly where you stand." },
  ],
  bandText: "Built for the people who keep local markets, farms and shops running.",
  steps: [
    { title: "Talk to us", text: "Visit or call us with your national ID. We explain the amount, the weekly instalment and the fees before you decide." },
    { title: "We review your request", text: "Our team checks your details and tells you whether the loan is approved." },
    { title: "Receive your funds", text: "Once the loan is approved and the processing fee is paid, the money is released to you." },
    { title: "Repay every week", text: "Pay each instalment through Paybill and keep the SMS we send you as your record." },
  ],
  aboutTitle: "A local team, close to our customers",
  aboutText: [
    "We work from the community we serve, so you can walk in, ask questions and get a straight answer.",
    "We keep our records clear and our follow-up respectful. If a week is hard, talk to us early and we will find a way forward together.",
  ],
};

type Settings = {
  company_name?: string; tagline?: string; phone?: string; email?: string;
  address?: string; logo_url?: string; paybill?: string; account_number?: string;
};

const waNumber = (p?: string) => {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  if (d.startsWith("254")) return d;
  if (d.startsWith("0")) return "254" + d.slice(1);
  return d;
};

// A photo that falls back to a patterned panel until you add your own image
function Photo({ src, alt, className = "", eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div role="img" aria-label={alt} className={`bv-weave relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-25 select-none" aria-hidden>🌾</div>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      loading={eager ? "eager" : "lazy"}
      {...(eager ? { fetchPriority: "high" as const } : {})}
      onError={() => setFailed(true)}
    />
  );
}

// The signature element: what a customer's repayment plan looks like
function PlanStrip() {
  const weeks = ["paid", "paid", "paid", "due", "later", "later"];
  return (
    <div className="bg-white rounded-lg p-4 w-[19rem] max-w-full shadow-[0_24px_40px_-16px_rgba(4,52,44,0.45)]">
      <p className="text-sm font-semibold text-[#04342C]">Your plan, week by week</p>
      <div className="relative mt-4 flex justify-between">
        <div className="absolute left-3 right-3 top-3 h-px bg-[#C9DCD2]" aria-hidden />
        {weeks.map((w, i) => (
          <div key={i} className="relative flex flex-col items-center gap-1">
            <span
              className={`bv-tick grid place-items-center w-6 h-6 rounded-full text-[11px] font-bold ${
                w === "paid"
                  ? "bg-[#0F6E56] text-white"
                  : w === "due"
                  ? "bg-[#F2C14E] text-[#04342C] ring-4 ring-[#F2C14E]/30"
                  : "bg-white text-[#587067] border border-[#C9DCD2]"
              }`}
              style={{ animationDelay: `${0.9 + i * 0.18}s` }}
            >
              {w === "paid" ? "✓" : i + 1}
            </span>
            <span className="text-[10px] text-[#587067]">Wk {i + 1}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[#587067]">Paid weeks are ticked. The next one due is highlighted.</p>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  const name = settings.company_name || "Blessed Ventures";
  const paybill = settings.paybill || "522522";
  const account = settings.account_number || "8086860";
  const address = settings.address || "Wanguru, Mwea, Kenya";
  const wa = waNumber(settings.phone);

  useEffect(() => {
    // Staff who are already signed in go straight to the dashboard (add ?home=1 to the address to see this page)
    const token = localStorage.getItem("token");
    const forceHome = new URLSearchParams(window.location.search).get("home");
    if (token && !forceHome) { router.replace("/dashboard"); return; }
    setSignedIn(!!token);

    fetch(`${API}/api/settings`)
      .then(r => r.json())
      .then(d => { if (d && !d.error) setSettings(d); })
      .catch(() => {});
  }, []);

  const go = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  };

  const navLinks = [
    { id: "services", label: "What we offer" },
    { id: "how", label: "How it works" },
    { id: "pay", label: "How to pay" },
    { id: "contact", label: "Contact" },
  ];

  const loginLabel = signedIn ? "Open dashboard" : "Staff login";
  const loginGo = () => router.push(signedIn ? "/dashboard" : "/login");

  return (
    <div className="bv-body min-h-screen bg-[#EEF5F0] text-[#10261F]">
      <style>{`
        .bv-heading { font-family: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif; letter-spacing: -0.02em; }
        .bv-body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
        .bv-weave { background-color: #0F6E56;
          background-image: linear-gradient(135deg, rgba(255,255,255,.08) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,.08) 25%, transparent 25%), linear-gradient(45deg, rgba(255,255,255,.08) 25%, transparent 25%), linear-gradient(315deg, rgba(255,255,255,.08) 25%, #0F6E56 25%);
          background-size: 44px 44px; background-position: 22px 0, 22px 0, 0 0, 0 0; }
        @keyframes bv-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes bv-tick { 0% { opacity: 0; transform: scale(.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
        .bv-rise { animation: bv-rise .8s cubic-bezier(.2,.7,.2,1) both; }
        .bv-tick { animation: bv-tick .5s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .bv-rise, .bv-tick { animation: none; } }
        .bv-body a:focus-visible, .bv-body button:focus-visible { outline: 3px solid #F2C14E; outline-offset: 2px; }
      `}</style>

      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[#D5E4DB]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3" aria-label={`${name} home`}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="" className="w-9 h-9 rounded-md object-cover" />
            ) : (
              <span className="grid place-items-center w-9 h-9 rounded-md bg-[#04342C] text-[#F2C14E] font-bold bv-heading">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="bv-heading text-lg font-semibold text-[#04342C]">{name}</span>
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm" aria-label="Main">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => go(l.id)} className="text-[#2F4A40] hover:text-[#0F6E56]">{l.label}</button>
            ))}
            <button onClick={loginGo} className="rounded-full border border-[#04342C] px-4 py-1.5 font-medium text-[#04342C] hover:bg-[#04342C] hover:text-white transition-colors">
              {loginLabel}
            </button>
          </nav>

          <button className="md:hidden p-2 -mr-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen}>
            <span className="block w-6 h-0.5 bg-[#04342C] mb-1.5" />
            <span className="block w-6 h-0.5 bg-[#04342C] mb-1.5" />
            <span className="block w-6 h-0.5 bg-[#04342C]" />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-[#D5E4DB] bg-white px-5 py-3 flex flex-col">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => go(l.id)} className="text-left py-3 text-[#2F4A40] border-b border-[#EEF5F0]">{l.label}</button>
            ))}
            <button onClick={loginGo} className="mt-3 rounded-full bg-[#04342C] text-white py-2.5 font-medium">{loginLabel}</button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-5 pt-12 pb-20 md:pt-20 md:pb-28 grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-6">
          <h1 className="bv-heading bv-rise text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] text-[#04342C]">
            {COPY.heroTitle}
          </h1>
          <p className="bv-rise mt-6 text-lg leading-relaxed text-[#2F4A40] max-w-md" style={{ animationDelay: "0.15s" }}>
            {COPY.heroText}
          </p>
          <div className="bv-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.3s" }}>
            <button onClick={() => go("how")} className="rounded-full bg-[#F2C14E] text-[#04342C] px-6 py-3 font-semibold hover:bg-[#f5cb68] transition-colors">
              See how it works
            </button>
            <button onClick={() => go("contact")} className="rounded-full border border-[#04342C] text-[#04342C] px-6 py-3 font-semibold hover:bg-[#04342C] hover:text-white transition-colors">
              Contact us
            </button>
          </div>
        </div>

        <div className="md:col-span-6 relative">
          <div className="absolute -right-3 -bottom-3 w-full h-full rounded-xl bg-[#04342C]" aria-hidden />
          <Photo src="/images/hero.jpg" alt="Our customers and team" eager className="relative w-full h-[22rem] md:h-[30rem] rounded-xl" />
          <div className="absolute -bottom-8 left-3 md:-left-10 bv-rise" style={{ animationDelay: "0.6s" }}>
            <PlanStrip />
          </div>
        </div>
      </section>

      {/* ── What we offer: ruled rows, not cards ── */}
      <section id="services" className="scroll-mt-20 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-20 md:py-24 grid md:grid-cols-12 gap-10">
          <h2 className="bv-heading md:col-span-4 text-3xl md:text-4xl font-semibold text-[#04342C] leading-tight">What we offer</h2>
          <div className="md:col-span-8 divide-y divide-[#D5E4DB] border-y border-[#D5E4DB]">
            {COPY.services.map(s => (
              <div key={s.title} className="py-6 grid sm:grid-cols-5 gap-2 sm:gap-6">
                <h3 className="sm:col-span-2 text-lg font-semibold text-[#0F6E56]">{s.title}</h3>
                <p className="sm:col-span-3 text-[#2F4A40] leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Full-width photo band ── */}
      <section className="relative">
        <Photo src="/images/band.jpg" alt="Local market and farm life" className="w-full h-72 md:h-96" />
        <div className="absolute inset-0 bg-[#04342C]/60 flex items-center">
          <p className="bv-heading max-w-6xl mx-auto px-5 text-white text-2xl md:text-4xl font-semibold leading-snug md:max-w-3xl md:mr-auto md:ml-[max(1.25rem,calc((100vw-72rem)/2+1.25rem))]">
            {COPY.bandText}
          </p>
        </div>
      </section>

      {/* ── How it works: a real sequence, so numbered ── */}
      <section id="how" className="scroll-mt-20 max-w-6xl mx-auto px-5 py-20 md:py-24">
        <h2 className="bv-heading text-3xl md:text-4xl font-semibold text-[#04342C] max-w-xl leading-tight">How it works</h2>
        <ol className="mt-12 grid md:grid-cols-4 gap-10 md:gap-6 relative">
          <div className="hidden md:block absolute top-5 left-5 right-5 h-px bg-[#B9D2C5]" aria-hidden />
          {COPY.steps.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="relative grid place-items-center w-10 h-10 rounded-full bg-[#04342C] text-[#F2C14E] font-bold bv-heading">{i + 1}</span>
              <h3 className="mt-5 text-lg font-semibold text-[#04342C]">{s.title}</h3>
              <p className="mt-2 text-[#2F4A40] leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── About: text beside a photo ── */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-20 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <Photo src="/images/about.jpg" alt="Our team at work" className="w-full h-80 md:h-[26rem] rounded-xl" />
          <div>
            <h2 className="bv-heading text-3xl md:text-4xl font-semibold text-[#04342C] leading-tight">{COPY.aboutTitle}</h2>
            {COPY.aboutText.map(t => (
              <p key={t} className="mt-5 text-[#2F4A40] leading-relaxed max-w-lg">{t}</p>
            ))}
            <button onClick={() => go("contact")} className="mt-8 rounded-full bg-[#04342C] text-white px-6 py-3 font-semibold hover:bg-[#0F6E56] transition-colors">
              Talk to our team
            </button>
          </div>
        </div>
      </section>

      {/* ── How to pay ── */}
      <section id="pay" className="scroll-mt-20 bg-[#04342C] text-white">
        <div className="max-w-6xl mx-auto px-5 py-20 md:py-24 grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <h2 className="bv-heading text-3xl md:text-4xl font-semibold leading-tight">How to pay your instalment</h2>
            <p className="mt-5 text-[#BFE0D1] leading-relaxed max-w-sm">
              Pay the amount shown on your weekly plan. We send an SMS when your payment is recorded. Keep it as your receipt.
            </p>
          </div>
          <div className="md:col-span-7">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "paybill", label: "Business number", value: paybill },
                { key: "account", label: "Account number", value: account },
              ].map(f => (
                <div key={f.key} className="rounded-lg bg-[#0B4A3E] p-5">
                  <p className="text-sm text-[#BFE0D1]">{f.label}</p>
                  <p className="bv-heading mt-1 text-4xl font-semibold tracking-wide">{f.value}</p>
                  <button onClick={() => copy(f.value, f.key)} className="mt-3 rounded-full border border-[#F2C14E] text-[#F2C14E] px-4 py-1 text-sm hover:bg-[#F2C14E] hover:text-[#04342C] transition-colors">
                    {copied === f.key ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
            <ol className="mt-8 space-y-3 text-[#E3F2EA] list-decimal pl-5">
              <li>Open M-Pesa on your phone and choose Lipa na M-Pesa, then Pay Bill.</li>
              <li>Enter the business number and the account number shown above.</li>
              <li>Enter the amount from your weekly plan, then confirm with your PIN.</li>
              <li>Wait for our SMS confirming that the payment is recorded.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="scroll-mt-20 max-w-6xl mx-auto px-5 py-20 md:py-24 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <h2 className="bv-heading text-3xl md:text-4xl font-semibold text-[#04342C] leading-tight">Come and talk to us</h2>
          <p className="mt-5 text-[#2F4A40] leading-relaxed max-w-sm">Call, message or visit. Bring your national ID if you would like to start a request.</p>
        </div>
        <div className="md:col-span-7 divide-y divide-[#D5E4DB] border-y border-[#D5E4DB]">
          <div className="py-5 grid sm:grid-cols-4 gap-1 sm:gap-4">
            <p className="text-sm text-[#587067]">Visit</p>
            <p className="sm:col-span-3 font-medium">{address}</p>
          </div>
          {settings.phone && (
            <div className="py-5 grid sm:grid-cols-4 gap-1 sm:gap-4">
              <p className="text-sm text-[#587067]">Call</p>
              <p className="sm:col-span-3 font-medium"><a className="hover:text-[#0F6E56] underline underline-offset-4" href={`tel:${settings.phone.replace(/\s/g, "")}`}>{settings.phone}</a></p>
            </div>
          )}
          {wa && (
            <div className="py-5 grid sm:grid-cols-4 gap-1 sm:gap-4">
              <p className="text-sm text-[#587067]">WhatsApp</p>
              <p className="sm:col-span-3 font-medium"><a className="hover:text-[#0F6E56] underline underline-offset-4" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Send us a message</a></p>
            </div>
          )}
          {settings.email && (
            <div className="py-5 grid sm:grid-cols-4 gap-1 sm:gap-4">
              <p className="text-sm text-[#587067]">Email</p>
              <p className="sm:col-span-3 font-medium"><a className="hover:text-[#0F6E56] underline underline-offset-4" href={`mailto:${settings.email}`}>{settings.email}</a></p>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#D5E4DB] bg-white">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-sm text-[#587067]">
          <p>&copy; {new Date().getFullYear()} {name}. All rights reserved.</p>
          <button onClick={loginGo} className="self-start sm:self-auto underline underline-offset-4 hover:text-[#0F6E56]">{loginLabel}</button>
        </div>
      </footer>
    </div>
  );
}
