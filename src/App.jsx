import React, { useState, useEffect, useCallback } from "react";
import { Plus, ArrowLeftRight, Building2, Wallet, Users, Search, X, Check, Clock, TrendingUp, TrendingDown, Landmark, Calendar as CalendarIcon, Lock, LogOut, Crown } from "lucide-react";

// ---------- Design tokens ----------
// bg: #0B1F1C (deep ledger green-black)
// panel: #12302C
// panel-alt: #16382F
// gold accent: #C9A15A
// text: #EDEDE3 / muted: #8FA79A
// up: #4E9A6A  down: #C1584A

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');`;

// ---------- Supabase (real database) ----------
const SUPABASE_URL = "https://iwznumnncpboekfwydez.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3em51bW5uY3Bib2VrZnd5ZGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTk4MzcsImV4cCI6MjEwMjYzNTgzN30.lnYjwFONcl3CZfk4L2MS0UElr0OUpvtW6KyunK6ades";

async function dbGet(key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=value`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error("db read failed");
  const rows = await res.json();
  return rows && rows[0] ? rows[0].value : null;
}

async function dbSet(key, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_state`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error("db write failed");
  return true;
}

const CURRENCY_LABELS = {
  USD: "دالر آمریکایی",
  IRT: "تومان ایران",
  PKR: "کلدار پاکستانی",
  AFN: "افغانی",
  EUR: "یورو",
  AED: "درهم امارات",
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const fmt = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
};
const todayISO = () => new Date().toISOString();
const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
};

const DEFAULT_BRANCHES = [
  { id: uid(), name: "کابل - مرکزی", city: "کابل" },
  { id: uid(), name: "هرات", city: "هرات" },
  { id: uid(), name: "مزار شریف", city: "مزار شریف" },
];
const DEFAULT_CURRENCIES = ["USD", "IRT", "PKR", "AFN"];

function useStore() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const value = await dbGet("sarafi:data");
      if (value) {
        setData(value);
      } else {
        const initial = {
          branches: DEFAULT_BRANCHES,
          currencies: DEFAULT_CURRENCIES,
          balances: {},
          transactions: [],
          transfers: [],
          customers: [],
          tenants: [
            { id: uid(), name: "صرافی نمونه", email: "demo@sarafi.af", plan: "free", joinedAt: todayISO() },
          ],
        };
        setData(initial);
      }
    } catch (e) {
      setError("اتصال به دیتابیس برقرار نشد. اینترنت یا کلید Supabase را بررسی کنید.");
      setData({
        branches: DEFAULT_BRANCHES,
        currencies: DEFAULT_CURRENCIES,
        balances: {},
        transactions: [],
        transfers: [],
        customers: [],
        tenants: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(async (next) => {
    setData(next);
    setSaving(true);
    try {
      await dbSet("sarafi:data", next);
    } catch (e) {
      setError("خطا در ذخیره اطلاعات — اتصال به دیتابیس را بررسی کنید");
    } finally {
      setSaving(false);
    }
  }, []);

  return { data, setData: persist, loading, error, saving };
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "rgba(143,167,154,0.14)", color: "#8FA79A" },
    gold: { bg: "rgba(201,161,90,0.16)", color: "#C9A15A" },
    up: { bg: "rgba(78,154,106,0.16)", color: "#6FBF8B" },
    down: { bg: "rgba(193,88,74,0.16)", color: "#E08375" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        background: t.bg,
        color: t.color,
        fontSize: 12,
        padding: "3px 10px",
        borderRadius: 999,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Panel({ children, style }) {
  return (
    <div
      style={{
        background: "#12302C",
        border: "1px solid rgba(201,161,90,0.12)",
        borderRadius: 14,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#8FA79A", fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle = {
  background: "#0B1F1C",
  border: "1px solid rgba(201,161,90,0.25)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#EDEDE3",
  fontFamily: "Vazirmatn, sans-serif",
  fontSize: 14,
  outline: "none",
};

function Button({ children, onClick, variant = "primary", type = "button", disabled, style }) {
  const variants = {
    primary: { background: "#C9A15A", color: "#0B1F1C", border: "1px solid #C9A15A" },
    ghost: { background: "transparent", color: "#EDEDE3", border: "1px solid rgba(237,237,227,0.25)" },
    danger: { background: "transparent", color: "#E08375", border: "1px solid rgba(193,88,74,0.4)" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        padding: "10px 16px",
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "Vazirmatn, sans-serif",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "transform 0.12s ease",
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,15,13,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#132D2A",
          border: "1px solid rgba(201,161,90,0.3)",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 460,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#EDEDE3" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8FA79A", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function useOwnerAuth() {
  const [owner, setOwner] = useState(undefined); // undefined = loading, null = none set
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const value = await dbGet("sarafi:owner");
        setOwner(value || null);
      } catch {
        setOwner(null);
      }
    })();
  }, []);

  const login = async (email, password) => {
    setAuthError("");
    if (owner === null) {
      // first run: this login seeds the owner account
      const rec = { email, password };
      try {
        await dbSet("sarafi:owner", rec);
        setOwner(rec);
        setSession(email);
      } catch {
        setAuthError("اتصال به دیتابیس برقرار نشد. دوباره تلاش کنید.");
      }
      return;
    }
    if (owner && owner.email === email && owner.password === password) {
      setSession(email);
    } else {
      setAuthError("ایمیل یا رمز عبور اشتباه است.");
    }
  };

  const logout = () => setSession(null);

  return { owner, session, login, logout, authError, ready: owner !== undefined };
}

function LoginScreen({ isFirstRun, onLogin, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#0B1F1C", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Vazirmatn, sans-serif", padding: 16 }}>
      <Panel style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#C9A15A,#8A6B2E)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={18} color="#0B1F1C" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>ورود مدیر سایت</div>
        </div>
        <div style={{ fontSize: 12, color: "#8FA79A", marginBottom: 18 }}>
          {isFirstRun ? "این اولین ورود است — همین ایمیل و رمز به‌عنوان حساب مدیر ثبت می‌شود." : "با ایمیل و رمز مدیر وارد شوید."}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="ایمیل">
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="رمز عبور">
            <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <div style={{ color: "#E08375", fontSize: 12 }}>{error}</div>}
          <Button disabled={!email || !password} onClick={() => onLogin(email, password)}>ورود</Button>
        </div>
      </Panel>
    </div>
  );
}

// ---------- Main App ----------
export default function SarafiApp() {
  const { data, setData, loading, error, saving } = useStore();
  const auth = useOwnerAuth();
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!document.getElementById("sarafi-font")) {
      const style = document.createElement("style");
      style.id = "sarafi-font";
      style.innerHTML = FONT_IMPORT;
      document.head.appendChild(style);
    }
  }, []);

  if (loading || !data || !auth.ready) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1F1C", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#8FA79A", fontFamily: "Vazirmatn, sans-serif" }}>در حال بارگذاری...</div>
      </div>
    );
  }

  if (!auth.session) {
    return <LoginScreen isFirstRun={auth.owner === null} onLogin={auth.login} error={auth.authError} />;
  }

  const getBalance = (branchId, currency) => (data.balances[branchId] && data.balances[branchId][currency]) || 0;

  const adjustBalance = (balances, branchId, currency, delta) => {
    const next = { ...balances };
    next[branchId] = { ...(next[branchId] || {}) };
    next[branchId][currency] = (next[branchId][currency] || 0) + delta;
    return next;
  };

  // ---- Actions ----
  const addBranch = (name, city) => {
    const branch = { id: uid(), name, city };
    setData({ ...data, branches: [...data.branches, branch] });
  };

  const addCurrency = (code) => {
    if (data.currencies.includes(code)) return;
    setData({ ...data, currencies: [...data.currencies, code] });
  };

  const recordTransaction = ({ branchId, type, currency, amount, rate, counterCurrency, note }) => {
    const tx = {
      id: uid(),
      branchId,
      type, // 'buy' or 'sell' (buy = sarafi buys foreign currency from customer, paying local; sell = opposite)
      currency,
      amount: Number(amount),
      rate: Number(rate),
      counterCurrency,
      counterAmount: Number(amount) * Number(rate),
      note: note || "",
      createdAt: todayISO(),
    };
    let balances = data.balances;
    // buy: sarafi gains `currency`, loses `counterCurrency`
    // sell: sarafi loses `currency`, gains `counterCurrency`
    if (type === "buy") {
      balances = adjustBalance(balances, branchId, currency, tx.amount);
      balances = adjustBalance(balances, branchId, counterCurrency, -tx.counterAmount);
    } else {
      balances = adjustBalance(balances, branchId, currency, -tx.amount);
      balances = adjustBalance(balances, branchId, counterCurrency, tx.counterAmount);
    }
    setData({ ...data, balances, transactions: [tx, ...data.transactions] });
  };

  const createTransfer = ({ fromBranchId, toBranchId, currency, amount, senderName, senderPhone, receiverName, receiverPhone, note }) => {
    const code = "HW-" + uid().toUpperCase().slice(0, 6);
    const transfer = {
      id: uid(),
      code,
      fromBranchId,
      toBranchId,
      currency,
      amount: Number(amount),
      senderName,
      senderPhone,
      receiverName,
      receiverPhone,
      note: note || "",
      status: "pending",
      createdAt: todayISO(),
      deliveredAt: null,
    };
    // money deposited at source branch: increases source cash (customer paid in), and creates a payable owed to destination branch
    const balances = adjustBalance(data.balances, fromBranchId, currency, Number(amount));
    setData({ ...data, balances, transfers: [transfer, ...data.transfers] });
  };

  const deliverTransfer = (transferId) => {
    const transfer = data.transfers.find((t) => t.id === transferId);
    if (!transfer || transfer.status !== "pending") return;
    const balances = adjustBalance(data.balances, transfer.toBranchId, transfer.currency, -transfer.amount);
    const transfers = data.transfers.map((t) =>
      t.id === transferId ? { ...t, status: "delivered", deliveredAt: todayISO() } : t
    );
    setData({ ...data, balances, transfers });
  };

  const cancelTransfer = (transferId) => {
    const transfer = data.transfers.find((t) => t.id === transferId);
    if (!transfer || transfer.status !== "pending") return;
    const balances = adjustBalance(data.balances, transfer.fromBranchId, transfer.currency, -transfer.amount);
    const transfers = data.transfers.map((t) => (t.id === transferId ? { ...t, status: "cancelled" } : t));
    setData({ ...data, balances, transfers });
  };

  const branchName = (id) => data.branches.find((b) => b.id === id)?.name || "—";

  const addTenant = (name, email, plan) => {
    const tenant = { id: uid(), name, email, plan, joinedAt: todayISO() };
    setData({ ...data, tenants: [...(data.tenants || []), tenant] });
  };

  const setTenantPlan = (tenantId, plan) => {
    const tenants = (data.tenants || []).map((t) => (t.id === tenantId ? { ...t, plan } : t));
    setData({ ...data, tenants });
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#0B1F1C",
        fontFamily: "Vazirmatn, sans-serif",
        color: "#EDEDE3",
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(201,161,90,0.15)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#C9A15A,#8A6B2E)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Landmark size={20} color="#0B1F1C" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: 0.2 }}>دفتر صرافی</div>
            <div style={{ fontSize: 11, color: "#8FA79A" }}>سیستم حسابداری چند شعبه</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 12, color: saving ? "#C9A15A" : "#8FA79A" }}>
            {saving ? "در حال ذخیره..." : "همه تغییرات ذخیره شده"}
          </div>
          <button onClick={auth.logout} title="خروج" style={{ background: "none", border: "none", color: "#8FA79A", cursor: "pointer", display: "flex" }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(193,88,74,0.15)", color: "#E08375", padding: "10px 24px", fontSize: 13 }}>{error}</div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, padding: "14px 24px 0", overflowX: "auto" }}>
        {[
          { id: "dashboard", label: "خلاصه", icon: TrendingUp },
          { id: "transactions", label: "معاملات ارزی", icon: Wallet },
          { id: "transfers", label: "حواله‌ها", icon: ArrowLeftRight },
          { id: "branches", label: "شعبه‌ها", icon: Building2 },
          { id: "calendar", label: "تقویم", icon: CalendarIcon },
          { id: "subscribers", label: "مشترکین", icon: Crown },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: active ? "#12302C" : "transparent",
                border: "1px solid",
                borderColor: active ? "rgba(201,161,90,0.4)" : "transparent",
                borderBottom: active ? "1px solid #12302C" : "1px solid transparent",
                color: active ? "#C9A15A" : "#8FA79A",
                padding: "10px 16px",
                borderRadius: "10px 10px 0 0",
                fontFamily: "Vazirmatn, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        {tab === "dashboard" && (
          <Dashboard data={data} getBalance={getBalance} branchName={branchName} />
        )}
        {tab === "transactions" && (
          <TransactionsTab
            data={data}
            branchName={branchName}
            getBalance={getBalance}
            onAdd={() => setModal("tx")}
          />
        )}
        {tab === "transfers" && (
          <TransfersTab
            data={data}
            branchName={branchName}
            onAdd={() => setModal("transfer")}
            onDeliver={deliverTransfer}
            onCancel={cancelTransfer}
          />
        )}
        {tab === "branches" && (
          <BranchesTab data={data} getBalance={getBalance} onAddBranch={() => setModal("branch")} onAddCurrency={() => setModal("currency")} />
        )}
        {tab === "calendar" && <CalendarTab data={data} branchName={branchName} />}
        {tab === "subscribers" && (
          <SubscribersTab data={data} onAdd={() => setModal("tenant")} onSetPlan={setTenantPlan} />
        )}
      </div>

      {modal === "tx" && (
        <TransactionModal data={data} onClose={() => setModal(null)} onSubmit={(v) => { recordTransaction(v); setModal(null); }} />
      )}
      {modal === "transfer" && (
        <TransferModal data={data} onClose={() => setModal(null)} onSubmit={(v) => { createTransfer(v); setModal(null); }} />
      )}
      {modal === "branch" && (
        <BranchModal onClose={() => setModal(null)} onSubmit={(name, city) => { addBranch(name, city); setModal(null); }} />
      )}
      {modal === "currency" && (
        <CurrencyModal onClose={() => setModal(null)} onSubmit={(c) => { addCurrency(c); setModal(null); }} />
      )}
      {modal === "tenant" && (
        <TenantModal onClose={() => setModal(null)} onSubmit={(n, e, p) => { addTenant(n, e, p); setModal(null); }} />
      )}
    </div>
  );
}

function CalendarTab({ data, branchName }) {
  const events = [
    ...data.transfers.filter((t) => t.status === "pending").map((t) => ({
      date: t.createdAt, label: `حواله در انتظار: ${fmt(t.amount)} ${t.currency} (${branchName(t.fromBranchId)} ← ${branchName(t.toBranchId)})`, tone: "gold",
    })),
    ...data.transactions.slice(0, 10).map((tx) => ({
      date: tx.createdAt, label: `${tx.type === "buy" ? "خرید" : "فروش"} ${fmt(tx.amount)} ${tx.currency} در ${branchName(tx.branchId)}`, tone: tx.type === "buy" ? "up" : "down",
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>تقویم رویدادها</div>
      {events.length === 0 ? (
        <Panel><div style={{ color: "#8FA79A", textAlign: "center", padding: 20 }}>هنوز رویدادی ثبت نشده.</div></Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.map((ev, i) => (
            <Panel key={i} style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13 }}>{ev.label}</span>
              <Badge tone={ev.tone}>{fmtDate(ev.date)}</Badge>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function SubscribersTab({ data, onAdd, onSetPlan }) {
  const tenants = data.tenants || [];
  const planLabel = { free: "رایگان", vip: "VIP" };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>مشترکین (صرافی‌های مشتری)</div>
        <Button onClick={onAdd}><Plus size={16} /> افزودن مشترک</Button>
      </div>
      {tenants.length === 0 ? (
        <Panel><div style={{ color: "#8FA79A", textAlign: "center", padding: 20 }}>هنوز مشترکی اضافه نشده.</div></Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tenants.map((t) => (
            <Panel key={t.id} style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#8FA79A" }}>{t.email}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge tone={t.plan === "vip" ? "gold" : "neutral"}>{planLabel[t.plan] || t.plan}</Badge>
                {t.plan !== "vip" ? (
                  <Button variant="ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => onSetPlan(t.id, "vip")}>ارتقا به VIP</Button>
                ) : (
                  <Button variant="ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => onSetPlan(t.id, "free")}>بازگشت به رایگان</Button>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function TenantModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("free");
  return (
    <Modal title="افزودن مشترک جدید" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="نام صرافی">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="ایمیل">
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="پلن">
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant={plan === "free" ? "primary" : "ghost"} onClick={() => setPlan("free")} style={{ flex: 1, justifyContent: "center" }}>رایگان</Button>
            <Button variant={plan === "vip" ? "primary" : "ghost"} onClick={() => setPlan("vip")} style={{ flex: 1, justifyContent: "center" }}>VIP</Button>
          </div>
        </Field>
        <Button disabled={!name || !email} onClick={() => onSubmit(name, email, plan)}>افزودن</Button>
      </div>
    </Modal>
  );
}

function Dashboard({ data, getBalance, branchName }) {
  const pendingTransfers = data.transfers.filter((t) => t.status === "pending");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {data.branches.map((b) => (
          <Panel key={b.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800 }}>{b.name}</div>
              <Badge>{b.city}</Badge>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.currencies.map((c) => {
                const bal = getBalance(b.id, c);
                return (
                  <div key={c} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#8FA79A" }}>{c}</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600, color: bal < 0 ? "#E08375" : "#EDEDE3" }}>
                      {fmt(bal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>حواله‌های در انتظار ({pendingTransfers.length})</div>
        {pendingTransfers.length === 0 ? (
          <div style={{ color: "#8FA79A", fontSize: 13 }}>هیچ حواله در انتظاری نیست.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendingTransfers.slice(0, 5).map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid rgba(201,161,90,0.08)", paddingBottom: 8 }}>
                <span>{branchName(t.fromBranchId)} ← {branchName(t.toBranchId)}</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{fmt(t.amount)} {t.currency}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function TransactionsTab({ data, branchName, onAdd }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>معاملات ارزی</div>
        <Button onClick={onAdd}><Plus size={16} /> ثبت معامله جدید</Button>
      </div>
      {data.transactions.length === 0 ? (
        <Panel><div style={{ color: "#8FA79A", textAlign: "center", padding: 20 }}>هنوز معامله‌ای ثبت نشده.</div></Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.transactions.map((tx) => (
            <Panel key={tx.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge tone={tx.type === "buy" ? "up" : "down"}>{tx.type === "buy" ? "خرید" : "فروش"}</Badge>
                  <span style={{ fontSize: 13, color: "#8FA79A" }}>{branchName(tx.branchId)}</span>
                </div>
                <span style={{ fontSize: 11, color: "#8FA79A" }}>{fmtDate(tx.createdAt)}</span>
              </div>
              <div style={{ marginTop: 8, fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 600 }}>
                {fmt(tx.amount)} {tx.currency} = {fmt(tx.counterAmount)} {tx.counterCurrency}
                <span style={{ color: "#8FA79A", fontFamily: "Vazirmatn, sans-serif", fontWeight: 400 }}> (نرخ {fmt(tx.rate)})</span>
              </div>
              {tx.note && <div style={{ marginTop: 6, fontSize: 12, color: "#8FA79A" }}>{tx.note}</div>}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function TransfersTab({ data, branchName, onAdd, onDeliver, onCancel }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>حواله‌ها</div>
        <Button onClick={onAdd}><Plus size={16} /> حواله جدید</Button>
      </div>
      {data.transfers.length === 0 ? (
        <Panel><div style={{ color: "#8FA79A", textAlign: "center", padding: 20 }}>هنوز حواله‌ای ثبت نشده.</div></Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.transfers.map((t) => (
            <Panel key={t.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#C9A15A", fontSize: 13 }}>{t.code}</div>
                  <div style={{ marginTop: 4, fontSize: 14 }}>{branchName(t.fromBranchId)} ← {branchName(t.toBranchId)}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#8FA79A" }}>فرستنده: {t.senderName} ({t.senderPhone})</div>
                  <div style={{ fontSize: 13, color: "#8FA79A" }}>گیرنده: {t.receiverName} ({t.receiverPhone})</div>
                </div>
                <div style={{ textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: 16 }}>{fmt(t.amount)} {t.currency}</div>
                  <Badge tone={t.status === "pending" ? "gold" : t.status === "delivered" ? "up" : "down"}>
                    {t.status === "pending" ? "در انتظار" : t.status === "delivered" ? "تحویل شده" : "لغو شده"}
                  </Badge>
                  {t.status === "pending" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="ghost" onClick={() => onDeliver(t.id)} style={{ padding: "6px 10px", fontSize: 12 }}>
                        <Check size={13} /> تحویل شد
                      </Button>
                      <Button variant="danger" onClick={() => onCancel(t.id)} style={{ padding: "6px 10px", fontSize: 12 }}>
                        لغو
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function BranchesTab({ data, getBalance, onAddBranch, onAddCurrency }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>شعبه‌ها</div>
          <Button onClick={onAddBranch}><Plus size={16} /> شعبه جدید</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          {data.branches.map((b) => (
            <Panel key={b.id}>
              <div style={{ fontWeight: 700 }}>{b.name}</div>
              <div style={{ fontSize: 12, color: "#8FA79A", marginTop: 4 }}>{b.city}</div>
            </Panel>
          ))}
        </div>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>ارزها</div>
          <Button onClick={onAddCurrency}><Plus size={16} /> افزودن ارز</Button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {data.currencies.map((c) => (
            <Badge key={c} tone="gold">{c} — {CURRENCY_LABELS[c] || c}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionModal({ data, onClose, onSubmit }) {
  const [branchId, setBranchId] = useState(data.branches[0]?.id || "");
  const [type, setType] = useState("buy");
  const [currency, setCurrency] = useState(data.currencies[0] || "USD");
  const [counterCurrency, setCounterCurrency] = useState(data.currencies[1] || "AFN");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [note, setNote] = useState("");

  const valid = branchId && amount && rate && currency !== counterCurrency;

  return (
    <Modal title="ثبت معامله ارزی" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="شعبه">
          <select style={inputStyle} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {data.branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
        </Field>
        <Field label="نوع معامله">
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant={type === "buy" ? "primary" : "ghost"} onClick={() => setType("buy")} style={{ flex: 1, justifyContent: "center" }}>خرید</Button>
            <Button variant={type === "sell" ? "primary" : "ghost"} onClick={() => setType("sell")} style={{ flex: 1, justifyContent: "center" }}>فروش</Button>
          </div>
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="ارز">
            <select style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {data.currencies.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </Field>
          <Field label="ارز مقابل">
            <select style={inputStyle} value={counterCurrency} onChange={(e) => setCounterCurrency(e.target.value)}>
              {data.currencies.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="مقدار">
            <input style={inputStyle} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </Field>
          <Field label="نرخ تبدیل">
            <input style={inputStyle} type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0" />
          </Field>
        </div>
        {amount && rate && (
          <div style={{ fontSize: 13, color: "#8FA79A", fontFamily: "JetBrains Mono, monospace" }}>
            = {fmt(Number(amount) * Number(rate))} {counterCurrency}
          </div>
        )}
        <Field label="یادداشت (اختیاری)">
          <input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder="نام مشتری یا توضیح" />
        </Field>
        <Button disabled={!valid} onClick={() => onSubmit({ branchId, type, currency, amount, rate, counterCurrency, note })}>
          ثبت معامله
        </Button>
      </div>
    </Modal>
  );
}

function TransferModal({ data, onClose, onSubmit }) {
  const [fromBranchId, setFromBranchId] = useState(data.branches[0]?.id || "");
  const [toBranchId, setToBranchId] = useState(data.branches[1]?.id || data.branches[0]?.id || "");
  const [currency, setCurrency] = useState(data.currencies[0] || "USD");
  const [amount, setAmount] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [note, setNote] = useState("");

  const valid = fromBranchId && toBranchId && fromBranchId !== toBranchId && amount && senderName && receiverName;

  return (
    <Modal title="حواله جدید" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="از شعبه">
            <select style={inputStyle} value={fromBranchId} onChange={(e) => setFromBranchId(e.target.value)}>
              {data.branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </Field>
          <Field label="به شعبه">
            <select style={inputStyle} value={toBranchId} onChange={(e) => setToBranchId(e.target.value)}>
              {data.branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="ارز">
            <select style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {data.currencies.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </Field>
          <Field label="مبلغ">
            <input style={inputStyle} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="نام فرستنده">
            <input style={inputStyle} value={senderName} onChange={(e) => setSenderName(e.target.value)} />
          </Field>
          <Field label="شماره فرستنده">
            <input style={inputStyle} value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="نام گیرنده">
            <input style={inputStyle} value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
          </Field>
          <Field label="شماره گیرنده">
            <input style={inputStyle} value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} />
          </Field>
        </div>
        <Field label="یادداشت (اختیاری)">
          <input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button disabled={!valid} onClick={() => onSubmit({ fromBranchId, toBranchId, currency, amount, senderName, senderPhone, receiverName, receiverPhone, note })}>
          ثبت حواله
        </Button>
      </div>
    </Modal>
  );
}

function BranchModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  return (
    <Modal title="شعبه جدید" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="نام شعبه">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: کندهار" />
        </Field>
        <Field label="شهر">
          <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Button disabled={!name || !city} onClick={() => onSubmit(name, city)}>افزودن شعبه</Button>
      </div>
    </Modal>
  );
}

function CurrencyModal({ onClose, onSubmit }) {
  const [code, setCode] = useState("");
  return (
    <Modal title="افزودن ارز" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="کد ارز (مثال: EUR)">
          <input style={inputStyle} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={5} />
        </Field>
        <Button disabled={!code} onClick={() => onSubmit(code)}>افزودن</Button>
      </div>
    </Modal>
  );
}
