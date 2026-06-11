import { useState, useMemo, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Home as HomeIcon, CalendarDays, PieChart as ChartPie, Target, Wallet, Plus,
  UtensilsCrossed, Baby, ShoppingBasket, Coffee, Car, Stethoscope,
  Clapperboard, MoreHorizontal, Banknote, TrendingUp, Landmark,
  PiggyBank, LineChart, ChevronLeft, ChevronRight, ChevronDown, Pencil,
  Coins, CalendarHeart, ListChecks, Clock, MapPin, Check, Trash2, LogOut,
} from "lucide-react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, googleProvider, ALLOWED_EMAILS } from "./firebase.js";

// ──────── 디자인 토큰 ────────
const C = {
  bg: "#F4F6F5", card: "#FFFFFF", ink: "#101D17", sub: "#8A938D",
  line: "#EDF0EE", income: "#16A06A", expense: "#F25C44", asset: "#3568C9",
  soft: "#F0F4F1", moneyIn: "#2E62C9", moneyOut: "#E14B30",
};
const WHO = { 종현: "#3568C9", 성은: "#E5559A", 같이: "#16A06A" };
const CATS = {
  식비: { color: "#F25C44", Icon: UtensilsCrossed },
  육아: { color: "#F2A33C", Icon: Baby },
  생활용품: { color: "#8B7CF0", Icon: ShoppingBasket },
  "외식/카페": { color: "#E5559A", Icon: Coffee },
  교통: { color: "#3E9BD6", Icon: Car },
  의료: { color: "#16A06A", Icon: Stethoscope },
  문화: { color: "#6C5CE7", Icon: Clapperboard },
  기타: { color: "#9AA5A0", Icon: MoreHorizontal },
  급여: { color: "#16A06A", Icon: Banknote },
  부수입: { color: "#3568C9", Icon: TrendingUp },
  기타수입: { color: "#9AA5A0", Icon: MoreHorizontal },
};
const EXPENSE_CATS = ["식비", "육아", "생활용품", "외식/카페", "교통", "의료", "문화", "기타"];
const INCOME_CATS = ["급여", "부수입", "기타수입"];
const KINDS = { 예금: { color: "#16A06A", Icon: Landmark }, 적금: { color: "#F2A33C", Icon: PiggyBank }, 주식: { color: "#3568C9", Icon: LineChart } };

const fmt = (n) => (n || 0).toLocaleString("ko-KR") + "원";
const daysIn = (m, y) => new Date(y, m, 0).getDate();
const firstDow = (m, y) => new Date(y, m - 1, 1).getDay();
const font = `-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`;
const card = { background: C.card, borderRadius: 20, padding: 18, boxShadow: "0 1px 3px rgba(16,29,23,0.05)" };
const navBtn = (disabled) => ({
  width: 32, height: 32, borderRadius: 10, border: "none", background: "#fff",
  boxShadow: "0 1px 3px rgba(16,29,23,0.06)", cursor: disabled ? "default" : "pointer",
  color: disabled ? "#CFD6D1" : "#5A655F",
  display: "flex", alignItems: "center", justifyContent: "center",
});

// ──────── 공용 컴포넌트 ────────
function MonthNav({ month, setMonth }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button style={navBtn(false)} onClick={() => setMonth(month - 1)}><ChevronLeft size={17} /></button>
      <button style={navBtn(false)} onClick={() => setMonth(month + 1)}><ChevronRight size={17} /></button>
    </div>
  );
}
function WhoTag({ who }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color: WHO[who] || C.sub, background: (WHO[who] || C.sub) + "14", padding: "2px 8px", borderRadius: 8 }}>{who}</span>;
}
function CatBadge({ cat, size = 38 }) {
  const { color, Icon } = CATS[cat] || CATS["기타"];
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.32, flexShrink: 0, background: color + "1A", color, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={size * 0.5} strokeWidth={2.2} />
    </div>
  );
}
function TxRow({ t, showDate, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", cursor: onClick ? "pointer" : "default" }}>
      <CatBadge cat={t.cat} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.memo || t.cat}</div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{showDate ? `${t.month}/${t.day} · ` : ""}{t.cat}</span>
          {t.fixed && <span style={{ fontSize: 10, fontWeight: 700, color: "#7E8A83", background: "#EDF0EE", padding: "2px 7px", borderRadius: 7 }}>고정</span>}
          <WhoTag who={t.who} />
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.type === "income" ? C.moneyIn : C.moneyOut }}>{fmt(t.amount)}</div>
      {onClick && <ChevronRight size={15} color="#C6CEC9" style={{ flexShrink: 0, marginLeft: -4 }} />}
    </div>
  );
}
function MonthGrid({ month, year, selected, onSelect, renderDay }) {
  const dim = daysIn(month, year), fd = firstDow(month, year);
  const cells = [];
  for (let i = 0; i < fd; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
        {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => (
          <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: i === 0 ? C.expense : i === 6 ? C.asset : C.sub }}>{w}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={"e" + i} />;
          const isSel = d === selected;
          return (
            <button key={d} onClick={() => onSelect(d)} style={{ background: isSel ? C.ink : "none", border: "none", borderRadius: 12, padding: "6px 0 5px", cursor: "pointer", fontFamily: font, minHeight: 48 }}>
              <div style={{ fontSize: 13, fontWeight: isSel ? 800 : 600, color: isSel ? "#fff" : C.ink }}>{d}</div>
              {renderDay(d, isSel)}
            </button>
          );
        })}
      </div>
    </>
  );
}
function Sheet({ onClose, children, title }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(16,29,23,0.45)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 18px calc(env(safe-area-inset-bottom) + 24px)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, color: C.sub, cursor: "pointer", padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function DaySelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: font, background: "#fff", width: "100%" }}>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}일</option>)}
    </select>
  );
}

// ──────── 가계부: 홈 ────────
function Home({ totals, budget, txs, month, year, setMonth, onTx }) {
  const remain = budget - totals.expense;
  const pct = Math.min(100, Math.round((totals.expense / budget) * 100));
  const recent = [...txs].sort((a, b) => b.day - a.day).slice(0, 5);
  return (
    <div>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, padding: "0 2px" }}>
        <div>
          <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>{year}년 {month}월</div>
          <h1 style={{ fontSize: 23, fontWeight: 800, margin: "3px 0 0" }}>우리집 가계부</h1>
        </div>
        <MonthNav month={month} setMonth={setMonth} />
      </header>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>{month}월 남은 예산</div>
        <div style={{ fontSize: 31, fontWeight: 800, margin: "6px 0 14px", color: remain >= 0 ? C.ink : C.moneyOut }}>{fmt(remain)}</div>
        <div style={{ height: 8, background: C.soft, borderRadius: 5, overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", borderRadius: 5, background: pct > 85 ? C.expense : C.income, transition: "width .4s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 9, fontSize: 12, color: C.sub, fontWeight: 500 }}>
          <span>예산 {fmt(budget)}</span><span>{pct}% 사용</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
        <div style={{ ...card, flex: 1, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>수입</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.moneyIn, marginTop: 4 }}>{fmt(totals.income)}</div>
        </div>
        <div style={{ ...card, flex: 1, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>지출</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.moneyOut, marginTop: 4 }}>{fmt(totals.expense)}</div>
        </div>
      </div>
      {recent.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>최근 내역</div>
          {recent.map((t, i) => (
            <div key={t.id}>
              {i > 0 && <div style={{ height: 1, background: C.line }} />}
              <TxRow t={t} showDate onClick={() => onTx(t)} />
            </div>
          ))}
        </div>
      )}
      {recent.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: "40px 18px", color: C.sub }}>
          <Coins size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>이번 달 내역이 없어요</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>+ 버튼으로 추가해보세요</div>
        </div>
      )}
    </div>
  );
}

// ──────── 가계부: 달력 ────────
function MoneyCalendar({ txs, month, year, setMonth, onTx }) {
  const [sel, setSel] = useState(new Date().getDate());
  const byDay = useMemo(() => {
    const m = {};
    txs.forEach((t) => { if (!m[t.day]) m[t.day] = { in: 0, out: 0 }; if (t.type === "income") m[t.day].in += t.amount; else m[t.day].out += t.amount; });
    return m;
  }, [txs]);
  const dayTxs = txs.filter((t) => t.day === sel).sort((a, b) => a.type === "income" ? -1 : 1);
  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{year}년 {month}월</div>
        <MonthNav month={month} setMonth={setMonth} />
      </header>
      <div style={{ ...card, marginBottom: 16 }}>
        <MonthGrid month={month} year={year} selected={sel} onSelect={setSel} renderDay={(d, isSel) => {
          const info = byDay[d];
          if (!info) return null;
          return (
            <div style={{ marginTop: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              {info.in > 0 && <div style={{ fontSize: 8, fontWeight: 700, color: isSel ? "#fff" : C.moneyIn }}>{(info.in / 10000).toFixed(0)}만</div>}
              {info.out > 0 && <div style={{ fontSize: 8, fontWeight: 700, color: isSel ? "#ffb3a7" : C.moneyOut }}>{(info.out / 10000).toFixed(0)}만</div>}
            </div>
          );
        }} />
      </div>
      {dayTxs.length > 0 ? (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, marginBottom: 4 }}>{month}월 {sel}일</div>
          {dayTxs.map((t, i) => (
            <div key={t.id}>{i > 0 && <div style={{ height: 1, background: C.line }} />}<TxRow t={t} onClick={() => onTx(t)} /></div>
          ))}
        </div>
      ) : (
        <div style={{ ...card, textAlign: "center", padding: "28px 18px", color: C.sub, fontSize: 13 }}>선택한 날에 내역이 없어요</div>
      )}
    </div>
  );
}

// ──────── 가계부: 통계 ────────
function Stats({ byCat, totalExpense, prevExpense, txs, month, setMonth, onTx }) {
  const [openCat, setOpenCat] = useState(null);
  const COLORS = byCat.map((x) => (CATS[x.name] || CATS["기타"]).color);
  const diff = prevExpense != null ? totalExpense - prevExpense : null;
  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{month}월 통계</div>
        <MonthNav month={month} setMonth={setMonth} />
      </header>
      {byCat.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 18px", color: C.sub }}>
          <ChartPie size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>이번 달 지출 내역이 없어요</div>
        </div>
      ) : (
        <>
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>총 지출</div>
            <div style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 8px" }}>{fmt(totalExpense)}</div>
            {diff !== null && (
              <div style={{ fontSize: 12, color: diff > 0 ? C.moneyOut : C.income, fontWeight: 600 }}>
                지난달보다 {fmt(Math.abs(diff))} {diff > 0 ? "더 썼어요" : "덜 썼어요"}
              </div>
            )}
          </div>
          <div style={{ ...card, marginBottom: 12 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byCat} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={card}>
            {byCat.map((item) => {
              const { color } = CATS[item.name] || CATS["기타"];
              const pct = Math.round((item.value / totalExpense) * 100);
              const isOpen = openCat === item.name;
              const catTxs = txs.filter((t) => t.cat === item.name && t.type === "expense");
              return (
                <div key={item.name}>
                  <div onClick={() => setOpenCat(isOpen ? null : item.name)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", cursor: "pointer" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: C.sub }}>{pct}%</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(item.value)}</div>
                    <ChevronDown size={15} color={C.sub} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: ".2s" }} />
                  </div>
                  {isOpen && catTxs.map((t) => (
                    <div key={t.id} style={{ paddingLeft: 22 }}>
                      <TxRow t={t} showDate onClick={() => onTx(t)} />
                    </div>
                  ))}
                  <div style={{ height: 1, background: C.line }} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ──────── 가계부: 예산 ────────
function Budget({ budget, setBudget, spent, month, recurring, onAddRecurring, onEditRecurring, onDeleteRecurring }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(budget));
  const [showAddR, setShowAddR] = useState(false);
  const totalFixed = recurring.reduce((s, r) => s + r.amount, 0);
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>{month}월 예산</div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>월 예산</div>
          <button onClick={() => { setEditing(!editing); setVal(String(budget)); }} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub }}><Pencil size={16} /></button>
        </div>
        {editing ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" value={val} onChange={(e) => setVal(e.target.value)} style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 16, fontFamily: font }} />
            <button onClick={() => { setBudget(Number(val)); setEditing(false); }} style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>저장</button>
          </div>
        ) : (
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(budget)}</div>
        )}
        <div style={{ marginTop: 14, height: 8, background: C.soft, borderRadius: 5, overflow: "hidden" }}>
          <div style={{ width: Math.min(100, Math.round((spent / budget) * 100)) + "%", height: "100%", borderRadius: 5, background: spent > budget ? C.expense : C.income }} />
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 8 }}>사용 {fmt(spent)} · 남은 {fmt(budget - spent)}</div>
      </div>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>고정 지출 <span style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>매달 자동 반영</span></div>
          <button onClick={() => setShowAddR(true)} style={{ border: "none", background: C.soft, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Plus size={13} />추가</button>
        </div>
        {recurring.length === 0 && <div style={{ fontSize: 13, color: C.sub, textAlign: "center", padding: "20px 0" }}>고정 지출이 없어요</div>}
        {recurring.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{r.day}일 · <WhoTag who={r.who} /></div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(r.amount)}</div>
            <button onClick={() => onEditRecurring(r)} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub }}><Pencil size={15} /></button>
            <button onClick={() => onDeleteRecurring(r.id)} style={{ border: "none", background: "none", cursor: "pointer", color: C.expense }}><Trash2 size={15} /></button>
          </div>
        ))}
        {recurring.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 8, paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
            <span>합계</span><span>{fmt(totalFixed)}</span>
          </div>
        )}
      </div>
      {showAddR && <EditRecurSheet onClose={() => setShowAddR(false)} onSave={(r) => { onAddRecurring(r); setShowAddR(false); }} />}
    </div>
  );
}

// ──────── 가계부: 자산 ────────
function Assets({ assets, onAdd, onDelete }) {
  const total = assets.reduce((s, a) => s + a.amount, 0);
  const byKind = Object.entries(KINDS).map(([k]) => ({ kind: k, total: assets.filter((a) => a.kind === k).reduce((s, a) => s + a.amount, 0) })).filter((x) => x.total > 0);
  return (
    <div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>총 자산</div>
        <div style={{ fontSize: 28, fontWeight: 800, margin: "6px 0" }}>{fmt(total)}</div>
        {byKind.map((x) => {
          const { color } = KINDS[x.kind];
          return (
            <div key={x.kind} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.sub, marginTop: 4 }}>
              <span style={{ color }}>{x.kind}</span><span>{fmt(x.total)}</span>
            </div>
          );
        })}
      </div>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>계좌 목록</div>
        {assets.length === 0 && <div style={{ fontSize: 13, color: C.sub, textAlign: "center", padding: "20px 0" }}>자산을 추가해보세요</div>}
        {assets.map((a) => {
          const { color, Icon } = KINDS[a.kind] || KINDS["예금"];
          return (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: color + "1A", color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={19} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{a.kind}{a.monthly ? ` · 월 ${fmt(a.monthly)}` : ""}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.asset }}>{fmt(a.amount)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────── 일정 ────────
function Schedule({ events, month, year, setMonth, onJump, onEdit, onDelete }) {
  const [sel, setSel] = useState(null);
  const [showYM, setShowYM] = useState(false);
  const evMap = useMemo(() => {
    const m = {};
    events.filter((e) => e.month === month && (e.year || year) === year).forEach((e) => { if (!m[e.day]) m[e.day] = []; m[e.day].push(e); });
    return m;
  }, [events, month, year]);
  const dayEvs = sel ? (evMap[sel] || []) : [];
  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => setShowYM(true)} style={{ fontSize: 16, fontWeight: 800, background: "none", border: "none", cursor: "pointer", fontFamily: font, color: C.ink, display: "flex", alignItems: "center", gap: 4 }}>
          {year}년 {month}월 <ChevronDown size={16} />
        </button>
        <MonthNav month={month} setMonth={setMonth} />
      </header>
      <div style={{ ...card, marginBottom: 16 }}>
        <MonthGrid month={month} year={year} selected={sel} onSelect={setSel} renderDay={(d, isSel) => {
          const evs = evMap[d] || [];
          if (!evs.length) return null;
          return (
            <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2, flexWrap: "wrap", padding: "0 2px" }}>
              {evs.slice(0, 3).map((e, i) => <div key={i} style={{ width: 5, height: 5, borderRadius: 3, background: isSel ? "#fff" : (WHO[e.who] || C.sub) }} />)}
            </div>
          );
        }} />
      </div>
      {sel && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, marginBottom: 8 }}>{month}월 {sel}일</div>
          {dayEvs.length === 0 && <div style={{ fontSize: 13, color: C.sub, textAlign: "center", padding: "16px 0" }}>일정이 없어요</div>}
          {dayEvs.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
              <div style={{ width: 4, borderRadius: 3, alignSelf: "stretch", background: WHO[e.who] || C.sub, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 3, display: "flex", gap: 8 }}>
                  {e.time && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} />{e.time}</span>}
                  {e.place && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={11} />{e.place}</span>}
                  <WhoTag who={e.who} />
                </div>
              </div>
              <button onClick={() => onEdit(e)} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub, padding: 4 }}><Pencil size={15} /></button>
              <button onClick={() => onDelete(e.id)} style={{ border: "none", background: "none", cursor: "pointer", color: C.expense, padding: 4 }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
      {showYM && (
        <Sheet onClose={() => setShowYM(false)} title="연/월 선택">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button key={m} onClick={() => { onJump(year, m); setShowYM(false); }} style={{ padding: "10px 0", borderRadius: 10, border: `1px solid ${m === month ? C.ink : C.line}`, background: m === month ? C.ink : "#fff", color: m === month ? "#fff" : C.ink, fontWeight: 700, cursor: "pointer", fontFamily: font, fontSize: 13 }}>{m}월</button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ──────── 할일 ────────
function Todos({ todos, onToggle, onAdd, onDelete }) {
  const [text, setText] = useState("");
  const [who, setWho] = useState("같이");
  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>할일</div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {Object.keys(WHO).map((w) => (
            <button key={w} onClick={() => setWho(w)} style={{ flex: 1, border: `1.5px solid ${who === w ? WHO[w] : C.line}`, borderRadius: 10, padding: "8px 4px", background: who === w ? WHO[w] + "14" : "#fff", color: who === w ? WHO[w] : C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font }}>{w}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onAdd({ text: text.trim(), who }); setText(""); } }} placeholder="할일 입력..." style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: font }} />
          <button onClick={() => { if (text.trim()) { onAdd({ text: text.trim(), who }); setText(""); } }} style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>추가</button>
        </div>
      </div>
      {pending.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          {pending.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
              <button onClick={() => onToggle(t.id)} style={{ width: 22, height: 22, borderRadius: 8, border: `2px solid ${C.line}`, background: "#fff", cursor: "pointer", flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{t.text}</div>
              <WhoTag who={t.who} />
              <button onClick={() => onDelete(t.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#CFD6D1" }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
      {done.length > 0 && (
        <div style={{ ...card, opacity: 0.6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 8 }}>완료 {done.length}개</div>
          {done.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <button onClick={() => onToggle(t.id)} style={{ width: 22, height: 22, borderRadius: 8, border: "none", background: C.income, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={13} color="#fff" /></button>
              <div style={{ flex: 1, fontSize: 13, textDecoration: "line-through", color: C.sub }}>{t.text}</div>
              <button onClick={() => onDelete(t.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#CFD6D1" }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
      {todos.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: "40px 18px", color: C.sub }}>
          <ListChecks size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>할일이 없어요 👍</div>
        </div>
      )}
    </div>
  );
}

// ──────── 시트: 내역 추가/수정 ────────
function AddTxSheet({ month, year, initial, onClose, onSave, onDelete, onSaveRecurring }) {
  const isEdit = !!initial;
  const [type, setType] = useState(initial?.type || "expense");
  const [cat, setCat] = useState(initial?.cat || "식비");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [memo, setMemo] = useState(initial?.memo || "");
  const [who, setWho] = useState(initial?.who || "같이");
  const [day, setDay] = useState(initial?.day || new Date().getDate());
  const [makeFixed, setMakeFixed] = useState(false);
  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;
  useEffect(() => { if (!cats.includes(cat)) setCat(cats[0]); }, [type]);

  const save = () => {
    if (!amount) return;
    const t = { type, cat, amount: Number(amount), memo, who, day, month, year };
    if (makeFixed && onSaveRecurring) { onSaveRecurring({ name: memo || cat, amount: Number(amount), day, cat, who }); }
    else { onSave(t); }
  };
  const input = { border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: font, width: "100%", background: "#fff" };
  return (
    <Sheet onClose={onClose} title={isEdit ? "내역 수정" : "내역 추가"}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["expense", "income"].map((tp) => (
          <button key={tp} onClick={() => setType(tp)} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1.5px solid ${type === tp ? (tp === "income" ? C.moneyIn : C.moneyOut) : C.line}`, background: type === tp ? (tp === "income" ? C.moneyIn : C.moneyOut) : "#fff", color: type === tp ? "#fff" : C.sub, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: font }}>
            {tp === "expense" ? "지출" : "수입"}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>카테고리</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} style={{ padding: "7px 14px", borderRadius: 10, border: `1.5px solid ${cat === c ? C.ink : C.line}`, background: cat === c ? C.ink : "#fff", color: cat === c ? "#fff" : C.ink, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font }}>{c}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>금액</div>
        <input style={input} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액 입력" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>메모</div>
        <input style={input} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (선택)" />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>날짜</div>
          <DaySelect value={day} onChange={setDay} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>담당</div>
          <select value={who} onChange={(e) => setWho(e.target.value)} style={{ ...input }}>
            {Object.keys(WHO).map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>
      </div>
      {!isEdit && type === "expense" && onSaveRecurring && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={makeFixed} onChange={(e) => setMakeFixed(e.target.checked)} />매월 고정지출로 등록
        </label>
      )}
      <button onClick={save} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: C.ink, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: font }}>
        {isEdit ? "수정 완료" : "추가"}
      </button>
      {isEdit && onDelete && (
        <button onClick={onDelete} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: `1px solid ${C.expense}`, background: "#fff", color: C.expense, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: font }}>삭제</button>
      )}
    </Sheet>
  );
}

// ──────── 시트: 일정 추가/수정 ────────
function AddEventSheet({ month, year, initial, onClose, onSave, onDelete }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title || "");
  const [day, setDay] = useState(initial?.day || new Date().getDate());
  const [time, setTime] = useState(initial?.time || "");
  const [place, setPlace] = useState(initial?.place || "");
  const [who, setWho] = useState(initial?.who || "같이");
  const input = { border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: font, width: "100%", background: "#fff" };
  return (
    <Sheet onClose={onClose} title={isEdit ? "일정 수정" : "일정 추가"}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>제목</div>
        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="일정 제목" />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>날짜</div>
          <DaySelect value={day} onChange={setDay} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>시간</div>
          <input style={input} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>장소</div>
        <input style={input} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="장소 (선택)" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>담당</div>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.keys(WHO).map((w) => (
            <button key={w} onClick={() => setWho(w)} style={{ flex: 1, border: `1.5px solid ${who === w ? WHO[w] : C.line}`, borderRadius: 10, padding: "9px 4px", background: who === w ? WHO[w] + "14" : "#fff", color: who === w ? WHO[w] : C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font }}>{w}</button>
          ))}
        </div>
      </div>
      <button onClick={() => title && onSave({ title, day, time, place, who, month, year })} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: C.ink, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: font }}>
        {isEdit ? "수정 완료" : "추가"}
      </button>
      {isEdit && onDelete && (
        <button onClick={onDelete} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: `1px solid ${C.expense}`, background: "#fff", color: C.expense, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: font }}>삭제</button>
      )}
    </Sheet>
  );
}

// ──────── 시트: 고정지출 수정 ────────
function EditRecurSheet({ initial, onClose, onSave, onDelete }) {
  const [name, setName] = useState(initial?.name || "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [day, setDay] = useState(initial?.day || 1);
  const [cat, setCat] = useState(initial?.cat || "기타");
  const [who, setWho] = useState(initial?.who || "같이");
  const input = { border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: font, width: "100%", background: "#fff" };
  return (
    <Sheet onClose={onClose} title={initial ? "고정지출 수정" : "고정지출 추가"}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>항목명</div>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 통신비" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>금액</div>
        <input style={input} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액" />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>결제일</div>
          <DaySelect value={day} onChange={setDay} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>담당</div>
          <select value={who} onChange={(e) => setWho(e.target.value)} style={input}>
            {Object.keys(WHO).map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>카테고리</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EXPENSE_CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} style={{ padding: "7px 14px", borderRadius: 10, border: `1.5px solid ${cat === c ? C.ink : C.line}`, background: cat === c ? C.ink : "#fff", color: cat === c ? "#fff" : C.ink, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font }}>{c}</button>
          ))}
        </div>
      </div>
      <button onClick={() => name && amount && onSave({ name, amount: Number(amount), day, cat, who })} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: C.ink, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: font }}>저장</button>
      {initial && onDelete && (
        <button onClick={onDelete} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: `1px solid ${C.expense}`, background: "#fff", color: C.expense, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: font }}>삭제</button>
      )}
    </Sheet>
  );
}

// ──────── 로그인 화면 ────────
function LoginScreen({ onLogin, loading, error }) {
  return (
    <div style={{ fontFamily: font, background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🏠</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.ink, marginBottom: 8 }}>우리집</div>
      <div style={{ fontSize: 14, color: C.sub, marginBottom: 48, textAlign: "center" }}>가계부 · 일정 · 할일<br />두 사람만의 가족 앱</div>
      {error && <div style={{ fontSize: 13, color: C.expense, marginBottom: 16, textAlign: "center" }}>{error}</div>}
      <button onClick={onLogin} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 16, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: font, boxShadow: "0 2px 8px rgba(16,29,23,0.08)", color: C.ink }}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        {loading ? "로그인 중..." : "Google로 로그인"}
      </button>
    </div>
  );
}

// ──────── 메인 앱 ────────
export default function App() {
  const [user, setUser] = useState(undefined); // undefined=로딩, null=비로그인
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Firebase 데이터
  const [txs, setTxs] = useState([]);
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [assets, setAssets] = useState([]);
  const [budget, setBudgetState] = useState(2000000);

  // UI 상태
  const [mode, setMode] = useState("money");
  const [tab, setTab] = useState("home");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonthRaw] = useState(now.getMonth() + 1);
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [editRecur, setEditRecur] = useState(null);

  const setMonth = (m) => {
    if (m < 1) { setYear((y) => y - 1); setMonthRaw(12); }
    else if (m > 12) { setYear((y) => y + 1); setMonthRaw(1); }
    else setMonthRaw(m);
  };
  const jumpTo = (y, m) => { setYear(y); setMonthRaw(m); };

  // ── 인증 ──
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true); setLoginError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;
      const allowed = ALLOWED_EMAILS.filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(email)) {
        await signOut(auth);
        setLoginError("접근이 허용되지 않은 계정이에요.\n종현 또는 성은의 구글 계정으로 로그인해주세요.");
      }
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") setLoginError("로그인 중 오류가 발생했어요.");
    }
    setLoginLoading(false);
  };

  // ── Firestore 실시간 구독 ──
  useEffect(() => {
    if (!user) return;
    const unsubs = [
      onSnapshot(query(collection(db, "transactions"), orderBy("createdAt", "desc")), (snap) => {
        setTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(query(collection(db, "events"), orderBy("createdAt", "desc")), (snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(query(collection(db, "todos"), orderBy("createdAt", "desc")), (snap) => {
        setTodos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(collection(db, "recurring"), (snap) => {
        setRecurring(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(collection(db, "assets"), (snap) => {
        setAssets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(doc(db, "settings", "budget"), (snap) => {
        if (snap.exists()) setBudgetState(snap.data().amount || 2000000);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user]);

  // ── CRUD 핸들러 ──
  const addTx = useCallback(async (t) => {
    await addDoc(collection(db, "transactions"), { ...t, createdAt: serverTimestamp() });
  }, []);
  const updateTx = useCallback(async (id, t) => {
    await updateDoc(doc(db, "transactions", id), t);
  }, []);
  const deleteTx = useCallback(async (id) => {
    await deleteDoc(doc(db, "transactions", id));
  }, []);

  const addEvent = useCallback(async (e) => {
    await addDoc(collection(db, "events"), { ...e, createdAt: serverTimestamp() });
  }, []);
  const updateEvent = useCallback(async (id, e) => {
    await updateDoc(doc(db, "events", id), e);
  }, []);
  const deleteEvent = useCallback(async (id) => {
    await deleteDoc(doc(db, "events", id));
  }, []);

  const addTodo = useCallback(async (t) => {
    await addDoc(collection(db, "todos"), { ...t, done: false, createdAt: serverTimestamp() });
  }, []);
  const toggleTodo = useCallback(async (id, done) => {
    await updateDoc(doc(db, "todos", id), { done: !done });
  }, []);
  const deleteTodo = useCallback(async (id) => {
    await deleteDoc(doc(db, "todos", id));
  }, []);

  const addRecurring = useCallback(async (r) => {
    await addDoc(collection(db, "recurring"), r);
  }, []);
  const updateRecurring = useCallback(async (id, r) => {
    await updateDoc(doc(db, "recurring", id), r);
  }, []);
  const deleteRecurring = useCallback(async (id) => {
    await deleteDoc(doc(db, "recurring", id));
  }, []);

  const saveBudget = useCallback(async (amount) => {
    await setDoc(doc(db, "settings", "budget"), { amount });
    setBudgetState(amount);
  }, []);

  // ── 파생 데이터 ──
  const fixedFor = (m, y) => recurring.map((r) => ({
    id: "r" + r.id + "-" + y + "-" + m, rid: r.id, type: "expense", cat: r.cat || "기타",
    amount: r.amount, memo: r.name, who: r.who, day: r.day, month: m, year: y, fixed: true,
  }));
  const monthTxs = useMemo(
    () => [...txs.filter((t) => t.month === month && t.year === year), ...fixedFor(month, year)],
    [txs, recurring, month, year]
  );
  const prevExpense = useMemo(() => {
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? year - 1 : year;
    const real = txs.filter((t) => t.month === pm && t.year === py && t.type === "expense").reduce((s, t) => s + t.amount, 0);
    if (real === 0) return null;
    return real + recurring.reduce((s, r) => s + r.amount, 0);
  }, [txs, recurring, month, year]);
  const totals = useMemo(() => ({
    income: monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    expense: monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
  }), [monthTxs]);
  const byCat = useMemo(() => {
    const m = {};
    monthTxs.filter((t) => t.type === "expense").forEach((t) => { m[t.cat] = (m[t.cat] || 0) + t.amount; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTxs]);

  const openTx = (t) => {
    if (t.fixed) {
      const r = recurring.find((x) => x.id === t.rid);
      if (r) setEditRecur(r);
    } else setEditTx(t);
  };

  // ── 렌더 ──
  if (user === undefined) {
    return <div style={{ fontFamily: font, background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 14 }}>로딩 중...</div>;
  }
  if (!user) {
    return <LoginScreen onLogin={handleLogin} loading={loginLoading} error={loginError} />;
  }

  const modes = [["money", "가계부", Coins], ["schedule", "일정", CalendarHeart], ["todo", "할일", ListChecks]];
  const tabs = [["home", "홈", HomeIcon], ["cal", "달력", CalendarDays], ["stats", "통계", ChartPie], ["budget", "예산", Target], ["asset", "자산", Wallet]];

  return (
    <div style={{ fontFamily: font, background: C.bg, minHeight: "100vh", color: C.ink, maxWidth: 480, margin: "0 auto", position: "relative", letterSpacing: "-0.01em" }}>
      {/* 상단 모드 전환 */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(244,246,245,0.92)", backdropFilter: "blur(12px)", padding: "10px 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", background: "#E8ECEA", borderRadius: 14, padding: 3, gap: 2 }}>
          {modes.map(([k, label, Icon]) => {
            const active = mode === k;
            return (
              <button key={k} onClick={() => setMode(k)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 11, border: "none", fontFamily: font, cursor: "pointer", fontSize: 13, fontWeight: active ? 800 : 600, background: active ? "#fff" : "transparent", color: active ? C.ink : "#7E8A83", boxShadow: active ? "0 1px 4px rgba(16,29,23,0.1)" : "none", transition: "all .15s" }}>
                <Icon size={15} strokeWidth={active ? 2.4 : 2} />{label}
              </button>
            );
          })}
        </div>
        <button onClick={() => signOut(auth)} title="로그아웃" style={{ border: "none", background: "none", cursor: "pointer", color: C.sub, padding: 4, display: "flex" }}>
          <LogOut size={18} />
        </button>
      </div>

      <div style={{ padding: "10px 18px 120px" }}>
        {mode === "money" && (
          <>
            {tab === "home" && <Home totals={totals} budget={budget} txs={monthTxs} month={month} year={year} setMonth={setMonth} onTx={openTx} />}
            {tab === "cal" && <MoneyCalendar txs={monthTxs} month={month} year={year} setMonth={setMonth} onTx={openTx} />}
            {tab === "stats" && <Stats byCat={byCat} totalExpense={totals.expense} prevExpense={prevExpense} txs={monthTxs} month={month} setMonth={setMonth} onTx={openTx} />}
            {tab === "budget" && <Budget budget={budget} setBudget={saveBudget} spent={totals.expense} month={month} recurring={recurring} onAddRecurring={addRecurring} onEditRecurring={setEditRecur} onDeleteRecurring={deleteRecurring} />}
            {tab === "asset" && <Assets assets={assets} />}
          </>
        )}
        {mode === "schedule" && <Schedule events={events} month={month} year={year} setMonth={setMonth} onJump={jumpTo} onEdit={setEditEvent} onDelete={deleteEvent} />}
        {mode === "todo" && <Todos todos={todos} onToggle={(id) => { const t = todos.find((x) => x.id === id); if (t) toggleTodo(id, t.done); }} onAdd={addTodo} onDelete={deleteTodo} />}
      </div>

      {(mode === "money" || mode === "schedule") && (
        <button onClick={() => setShowAdd(true)} aria-label="추가" style={{ position: "fixed", bottom: mode === "money" ? 92 : 30, right: "max(18px, calc(50% - 222px))", width: 54, height: 54, borderRadius: 27, border: "none", background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(16,29,23,0.28)", cursor: "pointer", zIndex: 20 }}>
          <Plus size={26} />
        </button>
      )}

      {mode === "money" && (
        <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.line}`, display: "flex", padding: "8px 0 20px", zIndex: 25 }}>
          {tabs.map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: tab === k ? C.ink : "#B3BBB6", fontFamily: font, padding: 4 }}>
              <Icon size={22} strokeWidth={tab === k ? 2.4 : 1.8} style={{ display: "block", margin: "0 auto" }} />
              <div style={{ fontSize: 10.5, fontWeight: tab === k ? 700 : 500, marginTop: 3 }}>{label}</div>
            </button>
          ))}
        </nav>
      )}

      {/* 시트들 */}
      {showAdd && mode === "money" && (
        <AddTxSheet month={month} year={year} onClose={() => setShowAdd(false)}
          onSave={(t) => { addTx(t); setShowAdd(false); }}
          onSaveRecurring={(r) => { addRecurring(r); setShowAdd(false); }} />
      )}
      {showAdd && mode === "schedule" && (
        <AddEventSheet month={month} year={year} onClose={() => setShowAdd(false)}
          onSave={(e) => { addEvent(e); setShowAdd(false); }} />
      )}
      {editTx && (
        <AddTxSheet month={editTx.month} year={editTx.year} initial={editTx} onClose={() => setEditTx(null)}
          onSave={(t) => { updateTx(editTx.id, t); setEditTx(null); }}
          onDelete={() => { deleteTx(editTx.id); setEditTx(null); }} />
      )}
      {editEvent && (
        <AddEventSheet month={editEvent.month} year={editEvent.year} initial={editEvent} onClose={() => setEditEvent(null)}
          onSave={(e) => { updateEvent(editEvent.id, e); setEditEvent(null); }}
          onDelete={() => { deleteEvent(editEvent.id); setEditEvent(null); }} />
      )}
      {editRecur && (
        <EditRecurSheet initial={editRecur} onClose={() => setEditRecur(null)}
          onSave={(r) => { updateRecurring(editRecur.id, r); setEditRecur(null); }}
          onDelete={() => { deleteRecurring(editRecur.id); setEditRecur(null); }} />
      )}
    </div>
  );
}
