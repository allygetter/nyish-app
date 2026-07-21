import React, { useState, useEffect, useCallback, useRef } from "react";
import "./lib/storage.js"; // sets up window.storage backed by Supabase
import {
  Home, Users, PiggyBank, HandCoins, CalendarDays, Megaphone, FileText,
  Award, LogIn, UserPlus, Check, X, ChevronRight, ChevronLeft, Plus,
  Download, ShieldCheck, Wallet, Clock, LogOut, Menu, Loader2, AlertCircle,
  CheckCircle2, XCircle, Landmark, User
} from "lucide-react";

/* ---------------------------------------------------------------
   NYISH — Nguumo Young Investors Self Help Group
   Design tokens:
   --nyish-ink      #6B3A28  warm terracotta ink (primary / header)
   --nyish-paper    #F7F2E4  aged paper cream (background)
   --nyish-gold     #C99A2E  harvest gold (accent / CTA)
   --nyish-rust     #8B4A2B  clay rust (secondary accent, warnings-lite)
   --nyish-line     #D8CCA8  hairline on paper
   Type: "Fraunces" (display, ledger-serif personality) + "Work Sans" (body/UI)
   Signature element: hand-ruled "ledger" hairlines + a wax-seal style
   circular stamp used for the certificate + role badges.
------------------------------------------------------------------*/

const FONT_LINK_ID = "nyish-fonts";
function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

const GROUP_NAME = "Nguumo Young Investors Self Help Group";
const GROUP_SHORT = "NYISH";

const DEFAULT_CONSTITUTION = `CONSTITUTION OF ${GROUP_NAME.toUpperCase()} ("${GROUP_SHORT}")

1. NAME
   The group shall be known as ${GROUP_NAME}.

2. VISION
   To build a self-reliant community of young investors through savings,
   credit access and mutual support.

3. MEMBERSHIP
   3.1 Open to any person aged 18–35 resident in or connected to Nguumo.
   3.2 New members are admitted after registering in the app and approval
       by the Officials (Chairperson, Treasurer, Secretary).
   3.3 Every member shall make regular contributions as agreed by the
       group in the amount and frequency set by the Annual General Meeting.

4. OFFICIALS
   4.1 Chairperson — presides over meetings, signatory to group funds.
   4.2 Treasurer — custodian of group funds, records savings and loans.
   4.3 Secretary — keeps minutes, attendance and correspondence.
   Officials are elected annually by simple majority vote.

5. MEETINGS
   5.1 The group shall meet as agreed (weekly/monthly).
   5.2 A quorum shall be two-thirds of active members.
   5.3 Minutes and attendance shall be recorded for every meeting.

6. SAVINGS & CONTRIBUTIONS
   6.1 Every member contributes the agreed amount at every meeting.
   6.2 Contributions are recorded against each member's name.
   6.3 A member who fails to contribute for three consecutive meetings
       may be brought before the group for review.

7. LOANS
   7.1 A member may apply for a loan up to an agreed multiple of their
       total savings.
   7.2 Loans are approved by the Officials and repaid with interest as
       set by the group.
   7.3 Defaulting members may have their savings used to offset the
       outstanding balance.

8. DISCIPLINE & DISPUTE RESOLUTION
   Disputes shall first be resolved internally by the Officials; unresolved
   matters go to the full membership for a vote.

9. AMENDMENTS
   This constitution may be amended by a two-thirds majority of members
   present at a general meeting.

10. DISSOLUTION
   Upon dissolution, group assets shall be shared among active members in
   proportion to their total savings, after settling all liabilities.

Adopted by the members of ${GROUP_NAME}.`;

/* ---------------------------- storage helpers ---------------------------- */
async function loadList(key) {
  try {
    const res = await window.storage.get(key, true);
    return res && res.value ? JSON.parse(res.value) : [];
  } catch {
    return [];
  }
}
async function saveList(key, list) {
  try {
    await window.storage.set(key, JSON.stringify(list), true);
  } catch (e) {
    console.error("save failed", key, e);
  }
}
async function loadText(key, fallback) {
  try {
    const res = await window.storage.get(key, true);
    return res && typeof res.value === "string" ? res.value : fallback;
  } catch {
    return fallback;
  }
}
async function saveText(key, text) {
  try {
    await window.storage.set(key, text, true);
  } catch (e) {
    console.error("save failed", key, e);
  }
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
// 8+ chars, at least one lowercase, one uppercase, one symbol.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*._-])[A-Za-z\d!@#$%^&*._-]{8,}$/;
const PASSWORD_HINT = "8+ characters, with an uppercase letter, a lowercase letter, and a symbol (e.g. @ . _ #).";

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024; // 1.5MB, keeps blob storage reasonable
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > MAX_PHOTO_BYTES) return reject(new Error("Photo is too large — please use one under 1.5MB."));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtKES(n) {
  const num = Number(n) || 0;
  return "KES " + num.toLocaleString("en-KE", { maximumFractionDigits: 0 });
}
function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}
const AVATAR_COLORS = ["#8B4A2B", "#1B4332", "#C99A2E", "#3C6E71", "#7A4E9E"];
function avatarColorFor(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
const isOfficial = (m) => m && ["chair", "treasurer", "secretary"].includes(m.role);
const roleLabel = (r) =>
  ({ chair: "Chairperson", treasurer: "Treasurer", secretary: "Secretary", member: "Member" }[r] || "Member");

function Avatar({ member, size = 34 }) {
  const common = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.36, fontWeight: 700, color: "#fff", overflow: "hidden",
  };
  if (member?.photo) {
    return <img src={member.photo} alt={member.name} style={{ ...common, objectFit: "cover", color: "transparent" }} />;
  }
  return <div style={{ ...common, background: avatarColorFor(member?.id || "?") }}>{initials(member?.name)}</div>;
}

/* ------------------------------- shell UI -------------------------------- */
function Seal({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="47" fill="none" stroke="#C99A2E" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="#C99A2E" strokeWidth="1" strokeDasharray="2 3" />
      <text x="50" y="45" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="15" fontWeight="700" fill="#C99A2E">
        NYISH
      </text>
      <text x="50" y="62" textAnchor="middle" fontFamily="Work Sans, sans-serif" fontSize="7" letterSpacing="1.5" fill="#C99A2E">
        NGUUMO
      </text>
    </svg>
  );
}

function TopBar({ title, subtitle, onMenu, right, menuIcon: MenuIcon = Menu }) {
  return (
    <div
      style={{
        background: "linear-gradient(160deg,#6B3A28,#7C4630)",
        color: "#F7F2E4",
        padding: "18px 18px 22px",
        borderBottomLeftRadius: 22,
        borderBottomRightRadius: 22,
        boxShadow: "0 6px 18px rgba(22,48,42,0.25)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -30,
          top: -30,
          width: 140,
          height: 140,
          borderRadius: "50%",
          border: "1px solid rgba(201,154,46,0.25)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onMenu && (
            <button onClick={onMenu} style={iconBtnStyle}>
              <MenuIcon size={20} color="#F7F2E4" />
            </button>
          )}
          <Seal size={34} />
        </div>
        {right}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, letterSpacing: 0.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

const iconBtnStyle = {
  background: "rgba(247,242,228,0.12)",
  border: "none",
  borderRadius: 10,
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#FFFDF8",
        border: "1px solid #EAE0C4",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 2px 8px rgba(22,48,42,0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", full, disabled, type = "button", icon }) {
  const styles = {
    primary: { background: "#6B3A28", color: "#F7F2E4" },
    gold: { background: "#C99A2E", color: "#6B3A28" },
    ghost: { background: "transparent", color: "#6B3A28", border: "1px solid #D8CCA8" },
    danger: { background: "#8B4A2B", color: "#F7F2E4" },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...styles[variant],
        border: styles[variant].border || "none",
        borderRadius: 12,
        padding: "11px 16px",
        fontFamily: "Work Sans, sans-serif",
        fontWeight: 600,
        fontSize: 14.5,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: full ? "100%" : "auto",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "transform .12s ease",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#5B5138", marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  );
}
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #D8CCA8",
  background: "#FFFDF8",
  fontFamily: "Work Sans, sans-serif",
  fontSize: 14.5,
  outline: "none",
  color: "#6B3A28",
};

function Badge({ children, tone = "gold" }) {
  const tones = {
    gold: { bg: "#F3E3B8", fg: "#8A6A16" },
    green: { bg: "#DCE9E1", fg: "#1B4332" },
    rust: { bg: "#EBD8CC", fg: "#8B4A2B" },
    grey: { bg: "#EDE9DA", fg: "#6B6350" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        background: t.bg,
        color: t.fg,
        fontSize: 11.5,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 999,
        letterSpacing: 0.3,
      }}
    >
      {children}
    </span>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 16px", color: "#8B8264" }}>
      <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: 13.5 }}>{text}</div>
    </div>
  );
}

function WelcomeModal({ me, onDismiss, onViewCertificate }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(58,31,22,0.55)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#FFFDF8", borderRadius: 18, padding: 24, maxWidth: 360, width: "100%", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
        <Seal size={54} />
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, color: "#6B3A28", marginTop: 12 }}>
          Karibu, {me.name.split(" ")[0]}!
        </div>
        <div style={{ fontSize: 13.5, color: "#5B5138", marginTop: 8, lineHeight: 1.5 }}>
          You're now a confirmed, active member of {GROUP_NAME}. Your membership certificate is ready.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          <Btn variant="gold" full icon={<Award size={16} />} onClick={onViewCertificate}>View my certificate</Btn>
          <Btn variant="ghost" full onClick={onDismiss}>Continue to app</Btn>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 90,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#6B3A28",
        color: "#F7F2E4",
        padding: "10px 18px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
        zIndex: 50,
        maxWidth: "88%",
        textAlign: "center",
      }}
    >
      {msg}
    </div>
  );
}

/* ------------------------------ Auth screens ------------------------------ */
function AuthShell({ children }) {
  useFonts();
  return (
    <div
      style={{
        minHeight: 560,
        background: "radial-gradient(circle at 30% 0%, #8B5540, #3A1F16 65%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 20px",
        fontFamily: "Work Sans, sans-serif",
      }}
    >
      <Seal size={64} />
      <div style={{ color: "#F7F2E4", fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 600, marginTop: 14, textAlign: "center" }}>
        {GROUP_SHORT}
      </div>
      <div style={{ color: "#C9BE9E", fontSize: 12.5, marginTop: 2, textAlign: "center", maxWidth: 260 }}>
        {GROUP_NAME}
      </div>
      <div style={{ width: "100%", maxWidth: 360, marginTop: 26 }}>{children}</div>
    </div>
  );
}

function LoginScreen({ members, onLogin, goRegister, notify }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    const m = members.find((x) => x.phone === phone.trim() && x.password === password.trim());
    setBusy(false);
    if (!m) {
      notify("No match. Check your phone number and password.");
      return;
    }
    if (m.status === "pending") {
      notify("Your registration is awaiting official approval.");
      return;
    }
    onLogin(m);
  };

  return (
    <Card style={{ background: "#FFFDF8" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: "#6B3A28", marginBottom: 14 }}>
        Member sign in
      </div>
      <form onSubmit={submit}>
        <Field label="Phone number">
          <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" required />
        </Field>
        <Field label="Password">
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
        </Field>
        <Btn type="submit" full variant="gold" icon={<LogIn size={16} />} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Btn>
      </form>
      <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#5B5138" }}>
        New to {GROUP_SHORT}?{" "}
        <button onClick={goRegister} style={{ background: "none", border: "none", color: "#8B4A2B", fontWeight: 700, cursor: "pointer", padding: 0 }}>
          Register here
        </button>
      </div>
    </Card>
  );
}

function RegisterScreen({ members, onRegistered, goLogin, notify }) {
  const [form, setForm] = useState({ name: "", phone: "", idNumber: "", kraPin: "", email: "", password: "" });
  const [photo, setPhoto] = useState(null); // data URL
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPhotoChange = async (e) => {
    try {
      const dataUrl = await fileToDataURL(e.target.files?.[0]);
      setPhoto(dataUrl);
    } catch (err) {
      notify(err.message);
      e.target.value = "";
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (members.some((m) => m.phone === form.phone.trim())) {
      notify("That phone number is already registered.");
      return;
    }
    if (!PASSWORD_RULE.test(form.password.trim())) {
      notify("Password doesn't meet the requirements — " + PASSWORD_HINT);
      return;
    }
    setBusy(true);
    const isFirstEver = members.length === 0;
    const newMember = {
      id: uid(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      idNumber: form.idNumber.trim(),
      kraPin: form.kraPin.trim(),
      email: form.email.trim(),
      password: form.password.trim(),
      photo: photo || null,
      role: isFirstEver ? "chair" : "member",
      status: isFirstEver ? "active" : "pending",
      joinDate: todayISO(),
    };
    const updated = [...members, newMember];
    await saveList("members", updated);
    setBusy(false);
    onRegistered(updated, newMember);
  };

  return (
    <Card style={{ background: "#FFFDF8" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: "#6B3A28", marginBottom: 14 }}>
        New member registration
      </div>
      <form onSubmit={submit}>
        <Field label="Full name">
          <input style={inputStyle} value={form.name} onChange={set("name")} required />
        </Field>
        <Field label="Phone number">
          <input style={inputStyle} value={form.phone} onChange={set("phone")} placeholder="07XXXXXXXX" required />
        </Field>
        <Field label="National ID number">
          <input style={inputStyle} value={form.idNumber} onChange={set("idNumber")} required />
        </Field>
        <Field label="KRA PIN (optional)">
          <input style={inputStyle} value={form.kraPin} onChange={set("kraPin")} placeholder="A0XXXXXXXXZ" />
        </Field>
        <Field label="Email (optional)">
          <input style={inputStyle} type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Passport photo (optional, can add later)">
          <input style={inputStyle} type="file" accept="image/*" onChange={onPhotoChange} />
          {photo && (
            <img src={photo} alt="preview" style={{ marginTop: 8, width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "1px solid #D8CCA8" }} />
          )}
        </Field>
        <Field label="Create a password">
          <input style={inputStyle} type="password" value={form.password} onChange={set("password")} placeholder="8+ chars, upper, lower, symbol" required />
          <div style={{ fontSize: 11, color: "#A79B78", marginTop: 4 }}>{PASSWORD_HINT}</div>
        </Field>
        <Btn type="submit" full variant="gold" icon={<UserPlus size={16} />} disabled={busy}>
          {busy ? "Submitting…" : "Submit registration"}
        </Btn>
      </form>
      <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#5B5138" }}>
        Already a member?{" "}
        <button onClick={goLogin} style={{ background: "none", border: "none", color: "#8B4A2B", fontWeight: 700, cursor: "pointer", padding: 0 }}>
          Sign in
        </button>
      </div>
    </Card>
  );
}

/* -------------------------------- App shell -------------------------------- */
const NAV = [
  { key: "home", label: "Home", icon: Home },
  { key: "savings", label: "Savings", icon: PiggyBank },
  { key: "loans", label: "Loans", icon: HandCoins },
  { key: "meetings", label: "Meetings", icon: CalendarDays },
  { key: "more", label: "More", icon: Menu },
];

export default function NyishApp() {
  useFonts();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [savings, setSavings] = useState([]);
  const [loans, setLoans] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [constitution, setConstitution] = useState(DEFAULT_CONSTITUTION);

  const [authMode, setAuthMode] = useState("login");
  const [me, setMe] = useState(null);
  const [page, setPage] = useState("home");
  const [morePage, setMorePage] = useState(null);
  const [toast, setToast] = useState("");

  const notify = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => {
    (async () => {
      const [m, s, l, mt, an, co] = await Promise.all([
        loadList("members"),
        loadList("savings"),
        loadList("loans"),
        loadList("meetings"),
        loadList("announcements"),
        loadText("constitution", DEFAULT_CONSTITUTION),
      ]);
      setMembers(m);
      setSavings(s);
      setLoans(l);
      setMeetings(mt);
      setAnnouncements(an);
      setConstitution(co);
      setLoading(false);
    })();
  }, []);

  // keep `me` fresh if data reloads elsewhere
  useEffect(() => {
    if (me) {
      const fresh = members.find((m) => m.id === me.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(me)) setMe(fresh);
    }
  }, [members]); // eslint-disable-line

  if (loading) {
    return (
      <AuthShell>
        <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
          <Loader2 className="spin" size={26} color="#C99A2E" />
          <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AuthShell>
    );
  }

  if (!me) {
    return (
      <AuthShell>
        {authMode === "login" ? (
          <LoginScreen members={members} onLogin={setMe} goRegister={() => setAuthMode("register")} notify={notify} />
        ) : (
          <RegisterScreen
            members={members}
            onRegistered={(updated, newMember) => {
              setMembers(updated);
              if (newMember.status === "active") {
                setMe(newMember);
                notify(`Welcome, ${newMember.name.split(" ")[0]}! You're set up as Chairperson.`);
              } else {
                notify("Registered! Await official approval, then sign in.");
                setAuthMode("login");
              }
            }}
            goLogin={() => setAuthMode("login")}
            notify={notify}
          />
        )}
        <Toast msg={toast} />
      </AuthShell>
    );
  }

  const official = isOfficial(me);
  const isChair = me.role === "chair";
  const isSecretary = me.role === "secretary";

  const mySavingsTotal = savings.filter((s) => s.memberId === me.id).reduce((a, b) => a + Number(b.amount), 0);
  const groupSavingsTotal = savings.reduce((a, b) => a + Number(b.amount), 0);
  const activeMembers = members.filter((m) => m.status === "active");

  const persist = {
    members: async (next) => { setMembers(next); await saveList("members", next); },
    savings: async (next) => { setSavings(next); await saveList("savings", next); },
    loans: async (next) => { setLoans(next); await saveList("loans", next); },
    meetings: async (next) => { setMeetings(next); await saveList("meetings", next); },
    announcements: async (next) => { setAnnouncements(next); await saveList("announcements", next); },
    constitution: async (text) => { setConstitution(text); await saveText("constitution", text); },
  };

  const dismissWelcome = async () => {
    const next = members.map((m) => (m.id === me.id ? { ...m, congratulated: true } : m));
    await persist.members(next);
  };

  const showWelcome = me.status === "active" && !me.congratulated;

  const ctx = {
    me, official, isChair, isSecretary, members, savings, loans, meetings, announcements, constitution,
    persist, notify, activeMembers, mySavingsTotal, groupSavingsTotal,
  };

  let body;
  if (page === "more" && morePage) {
    body = <MorePages.detail page={morePage} ctx={ctx} onBack={() => setMorePage(null)} />;
  } else {
    switch (page) {
      case "home": body = <HomePage ctx={ctx} goto={setPage} />; break;
      case "savings": body = <SavingsPage ctx={ctx} />; break;
      case "loans": body = <LoansPage ctx={ctx} />; break;
      case "meetings": body = <MeetingsPage ctx={ctx} />; break;
      case "more": body = <MorePages.menu ctx={ctx} open={setMorePage} onLogout={() => { setMe(null); setPage("home"); }} />; break;
      default: body = null;
    }
  }

  return (
    <div style={{ fontFamily: "Work Sans, sans-serif", background: "#F7F2E4", minHeight: 560, maxWidth: 430, margin: "0 auto", position: "relative", paddingBottom: 78 }}>
      {body}
      {showWelcome && <WelcomeModal me={me} onDismiss={dismissWelcome} onViewCertificate={() => { setPage("more"); setMorePage("certificate"); dismissWelcome(); }} />}
      <Toast msg={toast} />
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          background: "#FFFDF8",
          borderTop: "1px solid #EAE0C4",
          display: "flex",
          padding: "8px 6px calc(8px + env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 16px rgba(22,48,42,0.06)",
        }}
      >
        {NAV.map((n) => {
          const Icon = n.icon;
          const activeKey = page === "more" ? "more" : page;
          const active = activeKey === n.key;
          return (
            <button
              key={n.key}
              onClick={() => { setPage(n.key); if (n.key !== "more") setMorePage(null); else setMorePage(null); }}
              style={{
                flex: 1, background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0",
                color: active ? "#6B3A28" : "#A79B78",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* --------------------------------- Home ---------------------------------- */
function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 4px 10px" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 15.5, fontWeight: 600, color: "#6B3A28" }}>{children}</div>
      {action}
    </div>
  );
}

function HomePage({ ctx, goto }) {
  const { me, official, activeMembers, savings, loans, announcements, mySavingsTotal, groupSavingsTotal } = ctx;
  const pendingLoans = loans.filter((l) => l.status === "pending");
  const latestAnnouncements = [...announcements].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 2);

  return (
    <div>
      <TopBar
        title={`Karibu, ${me.name.split(" ")[0]}`}
        subtitle={`${roleLabel(me.role)} · ${GROUP_SHORT}`}
        right={<Avatar member={me} size={34} />}
      />
      <div style={{ padding: "16px 16px 4px" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: "#8B8264", fontWeight: 600 }}>Group savings</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, color: "#6B3A28", marginTop: 4 }}>
              {fmtKES(groupSavingsTotal)}
            </div>
          </Card>
          <Card style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: "#8B8264", fontWeight: 600 }}>My savings</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, color: "#6B3A28", marginTop: 4 }}>
              {fmtKES(mySavingsTotal)}
            </div>
          </Card>
        </div>
        <div style={{ marginTop: 12 }}>
          <Card>
            <div style={{ fontSize: 11.5, color: "#8B8264", fontWeight: 600 }}>Active members</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, color: "#6B3A28", marginTop: 4 }}>
              {activeMembers.length}
            </div>
          </Card>
        </div>

        {official && pendingLoans.length > 0 && (
          <Card style={{ marginTop: 14, borderColor: "#EBD8CC", background: "#FBF3EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={18} color="#8B4A2B" />
              <div style={{ fontSize: 13.5, color: "#8B4A2B", fontWeight: 600 }}>
                {pendingLoans.length} loan request{pendingLoans.length > 1 ? "s" : ""} awaiting your decision
              </div>
            </div>
          </Card>
        )}

        <SectionTitle action={<button onClick={() => goto("more")} style={{ background: "none", border: "none", color: "#8B4A2B", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>See all</button>}>
          Announcements
        </SectionTitle>
        {latestAnnouncements.length === 0 ? (
          <Card><EmptyState icon={<Megaphone size={22} color="#C9BE9E" />} text="No announcements yet." /></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {latestAnnouncements.map((a) => (
              <Card key={a.id}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#6B3A28" }}>{a.title}</div>
                <div style={{ fontSize: 12.5, color: "#6B6350", marginTop: 3 }}>{a.body}</div>
                <div style={{ fontSize: 11, color: "#A79B78", marginTop: 6 }}>{a.date}</div>
              </Card>
            ))}
          </div>
        )}

        <SectionTitle>Quick actions</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <QuickAction icon={<PiggyBank size={18} />} label="Savings" onClick={() => goto("savings")} />
          <QuickAction icon={<HandCoins size={18} />} label="Loans" onClick={() => goto("loans")} />
          <QuickAction icon={<CalendarDays size={18} />} label="Meetings" onClick={() => goto("meetings")} />
          <QuickAction icon={<Award size={18} />} label="Certificate" onClick={() => goto("more")} />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "#FFFDF8", border: "1px solid #EAE0C4", borderRadius: 14, padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", color: "#6B3A28" }}>
      <div style={{ color: "#C99A2E" }}>{icon}</div>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

/* -------------------------------- Savings -------------------------------- */
function SavingsPage({ ctx }) {
  const { me, official, members, savings, persist, notify } = ctx;
  const [showForm, setShowForm] = useState(false);
  const [memberId, setMemberId] = useState(me.id);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const visible = official ? savings : savings.filter((s) => s.memberId === me.id);
  const sorted = [...visible].sort((a, b) => (a.date < b.date ? 1 : -1));
  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return notify("Enter a valid amount.");
    const entry = { id: uid(), memberId: official ? memberId : me.id, amount: Number(amount), date: todayISO(), note: note.trim(), recordedBy: me.id };
    await persist.savings([...savings, entry]);
    notify("Contribution recorded.");
    setAmount(""); setNote(""); setShowForm(false);
  };

  return (
    <div>
      <TopBar title="Savings" subtitle={official ? "All member contributions" : "Your contribution history"} />
      <div style={{ padding: 16 }}>
        <Btn variant="gold" icon={<Plus size={16} />} onClick={() => setShowForm((s) => !s)}>
          {official ? "Record a contribution" : "Add my contribution"}
        </Btn>

        {showForm && (
          <Card style={{ marginTop: 14 }}>
            <form onSubmit={submit}>
              {official && (
                <Field label="Member">
                  <select style={inputStyle} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                    {members.filter((m) => m.status === "active").map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Amount (KES)">
                <input style={inputStyle} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </Field>
              <Field label="Note (optional)">
                <input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. weekly contribution" />
              </Field>
              <Btn type="submit" full variant="primary">Save entry</Btn>
            </form>
          </Card>
        )}

        <SectionTitle>History</SectionTitle>
        {sorted.length === 0 ? (
          <Card><EmptyState icon={<PiggyBank size={22} color="#C9BE9E" />} text="No contributions recorded yet." /></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((s) => (
              <Card key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  {official && <div style={{ fontWeight: 700, fontSize: 13.5, color: "#6B3A28" }}>{memberName(s.memberId)}</div>}
                  <div style={{ fontSize: 11.5, color: "#A79B78" }}>{s.date}{s.note ? ` · ${s.note}` : ""}</div>
                </div>
                <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, color: "#6B3A28" }}>+{fmtKES(s.amount)}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Loans ---------------------------------- */
function LoansPage({ ctx }) {
  const { me, isChair, members, loans, savings, persist, notify } = ctx;
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [repayFor, setRepayFor] = useState(null);
  const [repayAmt, setRepayAmt] = useState("");

  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";
  const visible = isChair ? loans : loans.filter((l) => l.memberId === me.id);
  const sorted = [...visible].sort((a, b) => (a.dateRequested < b.dateRequested ? 1 : -1));

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return notify("Enter a valid amount.");
    const entry = {
      id: uid(), memberId: me.id, amount: Number(amount), purpose: purpose.trim(),
      status: "pending", dateRequested: todayISO(), dateApproved: null,
      repayments: [], balance: Number(amount),
    };
    await persist.loans([...loans, entry]);
    notify("Loan request submitted.");
    setAmount(""); setPurpose(""); setShowForm(false);
  };

  const decide = async (loan, decision) => {
    const next = loans.map((l) => l.id === loan.id ? { ...l, status: decision, dateApproved: todayISO() } : l);
    await persist.loans(next);
    notify(`Loan ${decision === "approved" ? "approved" : "rejected"}.`);
  };

  const recordRepayment = async (loan) => {
    if (!repayAmt || Number(repayAmt) <= 0) return notify("Enter a valid repayment amount.");
    const amt = Number(repayAmt);
    const next = loans.map((l) => {
      if (l.id !== loan.id) return l;
      const newBalance = Math.max(0, l.balance - amt);
      return {
        ...l,
        repayments: [...l.repayments, { amount: amt, date: todayISO() }],
        balance: newBalance,
        status: newBalance === 0 ? "repaid" : "active",
      };
    });
    await persist.loans(next);
    notify("Repayment recorded.");
    setRepayFor(null); setRepayAmt("");
  };

  const statusTone = { pending: "gold", approved: "green", active: "green", rejected: "rust", repaid: "grey" };

  return (
    <div>
      <TopBar title="Loans" subtitle={isChair ? "Requests & repayments (Chairperson)" : "Request and track your loans"} />
      <div style={{ padding: 16 }}>
        {!isChair && (
          <Btn variant="gold" icon={<Plus size={16} />} onClick={() => setShowForm((s) => !s)}>Request a loan</Btn>
        )}

        {showForm && (
          <Card style={{ marginTop: 14 }}>
            <form onSubmit={submitRequest}>
              <Field label="Amount (KES)">
                <input style={inputStyle} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </Field>
              <Field label="Purpose">
                <input style={inputStyle} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. stock for kiosk" required />
              </Field>
              <Btn type="submit" full variant="primary">Submit request</Btn>
            </form>
          </Card>
        )}

        <SectionTitle>{isChair ? "All loans" : "My loans"}</SectionTitle>
        {sorted.length === 0 ? (
          <Card><EmptyState icon={<HandCoins size={22} color="#C9BE9E" />} text="No loans yet." /></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((l) => (
              <Card key={l.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    {isChair && <div style={{ fontWeight: 700, fontSize: 13.5, color: "#6B3A28" }}>{memberName(l.memberId)}</div>}
                    <div style={{ fontSize: 12.5, color: "#6B6350", marginTop: 2 }}>{l.purpose}</div>
                    <div style={{ fontSize: 11, color: "#A79B78", marginTop: 4 }}>Requested {l.dateRequested}</div>
                  </div>
                  <Badge tone={statusTone[l.status]}>{l.status}</Badge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, borderTop: "1px dashed #EAE0C4", paddingTop: 10 }}>
                  <div style={{ fontSize: 12.5, color: "#5B5138" }}>Amount: <b>{fmtKES(l.amount)}</b></div>
                  {(l.status === "approved" || l.status === "active" || l.status === "repaid") && (
                    <div style={{ fontSize: 12.5, color: "#5B5138" }}>Balance: <b>{fmtKES(l.balance)}</b></div>
                  )}
                </div>

                {isChair && l.status === "pending" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <Btn variant="primary" icon={<Check size={15} />} onClick={() => decide(l, "approved")}>Grant loan</Btn>
                    <Btn variant="ghost" icon={<X size={15} />} onClick={() => decide(l, "rejected")}>Reject</Btn>
                  </div>
                )}

                {isChair && (l.status === "approved" || l.status === "active") && (
                  repayFor === l.id ? (
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      <input style={{ ...inputStyle, flex: 1 }} type="number" min="1" placeholder="Repay amount" value={repayAmt} onChange={(e) => setRepayAmt(e.target.value)} />
                      <Btn variant="primary" onClick={() => recordRepayment(l)}>Save</Btn>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <Btn variant="ghost" icon={<Wallet size={15} />} onClick={() => setRepayFor(l.id)}>Record repayment</Btn>
                    </div>
                  )
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Meetings --------------------------------- */
function MeetingsPage({ ctx }) {
  const { me, isSecretary, members, meetings, persist, notify, activeMembers } = ctx;
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [agenda, setAgenda] = useState("");
  const [minutes, setMinutes] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [openId, setOpenId] = useState(null);

  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";
  const sorted = [...meetings].sort((a, b) => (a.date < b.date ? 1 : -1));

  const toggleAttend = (id) => {
    setAttendance((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  };

  const submit = async (e) => {
    e.preventDefault();
    const entry = { id: uid(), date, agenda: agenda.trim(), minutes: minutes.trim(), attendance, createdBy: me.id };
    await persist.meetings([...meetings, entry]);
    notify("Meeting saved.");
    setAgenda(""); setMinutes(""); setAttendance([]); setShowForm(false);
  };

  return (
    <div>
      <TopBar title="Meetings" subtitle={isSecretary ? "Attendance & minutes (Secretary)" : "Attendance & minutes — view only"} />
      <div style={{ padding: 16 }}>
        {isSecretary && (
          <Btn variant="gold" icon={<Plus size={16} />} onClick={() => setShowForm((s) => !s)}>Log a meeting</Btn>
        )}

        {showForm && (
          <Card style={{ marginTop: 14 }}>
            <form onSubmit={submit}>
              <Field label="Date">
                <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field label="Agenda">
                <input style={inputStyle} value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="e.g. Loan reviews, AGM prep" required />
              </Field>
              <Field label="Minutes">
                <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Summary of discussion & decisions" />
              </Field>
              <Field label="Attendance">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {activeMembers.map((m) => (
                    <button type="button" key={m.id} onClick={() => toggleAttend(m.id)}
                      style={{
                        border: "1px solid " + (attendance.includes(m.id) ? "#6B3A28" : "#D8CCA8"),
                        background: attendance.includes(m.id) ? "#F0DDD0" : "#FFFDF8",
                        color: "#6B3A28", borderRadius: 999, padding: "6px 12px", fontSize: 12.5, cursor: "pointer",
                      }}>
                      {m.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </Field>
              <Btn type="submit" full variant="primary">Save meeting</Btn>
            </form>
          </Card>
        )}

        <SectionTitle>Past meetings</SectionTitle>
        {sorted.length === 0 ? (
          <Card><EmptyState icon={<CalendarDays size={22} color="#C9BE9E" />} text="No meetings logged yet." /></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((mt) => {
              const open = openId === mt.id;
              const present = mt.attendance.includes(me.id);
              return (
                <Card key={mt.id}>
                  <button onClick={() => setOpenId(open ? null : mt.id)} style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer", padding: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#6B3A28" }}>{mt.date}</div>
                        <div style={{ fontSize: 12, color: "#6B6350", marginTop: 2 }}>{mt.agenda}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {!isSecretary && <Badge tone={present ? "green" : "rust"}>{present ? "Present" : "Absent"}</Badge>}
                        {open ? <ChevronLeft size={16} style={{ transform: "rotate(-90deg)" }} /> : <ChevronRight size={16} />}
                      </div>
                    </div>
                  </button>
                  {open && (
                    <div style={{ marginTop: 10, borderTop: "1px dashed #EAE0C4", paddingTop: 10 }}>
                      <div style={{ fontSize: 12.5, color: "#5B5138", whiteSpace: "pre-wrap" }}>{mt.minutes || "No minutes recorded."}</div>
                      <div style={{ fontSize: 11.5, color: "#A79B78", marginTop: 8, fontWeight: 600 }}>
                        Attendance ({mt.attendance.length}/{activeMembers.length}): {mt.attendance.map(memberName).join(", ") || "None"}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ More section ------------------------------- */
function MoreMenu({ ctx, open, onLogout }) {
  const { me, official } = ctx;
  const items = [
    { key: "profile", label: "My profile", icon: User },
    official && { key: "members", label: "Members & approvals", icon: Users },
    { key: "announcements", label: "Announcements", icon: Megaphone },
    { key: "constitution", label: "Constitution", icon: FileText },
    { key: "certificate", label: "My certificate", icon: Award },
  ].filter(Boolean);

  return (
    <div>
      <TopBar title="More" subtitle={`Signed in as ${me.name}`} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <button key={it.key} onClick={() => open(it.key)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFDF8", border: "1px solid #EAE0C4", borderRadius: 14, padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Icon size={19} color="#C99A2E" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#6B3A28" }}>{it.label}</span>
                </div>
                <ChevronRight size={17} color="#A79B78" />
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 22 }}>
          <Btn variant="danger" full icon={<LogOut size={16} />} onClick={onLogout}>Sign out</Btn>
        </div>
      </div>
    </div>
  );
}

function MembersPage({ ctx, onBack }) {
  const { members, persist, notify } = ctx;
  const pending = members.filter((m) => m.status === "pending");
  const active = members.filter((m) => m.status === "active");

  const approve = async (m) => {
    await persist.members(members.map((x) => x.id === m.id ? { ...x, status: "active" } : x));
    notify(`${m.name} approved.`);
    // Best-effort welcome email with certificate attached — silently
    // skipped if the member has no email, or /api/send-welcome isn't
    // configured yet (no RESEND_API_KEY set in Vercel). See PROGRESS.md.
    if (m.email) {
      try {
        const certificatePngBase64 = await renderCertificateBase64({ ...m, status: "active" });
        await fetch("/api/send-welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: m.email, name: m.name, certificatePngBase64 }),
        });
      } catch {
        // Non-fatal — the member still sees the in-app welcome + certificate on next login.
      }
    }
  };
  const reject = async (m) => {
    await persist.members(members.filter((x) => x.id !== m.id));
    notify(`${m.name}'s registration removed.`);
  };
  const setRole = async (m, role) => {
    await persist.members(members.map((x) => x.id === m.id ? { ...x, role } : x));
    notify(`${m.name} is now ${roleLabel(role)}.`);
  };

  return (
    <DetailShell title="Members & approvals" onBack={onBack}>
      {pending.length > 0 && (
        <>
          <SectionTitle>Pending approval ({pending.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((m) => (
              <Card key={m.id}>
                <div style={{ fontWeight: 700, color: "#6B3A28" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#8B8264" }}>{m.phone} · ID {m.idNumber}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn variant="primary" icon={<Check size={15} />} onClick={() => approve(m)}>Approve</Btn>
                  <Btn variant="ghost" icon={<X size={15} />} onClick={() => reject(m)}>Reject</Btn>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      <SectionTitle>Active members ({active.length})</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {active.map((m) => (
          <Card key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar member={m} size={34} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: "#6B3A28" }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: "#A79B78" }}>{m.phone} · joined {m.joinDate}</div>
              </div>
            </div>
            <select style={{ ...inputStyle, width: 118, padding: "6px 8px", fontSize: 12 }} value={m.role} onChange={(e) => setRole(m, e.target.value)}>
              <option value="member">Member</option>
              <option value="chair">Chair</option>
              <option value="treasurer">Treasurer</option>
              <option value="secretary">Secretary</option>
            </select>
          </Card>
        ))}
      </div>
    </DetailShell>
  );
}

function AnnouncementsPage({ ctx, onBack }) {
  const { me, official, announcements, persist, notify } = ctx;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const sorted = [...announcements].sort((a, b) => (a.date < b.date ? 1 : -1));

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return notify("Add a title.");
    const entry = { id: uid(), title: title.trim(), body: body.trim(), date: todayISO(), postedBy: me.id };
    await persist.announcements([entry, ...announcements]);
    notify("Announcement posted.");
    setTitle(""); setBody("");
  };

  return (
    <DetailShell title="Announcements" onBack={onBack}>
      {official && (
        <Card style={{ marginBottom: 16 }}>
          <form onSubmit={submit}>
            <Field label="Title">
              <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <Field label="Message">
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Btn type="submit" variant="gold" icon={<Megaphone size={15} />}>Post to group</Btn>
          </form>
        </Card>
      )}
      {sorted.length === 0 ? (
        <Card><EmptyState icon={<Megaphone size={22} color="#C9BE9E" />} text="No announcements yet." /></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((a) => (
            <Card key={a.id}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#6B3A28" }}>{a.title}</div>
              <div style={{ fontSize: 12.5, color: "#6B6350", marginTop: 3 }}>{a.body}</div>
              <div style={{ fontSize: 11, color: "#A79B78", marginTop: 6 }}>{a.date}</div>
            </Card>
          ))}
        </div>
      )}
    </DetailShell>
  );
}

function ConstitutionPage({ ctx, onBack }) {
  const { official, constitution, persist, notify } = ctx;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(constitution);

  const download = () => {
    const blob = new Blob([constitution], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "NYISH_Constitution.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    await persist.constitution(draft);
    notify("Constitution updated.");
    setEditing(false);
  };

  return (
    <DetailShell title="Constitution" onBack={onBack}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn variant="gold" icon={<Download size={15} />} onClick={download}>Download</Btn>
        {official && !editing && <Btn variant="ghost" onClick={() => { setDraft(constitution); setEditing(true); }}>Edit</Btn>}
      </div>
      {editing ? (
        <Card>
          <textarea style={{ ...inputStyle, minHeight: 320, resize: "vertical", fontFamily: "monospace", fontSize: 12.5 }} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn variant="primary" onClick={save}>Save changes</Btn>
            <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
          </div>
        </Card>
      ) : (
        <Card>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Work Sans, sans-serif", fontSize: 13, lineHeight: 1.6, color: "#3A3524", margin: 0 }}>{constitution}</pre>
        </Card>
      )}
    </DetailShell>
  );
}

async function drawCertificateOnCanvas(canvas, member) {
  const ctx2d = canvas.getContext("2d");
  const W = 900, H = 640;
  canvas.width = W; canvas.height = H;

  ctx2d.fillStyle = "#F7F2E4";
  ctx2d.fillRect(0, 0, W, H);
  ctx2d.strokeStyle = "#C99A2E";
  ctx2d.lineWidth = 6;
  ctx2d.strokeRect(24, 24, W - 48, H - 48);
  ctx2d.strokeStyle = "#6B3A28";
  ctx2d.lineWidth = 1.5;
  ctx2d.strokeRect(36, 36, W - 72, H - 72);

  if (member.photo) {
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = member.photo;
      });
      const cx = W - 130, cy = 100, r = 46;
      ctx2d.save();
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
      ctx2d.closePath();
      ctx2d.clip();
      const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx2d.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx2d.restore();
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
      ctx2d.strokeStyle = "#C99A2E";
      ctx2d.lineWidth = 3;
      ctx2d.stroke();
    } catch {
      // ignore broken photo, certificate still renders without it
    }
  }

  ctx2d.textAlign = "center";
  ctx2d.fillStyle = "#6B3A28";
  ctx2d.font = "600 15px Work Sans, sans-serif";
  ctx2d.fillText("CERTIFICATE OF MEMBERSHIP", W / 2, 110);

  ctx2d.font = "700 34px Fraunces, serif";
  ctx2d.fillText(GROUP_NAME, W / 2, 155);

  ctx2d.font = "14px Work Sans, sans-serif";
  ctx2d.fillStyle = "#6B6350";
  ctx2d.fillText("This certifies that", W / 2, 230);

  ctx2d.font = "600 40px Fraunces, serif";
  ctx2d.fillStyle = "#8B4A2B";
  ctx2d.fillText(member.name, W / 2, 285);

  ctx2d.font = "14px Work Sans, sans-serif";
  ctx2d.fillStyle = "#6B6350";
  ctx2d.fillText("is a registered and active member of " + GROUP_SHORT + ",", W / 2, 330);
  ctx2d.fillText("having joined on " + member.joinDate + ".", W / 2, 352);

  ctx2d.save();
  ctx2d.translate(W / 2, 460);
  ctx2d.beginPath(); ctx2d.arc(0, 0, 58, 0, Math.PI * 2); ctx2d.strokeStyle = "#C99A2E"; ctx2d.lineWidth = 3; ctx2d.stroke();
  ctx2d.beginPath(); ctx2d.arc(0, 0, 48, 0, Math.PI * 2); ctx2d.setLineDash([2, 4]); ctx2d.stroke(); ctx2d.setLineDash([]);
  ctx2d.font = "700 16px Fraunces, serif"; ctx2d.fillStyle = "#C99A2E"; ctx2d.fillText("NYISH", 0, -4);
  ctx2d.font = "8px Work Sans, sans-serif"; ctx2d.fillText("NGUUMO", 0, 12);
  ctx2d.restore();

  ctx2d.font = "12px Work Sans, sans-serif";
  ctx2d.fillStyle = "#A79B78";
  ctx2d.fillText("Member ID: " + member.id.toUpperCase(), W / 2, 560);
  ctx2d.fillText(
    member.kraPin ? `KRA PIN: ${member.kraPin}   ·   Issued ${todayISO()}` : "Issued " + todayISO(),
    W / 2, 578
  );
}

// Renders a member's certificate off-screen and returns raw base64 PNG data
// (no data-URL prefix) — used to email it as an attachment on approval.
async function renderCertificateBase64(member) {
  const canvas = document.createElement("canvas");
  await drawCertificateOnCanvas(canvas, member);
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1];
}

function CertificatePage({ ctx, onBack }) {
  const { me } = ctx;
  const canvasRef = useRef(null);
  const eligible = me.status === "active";

  useEffect(() => {
    if (!eligible || !canvasRef.current) return;
    let cancelled = false;
    drawCertificateOnCanvas(canvasRef.current, me).catch(() => {});
    return () => { cancelled = true; };
  }, [eligible, me]);

  const download = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `NYISH_Certificate_${me.name.replace(/\s+/g, "_")}.png`;
    a.click();
  };

  return (
    <DetailShell title="My certificate" onBack={onBack}>
      {!eligible ? (
        <Card><EmptyState icon={<Award size={22} color="#C9BE9E" />} text="Your membership is still pending approval." /></Card>
      ) : (
        <>
          <Card style={{ padding: 8, overflow: "hidden" }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "auto", borderRadius: 8, display: "block" }} />
          </Card>
          <div style={{ marginTop: 14 }}>
            <Btn variant="gold" full icon={<Download size={16} />} onClick={download}>Download certificate (PNG)</Btn>
          </div>
        </>
      )}
    </DetailShell>
  );
}

function ProfilePage({ ctx, onBack }) {
  const { me, members, persist, notify } = ctx;
  const [form, setForm] = useState({
    name: me.name, email: me.email || "", kraPin: me.kraPin || "",
    idNumber: me.idNumber || "", nextOfKin: me.nextOfKin || "", nextOfKinPhone: me.nextOfKinPhone || "",
  });
  const [photo, setPhoto] = useState(me.photo || null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPhotoChange = async (e) => {
    try {
      const dataUrl = await fileToDataURL(e.target.files?.[0]);
      if (dataUrl) setPhoto(dataUrl);
    } catch (err) {
      notify(err.message);
      e.target.value = "";
    }
  };

  const saveProfile = async () => {
    const next = members.map((m) => (m.id === me.id ? { ...m, ...form, photo } : m));
    await persist.members(next);
    notify("Profile updated.");
  };

  const changePassword = async () => {
    if (pw.current.trim() !== me.password) return notify("Current password is incorrect.");
    if (!PASSWORD_RULE.test(pw.next.trim())) return notify("New password doesn't meet the requirements — " + PASSWORD_HINT);
    if (pw.next.trim() !== pw.confirm.trim()) return notify("New password and confirmation don't match.");
    const next = members.map((m) => (m.id === me.id ? { ...m, password: pw.next.trim() } : m));
    await persist.members(next);
    setPw({ current: "", next: "", confirm: "" });
    notify("Password changed.");
  };

  return (
    <DetailShell title="My profile" onBack={onBack}>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <Avatar member={{ ...me, photo }} size={84} />
          <label style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: "#8B4A2B", cursor: "pointer" }}>
            Change passport photo
            <input type="file" accept="image/*" onChange={onPhotoChange} style={{ display: "none" }} />
          </label>
        </div>
        <Field label="Full name">
          <input style={inputStyle} value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Email">
          <input style={inputStyle} type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="National ID number">
          <input style={inputStyle} value={form.idNumber} onChange={set("idNumber")} />
        </Field>
        <Field label="KRA PIN">
          <input style={inputStyle} value={form.kraPin} onChange={set("kraPin")} placeholder="A0XXXXXXXXZ" />
        </Field>
        <Field label="Next of kin name">
          <input style={inputStyle} value={form.nextOfKin} onChange={set("nextOfKin")} />
        </Field>
        <Field label="Next of kin phone">
          <input style={inputStyle} value={form.nextOfKinPhone} onChange={set("nextOfKinPhone")} placeholder="07XXXXXXXX" />
        </Field>
        <Btn variant="primary" full onClick={saveProfile}>Save profile</Btn>
      </Card>

      <SectionTitle>Change password</SectionTitle>
      <Card>
        <Field label="Current password">
          <input style={inputStyle} type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
        </Field>
        <Field label="New password">
          <input style={inputStyle} type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
          <div style={{ fontSize: 11, color: "#A79B78", marginTop: 4 }}>{PASSWORD_HINT}</div>
        </Field>
        <Field label="Confirm new password">
          <input style={inputStyle} type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
        </Field>
        <Btn variant="ghost" full onClick={changePassword}>Update password</Btn>
      </Card>
    </DetailShell>
  );
}

function DetailShell({ title, onBack, children }) {
  return (
    <div>
      <TopBar
        title={title}
        onMenu={onBack}
        menuIcon={ChevronLeft}
        right={<div />}
      />
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

const MorePages = {
  menu: ({ ctx, open, onLogout }) => <MoreMenu ctx={ctx} open={open} onLogout={onLogout} />,
  detail: ({ page, ctx, onBack }) => {
    switch (page) {
      case "profile": return <ProfilePage ctx={ctx} onBack={onBack} />;
      case "members": return <MembersPage ctx={ctx} onBack={onBack} />;
      case "announcements": return <AnnouncementsPage ctx={ctx} onBack={onBack} />;
      case "constitution": return <ConstitutionPage ctx={ctx} onBack={onBack} />;
      case "certificate": return <CertificatePage ctx={ctx} onBack={onBack} />;
      default: return null;
    }
  },
};
