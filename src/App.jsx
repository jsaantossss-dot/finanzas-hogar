import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Plus, Trash2, Upload, Wallet, TrendingUp, TrendingDown,
  Target, ChevronLeft, ChevronRight, PiggyBank, Receipt,
} from "lucide-react";

const CATS = [
  { id: "vivienda", label: "Vivienda", color: "#6B8F71" },
  { id: "alimentacion", label: "Alimentación", color: "#C08A2E" },
  { id: "transporte", label: "Transporte", color: "#4E7C8C" },
  { id: "servicios", label: "Servicios", color: "#8C6B4E" },
  { id: "salud", label: "Salud", color: "#A6503D" },
  { id: "entretenimiento", label: "Entretenimiento", color: "#9C7BB3" },
  { id: "ahorro", label: "Ahorro / Inversión", color: "#3E7C5D" },
  { id: "otros", label: "Otros", color: "#8A8F87" },
];
const catById = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const STORAGE_KEY = "hogar-finanzas-data";

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function clp(n) {
  const v = Math.round(n || 0);
  return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("es-CL");
}

function parseAmount(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/[^0-9.,-]/g, "");
  if (s === "" || s === "-") return null;
  const neg = s.startsWith("-");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = s.split(".");
    if (parts.length > 2) s = parts.join("");
    else if (parts.length === 2 && parts[1].length === 3) s = parts.join("");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return neg ? -Math.abs(n) : n;
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return null;
}

function guessCategory(desc) {
  const d = (desc || "").toLowerCase();
  const rules = [
    [/(arriendo|hipoteca|gasto comun|dicom|inmobiliari)/, "vivienda"],
    [/(supermercado|lider|jumbo|tottus|santa isabel|unimarc|feria|almacen)/, "alimentacion"],
    [/(uber|didi|cabify|bencina|copec|shell|metro|bip|estacionamiento|peaje)/, "transporte"],
    [/(luz|agua|gas|internet|movistar|entel|wom|vtr|claro|telefon)/, "servicios"],
    [/(farmacia|cruz verde|salcobrand|clinica|isapre|fonasa|doctor|dental)/, "salud"],
    [/(netflix|spotify|cine|restaurant|bar |pub |hbo|disney|steam)/, "entretenimiento"],
    [/(deposito|ahorro|fondo mutuo|acciones|inversion|apv)/, "ahorro"],
  ];
  for (const [re, cat] of rules) if (re.test(d)) return cat;
  return "otros";
}

const styles = `
.hf-root{
  --paper:#E9EFEA; --paper-card:#FBFAF6; --ink:#1E3932; --ink-soft:#4A5F58;
  --line:#C7D2C9; --gold:#C08A2E; --expense:#A6503D; --income:#3E7C5D;
  --shadow: 0 1px 2px rgba(30,57,50,0.06), 0 4px 14px rgba(30,57,50,0.06);
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
  padding: 22px 16px 60px;
  box-sizing: border-box;
}
.hf-root *{ box-sizing: border-box; }
.hf-mono{ font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
.hf-display{ font-family: 'Fraunces', serif; }
.hf-max{ max-width: 860px; margin: 0 auto; }

.hf-header{ display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:12px; }
.hf-title{ font-size: 28px; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hf-sub{ font-size:12.5px; color:var(--ink-soft); margin-top:2px; letter-spacing:.02em; }

.hf-monthnav{ display:flex; align-items:center; gap:10px; background:var(--paper-card); border:1px solid var(--line); border-radius:999px; padding:6px 6px 6px 14px; box-shadow:var(--shadow); }
.hf-monthnav button{ border:none; background:transparent; cursor:pointer; color:var(--ink); width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
.hf-monthnav button:hover{ background:var(--paper); }
.hf-monthnav span{ font-size:13.5px; font-weight:600; min-width:118px; text-align:center; }

.hf-cards{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
@media (max-width:640px){ .hf-cards{ grid-template-columns:1fr; } }
.hf-card{ background:var(--paper-card); border:1px solid var(--line); border-radius:14px; padding:16px 18px; box-shadow:var(--shadow); position:relative; overflow:hidden; }
.hf-card .hf-label{ font-size:11.5px; text-transform:uppercase; letter-spacing:.08em; color:var(--ink-soft); display:flex; align-items:center; gap:6px; margin-bottom:8px;}
.hf-card .hf-amount{ font-size:22px; font-weight:600; }
.hf-card.income .hf-amount{ color: var(--income); }
.hf-card.expense .hf-amount{ color: var(--expense); }
.hf-card.balance .hf-amount{ color: var(--ink); }

.hf-tabs{ display:flex; gap:4px; border-bottom:1px solid var(--line); margin-bottom:20px; }
.hf-tab{ border:none; background:transparent; cursor:pointer; padding:9px 4px; margin-right:18px; font-size:13.5px; font-weight:600; color:var(--ink-soft); border-bottom:2px solid transparent; position:relative; top:1px; display:flex; align-items:center; gap:6px;}
.hf-tab.active{ color:var(--ink); border-bottom:2px solid var(--gold); }

.hf-section{ background:var(--paper-card); border:1px solid var(--line); border-radius:16px; padding:20px; box-shadow:var(--shadow); margin-bottom:18px; }
.hf-section h3{ font-size:14.5px; margin:0 0 14px; font-weight:600; display:flex; align-items:center; gap:8px; }
.hf-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:700px){ .hf-grid2{ grid-template-columns:1fr; } }

.hf-legend{ display:flex; flex-wrap:wrap; gap:8px 14px; margin-top:10px; }
.hf-legend-item{ display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--ink-soft); }
.hf-dot{ width:8px; height:8px; border-radius:50%; display:inline-block; }

.hf-form{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
.hf-input, .hf-select{ border:1px solid var(--line); background:#fff; border-radius:8px; padding:8px 10px; font-size:13px; font-family:inherit; color:var(--ink); }
.hf-input.desc{ flex:1 1 180px; }
.hf-input.date{ flex:0 0 138px; }
.hf-input.amount{ flex:0 0 120px; }
.hf-select{ flex:0 0 150px; }
.hf-btn{ border:none; border-radius:8px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; }
.hf-btn-primary{ background:var(--ink); color:#fff; }
.hf-btn-primary:hover{ background:#142722; }
.hf-btn-ghost{ background:transparent; color:var(--ink-soft); border:1px solid var(--line); }
.hf-btn-ghost:hover{ background:var(--paper); }
.hf-toggle-type{ display:flex; border:1px solid var(--line); border-radius:8px; overflow:hidden; flex:0 0 auto; }
.hf-toggle-type button{ border:none; background:#fff; padding:8px 12px; font-size:12.5px; font-weight:600; cursor:pointer; color:var(--ink-soft); }
.hf-toggle-type button.on.exp{ background:var(--expense); color:#fff; }
.hf-toggle-type button.on.inc{ background:var(--income); color:#fff; }

.hf-ledger{ border-top:1px dashed var(--line); }
.hf-day{ font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-soft); margin:14px 0 6px; }
.hf-row{ display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px dashed var(--line); }
.hf-row .cat-dot{ width:9px; height:9px; border-radius:50%; flex:0 0 auto; }
.hf-row .desc{ flex:1; font-size:13.5px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hf-row .cat{ font-size:11px; color:var(--ink-soft); flex:0 0 auto; }
.hf-row .amt{ font-weight:600; font-size:13.5px; flex:0 0 auto; min-width:88px; text-align:right; }
.hf-row .amt.inc{ color:var(--income); }
.hf-row .amt.exp{ color:var(--expense); }
.hf-row .del{ opacity:0; cursor:pointer; color:var(--ink-soft); background:none; border:none; flex:0 0 auto; }
.hf-row:hover .del{ opacity:1; }
.hf-empty{ text-align:center; padding:30px 10px; color:var(--ink-soft); font-size:13px; }

.hf-goal{ border:1px solid var(--line); border-radius:12px; padding:14px 16px; margin-bottom:12px; background:#fff; }
.hf-goal-top{ display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; gap:10px; }
.hf-goal-name{ font-weight:600; font-size:14px; }
.hf-goal-nums{ font-size:12px; color:var(--ink-soft); }
.hf-bar-track{ background:var(--paper); border-radius:999px; height:8px; overflow:hidden; }
.hf-bar-fill{ height:100%; background:linear-gradient(90deg,var(--income),var(--gold)); border-radius:999px; }
.hf-goal-actions{ display:flex; gap:6px; margin-top:10px; }
.hf-goal-actions input{ width:100px; }

.hf-import{ border:1px dashed var(--line); border-radius:12px; padding:14px; background:var(--paper); margin-bottom:18px; }
.hf-import textarea{ width:100%; min-height:80px; border:1px solid var(--line); border-radius:8px; padding:8px; font-family:'IBM Plex Mono',monospace; font-size:12px; resize:vertical; }
.hf-import-actions{ display:flex; justify-content:space-between; align-items:center; margin-top:8px; flex-wrap:wrap; gap:8px; }
.hf-import-help{ font-size:11.5px; color:var(--ink-soft); }
`;

const SEED_TX = () => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const d = (day) => `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return [
    { id: uid(), date: d(3), desc: "Sueldo", amount: 1200000, type: "income", cat: "otros" },
    { id: uid(), date: d(5), desc: "Arriendo", amount: -420000, type: "expense", cat: "vivienda" },
    { id: uid(), date: d(6), desc: "Jumbo", amount: -65000, type: "expense", cat: "alimentacion" },
    { id: uid(), date: d(8), desc: "Cuenta luz", amount: -32000, type: "expense", cat: "servicios" },
    { id: uid(), date: d(10), desc: "Netflix", amount: -9990, type: "expense", cat: "entretenimiento" },
    { id: uid(), date: d(12), desc: "Bencina", amount: -28000, type: "expense", cat: "transporte" },
  ];
};

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [tab, setTab] = useState("resumen");
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [form, setForm] = useState({ desc: "", amount: "", date: new Date().toISOString().slice(0, 10), cat: "otros", type: "expense" });
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [newGoal, setNewGoal] = useState({ name: "", target: "", current: "" });
  const [contribInputs, setContribInputs] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setTransactions(data.transactions || []);
        setGoals(data.goals || []);
      } else {
        setTransactions(SEED_TX());
        setGoals([{ id: uid(), name: "Fondo de emergencia", target: 1500000, current: 300000 }]);
      }
    } catch (e) {
      setTransactions(SEED_TX());
      setGoals([{ id: uid(), name: "Fondo de emergencia", target: 1500000, current: 300000 }]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions, goals }));
    } catch (e) {}
  }, [transactions, goals, loaded]);

  const monthTx = useMemo(() => {
    return transactions.filter((t) => {
      const [y, m] = t.date.split("-").map(Number);
      return y === cursor.y && m - 1 === cursor.m;
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, cursor]);

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    monthTx.forEach((t) => (t.amount >= 0 ? (income += t.amount) : (expense += -t.amount)));
    return { income, expense, balance: income - expense };
  }, [monthTx]);

  const byCategory = useMemo(() => {
    const map = {};
    monthTx.forEach((t) => {
      if (t.amount < 0) map[t.cat] = (map[t.cat] || 0) + -t.amount;
    });
    return Object.entries(map)
      .map(([cat, value]) => ({ cat, value, ...catById(cat) }))
      .sort((a, b) => b.value - a.value);
  }, [monthTx]);

  const last6 = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      let m = cursor.m - i, y = cursor.y;
      while (m < 0) { m += 12; y -= 1; }
      const label = MESES[m].slice(0, 3);
      let inc = 0, exp = 0;
      transactions.forEach((t) => {
        const [ty, tm] = t.date.split("-").map(Number);
        if (ty === y && tm - 1 === m) t.amount >= 0 ? (inc += t.amount) : (exp += -t.amount);
      });
      arr.push({ label, Ingresos: inc, Gastos: exp });
    }
    return arr;
  }, [transactions, cursor]);

  const grouped = useMemo(() => {
    const g = {};
    monthTx.forEach((t) => { (g[t.date] = g[t.date] || []).push(t); });
    return Object.entries(g).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [monthTx]);

  function addTransaction(e) {
    e.preventDefault();
    const amt = parseAmount(form.amount);
    if (!form.desc.trim() || amt === null || !form.date) return;
    const signed = form.type === "expense" ? -Math.abs(amt) : Math.abs(amt);
    setTransactions((prev) => [
      ...prev,
      { id: uid(), date: form.date, desc: form.desc.trim(), amount: signed, type: form.type, cat: form.type === "income" ? "otros" : form.cat },
    ]);
    setForm((f) => ({ ...f, desc: "", amount: "" }));
  }

  function removeTx(id) { setTransactions((prev) => prev.filter((t) => t.id !== id)); }

  function runImport() {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let added = 0, skipped = 0;
    const newRows = [];
    for (const line of lines) {
      if (/^fecha[;,]/i.test(line) || /^date[;,]/i.test(line)) continue;
      const sep = (line.match(/;/g) || []).length >= (line.match(/,/g) || []).length ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());
      if (parts.length < 2) { skipped++; continue; }
      let date = null;
      for (const p of parts) { if (!date) { const dd = parseDate(p); if (dd) date = dd; } }
      const amtCandidates = parts.filter((p) => parseAmount(p) !== null && !parseDate(p));
      let amount = amtCandidates.length ? parseAmount(amtCandidates[amtCandidates.length - 1]) : null;
      const desc = parts.filter((p) => p !== date && parseAmount(p) === null).join(" ").trim() || "Movimiento importado";
      if (!date || amount === null) { skipped++; continue; }
      newRows.push({ id: uid(), date, desc, amount, type: amount >= 0 ? "income" : "expense", cat: amount >= 0 ? "otros" : guessCategory(desc) });
      added++;
    }
    if (newRows.length) setTransactions((prev) => [...prev, ...newRows]);
    setImportMsg(`${added} movimiento(s) importado(s)${skipped ? `, ${skipped} línea(s) no reconocida(s)` : ""}.`);
    setCsvText("");
  }

  function addGoal(e) {
    e.preventDefault();
    const target = parseAmount(newGoal.target);
    const current = parseAmount(newGoal.current) || 0;
    if (!newGoal.name.trim() || !target) return;
    setGoals((prev) => [...prev, { id: uid(), name: newGoal.name.trim(), target, current }]);
    setNewGoal({ name: "", target: "", current: "" });
  }

  function contribute(id) {
    const val = parseAmount(contribInputs[id]);
    if (!val) return;
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, current: Math.max(0, g.current + val) } : g)));
    setContribInputs((prev) => ({ ...prev, [id]: "" }));
  }

  function removeGoal(id) { setGoals((prev) => prev.filter((g) => g.id !== id)); }

  function shiftMonth(delta) {
    setCursor((c) => {
      let m = c.m + delta, y = c.y;
      if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
      return { y, m };
    });
  }

  return (
    <div className="hf-root">
      <style>{styles}</style>
      <div className="hf-max">
        <div className="hf-header">
          <div>
            <p className="hf-title hf-display">Finanzas de la casa</p>
            <p className="hf-sub">Libro de movimientos, presupuesto y metas</p>
          </div>
          <div className="hf-monthnav">
            <button onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></button>
            <span>{MESES[cursor.m]} {cursor.y}</span>
            <button onClick={() => shiftMonth(1)}><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="hf-cards">
          <div className="hf-card income">
            <div className="hf-label"><TrendingUp size={13} /> Ingresos del mes</div>
            <div className="hf-amount hf-mono">{clp(totals.income)}</div>
          </div>
          <div className="hf-card expense">
            <div className="hf-label"><TrendingDown size={13} /> Gastos del mes</div>
            <div className="hf-amount hf-mono">{clp(totals.expense)}</div>
          </div>
          <div className="hf-card balance">
            <div className="hf-label"><Wallet size={13} /> Saldo</div>
            <div className="hf-amount hf-mono">{clp(totals.balance)}</div>
          </div>
        </div>

        <div className="hf-tabs">
          <button className={`hf-tab ${tab === "resumen" ? "active" : ""}`} onClick={() => setTab("resumen")}>Resumen</button>
          <button className={`hf-tab ${tab === "movimientos" ? "active" : ""}`} onClick={() => setTab("movimientos")}>Movimientos</button>
          <button className={`hf-tab ${tab === "metas" ? "active" : ""}`} onClick={() => setTab("metas")}>Ahorro e inversión</button>
        </div>

        {tab === "resumen" && (
          <div className="hf-grid2">
            <div className="hf-section">
              <h3><Receipt size={15} /> Gasto por categoría</h3>
              {byCategory.length === 0 ? (
                <div className="hf-empty">Sin gastos registrados este mes.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="label" innerRadius={52} outerRadius={80} paddingAngle={2}>
                        {byCategory.map((entry) => <Cell key={entry.cat} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <Tooltip formatter={(v) => clp(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #C7D2C9" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="hf-legend">
                    {byCategory.map((c) => (
                      <div className="hf-legend-item" key={c.cat}>
                        <span className="hf-dot" style={{ background: c.color }} />
                        {c.label} · {clp(c.value)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="hf-section">
              <h3><TrendingUp size={15} /> Últimos 6 meses</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={last6} margin={{ left: -18 }}>
                  <CartesianGrid vertical={false} stroke="#C7D2C9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#4A5F58" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#4A5F58" }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v) => clp(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #C7D2C9" }} />
                  <Bar dataKey="Ingresos" fill="#3E7C5D" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#A6503D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === "movimientos" && (
          <div className="hf-section">
            <h3><Plus size={15} /> Agregar movimiento</h3>
            <form className="hf-form" onSubmit={addTransaction}>
              <div className="hf-toggle-type">
                <button type="button" className={form.type === "expense" ? "on exp" : ""} onClick={() => setForm((f) => ({ ...f, type: "expense" }))}>Gasto</button>
                <button type="button" className={form.type === "income" ? "on inc" : ""} onClick={() => setForm((f) => ({ ...f, type: "income" }))}>Ingreso</button>
              </div>
              <input className="hf-input date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              <input className="hf-input desc" placeholder="Descripción (ej: Supermercado)" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} />
              {form.type === "expense" && (
                <select className="hf-select" value={form.cat} onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value }))}>
                  {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              )}
              <input className="hf-input amount" placeholder="Monto CLP" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              <button className="hf-btn hf-btn-primary" type="submit"><Plus size={14} /> Agregar</button>
              <button type="button" className="hf-btn hf-btn-ghost" onClick={() => setShowImport((s) => !s)}><Upload size={14} /> Importar CSV</button>
            </form>

            {showImport && (
              <div className="hf-import">
                <textarea
                  placeholder={"Pega aquí los movimientos exportados del banco, uno por línea.\nEj: 2026-08-05;Supermercado Jumbo;-45000\n2026-08-03;Transferencia recibida;850000"}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
                <div className="hf-import-actions">
                  <span className="hf-import-help">Acepta separador coma o punto y coma, fechas AAAA-MM-DD o DD/MM/AAAA. {importMsg}</span>
                  <button className="hf-btn hf-btn-primary" onClick={runImport}><Upload size={14} /> Procesar</button>
                </div>
              </div>
            )}

            <div className="hf-ledger">
              {grouped.length === 0 && <div className="hf-empty">No hay movimientos este mes todavía.</div>}
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <div className="hf-day">{new Date(date + "T00:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}</div>
                  {items.map((t) => (
                    <div className="hf-row" key={t.id}>
                      <span className="cat-dot" style={{ background: catById(t.cat).color }} />
                      <span className="desc">{t.desc}</span>
                      <span className="cat">{t.amount < 0 ? catById(t.cat).label : "Ingreso"}</span>
                      <span className={`amt hf-mono ${t.amount < 0 ? "exp" : "inc"}`}>{clp(t.amount)}</span>
                      <button className="del" onClick={() => removeTx(t.id)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "metas" && (
          <div className="hf-section">
            <h3><Target size={15} /> Metas de ahorro e inversión</h3>
            {goals.length === 0 && <div className="hf-empty">Aún no tienes metas. Crea la primera abajo.</div>}
            {goals.map((g) => {
              const pct = g.target ? Math.min(100, (g.current / g.target) * 100) : 0;
              return (
                <div className="hf-goal" key={g.id}>
                  <div className="hf-goal-top">
                    <span className="hf-goal-name"><PiggyBank size={14} style={{ marginRight: 6, verticalAlign: -2 }} />{g.name}</span>
                    <button className="del" style={{ opacity: 1 }} onClick={() => removeGoal(g.id)}><Trash2 size={14} /></button>
                  </div>
                  <div className="hf-bar-track"><div className="hf-bar-fill" style={{ width: `${pct}%` }} /></div>
                  <div className="hf-goal-nums hf-mono" style={{ marginTop: 6 }}>{clp(g.current)} de {clp(g.target)} · {pct.toFixed(0)}%</div>
                  <div className="hf-goal-actions">
                    <input className="hf-input" placeholder="Aportar monto" value={contribInputs[g.id] || ""} onChange={(e) => setContribInputs((prev) => ({ ...prev, [g.id]: e.target.value }))} />
                    <button className="hf-btn hf-btn-ghost" onClick={() => contribute(g.id)}>Aportar</button>
                  </div>
                </div>
              );
            })}
            <form className="hf-form" style={{ marginTop: 16, borderTop: "1px dashed var(--line)", paddingTop: 16 }} onSubmit={addGoal}>
              <input className="hf-input desc" placeholder="Nombre de la meta (ej: Vacaciones)" value={newGoal.name} onChange={(e) => setNewGoal((f) => ({ ...f, name: e.target.value }))} />
              <input className="hf-input amount" placeholder="Meta CLP" value={newGoal.target} onChange={(e) => setNewGoal((f) => ({ ...f, target: e.target.value }))} />
              <input className="hf-input amount" placeholder="Ya tengo (opcional)" value={newGoal.current} onChange={(e) => setNewGoal((f) => ({ ...f, current: e.target.value }))} />
              <button className="hf-btn hf-btn-primary" type="submit"><Plus size={14} /> Crear meta</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
