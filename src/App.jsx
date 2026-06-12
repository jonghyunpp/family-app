import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Home as HomeIcon, CalendarDays, PieChart as ChartPie, Target, Wallet, Plus,
  Utensils, Baby, ShoppingBasket, Car, Stethoscope,
  MoreHorizontal, Banknote, TrendingUp, Landmark,
  PiggyBank, LineChart, ChevronLeft, ChevronRight, ChevronDown, Pencil,
  Coins, CalendarHeart, ListChecks, Clock, MapPin, Check, Trash2, LogOut,
  CreditCard, Shirt, Building2, Plane, BookOpen, Gift, Search, StickyNote, Download, Upload, Repeat2, X,
} from "lucide-react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc,
  query, orderBy, serverTimestamp, getDocs, writeBatch,
} from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, USERS } from "./firebase.js";

// ──────── 디자인 토큰 ────────
const C_LIGHT = {
  bg: "#F4F6F5", card: "#FFFFFF", ink: "#101D17", sub: "#8A938D",
  line: "#EDF0EE", income: "#16A06A", expense: "#F25C44", asset: "#3568C9",
  soft: "#F0F4F1", moneyIn: "#2E62C9", moneyOut: "#E14B30",
};
const C_DARK = {
  bg: "#111816", card: "#1C2820", ink: "#E6EFEA", sub: "#7A8A7E",
  line: "#2C3C34", income: "#2ECC87", expense: "#F25C44", asset: "#5588E8",
  soft: "#1A2822", moneyIn: "#5588E8", moneyOut: "#E85040",
};
const C = { ...C_LIGHT }; // 런타임에 Object.assign으로 테마 전환
const WHO = { 종현: "#3568C9", 성은: "#E5559A", 같이: "#16A06A" };
const CATS = {
  외식:          { color: "#C85010", bg: "#FFE0C0", Icon: Utensils },        // 오렌지
  생필품:        { color: "#4830B0", bg: "#D4C8F8", Icon: ShoppingBasket },  // 라벤더
  육아:          { color: "#985800", bg: "#FFD89A", Icon: Baby },            // 피치골드
  교통:          { color: "#1860B8", bg: "#C0D8F8", Icon: Car },             // 하늘
  "의료/건강":   { color: "#0A8050", bg: "#B8EDD8", Icon: Stethoscope },     // 민트그린
  "의류/미용":   { color: "#C01880", bg: "#F9C8EC", Icon: Shirt },           // 핫핑크
  "여행/문화":   { color: "#087878", bg: "#B0E8E4", Icon: Plane },           // 틸
  교육:          { color: "#0848A8", bg: "#B8CCF4", Icon: BookOpen },        // 블루
  경조사:        { color: "#B81030", bg: "#F9C0CC", Icon: Gift },            // 로즈레드
  "주거/공과금": { color: "#3838B0", bg: "#C8C8F4", Icon: Building2 },       // 인디고
  기타:          { color: "#486058", bg: "#C8D4D0", Icon: MoreHorizontal },  // 세이지그레이
  급여:       { color: "#0A8050", bg: "#B8EDD8", Icon: Banknote },           // 민트그린
  부수입:     { color: "#0848A8", bg: "#B8CCF4", Icon: TrendingUp },         // 블루
  기타수입:   { color: "#7C6840", bg: "#EDE3C8", Icon: MoreHorizontal },     // 황토
};
// 알 수 없는 카테고리: 이름 해시로 고유 색상 생성 (fallback이 항상 기타색으로 겹치는 문제 방지)
function getCatInfo(name) {
  if (CATS[name]) return CATS[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (name.charCodeAt(i) + ((h << 5) - h)) | 0;
  const hue = ((Math.abs(h) % 36) * 10 + 10) % 360;
  return { color: `hsl(${hue},60%,40%)`, bg: `hsl(${hue},55%,88%)`, Icon: MoreHorizontal };
}
const EXPENSE_CATS = ["외식", "생필품", "육아", "교통", "의료/건강", "의류/미용", "여행/문화", "교육", "경조사", "주거/공과금", "기타"];
const INCOME_CATS = ["급여", "부수입", "기타수입"];

// ──────── 이용내역서 파서 ────────
const CAT_KW = {
  "외식":      ["마트","편의점","GS25","CU","세븐","이마트","롯데마트","홈플러스","코스트코","농협하나로","쿠팡로켓","SSG","노브랜드","트레이더스","다이소","위마트","배달의민족","배민","쿠팡이츠","요기요","맥도날드","버거킹","KFC","롯데리아","서브웨이","치킨","피자","족발","보쌈","냉면","해장국","분식","김밥","고기집","삼겹","갈비","순대","떡볶이","초밥","덮밥","짜장","짬뽕","돈까스","우동","라멘","식당","음식점","스타벅스","이디야","투썸","커피빈","할리스","탐앤탐스","빽다방","메가커피","컴포즈","카페","베이커리","파리바게뜨","뚜레쥬르","설빙","베스킨","던킨","도넛","마카롱","크리스피","공차","코코","요거트","와플","포차","호프","술집","BAR","bar","주점","나이트","클럽","노래방","PC방","오락실"],
  "의류/미용":   ["무신사","지그재그","29cm","에이블리","미용실","헤어","네일","살롱","뷰티","아모레","LG생활","이니스프리","에뛰드","H&M","자라","유니클로","스파오","탑텐","신세계몰","롯데온","올리브영"],
  "의료/건강":   ["병원","의원","약국","한의원","치과","안과","이비인후과","피부과","정형외과","내과","소아과","산부인과","헬스","피트니스","스포츠센터","수영","요가","필라테스","GX클럽"],
  "교통":        ["주유소","SK에너지","GS칼텍스","S-OIL","에쓰오일","현대오일","알뜰주유","택시","카카오T","우버","티머니","하이패스","주차","EX고속","KTX","SRT","기차","고속버스","항공","대한항공","아시아나","제주항공","진에어","에어서울","티웨이","이스타"],
  "주거/공과금": ["관리비","아파트관리","월세","보증금","인테리어","가구","청소업체","이사","용달","SKT","SK텔레콤","KT","LGU+","LG유플러스","통신비","핸드폰","알뜰폰","넷플릭스","왓챠","웨이브","시즌","디즈니","애플","구글","유튜브프리미엄","스포티파이","멜론","전기세","전기요금","도시가스","수도요금","한전","한국전력","지역난방","전기도시"],
  "생필품":    ["이케아","쿠쿠","리빙","청소","세제","생필품","락앤락","3M","크린랩"],
  "여행/문화":  ["CGV","롯데시네마","메가박스","교보문고","영풍문고","알라딘","예스24","도서","공연","전시","박물관","멜론","지니","스팀","닌텐도","플레이스테이션","호텔","에어비앤비","야놀자","여기어때","여행사","투어","리조트","펜션","모텔","게스트하우스"],
  "교육":      ["학원","교육","과외","강의","학습지","웅진","대교","클래스101","인프런","패스트캠퍼스","유데미","구름"],
  "육아":      ["유치원","어린이집","키즈","장난감","레고","아동복","베이비","분유","기저귀","맘스클럽"],
  "경조사":    ["화환","꽃집","플라워","장례","예식"],
  "급여":      ["급여","월급","임금","봉급","급료"],
  "부수입":    ["이자","배당","환급","캐시백"],
};

function guessCat(desc) {
  if (!desc) return "기타";
  const d = desc.replace(/\s/g, "");
  for (const [cat, kws] of Object.entries(CAT_KW)) {
    if (kws.some((kw) => d.includes(kw.replace(/\s/g, "")))) return cat;
  }
  return "기타";
}
function parseAmt(v) { return Math.abs(Number(String(v || "").replace(/[^0-9.-]/g, ""))) || 0; }
function parseDateStr(v) {
  if (!v) return {};
  const s = String(v).replace(/[.\-\/년월일\s]/g, "").replace(/T.*/,"");
  if (s.length >= 8) return { year: +s.slice(0,4), month: +s.slice(4,6), day: +s.slice(6,8) };
  if (s.length === 6) return { year: 2000 + +s.slice(0,2), month: +s.slice(2,4), day: +s.slice(4,6) };
  return {};
}
async function parseStatement(file) {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", codepage: 949 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // 헤더 행 찾기 (비어있지 않은 첫 행)
  let hi = 0;
  for (let i = 0; i < Math.min(15, raw.length); i++) {
    if (raw[i].filter((c) => c !== "").length >= 3) { hi = i; break; }
  }
  const headers = raw[hi].map((h) => String(h).trim());
  const hj = headers.join(",");

  // 컬럼 인덱스 자동 감지
  const col = (kws) => headers.findIndex((h) => kws.some((k) => h.includes(k)));
  const dateCol = col(["이용일","거래일","날짜","일자"]);
  const descCol = col(["가맹점명","이용가맹점","적요명","적요","내용","거래내용"]);
  const amtCol  = col(["이용금액","출금금액","출금","찾으신","거래금액"]);
  const inCol   = col(["입금금액","입금","맡기신"]);
  const isCard  = hj.includes("가맹점") || hj.includes("이용금액");

  const results = [];
  for (let i = hi + 1; i < raw.length; i++) {
    const row = raw[i];
    if (row.every((c) => c === "" || c === 0)) continue;
    const dateObj = parseDateStr(row[dateCol >= 0 ? dateCol : 0]);
    if (!dateObj.year) continue;
    const desc = String(row[descCol >= 0 ? descCol : 1] || "").trim();
    const out = parseAmt(row[amtCol >= 0 ? amtCol : (isCard ? 2 : 3)]);
    const inp = inCol >= 0 ? parseAmt(row[inCol]) : 0;
    const amount = out > 0 ? out : inp;
    if (!amount) continue;
    const type = inp > 0 && out === 0 ? "income" : "expense";
    const cat = guessCat(desc);
    results.push({ ...dateObj, type, cat, amount, memo: desc, fixed: false });
  }
  return results;
}

function ImportSheet({ onClose, onBulkSave, currentWho }) {
  const [step, setStep] = useState("upload");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [defaultWho, setDefaultWho] = useState(currentWho);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setLoading(true); setErr("");
    try {
      const parsed = await parseStatement(f);
      if (!parsed.length) setErr("내역을 찾을 수 없어요. 파일을 확인해주세요.");
      else { setRows(parsed.map((r) => ({ ...r, who: defaultWho }))); setStep("preview"); }
    } catch (ex) { setErr("읽기 실패: " + ex.message); }
    setLoading(false);
  };

  const updateRow = (i, field, val) =>
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, [field]: val };
      // 타입이 바뀌면 카테고리도 초기화
      if (field === "type") updated.cat = val === "income" ? "급여" : "외식";
      return updated;
    }));
  const removeRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <Sheet onClose={onClose} title="내역 불러오기">
      {step === "upload" && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>은행·카드 이용내역 파일</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 16, lineHeight: 1.8 }}>
            KB국민 · 신한 · 삼성 · 농협 · 롯데 · 현대 · 우리<br/>
            CSV / XLSX 파일을 선택해주세요
          </div>
          {/* 담당자 선택 */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
            {Object.keys(WHO).map((w) => (
              <button key={w} onClick={() => setDefaultWho(w)}
                style={{ padding: "7px 18px", borderRadius: 10, border: `1.5px solid ${defaultWho === w ? WHO[w] : C.line}`, background: defaultWho === w ? WHO[w] + "14" : "#fff", color: defaultWho === w ? WHO[w] : C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font }}>
                {w}
              </button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} disabled={loading}
            style={{ padding: "14px 36px", borderRadius: 14, border: "none", background: C.ink, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: font }}>
            {loading ? "분석 중..." : "파일 선택"}
          </button>
          {err && <div style={{ marginTop: 16, color: C.expense, fontSize: 13 }}>{err}</div>}
        </div>
      )}
      {step === "preview" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{rows.length}건 인식 — 확인 후 저장</div>
            <button onClick={() => { setStep("upload"); setRows([]); setErr(""); }}
              style={{ fontSize: 12, color: C.sub, border: "none", background: "none", cursor: "pointer" }}>다시 선택</button>
          </div>
          <div style={{ maxHeight: "52vh", overflowY: "auto", marginBottom: 12 }}>
            {rows.map((r, i) => {
              const { color, bg } = CATS[r.cat] || CATS["기타"];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
                  {/* 수입/지출 토글 */}
                  <button onClick={() => updateRow(i, "type", r.type === "income" ? "expense" : "income")}
                    style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "3px 6px", borderRadius: 6, border: "none", cursor: "pointer", background: r.type === "income" ? C.moneyIn + "18" : C.moneyOut + "18", color: r.type === "income" ? C.moneyIn : C.moneyOut }}>
                    {r.type === "income" ? "수입" : "지출"}
                  </button>
                  {/* 카테고리 */}
                  <select value={r.cat} onChange={(e) => updateRow(i, "cat", e.target.value)}
                    style={{ background: bg, color, fontWeight: 700, border: `1.5px solid ${color}`, borderRadius: 8, padding: "4px 5px", fontSize: 11, fontFamily: font, flexShrink: 0, maxWidth: 76 }}>
                    {(r.type === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <div style={{ flex: 1, fontSize: 12, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.sub }}>{r.memo}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: r.type === "income" ? C.moneyIn : C.moneyOut, flexShrink: 0 }}>{fmt(r.amount)}</div>
                  <div style={{ fontSize: 11, color: C.sub, flexShrink: 0 }}>{r.month}/{r.day}</div>
                  <button onClick={() => removeRow(i)} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub, padding: 0, flexShrink: 0 }}><Trash2 size={13} /></button>
                </div>
              );
            })}
          </div>
          <button onClick={() => onBulkSave(rows)}
            style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: C.ink, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: font }}>
            {rows.length}건 저장
          </button>
        </>
      )}
    </Sheet>
  );
}
const KINDS = { 예금: { color: "#16A06A", Icon: Landmark }, 적금: { color: "#F2A33C", Icon: PiggyBank }, 주식: { color: "#3568C9", Icon: LineChart } };

const fmt = (n) => (n || 0).toLocaleString("ko-KR") + "원";
// 입력 중 콤마 포맷 (내부 저장은 숫자문자열, 표시만 콤마)
const fmtInput = (v) => { const n = String(v || "").replace(/[^0-9]/g, ""); return n ? Number(n).toLocaleString("ko-KR") : ""; };
const parseInput = (v) => String(v || "").replace(/[^0-9]/g, "");
const daysIn = (m, y) => new Date(y, m, 0).getDate();
const firstDow = (m, y) => new Date(y, m - 1, 1).getDay();
const font = `-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`;
// card는 getter로 정의해서 C.card가 바뀌면 항상 최신값 반환
const card = { get background() { return C.card; }, borderRadius: 20, padding: 18, boxShadow: "0 1px 3px rgba(16,29,23,0.05)" };
const navBtn = (disabled) => ({
  width: 32, height: 32, borderRadius: 10, border: "none", background: C.card,
  boxShadow: "0 1px 3px rgba(16,29,23,0.06)", cursor: disabled ? "default" : "pointer",
  color: disabled ? C.line : C.sub,
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
  const { color, bg, Icon } = getCatInfo(cat);
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.32, flexShrink: 0, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={size * 0.5} strokeWidth={2.2} />
    </div>
  );
}
function instInfo(t) {
  if (!t.installment || !t.installmentTotal) return null;
  const remaining = t.installmentTotal - t.installmentCurrent;
  const endDate = new Date(t.year, t.month - 1 + (t.installmentTotal - t.installmentCurrent + 1));
  const endStr = `${endDate.getFullYear()}년 ${endDate.getMonth() + 1}월`;
  return { current: t.installmentCurrent, total: t.installmentTotal, remaining, endStr };
}
function TxRow({ t, showDate, onClick, onPin }) {
  const inst = instInfo(t);
  const pinned = !!t.rid; // recurring에서 생성된 고정 항목
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
      <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, cursor: onClick ? "pointer" : "default" }}>
        <CatBadge cat={t.cat} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.memo || t.cat}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span>{showDate ? `${t.month}/${t.day} · ` : ""}{t.cat}</span>
            {t.fixed && <span style={{ fontSize: 10, fontWeight: 700, color: C.sub, background: C.soft, padding: "2px 7px", borderRadius: 7 }}>고정</span>}
            {inst && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", background: "#EDE9FE", padding: "2px 7px", borderRadius: 7, display: "flex", alignItems: "center", gap: 3 }}>
                <CreditCard size={9} strokeWidth={2.5} />{inst.current}/{inst.total} · 잔여 {inst.remaining}회 · {inst.endStr} 종료
              </span>
            )}
            <WhoTag who={t.who} />
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.type === "income" ? C.moneyIn : C.moneyOut, flexShrink: 0 }}>{fmt(t.amount)}</div>
        {onClick && <ChevronRight size={15} color="#C6CEC9" style={{ flexShrink: 0, marginLeft: -4 }} />}
      </div>
      {onPin && t.type === "expense" && !t.installment && (
        <button
          onClick={(e) => { e.stopPropagation(); onPin(t); }}
          title={pinned ? "고정 지출 해제" : "고정 지출로 등록"}
          style={{ flexShrink: 0, border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: pinned ? C.income : C.line }}
        >
          <Repeat2 size={15} strokeWidth={pinned ? 2.5 : 1.8} />
        </button>
      )}
    </div>
  );
}
function MonthGrid({ month, year, selected, onSelect, renderDay }) {
  const dim = daysIn(month, year), fd = firstDow(month, year);
  const nowD = new Date();
  const todayNum = nowD.getMonth() + 1 === month && nowD.getFullYear() === year ? nowD.getDate() : null;
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
          const isToday = d === todayNum;
          return (
            <button key={d} onClick={() => onSelect(d)} style={{ background: isSel ? C.ink : "none", border: isToday && !isSel ? `1.5px solid ${C.income}` : "none", borderRadius: 12, padding: "6px 0 5px", cursor: "pointer", fontFamily: font, minHeight: 48 }}>
              <div style={{ fontSize: 13, fontWeight: isSel || isToday ? 800 : 600, color: isSel ? "#fff" : isToday ? C.income : C.ink }}>{d}</div>
              {renderDay(d, isSel)}
            </button>
          );
        })}
      </div>
    </>
  );
}
// ──────── 빠른 입력 바 ────────
function QuickAddBar({ who: defaultWho = "종현", onSave, onDetail, onClose, date, darkMode = false }) {
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("외식");
  const inputRef = useRef(null);

  const ALL_CATS = [...EXPENSE_CATS, ...INCOME_CATS];
  const inferredType = INCOME_CATS.includes(cat) ? "income" : "expense";

  const handleSave = (saveType, saveCat) => {
    const n = Number(amount);
    if (!n) return;
    const finalCat = saveCat ?? cat;
    let dy, mo, yr;
    if (date) {
      [yr, mo, dy] = date.split("-").map(Number);
    } else {
      const today = new Date();
      dy = today.getDate(); mo = today.getMonth() + 1; yr = today.getFullYear();
    }
    onSave({ type: saveType, cat: finalCat, amount: n, month: mo, day: dy, year: yr, who: defaultWho, memo: "", fixed: false });
    setAmount("");
    inputRef.current?.blur();
    onClose?.();
  };

  const accentColor = inferredType === "expense" ? C.moneyOut : C.moneyIn;

  return (
    <div style={{ position: "fixed", bottom: "calc(max(84px, calc(env(safe-area-inset-bottom, 0px) + 76px)))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 24px)", maxWidth: 456, background: darkMode ? "#1A2E28" : "#EEF4F0", borderRadius: 20, padding: "10px 14px 12px", zIndex: 22, boxShadow: "0 4px 24px rgba(16,29,23,0.14), 0 1px 4px rgba(16,29,23,0.06)" }}>
      {/* 날짜 표시 (달력 탭에서 날짜 선택 시) */}
      {date && (() => { const [dy, dm, dd] = date.split("-").map(Number); return (
        <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, marginBottom: 5 }}>{dm}월 {dd}일 입력 중</div>
      ); })()}
      {/* 카테고리 + 상세입력 버튼 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", flex: 1, WebkitOverflowScrolling: "touch", padding: "3px 2px" }}>
          {ALL_CATS.map((c) => {
            const { color, bg } = CATS[c];
            const sel = cat === c;
            return (
              <button key={c} onClick={() => setCat(c)} style={{ flexShrink: 0, border: `1.5px solid ${sel ? color : "transparent"}`, borderRadius: 20, padding: "5px 11px", background: sel ? bg : darkMode ? "#243830" : "#D8E8DC", color: sel ? color : C.sub, fontSize: 12, fontWeight: sel ? 800 : 600, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}>
                {c}
              </button>
            );
          })}
        </div>
        {/* 상세 입력 버튼 */}
        <button onClick={() => onDetail && onDetail(date)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 10, border: `1.5px solid ${C.line}`, background: C.soft, color: C.sub, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Plus size={15} strokeWidth={2.5} />
        </button>
        {/* 닫기 버튼 */}
        {onClose && (
          <button onClick={onClose} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 10, border: "none", background: "transparent", color: C.sub, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} strokeWidth={2.2} />
          </button>
        )}
      </div>
      {/* 금액 + 지출/수입 저장 버튼 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          ref={inputRef} type="text" inputMode="numeric" value={fmtInput(amount)}
          onChange={(e) => setAmount(parseInput(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter" && amount) handleSave(type); }}
          placeholder="0"
          style={{ flex: 1, border: "none", borderBottom: `2px solid ${accentColor}`, fontSize: 22, fontWeight: 800, padding: "2px 0", textAlign: "right", fontFamily: font, background: "none", color: C.ink, outline: "none", minWidth: 0 }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, flexShrink: 0 }}>원</span>
        <button
          onClick={() => handleSave("expense", INCOME_CATS.includes(cat) ? "외식" : cat)}
          disabled={!amount}
          style={{ flexShrink: 0, border: "none", borderRadius: 12, background: amount ? C.moneyOut : C.line, color: amount ? "#fff" : C.sub, padding: "11px 14px", fontWeight: 800, fontSize: 14, cursor: amount ? "pointer" : "default", fontFamily: font }}
        >지출</button>
        <button
          onClick={() => handleSave("income", EXPENSE_CATS.includes(cat) ? "급여" : cat)}
          disabled={!amount}
          style={{ flexShrink: 0, border: "none", borderRadius: 12, background: amount ? C.moneyIn : C.line, color: amount ? "#fff" : C.sub, padding: "11px 14px", fontWeight: 800, fontSize: 14, cursor: amount ? "pointer" : "default", fontFamily: font }}
        >수입</button>
      </div>
    </div>
  );
}

// ──────── 내역 검색 ────────
function TxSearch({ txs, onClose, onTx }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return txs.filter((t) =>
      (t.memo || "").toLowerCase().includes(lq) ||
      (t.cat || "").toLowerCase().includes(lq) ||
      String(t.amount).includes(lq)
    ).slice(0, 30);
  }, [q, txs]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
        <Search size={18} color={C.sub} />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="메모, 카테고리, 금액 검색..." style={{ flex: 1, border: "none", fontSize: 16, fontFamily: font, outline: "none", color: C.ink }} />
        <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 16, color: C.sub, cursor: "pointer", fontFamily: font, fontWeight: 600 }}>닫기</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {q && results.length === 0 && <div style={{ textAlign: "center", color: C.sub, fontSize: 14, padding: "40px 0" }}>검색 결과가 없어요</div>}
        {results.map((t, i) => (
          <div key={t.id}>
            {i > 0 && <div style={{ height: 1, background: C.line }} />}
            <TxRow t={t} showDate onClick={() => { onTx(t); onClose(); }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Sheet({ onClose, children, title }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(16,29,23,0.45)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 18px calc(env(safe-area-inset-bottom) + 24px)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
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
// iOS 네이티브 드럼롤 스타일 날짜 선택기 (select 3개 → 년/월/일)
function DatePicker({ value, onChange }) {
  const now = new Date();
  const parts = (value || "").split("-");
  const y = parseInt(parts[0]) || now.getFullYear();
  const m = parseInt(parts[1]) || now.getMonth() + 1;
  const d = parseInt(parts[2]) || now.getDate();
  const daysInMonth = new Date(y, m, 0).getDate();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);
  const sel = { border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 4px", fontSize: 15, fontFamily: font, background: "#fff", flex: 1, textAlign: "center", color: C.ink, WebkitAppearance: "none", appearance: "none", cursor: "pointer" };
  const update = (ny, nm, nd) => {
    const maxD = new Date(ny, nm, 0).getDate();
    const safeD = Math.min(nd, maxD);
    onChange(`${ny}-${String(nm).padStart(2, "0")}-${String(safeD).padStart(2, "0")}`);
  };
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <select value={y} onChange={(e) => update(+e.target.value, m, d)} style={{ ...sel, flex: "1.3" }}>
        {years.map((yr) => <option key={yr} value={yr}>{yr}년</option>)}
      </select>
      <select value={m} onChange={(e) => update(y, +e.target.value, d)} style={sel}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => <option key={mo} value={mo}>{mo}월</option>)}
      </select>
      <select value={d} onChange={(e) => update(y, m, +e.target.value)} style={sel}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dy) => <option key={dy} value={dy}>{dy}일</option>)}
      </select>
    </div>
  );
}

// ──────── 가계부: 홈 ────────
function Home({ totals, budget, txs, month, year, setMonth, onTx, onPin, appTitle = "우리집" }) {
  const remain = budget - totals.expense;
  const pct = Math.min(100, Math.round((totals.expense / budget) * 100));
  const recent = [...txs].sort((a, b) => b.day - a.day).slice(0, 5);
  return (
    <div>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, padding: "0 2px" }}>
        <div>
          <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>{year}년 {month}월</div>
        </div>
        <MonthNav month={month} setMonth={setMonth} />
      </header>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>{month}월 남은 예산</div>
        <div style={{ fontSize: 25, fontWeight: 800, margin: "6px 0 12px", color: remain >= 0 ? C.ink : C.moneyOut }}>{fmt(remain)}</div>
        <div style={{ height: 8, background: C.soft, borderRadius: 5, overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", borderRadius: 5, background: pct > 85 ? C.expense : C.income, transition: "width .4s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 9, fontSize: 12, color: C.sub, fontWeight: 500 }}>
          <span>예산 {fmt(budget)}</span><span>{pct}% 사용</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        {[
          { label: "수입", value: totals.income, color: C.moneyIn, prefix: "" },
          { label: "지출", value: totals.expense, color: C.moneyOut, prefix: "" },
          { label: "순수입", value: totals.income - totals.expense, color: totals.income - totals.expense >= 0 ? C.moneyIn : C.moneyOut, prefix: totals.income - totals.expense >= 0 ? "+" : "" },
        ].map(({ label, value, color, prefix }) => (
          <div key={label} style={{ ...card, flex: 1, padding: "12px 10px", minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1.3, wordBreak: "keep-all", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prefix}{fmt(value)}</div>
          </div>
        ))}
      </div>
      {recent.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>최근 내역</div>
          {recent.map((t, i) => (
            <div key={t.id}>
              {i > 0 && <div style={{ height: 1, background: C.line }} />}
              <TxRow t={t} showDate onClick={() => onTx(t)} onPin={onPin} />
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
function MoneyCalendar({ txs, month, year, setMonth, onTx, onPin, sel, onSel, onDetail }) {
  const nowD = new Date();
  const isCurrentMonth = nowD.getMonth() + 1 === month && nowD.getFullYear() === year;
  // 달이 바뀔 때만 선택 날짜 초기화 (탭 이동 시에는 유지)
  const prevMonthRef = useRef(`${year}-${month}`);
  useEffect(() => {
    const key = `${year}-${month}`;
    if (prevMonthRef.current !== key) {
      prevMonthRef.current = key;
      onSel(isCurrentMonth ? nowD.getDate() : 1);
    }
  }, [month, year]);
  const byDay = useMemo(() => {
    const m = {};
    txs.forEach((t) => { if (!m[t.day]) m[t.day] = { in: 0, out: 0 }; if (t.type === "income") m[t.day].in += t.amount; else m[t.day].out += t.amount; });
    return m;
  }, [txs]);
  const dayTxs = txs.filter((t) => t.day === sel).sort((a, b) => a.type === "income" ? -1 : 1);
  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{year}년 {month}월</div>
        <MonthNav month={month} setMonth={setMonth} />
      </header>
      <div style={{ ...card, marginBottom: 16 }}>
        <MonthGrid month={month} year={year} selected={sel} onSelect={onSel} renderDay={(d, isSel) => {
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
      {sel && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>{month}월 {sel}일</div>
            <button onClick={() => onDetail(`${year}-${String(month).padStart(2,"0")}-${String(sel).padStart(2,"0")}`)}
              style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: C.soft, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: C.ink, fontFamily: font }}>
              <Plus size={13} />상세 입력
            </button>
          </div>
          {dayTxs.length > 0 ? (
            dayTxs.map((t, i) => (
              <div key={t.id}>{i > 0 && <div style={{ height: 1, background: C.line }} />}<TxRow t={t} onClick={() => onTx(t)} onPin={onPin} /></div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.sub, fontSize: 13 }}>내역이 없어요</div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────── 가계부: 통계 ────────
function Stats({ byCat, totalExpense, prevExpense, txs, allTxs, month, year, setMonth, onTx, onPin }) {
  const [openCat, setOpenCat] = useState(null);
  const COLORS = byCat.map((x) => getCatInfo(x.name).color);
  const diff = prevExpense != null ? totalExpense - prevExpense : null;

  // 담당자별 지출
  const byWho = useMemo(() => {
    const m = {};
    txs.filter((t) => t.type === "expense").forEach((t) => { m[t.who] = (m[t.who] || 0) + t.amount; });
    return Object.entries(WHO).map(([name, color]) => ({ name, color, amount: m[name] || 0 })).filter((x) => x.amount > 0);
  }, [txs]);

  // 최근 6개월 추이
  const trend = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const m = d.getMonth() + 1, y = d.getFullYear();
      const total = (allTxs || []).filter((t) => t.month === m && (t.year || year) === y && t.type === "expense").reduce((s, t) => s + t.amount, 0);
      result.push({ label: `${m}월`, value: total, current: i === 0 });
    }
    return result;
  }, [allTxs, month, year]);
  const maxTrend = Math.max(...trend.map((t) => t.value), 1);

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{month}월 통계</div>
        <MonthNav month={month} setMonth={setMonth} />
      </header>
      {/* 6개월 추이 차트 */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, marginBottom: 12 }}>최근 6개월 지출</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {trend.map((t) => (
            <div key={t.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 9, color: t.current ? C.moneyOut : C.sub, fontWeight: t.current ? 800 : 500 }}>
                {t.value > 0 ? (t.value >= 10000 ? `${Math.round(t.value / 10000)}만` : "") : ""}
              </div>
              <div style={{ width: "100%", background: t.current ? C.moneyOut : C.line, borderRadius: 4, transition: "height .3s", height: t.value > 0 ? `${Math.max(4, Math.round((t.value / maxTrend) * 56))}px` : "4px" }} />
              <div style={{ fontSize: 10, color: t.current ? C.ink : C.sub, fontWeight: t.current ? 800 : 500 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>
      {byCat.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 18px", color: C.sub }}>
          <ChartPie size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>이번 달 지출 내역이 없어요</div>
        </div>
      ) : (
        <>
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>총 지출</div>
            <div style={{ fontSize: 21, fontWeight: 800, margin: "4px 0 6px" }}>{fmt(totalExpense)}</div>
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
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i]} stroke="#fff" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "7px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.10)", fontSize: 12, fontFamily: font }}>
                      <div style={{ fontWeight: 700, color: C.ink, marginBottom: 2 }}>{d.name}</div>
                      <div style={{ fontWeight: 800, color: C.moneyOut }}>{fmt(d.value)}</div>
                    </div>
                  );
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {byWho.length > 0 && (
            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, marginBottom: 12 }}>담당자별 지출</div>
              {byWho.map(({ name, color, amount }) => {
                const pct = Math.round((amount / totalExpense) * 100);
                return (
                  <div key={name} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                      <span style={{ color }}>{name}</span>
                      <span>{fmt(amount)} <span style={{ fontSize: 11, fontWeight: 500, color: C.sub }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 7, background: C.soft, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: pct + "%", height: "100%", borderRadius: 4, background: color, transition: "width .4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={card}>
            {byCat.map((item) => {
              const { color } = getCatInfo(item.name);
              const pct = Math.round((item.value / totalExpense) * 100);
              const isOpen = openCat === item.name;
              const catTxs = txs.filter((t) => t.cat === item.name && t.type === "expense").sort((a, b) => (b.day || 0) - (a.day || 0));
              return (
                <div key={item.name}>
                  <div onClick={() => setOpenCat(isOpen ? null : item.name)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", cursor: "pointer" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: C.sub }}>{pct}%</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(item.value)}</div>
                    <ChevronDown size={15} color={C.sub} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: ".2s" }} />
                  </div>
                  {isOpen && catTxs.map((t) => (
                    <div key={t.id} style={{ paddingLeft: 22 }}>
                      <TxRow t={t} showDate onClick={() => onTx(t)} onPin={onPin} />
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
function Budget({ budget, setBudget, spent, month, recurring, onAddRecurring, onEditRecurring, onDeleteRecurring, catBudgets, onSaveCatBudget, monthTxs }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(budget));
  const [showAddR, setShowAddR] = useState(false);
  const [showCatBudget, setShowCatBudget] = useState(false);
  const [catVals, setCatVals] = useState({});
  const totalFixed = recurring.reduce((s, r) => s + r.amount, 0);

  const catSpent = useMemo(() => {
    const m = {};
    (monthTxs || []).filter((t) => t.type === "expense").forEach((t) => { m[t.cat] = (m[t.cat] || 0) + t.amount; });
    return m;
  }, [monthTxs]);
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>{month}월 예산</div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>월 예산</div>
          <button onClick={() => { setEditing(!editing); setVal(String(budget)); }} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub }}><Pencil size={16} /></button>
        </div>
        {editing ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="text" inputMode="numeric" value={fmtInput(val)} onChange={(e) => setVal(parseInput(e.target.value))} style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 16, fontFamily: font }} />
            <button onClick={() => { setBudget(Number(val)); setEditing(false); }} style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>저장</button>
          </div>
        ) : (
          <div style={{ fontSize: 21, fontWeight: 800 }}>{fmt(budget)}</div>
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
      {/* 카테고리별 예산 */}
      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showCatBudget ? 14 : 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>카테고리별 예산</div>
          <button onClick={() => { setShowCatBudget((v) => !v); setCatVals({ ...catBudgets }); }} style={{ border: "none", background: C.soft, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{showCatBudget ? "닫기" : "설정"}</button>
        </div>
        {!showCatBudget && Object.keys(catBudgets || {}).length > 0 && (
          <div style={{ marginTop: 10 }}>
            {EXPENSE_CATS.filter((c) => catBudgets[c]).map((c) => {
              const bgt = catBudgets[c], sp = catSpent[c] || 0, pct = Math.min(100, Math.round((sp / bgt) * 100));
              const { color } = CATS[c] || CATS["기타"];
              return (
                <div key={c} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    <span style={{ color }}>{c}</span>
                    <span style={{ color: sp > bgt ? C.expense : C.sub }}>{fmt(sp)} / {fmt(bgt)}</span>
                  </div>
                  <div style={{ height: 6, background: C.soft, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", borderRadius: 4, background: sp > bgt ? C.expense : color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {showCatBudget && (
          <>
            {EXPENSE_CATS.map((c) => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 70, fontSize: 12, fontWeight: 600, color: (CATS[c] || CATS["기타"]).color, flexShrink: 0 }}>{c}</div>
                <input type="text" inputMode="numeric" placeholder="예산 없음" value={fmtInput(catVals[c] || "")} onChange={(e) => setCatVals((v) => ({ ...v, [c]: parseInput(e.target.value) }))}
                  style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 10px", fontSize: 16, fontFamily: font }} />
              </div>
            ))}
            <button onClick={() => { const cleaned = {}; Object.entries(catVals).forEach(([k, v]) => { if (v) cleaned[k] = Number(v); }); onSaveCatBudget(cleaned); setShowCatBudget(false); }}
              style={{ width: "100%", marginTop: 4, padding: "12px 0", borderRadius: 12, border: "none", background: C.ink, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: font }}>저장</button>
          </>
        )}
      </div>
      {showAddR && <EditRecurSheet onClose={() => setShowAddR(false)} onSave={(r) => { onAddRecurring(r); setShowAddR(false); }} />}
    </div>
  );
}

// ──────── 가계부: 자산 ────────
function Assets({ assets, txs = [], onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editAsset, setEditAsset] = useState(null);

  // 수입 - 지출 누계 (앱에 기록된 전체 기간)
  const totalIncome = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter((t) => t.type === "expense" && !t.fixed).reduce((s, t) => s + t.amount, 0);
  const netIncome = totalIncome - totalExpense;

  const manualTotal = assets.reduce((s, a) => s + a.amount, 0);
  const grandTotal = netIncome + manualTotal;
  const byKind = Object.entries(KINDS).map(([k]) => ({ kind: k, total: assets.filter((a) => a.kind === k).reduce((s, a) => s + a.amount, 0) })).filter((x) => x.total > 0);

  return (
    <div>
      {/* 총 자산 요약 */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>총 자산 추정</div>
        <div style={{ fontSize: 22, fontWeight: 800, margin: "4px 0", color: grandTotal >= 0 ? C.ink : C.expense }}>{fmt(grandTotal)}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.sub, marginTop: 6 }}>
          <span style={{ color: C.income }}>순수익 누계</span><span style={{ color: netIncome >= 0 ? C.income : C.expense, fontWeight: 700 }}>{netIncome >= 0 ? "+" : ""}{fmt(netIncome)}</span>
        </div>
        {byKind.map((x) => {
          const { color } = KINDS[x.kind];
          return (
            <div key={x.kind} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.sub, marginTop: 4 }}>
              <span style={{ color }}>{x.kind}</span><span>{fmt(x.total)}</span>
            </div>
          );
        })}
      </div>

      {/* 순수익 누계 상세 카드 */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, marginBottom: 10 }}>수입 / 지출 누계</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: C.income + "12", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: C.income, fontWeight: 700, marginBottom: 4 }}>총 수입</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.income }}>{fmt(totalIncome)}</div>
          </div>
          <div style={{ flex: 1, background: C.expense + "12", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: C.expense, fontWeight: 700, marginBottom: 4 }}>총 지출</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.expense }}>{fmt(totalExpense)}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginTop: 8 }}>* 고정지출 제외, 앱에 기록된 내역 기준</div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>계좌 목록</div>
          <button onClick={() => setShowAdd(true)} style={{ border: "none", background: C.soft, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Plus size={13} />추가</button>
        </div>
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
              <button onClick={() => setEditAsset(a)} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub }}><Pencil size={14} /></button>
              <button onClick={() => onDelete(a.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#CFD6D1" }}><Trash2 size={15} /></button>
            </div>
          );
        })}
      </div>
      {showAdd && (
        <AddAssetSheet onClose={() => setShowAdd(false)} onSave={(a) => { onAdd(a); setShowAdd(false); }} />
      )}
      {editAsset && (
        <AddAssetSheet initial={editAsset} onClose={() => setEditAsset(null)}
          onSave={(a) => { onUpdate(editAsset.id, a); setEditAsset(null); }}
          onDelete={() => { onDelete(editAsset.id); setEditAsset(null); }} />
      )}
    </div>
  );
}

// ──────── 시트: 자산 추가/수정 ────────
function AddAssetSheet({ initial, onClose, onSave, onDelete }) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || "");
  const [kind, setKind] = useState(initial?.kind || "예금");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [monthly, setMonthly] = useState(initial?.monthly ? String(initial.monthly) : "");
  const input = { border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 16, fontFamily: font, width: "100%", background: "#fff" };
  return (
    <Sheet onClose={onClose} title={isEdit ? "자산 수정" : "자산 추가"}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>계좌/자산명</div>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 국민은행 통장" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>종류</div>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.keys(KINDS).map((k) => {
            const { color } = KINDS[k];
            return (
              <button key={k} onClick={() => setKind(k)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1.5px solid ${kind === k ? color : C.line}`, background: kind === k ? color + "14" : "#fff", color: kind === k ? color : C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font }}>{k}</button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>잔액 / 평가금액</div>
        <input style={input} type="text" inputMode="numeric" value={fmtInput(amount)} onChange={(e) => setAmount(parseInput(e.target.value))} placeholder="금액" />
      </div>
      {(kind === "적금") && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>월 납입액 (선택)</div>
          <input style={input} type="text" inputMode="numeric" value={fmtInput(monthly)} onChange={(e) => setMonthly(parseInput(e.target.value))} placeholder="월 납입금액" />
        </div>
      )}
      <button onClick={() => name && amount && onSave({ name, kind, amount: Number(amount), monthly: monthly ? Number(monthly) : 0 })}
        style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: C.ink, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: font }}>
        {isEdit ? "수정 완료" : "추가"}
      </button>
      {isEdit && onDelete && (
        <button onClick={onDelete} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: `1px solid ${C.expense}`, background: "#fff", color: C.expense, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font }}>삭제</button>
      )}
    </Sheet>
  );
}

// ──────── 일정 ────────
function Schedule({ events, month, year, setMonth, onJump, onEdit, onDelete, onAdd }) {
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>{month}월 {sel}일</div>
            <button onClick={() => onAdd && onAdd(sel)} style={{ border: "none", background: C.soft, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, color: C.ink }}><Plus size={12} />추가</button>
          </div>
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
// ──────── 메모장 ────────
function Memos({ notes, currentWho, onAdd, onUpdate, onDelete }) {
  const [text, setText] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef(null);

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd({ text: text.trim(), who: currentWho });
    setText("");
  };

  const startEdit = (n) => { setEditId(n.id); setEditText(n.text); };
  const saveEdit = () => { if (editText.trim()) onUpdate(editId, { text: editText.trim() }); setEditId(null); };

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>메모</div>
      <div style={{ ...card, marginBottom: 12 }}>
        <textarea ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="메모를 입력하세요..." rows={3}
          style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: font, resize: "none", marginBottom: 8 }} />
        <button onClick={handleAdd} disabled={!text.trim()} style={{ width: "100%", border: "none", borderRadius: 10, padding: "10px 0", background: text.trim() ? C.ink : C.line, color: text.trim() ? "#fff" : C.sub, fontWeight: 800, fontSize: 14, cursor: text.trim() ? "pointer" : "default", fontFamily: font }}>저장</button>
      </div>
      {notes.map((n) => (
        <div key={n.id} style={{ ...card, marginBottom: 10 }}>
          {editId === n.id ? (
            <>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3}
                style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: font, resize: "none", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditId(null)} style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 0", background: "#fff", color: C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font }}>취소</button>
                <button onClick={saveEdit} style={{ flex: 2, border: "none", borderRadius: 10, padding: "8px 0", background: C.ink, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: font }}>저장</button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{n.text}</div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <WhoTag who={n.who} />
                  {n.createdAt?.seconds && <span style={{ fontSize: 11, color: C.sub }}>{new Date(n.createdAt.seconds * 1000).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                <button onClick={() => startEdit(n)} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub, padding: 4 }}><Pencil size={14} /></button>
                <button onClick={() => onDelete(n.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#CFD6D1", padding: 4 }}><Trash2 size={14} /></button>
              </div>
            </div>
          )}
        </div>
      ))}
      {notes.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: "40px 18px", color: C.sub }}>
          <StickyNote size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>공유 메모를 남겨보세요</div>
        </div>
      )}
    </div>
  );
}

const PRIORITY = { 높음: { color: "#EF4444", label: "높음" }, 보통: { color: "#F59E0B", label: "보통" }, 낮음: { color: "#9AA5A0", label: "낮음" } };
function Todos({ todos, onToggle, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [who, setWho] = useState("같이");
  const [priority, setPriority] = useState("보통");
  const [dueDate, setDueDate] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const reset = () => { setText(""); setWho("같이"); setPriority("보통"); setDueDate(""); setShowForm(false); };
  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd({ text: text.trim(), who, priority, dueDate });
    reset();
  };

  const sortedPending = [...todos.filter((t) => !t.done)].sort((a, b) => {
    const po = { 높음: 0, 보통: 1, 낮음: 2 };
    if (po[a.priority] !== po[b.priority]) return (po[a.priority] || 1) - (po[b.priority] || 1);
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1; if (b.dueDate) return 1;
    return 0;
  });
  const done = todos.filter((t) => t.done);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>할일</div>
        <button onClick={() => setShowForm((v) => !v)} style={{ border: "none", background: C.ink, color: "#fff", borderRadius: 10, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 5 }}><Plus size={14} />추가</button>
      </div>
      {showForm && (
        <div style={{ ...card, marginBottom: 12 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder="할일 입력..." style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 16, fontFamily: font, marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {Object.keys(PRIORITY).map((p) => (
              <button key={p} onClick={() => setPriority(p)} style={{ flex: 1, border: `1.5px solid ${priority === p ? PRIORITY[p].color : C.line}`, borderRadius: 9, padding: "6px 0", background: priority === p ? PRIORITY[p].color + "14" : "#fff", color: priority === p ? PRIORITY[p].color : C.sub, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: font }}>{p}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {Object.keys(WHO).map((w) => (
              <button key={w} onClick={() => setWho(w)} style={{ flex: 1, border: `1.5px solid ${who === w ? WHO[w] : C.line}`, borderRadius: 9, padding: "6px 0", background: who === w ? WHO[w] + "14" : "#fff", color: who === w ? WHO[w] : C.sub, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: font }}>{w}</button>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>마감일</span>
              {dueDate && <button onClick={() => setDueDate("")} style={{ border: "none", background: "none", color: C.sub, fontSize: 11, cursor: "pointer", fontFamily: font, padding: 0 }}>✕ 없음</button>}
            </div>
            {dueDate ? (
              <DatePicker value={dueDate} onChange={setDueDate} />
            ) : (
              <button onClick={() => setDueDate(new Date().toISOString().slice(0,10))} style={{ width: "100%", border: `1px dashed ${C.line}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: font, background: "#fff", color: C.sub, cursor: "pointer", textAlign: "left" }}>+ 마감일 추가</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reset} style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 0", background: "#fff", color: C.sub, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: font }}>취소</button>
            <button onClick={handleAdd} style={{ flex: 2, border: "none", borderRadius: 10, padding: "10px 0", background: C.ink, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: font }}>추가</button>
          </div>
        </div>
      )}
      {sortedPending.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          {sortedPending.map((t, i) => {
            const pc = PRIORITY[t.priority]?.color || C.sub;
            const isOverdue = t.dueDate && t.dueDate < today;
            const isDueToday = t.dueDate === today;
            return (
              <div key={t.id}>
                {i > 0 && <div style={{ height: 1, background: C.line }} />}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0" }}>
                  <button onClick={() => onToggle(t.id)} style={{ width: 22, height: 22, borderRadius: 8, border: `2px solid ${pc}`, background: "#fff", cursor: "pointer", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{t.text}</div>
                      {t.dueDate && <span style={{ fontSize: 14, fontWeight: 700, color: isOverdue ? C.expense : isDueToday ? "#F59E0B" : C.ink, flexShrink: 0 }}>{isOverdue ? "⚠️" : isDueToday ? "🔴" : ""} {t.dueDate.slice(5).replace("-", "/")}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      {t.priority && <span style={{ fontSize: 10, fontWeight: 700, color: pc, background: pc + "14", padding: "1px 6px", borderRadius: 6 }}>{t.priority}</span>}
                      <WhoTag who={t.who} />
                    </div>
                  </div>
                  <button onClick={() => onDelete(t.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#CFD6D1" }}><Trash2 size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {done.length > 0 && (
        <div style={{ ...card, opacity: 0.7 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>완료 {done.length}개</div>
            <button onClick={() => done.forEach((t) => onDelete(t.id))}
              style={{ fontSize: 11, color: C.expense, border: "none", background: "none", cursor: "pointer", fontFamily: font, fontWeight: 600 }}>전체 삭제</button>
          </div>
          {done.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
              <button onClick={() => onToggle(t.id)} style={{ width: 22, height: 22, borderRadius: 8, border: "none", background: C.income, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={13} color="#fff" /></button>
              <div style={{ flex: 1, fontSize: 13, textDecoration: "line-through", color: C.sub }}>{t.text}</div>
              <button onClick={() => onDelete(t.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#CFD6D1" }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
      {todos.length === 0 && !showForm && (
        <div style={{ ...card, textAlign: "center", padding: "40px 18px", color: C.sub }}>
          <ListChecks size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>할일이 없어요 👍</div>
        </div>
      )}
    </div>
  );
}

// ──────── 시트: 내역 추가/수정 ────────
function AddTxSheet({ month, year, initial, initialDate, defaultWho = "같이", onClose, onSave, onDelete, onSaveRecurring }) {
  const isEdit = !!initial;
  const [type, setType] = useState(initial?.type || "expense");
  const [cat, setCat] = useState(initial?.cat || "외식");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [memo, setMemo] = useState(initial?.memo || "");
  const [who, setWho] = useState(initial?.who || defaultWho);
  const [dateStr, setDateStr] = useState(() => {
    if (initial) return `${initial.year}-${String(initial.month).padStart(2,"0")}-${String(initial.day||1).padStart(2,"0")}`;
    if (initialDate) return initialDate;
    return `${year}-${String(month).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`;
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [isInstallment, setIsInstallment] = useState(initial?.installment || false);
  const [instTotal, setInstTotal] = useState(initial?.installmentTotal || 1);
  const [instCurrent, setInstCurrent] = useState(initial?.installmentCurrent || 1);
  const [instPrincipal, setInstPrincipal] = useState("");
  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;
  useEffect(() => { if (!cats.includes(cat)) setCat(cats[0]); }, [type]);

  const instRemaining = isInstallment ? instTotal - instCurrent : null;
  const instEndDate = isInstallment ? (() => { const d = new Date(year, month - 1 + (instTotal - instCurrent + 1)); return `${d.getFullYear()}년 ${d.getMonth() + 1}월`; })() : null;

  const save = () => {
    if (!amount) return;
    const [txYear, txMonth, txDay] = dateStr ? dateStr.split("-").map(Number) : [year, month, 1];
    const t = { type, cat, amount: Number(amount), memo, who, day: txDay, month: txMonth, year: txYear, fixed: false };
    if (isInstallment) { Object.assign(t, { installment: true, installmentTotal: instTotal, installmentCurrent: instCurrent }); }
    if (isRecurring && onSaveRecurring && !isInstallment) { onSaveRecurring({ name: memo || cat, amount: Number(amount), day: txDay, cat, who }); }
    else { onSave(t); }
  };
  const input = { border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 16, fontFamily: font, width: "100%", background: "#fff" };
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
          {cats.map((c) => {
            const { color, bg, Icon } = getCatInfo(c);
            const sel = cat === c;
            return (
              <button key={c} onClick={() => setCat(c)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 6px", borderRadius: 14, border: `2px solid ${sel ? color : "transparent"}`, background: bg, color: sel ? color : C.sub, fontWeight: sel ? 800 : 600, fontSize: 11, cursor: "pointer", fontFamily: font, width: "calc(20% - 5px)", minWidth: 58, boxShadow: sel ? `0 2px 8px ${color}40` : "0 1px 3px rgba(0,0,0,0.05)" }}>
                <Icon size={22} strokeWidth={1.8} color={color} />
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>금액</div>
        <input style={input} type="text" inputMode="numeric" value={fmtInput(amount)} onChange={(e) => setAmount(parseInput(e.target.value))} placeholder="금액 입력" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>메모</div>
        <input style={input} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (선택)" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>날짜</div>
        <DatePicker value={dateStr} onChange={setDateStr} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>담당</div>
        <select value={who} onChange={(e) => setWho(e.target.value)} style={{ ...input }}>
          {Object.keys(WHO).map((w) => <option key={w}>{w}</option>)}
        </select>
      </div>
      {type === "expense" && !isInstallment && onSaveRecurring && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          <span>고정 지출 <span style={{ fontSize: 11, fontWeight: 500, color: C.sub }}>(매월 자동 반영)</span></span>
        </label>
      )}
      {type === "expense" && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: isInstallment ? 10 : 0 }}>
            <input type="checkbox" checked={isInstallment} onChange={(e) => { setIsInstallment(e.target.checked); if (e.target.checked) setMakeFixed(false); }} />
            <CreditCard size={14} strokeWidth={2.2} style={{ color: "#7C3AED" }} />할부 등록
          </label>
          {isInstallment && (
            <div style={{ background: "#F5F3FF", borderRadius: 12, padding: "12px 14px", marginTop: 8 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", marginBottom: 5 }}>총 개월수</div>
                  <input type="number" inputMode="numeric" value={instTotal} onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    setInstTotal(v);
                    if (instPrincipal) setAmount(String(Math.round(Number(instPrincipal.replace(/,/g,"")) / v)));
                  }} style={{ border: "1px solid #DDD6FE", borderRadius: 8, padding: "8px 10px", fontSize: 16, fontFamily: font, width: "100%", background: "#fff", textAlign: "center", fontWeight: 700 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", marginBottom: 5 }}>현재 회차</div>
                  <input type="number" inputMode="numeric" value={instCurrent} onChange={(e) => setInstCurrent(Math.min(instTotal, Math.max(1, Number(e.target.value))))} style={{ border: "1px solid #DDD6FE", borderRadius: 8, padding: "8px 10px", fontSize: 16, fontFamily: font, width: "100%", background: "#fff", textAlign: "center", fontWeight: 700 }} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", marginBottom: 5 }}>원금 (총 구매금액)</div>
                <input type="text" inputMode="numeric" placeholder="원금 입력 시 월 납부액 자동 계산" value={instPrincipal}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                    if (!/^\d*$/.test(raw)) return;
                    setInstPrincipal(raw ? Number(raw).toLocaleString() : "");
                    if (raw && instTotal > 1) setAmount(String(Math.round(Number(raw) / instTotal)));
                    else if (raw) setAmount(raw);
                  }}
                  style={{ border: "1px solid #DDD6FE", borderRadius: 8, padding: "8px 10px", fontSize: 15, fontFamily: font, width: "100%", background: "#fff", fontWeight: 600 }} />
              </div>
              {instRemaining !== null && (
                <div style={{ fontSize: 12, color: "#6D28D9", fontWeight: 700, textAlign: "center" }}>
                  잔여 {instRemaining}회 · {instEndDate} 자동 종료
                  {instPrincipal && instTotal > 1 && <span style={{ color: "#9333EA", fontWeight: 500 }}> · 월 {fmt(Math.round(Number(instPrincipal.replace(/,/g,"")) / instTotal))}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <button onClick={save} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: C.ink, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: font }}>
        {isEdit ? "수정 완료" : "추가"}
      </button>
      {isEdit && onDelete && (
        <button onClick={onDelete} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: `1px solid ${C.expense}`, background: "#fff", color: C.expense, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font }}>삭제</button>
      )}
    </Sheet>
  );
}

// ──────── 시트: 일정 추가/수정 ────────
function AddEventSheet({ month, year, initial, defaultDay, onClose, onSave, onDelete }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title || "");
  const [dateStr, setDateStr] = useState(() => {
    if (initial) return `${initial.year}-${String(initial.month).padStart(2,"0")}-${String(initial.day).padStart(2,"0")}`;
    const d = defaultDay || new Date().getDate();
    return `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  });
  const [time, setTime] = useState(initial?.time || "");
  const [place, setPlace] = useState(initial?.place || "");
  const [who, setWho] = useState(initial?.who || "같이");
  const input = { border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 16, fontFamily: font, width: "100%", background: "#fff" };
  return (
    <Sheet onClose={onClose} title={isEdit ? "일정 수정" : "일정 추가"}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>제목</div>
        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="일정 제목" />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>날짜</div>
          <DatePicker value={dateStr} onChange={setDateStr} />
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
      <button onClick={() => { if (!title) return; const [evYear, evMonth, evDay] = dateStr ? dateStr.split("-").map(Number) : [year, month, 1]; onSave({ title, day: evDay, time, place, who, month: evMonth, year: evYear }); }} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: C.ink, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: font }}>
        {isEdit ? "수정 완료" : "추가"}
      </button>
      {isEdit && onDelete && (
        <button onClick={onDelete} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: `1px solid ${C.expense}`, background: "#fff", color: C.expense, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font }}>삭제</button>
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
  const input = { border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 16, fontFamily: font, width: "100%", background: "#fff" };
  return (
    <Sheet onClose={onClose} title={initial ? "고정지출 수정" : "고정지출 추가"}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>항목명</div>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 통신비" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>금액</div>
        <input style={input} type="text" inputMode="numeric" value={fmtInput(amount)} onChange={(e) => setAmount(parseInput(e.target.value))} placeholder="금액" />
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
          {EXPENSE_CATS.map((c) => {
            const { color, bg, Icon } = getCatInfo(c);
            const sel = cat === c;
            return (
              <button key={c} onClick={() => setCat(c)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 6px", borderRadius: 14, border: `2px solid ${sel ? color : "transparent"}`, background: bg, color: sel ? color : C.sub, fontWeight: sel ? 800 : 600, fontSize: 11, cursor: "pointer", fontFamily: font, width: "calc(20% - 5px)", minWidth: 58, boxShadow: sel ? `0 2px 8px ${color}40` : "0 1px 3px rgba(0,0,0,0.05)" }}>
                <Icon size={22} strokeWidth={1.8} color={color} />
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <button onClick={() => name && amount && onSave({ name, amount: Number(amount), day, cat, who })} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: C.ink, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: font }}>저장</button>
      {initial && onDelete && (
        <button onClick={onDelete} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: `1px solid ${C.expense}`, background: "#fff", color: C.expense, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font }}>삭제</button>
      )}
    </Sheet>
  );
}

// ──────── 로그인 화면 (이름 선택 → PIN) ────────
function LoginScreen({ onLogin, loading, error }) {
  const [who, setWho] = useState(null); // null = 이름 선택 단계
  const [pin, setPin] = useState("");

  useEffect(() => { if (error) setPin(""); }, [error]);

  const handleNum = (n) => {
    if (loading || pin.length >= 6) return;
    const next = pin + n;
    setPin(next);
    if (next.length === 6) setTimeout(() => onLogin(next, who), 80);
  };
  const handleDel = () => { if (!loading) setPin((p) => p.slice(0, -1)); };

  // ── 단계 1: 이름 선택 ──
  if (!who) {
    return (
      <div style={{ fontFamily: font, background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🏠</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, marginBottom: 4 }}>우리집</div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 48 }}>가계부 · 일정 · 할일</div>
        <div style={{ width: "100%", maxWidth: 280, display: "flex", gap: 14 }}>
          {["종현", "성은"].map((name) => {
            const color = WHO[name];
            const initial = name === "종현" ? "J" : "S";
            return (
              <button key={name} onClick={() => setWho(name)} style={{ flex: 1, padding: "24px 0", borderRadius: 20, border: `2px solid ${color}20`, background: "#fff", cursor: "pointer", fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: 26, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>{initial}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{name}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 단계 2: PIN 입력 ──
  const color = WHO[who];
  const initial = who === "종현" ? "J" : "S";
  return (
    <div style={{ fontFamily: font, background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 12 }}>{initial}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 4 }}>{who}</div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 40 }}>비밀번호를 입력해주세요</div>

      <div style={{ width: "100%", maxWidth: 280 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 32 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: i < pin.length ? color : C.line, transition: "background .15s" }} />
          ))}
        </div>

        {error && <div style={{ fontSize: 12, color: C.expense, textAlign: "center", marginBottom: 16 }}>{error}</div>}
        {loading && <div style={{ fontSize: 12, color: C.sub, textAlign: "center", marginBottom: 16 }}>확인 중...</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
            <button key={i} onClick={() => k === "⌫" ? handleDel() : k !== "" ? handleNum(String(k)) : null}
              disabled={loading || k === ""}
              style={{ padding: "18px 0", borderRadius: 14, border: `1.5px solid ${C.line}`, background: k === "⌫" ? C.soft : "#fff", fontSize: k === "⌫" ? 20 : 22, fontWeight: 600, cursor: k === "" ? "default" : "pointer", fontFamily: font, color: k === "" ? "transparent" : C.ink, opacity: loading ? 0.5 : 1 }}>
              {k}
            </button>
          ))}
        </div>
        <button onClick={() => setWho(null)} style={{ width: "100%", marginTop: 20, border: "none", background: "none", color: C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font }}>← 다시 선택</button>
      </div>
    </div>
  );
}

// ──────── 메인 앱 ────────
export default function App() {
  const [user, setUser] = useState(undefined); // undefined=로딩, null=비로그인
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentWho, setCurrentWho] = useState("종현");

  // Firebase 데이터
  const [txs, setTxs] = useState([]);
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [assets, setAssets] = useState([]);
  const [notes, setNotes] = useState([]);
  const [budget, setBudgetState] = useState(2000000);
  const [catBudgets, setCatBudgets] = useState({});

  // 앱 표시 설정 (Firestore 저장)
  const [appTitle, setAppTitleState] = useState("우리집");
  const [userNames, setUserNamesState] = useState({ 종현: "종현", 성은: "성은", 같이: "같이" });

  // UI 상태
  const [mode, setMode] = useState("money");
  const [tab, setTab] = useState("home");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonthRaw] = useState(now.getMonth() + 1);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "1");
  const [showSettings, setShowSettings] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [addDay, setAddDay] = useState(null); // 일정 추가 시 기본 날짜
  const [addTxDate, setAddTxDate] = useState(null); // 달력에서 날짜 선택 후 내역 추가
  const [calSel, setCalSel] = useState(null); // 달력에서 선택된 날
  const [showQuickBar, setShowQuickBar] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [editRecur, setEditRecur] = useState(null);

  const setMonth = (m) => {
    if (m < 1) { setYear((y) => y - 1); setMonthRaw(12); }
    else if (m > 12) { setYear((y) => y + 1); setMonthRaw(1); }
    else setMonthRaw(m);
  };
  const jumpTo = (y, m) => { setYear(y); setMonthRaw(m); };

  // ── 다크모드 적용 (렌더 시 동기 반영) ──
  Object.assign(C, darkMode ? C_DARK : C_LIGHT);
  useEffect(() => {
    document.body.style.background = C.bg;
    localStorage.setItem("darkMode", darkMode ? "1" : "0");
  }, [darkMode]);

  // ── 인증 ──
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const handleLogin = async (pin, who) => {
    if (!pin) return;
    setLoginLoading(true); setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, USERS["종현"], pin);
      setCurrentWho(who || "종현");
    } catch (e) {
      setLoginError("비밀번호가 맞지 않아요.");
      setLoginLoading(false);
    }
  };

  // ── 카테고리 마이그레이션 (한 번만) ──
  useEffect(() => {
    if (!user) return;
    const CAT_MIGRATE = {
      "카페/간식": "외식",
      "식비":      "외식",
      "통신":      "주거/공과금",
      "주거":      "주거/공과금",
      "공과금":    "주거/공과금",
      "생활용품":  "생필품",
      "문화/여가": "여행/문화",
      "여행":      "여행/문화",
      "술/유흥":   "외식",
    };
    const key = "catMigrated_v5";
    if (localStorage.getItem(key)) return;
    (async () => {
      const snap = await getDocs(collection(db, "transactions"));
      const batch = writeBatch(db);
      let count = 0;
      snap.docs.forEach((d) => {
        const newCat = CAT_MIGRATE[d.data().cat];
        if (newCat) { batch.update(d.ref, { cat: newCat }); count++; }
      });
      if (count > 0) await batch.commit();
      localStorage.setItem(key, "1");
    })();
  }, [user]);

  // ── fixed:true 정리 마이그레이션 (한 번만) ──
  // 기존 txs에서 fixed:true인데 rid 없는 것들(개별로 고정 표시된 것)을 false로 초기화
  useEffect(() => {
    if (!user) return;
    const key = "fixedCleaned_v1";
    if (localStorage.getItem(key)) return;
    (async () => {
      const snap = await getDocs(collection(db, "transactions"));
      const batch = writeBatch(db);
      let count = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.fixed === true && !data.rid) {
          batch.update(d.ref, { fixed: false });
          count++;
        }
      });
      if (count > 0) await batch.commit();
      localStorage.setItem(key, "1");
    })();
  }, [user]);

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
      onSnapshot(query(collection(db, "notes"), orderBy("createdAt", "desc")), (snap) => {
        setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(doc(db, "settings", "budget"), (snap) => {
        if (snap.exists()) setBudgetState(snap.data().amount || 2000000);
      }),
      onSnapshot(doc(db, "settings", "catBudget"), (snap) => {
        if (snap.exists()) setCatBudgets(snap.data() || {});
      }),
      onSnapshot(doc(db, "settings", "display"), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.appTitle) setAppTitleState(d.appTitle);
          if (d.userNames) setUserNamesState((p) => ({ ...p, ...d.userNames }));
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user]);

  // ── CRUD 핸들러 ──
  const addTx = useCallback(async (t) => {
    await addDoc(collection(db, "transactions"), { ...t, createdAt: serverTimestamp() });
  }, []);
  const bulkAddTxs = useCallback(async (rows) => {
    await Promise.all(rows.map((t) => addDoc(collection(db, "transactions"), { ...t, createdAt: serverTimestamp() })));
    setShowImport(false);
  }, []);
  const updateTx = useCallback(async (id, t) => {
    await updateDoc(doc(db, "transactions", id), t);
  }, []);
  const deleteTx = useCallback(async (id) => {
    await deleteDoc(doc(db, "transactions", id));
  }, []);

  const saveDisplay = useCallback(async (patch) => {
    await setDoc(doc(db, "settings", "display"), patch, { merge: true });
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
  const toggleFixed = useCallback(async (t) => {
    if (t.rid) {
      // 고정(recurring 생성) 항목 → recurring에서 삭제
      await deleteDoc(doc(db, "recurring", t.rid));
    } else {
      // 일반 내역 → recurring으로 등록
      await addDoc(collection(db, "recurring"), {
        name: t.memo || t.cat, amount: t.amount, cat: t.cat, day: t.day, who: t.who,
      });
    }
  }, []);

  const addAsset = useCallback(async (a) => {
    await addDoc(collection(db, "assets"), { ...a, createdAt: serverTimestamp() });
  }, []);
  const updateAsset = useCallback(async (id, a) => {
    await updateDoc(doc(db, "assets", id), a);
  }, []);
  const deleteAsset = useCallback(async (id) => {
    await deleteDoc(doc(db, "assets", id));
  }, []);

  const addNote = useCallback(async (n) => {
    await addDoc(collection(db, "notes"), { ...n, createdAt: serverTimestamp() });
  }, []);
  const updateNote = useCallback(async (id, n) => {
    await updateDoc(doc(db, "notes", id), n);
  }, []);
  const deleteNote = useCallback(async (id) => {
    await deleteDoc(doc(db, "notes", id));
  }, []);

  const saveBudget = useCallback(async (amount) => {
    await setDoc(doc(db, "settings", "budget"), { amount });
    setBudgetState(amount);
  }, []);
  const saveCatBudget = useCallback(async (cats) => {
    await setDoc(doc(db, "settings", "catBudget"), cats);
    setCatBudgets(cats);
  }, []);

  // ── 파생 데이터 ──
  const fixedFor = (m, y) => recurring.map((r) => ({
    id: "r" + r.id + "-" + y + "-" + m, rid: r.id, type: "expense", cat: r.cat || "기타",
    amount: r.amount, memo: r.name, who: r.who, day: r.day, month: m, year: y, fixed: true,
  }));
  const monthTxs = useMemo(() => {
    const real = txs.filter((t) => t.month === month && t.year === year);
    // 할부 자동 회차 증가: 다른 달에 등록된 할부가 현재 달에도 표시
    const installmentOther = txs
      .filter((t) => !(t.month === month && t.year === year) && t.installment && t.installmentTotal)
      .map((t) => {
        const diff = (year - t.year) * 12 + (month - t.month);
        const eff = (t.installmentCurrent || 1) + diff;
        return diff > 0 && eff <= t.installmentTotal ? { ...t, installmentCurrent: eff, month, year, _instDerived: true } : null;
      })
      .filter(Boolean);
    return [...real, ...installmentOther, ...fixedFor(month, year)];
  }, [txs, recurring, month, year]);
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

  const exportExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const rows = monthTxs
      .filter((t) => !t._instDerived)
      .map((t) => ({
        날짜: `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day || 1).padStart(2, "0")}`,
        구분: t.type === "income" ? "수입" : "지출",
        카테고리: t.cat || "",
        내용: t.memo || "",
        금액: t.amount || 0,
        담당: t.who || "",
        고정: t.fixed ? "O" : "",
        할부: t.installment ? `${t.installmentCurrent}/${t.installmentTotal}` : "",
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 6 }, { wch: 4 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${year}년${month}월`);
    XLSX.writeFile(wb, `우리집_가계부_${year}년${month}월.xlsx`);
  }, [monthTxs, month, year]);

  const openTx = (t) => {
    if (t.fixed && t.rid) {
      const r = recurring.find((x) => x.id === t.rid);
      if (r) { setEditRecur(r); return; }
    }
    // 할부 파생 거래는 원본 거래를 찾아서 열기
    if (t._instDerived) {
      const orig = txs.find((x) => x.id === t.id);
      if (orig) { setEditTx(orig); return; }
    }
    setEditTx(t);
  };

  // ── 렌더 ──
  if (user === undefined) {
    return <div style={{ fontFamily: font, background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 14 }}>로딩 중...</div>;
  }
  if (!user) {
    return <LoginScreen onLogin={handleLogin} loading={loginLoading} error={loginError} />;
  }

  const modes = [["money", "가계부", Coins], ["schedule", "일정", CalendarHeart], ["todo", "할일", ListChecks], ["memo", "메모", StickyNote]];
  const tabs = [["home", "홈", HomeIcon], ["cal", "달력", CalendarDays], ["stats", "통계", ChartPie], ["budget", "예산", Target], ["asset", "자산", Wallet]];

  return (
    <div style={{ fontFamily: font, background: C.bg, minHeight: "100vh", color: C.ink, maxWidth: 480, margin: "0 auto", position: "relative", letterSpacing: "-0.01em" }}>
      {/* 상단 모드 전환 */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: darkMode ? `${C.bg}ee` : "rgba(244,246,245,0.92)", backdropFilter: "blur(12px)", padding: "6px 14px 7px", borderBottom: `1px solid ${C.line}` }}>
        {/* 앱 타이틀 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6, minHeight: 24 }}>
          {editingTitle ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { const v = titleDraft.trim() || "우리집"; setAppTitleState(v); saveDisplay({ appTitle: v }); setEditingTitle(false); }
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.ink, textAlign: "center", border: "none", borderBottom: `2px solid ${C.income}`, outline: "none", background: "transparent", width: 120, letterSpacing: "-0.01em" }}
              />
              <button
                onClick={() => { const v = titleDraft.trim() || "우리집"; setAppTitleState(v); saveDisplay({ appTitle: v }); setEditingTitle(false); }}
                style={{ border: "none", background: C.income, borderRadius: 8, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <Check size={13} color="#fff" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button onClick={() => { setTitleDraft(appTitle); setEditingTitle(true); }} style={{ border: "none", background: "none", cursor: "pointer", padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.ink, letterSpacing: "-0.01em" }}>{appTitle}</span>
              <Pencil size={11} strokeWidth={2} color={C.sub} />
            </button>
          )}
        </div>
        {/* 모드 탭 + 우측 버튼 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", background: C.soft, borderRadius: 12, padding: 3, gap: 1, flexShrink: 0 }}>
          {modes.map(([k, label, Icon]) => {
            const active = mode === k;
            return (
              <button key={k} onClick={() => setMode(k)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 9, border: "none", fontFamily: font, cursor: "pointer", fontSize: 12, fontWeight: active ? 800 : 600, background: active ? C.card : "transparent", color: active ? C.ink : C.sub, boxShadow: active ? "0 1px 4px rgba(16,29,23,0.1)" : "none", transition: "all .15s", whiteSpace: "nowrap" }}>
                <Icon size={13} strokeWidth={active ? 2.4 : 2} />{label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {mode === "money" && <button onClick={() => setShowSearch(true)} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub, padding: 4, display: "flex" }}><Search size={18} /></button>}
          <button onClick={() => setShowSettings(true)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", marginLeft: 2 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: WHO[currentWho], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>
              {(userNames[currentWho] || currentWho)[0]}
            </div>
          </button>
        </div>
        </div>
      </div>

      <div style={{ padding: "10px 18px", paddingBottom: `calc(${mode === "money" ? (showQuickBar ? 180 : 90) : 90}px + env(safe-area-inset-bottom, 0px))` }}>
        {mode === "money" && (
          <>
            {tab === "home" && <Home totals={totals} budget={budget} txs={monthTxs} month={month} year={year} setMonth={setMonth} onTx={openTx} onPin={toggleFixed} appTitle={appTitle} />}
            {tab === "cal" && <MoneyCalendar txs={monthTxs} month={month} year={year} setMonth={setMonth} onTx={openTx} onPin={toggleFixed} sel={calSel} onSel={(d) => { setCalSel(d); if (d) setShowQuickBar(true); else setShowQuickBar(false); }} onDetail={(dateStr) => { setAddTxDate(dateStr); setShowAdd(true); }} />}
            {tab === "stats" && <Stats byCat={byCat} totalExpense={totals.expense} prevExpense={prevExpense} txs={monthTxs} allTxs={txs} month={month} year={year} setMonth={setMonth} onTx={openTx} onPin={toggleFixed} />}
            {tab === "budget" && <Budget budget={budget} setBudget={saveBudget} spent={totals.expense} month={month} recurring={recurring} onAddRecurring={addRecurring} onEditRecurring={setEditRecur} onDeleteRecurring={deleteRecurring} catBudgets={catBudgets} onSaveCatBudget={saveCatBudget} monthTxs={monthTxs} />}
            {tab === "asset" && <Assets assets={assets} txs={txs} onAdd={addAsset} onUpdate={updateAsset} onDelete={deleteAsset} />}
          </>
        )}
        {mode === "schedule" && <Schedule events={events} month={month} year={year} setMonth={setMonth} onJump={jumpTo} onEdit={setEditEvent} onDelete={deleteEvent} onAdd={(d) => { setAddDay(d); setShowAdd(true); }} />}
        {mode === "todo" && <Todos todos={todos} onToggle={(id) => { const t = todos.find((x) => x.id === id); if (t) toggleTodo(id, t.done); }} onAdd={addTodo} onDelete={deleteTodo} />}
        {mode === "memo" && <Memos notes={notes} currentWho={currentWho} onAdd={addNote} onUpdate={updateNote} onDelete={deleteNote} />}
      </div>

      {/* 퀵바 — 홈/달력 탭에서 showQuickBar 시 표시 */}
      {mode === "money" && (tab === "home" || tab === "cal") && showQuickBar && (
        <QuickAddBar
          who={currentWho}
          onSave={(t) => { addTx(t); setShowQuickBar(false); }}
          onClose={() => { setShowQuickBar(false); if (tab === "cal") setCalSel(null); }}
          onDetail={(d) => { setAddTxDate(d || null); setShowAdd(true); setShowQuickBar(false); }}
          date={tab === "cal" && calSel ? `${year}-${String(month).padStart(2,"0")}-${String(calSel).padStart(2,"0")}` : null}
          darkMode={darkMode}
        />
      )}

      {/* + FAB — 홈 탭 (퀵바 닫혀있을 때) */}
      {mode === "money" && tab === "home" && !showQuickBar && (
        <button
          onClick={() => setShowQuickBar(true)}
          aria-label="내역 추가"
          style={{ position: "fixed", bottom: "calc(max(80px, calc(env(safe-area-inset-bottom, 0px) + 72px)))", right: "max(18px, calc(50% - 222px))", width: 52, height: 52, borderRadius: 26, border: "none", background: C.income, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(16,160,106,0.4)", cursor: "pointer", zIndex: 22, touchAction: "manipulation" }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {mode === "schedule" && (
        <button onClick={() => { setAddDay(null); setShowAdd(true); }} aria-label="일정 추가" style={{ position: "fixed", bottom: "calc(30px + env(safe-area-inset-bottom, 0px))", right: "max(18px, calc(50% - 222px))", width: 56, height: 56, minWidth: 44, minHeight: 44, borderRadius: 28, border: "none", background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(16,29,23,0.28)", cursor: "pointer", zIndex: 20, touchAction: "manipulation" }}>
          <Plus size={26} />
        </button>
      )}

      {mode === "money" && (
        <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: darkMode ? `${C.card}f2` : "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", display: "flex", paddingTop: 10, paddingBottom: "max(20px, calc(env(safe-area-inset-bottom, 0px) + 8px))", zIndex: 25 }}>
          {tabs.map(([k, label, Icon]) => (
            <button key={k} onClick={() => { if (k !== tab) { const n = new Date(); setYear(n.getFullYear()); setMonthRaw(n.getMonth() + 1); setShowQuickBar(false); setCalSel(null); } setTab(k); }} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: tab === k ? C.ink : "#B3BBB6", fontFamily: font, padding: "4px 0", minHeight: 44, touchAction: "manipulation" }}>
              <Icon size={22} strokeWidth={tab === k ? 2.4 : 1.8} style={{ display: "block", margin: "0 auto" }} />
              <div style={{ fontSize: 10.5, fontWeight: tab === k ? 700 : 500, marginTop: 3 }}>{label}</div>
            </button>
          ))}
        </nav>
      )}

      {/* 시트들 */}
      {showAdd && mode === "money" && (
        <AddTxSheet month={month} year={year} initialDate={addTxDate} defaultWho={currentWho}
          onClose={() => { setShowAdd(false); setAddTxDate(null); }}
          onSave={(t) => { addTx(t); setShowAdd(false); setAddTxDate(null); }}
          onSaveRecurring={(r) => { addRecurring(r); setShowAdd(false); setAddTxDate(null); }} />
      )}
      {showAdd && mode === "schedule" && (
        <AddEventSheet month={month} year={year} defaultDay={addDay} onClose={() => { setShowAdd(false); setAddDay(null); }}
          onSave={(e) => { addEvent(e); setShowAdd(false); setAddDay(null); }} />
      )}
      {editTx && (
        <AddTxSheet month={editTx.month} year={editTx.year} initial={editTx} onClose={() => setEditTx(null)}
          onSave={(t) => { updateTx(editTx.id, t); setEditTx(null); }}
          onSaveRecurring={(r) => { addRecurring(r); setEditTx(null); }}
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
      {showSearch && <TxSearch txs={txs} onClose={() => setShowSearch(false)} onTx={openTx} />}
      {showImport && <ImportSheet onClose={() => setShowImport(false)} onBulkSave={bulkAddTxs} currentWho={currentWho} />}

      {/* 설정 패널 */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(16,29,23,0.45)" }} onClick={() => setShowSettings(false)} />
          <div style={{ position: "relative", background: C.card, borderRadius: "20px 20px 0 0", padding: "20px 18px calc(env(safe-area-inset-bottom) + 28px)", fontFamily: font }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>설정</div>
              <button onClick={() => setShowSettings(false)} style={{ border: "none", background: "none", fontSize: 22, color: C.sub, cursor: "pointer", padding: 4 }}>×</button>
            </div>

            {/* 앱 이름 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 10, letterSpacing: "0.05em" }}>앱 이름</div>
              <input defaultValue={appTitle} onBlur={(e) => { const v = e.target.value.trim() || "우리집"; setAppTitleState(v); saveDisplay({ appTitle: v }); }}
                style={{ width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: font, background: C.bg, color: C.ink, fontWeight: 700, boxSizing: "border-box" }} />
            </div>

            {/* 사용자 이름 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 10, letterSpacing: "0.05em" }}>사용자 이름</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["종현", WHO["종현"]], ["성은", WHO["성은"]]].map(([key, color]) => (
                  <div key={key} style={{ flex: 1 }}>
                    <input defaultValue={userNames[key]} onBlur={(e) => { const v = e.target.value.trim() || key; setUserNamesState((p) => ({ ...p, [key]: v })); saveDisplay({ userNames: { [key]: v } }); }}
                      style={{ width: "100%", border: `1.5px solid ${color}40`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: font, background: color + "10", color, fontWeight: 700, boxSizing: "border-box", textAlign: "center" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* 현재 사용자 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 10, letterSpacing: "0.05em" }}>현재 사용자</div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(WHO).map(([w, color]) => (
                  <button key={w} onClick={() => setCurrentWho(w)}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1.5px solid ${currentWho === w ? color : C.line}`, background: currentWho === w ? color + "18" : C.bg, color: currentWho === w ? color : C.sub, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: font, transition: "all .15s" }}>
                    {userNames[w] || w}
                  </button>
                ))}
              </div>
            </div>

            {/* 테마 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 10, letterSpacing: "0.05em" }}>테마</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["라이트", false, "☀️"], ["다크", true, "🌙"]].map(([label, isDark, emoji]) => (
                  <button key={label} onClick={() => setDarkMode(isDark)}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1.5px solid ${darkMode === isDark ? C.ink : C.line}`, background: darkMode === isDark ? C.ink : C.bg, color: darkMode === isDark ? C.card : C.sub, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: font, transition: "all .15s" }}>
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 데이터 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 10, letterSpacing: "0.05em" }}>데이터</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { exportExcel(); setShowSettings(false); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font }}>
                  <Download size={15} />엑셀 내보내기
                </button>
                <button onClick={() => { setShowImport(true); setShowSettings(false); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.bg, color: C.ink, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font }}>
                  <Upload size={15} />내역 불러오기
                </button>
              </div>
            </div>

            {/* 로그아웃 */}
            <button onClick={() => signOut(auth)}
              style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: `1.5px solid ${C.expense}20`, background: C.expense + "0D", color: C.expense, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: font }}>
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
