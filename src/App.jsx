import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Home, Users, PiggyBank, HandCoins, CalendarDays, Megaphone, FileText,
  Award, LogIn, UserPlus, Check, X, ChevronRight, ChevronLeft, Plus,
  Download, ShieldCheck, Wallet, LogOut, Menu, Loader2, AlertCircle,
  CheckCircle2, Landmark, User, RefreshCw, Eye, EyeOff, ImagePlus, Wifi, WifiOff, QrCode
} from "lucide-react";
import { signIn, signUp, verifySignupCode, resendSignupCode, signOut, getSession, onAuthChange } from "./lib/auth.js";
import { supabase } from "./lib/supabaseClient.js";
import {
  fetchMembers, insertMember, updateMember, deleteMember, upsertMember,
  fetchSavings, insertSaving,
  fetchLoans, insertLoan, updateLoan,
  fetchMeetings, insertMeeting,
  fetchAnnouncements, insertAnnouncement,
  fetchFines, insertFine, updateFine,
  fetchRotation, saveRotation,
  fetchConstitution, saveConstitution,
} from "./lib/db.js";
import { drawQr, memberQrData } from "./lib/qr.js";
import { enqueue, flushQueue, queueCount, listQueue } from "./lib/offline.js";

/* ---------------------------------------------------------------
   NYISH — Nguumo Young Investors Self Help Group
   Design tokens:
   --nyish-ink      #6B3A28  warm terracotta ink (primary / header)
   --nyish-paper    #F7F2E4  aged paper cream (background)
   --nyish-gold     #C99A2E  harvest gold (accent / CTA)
   --nyish-rust     #8B4A2B  clay rust (secondary accent, warnings-lite)
   --nyish-line     #D8CCA8  hairline on paper
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
const LARGE_LOAN_THRESHOLD = 50000;
const LOAN_INTEREST_RATE_PCT = 10;

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


/* ---- utilities ---- */
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
const MAX_ANNOUNCEMENT_IMAGE_BYTES = 6 * 1024 * 1024; // before resizing
// Crops/scales any uploaded image to a consistent 16:9 banner and
// re-compresses it, so announcement pictures always fit their card the
// same way regardless of the original photo's shape or size.
function resizeImageCover(file, targetW = 800, targetH = 450) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > MAX_ANNOUNCEMENT_IMAGE_BYTES) return reject(new Error("Image is too large — please use one under 6MB."));
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetW; canvas.height = targetH;
        const ctx2d = canvas.getContext("2d");
        const scale = Math.max(targetW / img.width, targetH / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx2d.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Could not read that image."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read that image."));
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

// Password field with a show/hide toggle — used anywhere a password or PIN
// is typed (login, registration, change-password).
function PasswordInput({ value, onChange, placeholder, required }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        style={{ ...inputStyle, paddingRight: 40 }}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: "#A79B78" }}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

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

function LoginScreen({ onLogin, goRegister, notify }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { session } = await signIn(email.trim(), password.trim());
      if (!session) { notify("Sign in failed — check your email and password."); setBusy(false); return; }
      // Load member profile from DB using the auth user id
      const members = await fetchMembers();
      const me = members.find((m) => m.id === session.user.id);
      if (!me) { notify("Account exists but no member profile found. Contact an official."); setBusy(false); return; }
      if (me.status === "pending") { notify("Your registration is awaiting official approval."); setBusy(false); return; }
      onLogin(me);
    } catch (err) {
      notify(err.message || "Sign in failed.");
    }
    setBusy(false);
  };

  return (
    <Card style={{ background: "#FFFDF8" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: "#6B3A28", marginBottom: 14 }}>
        Member sign in
      </div>
      <form onSubmit={submit}>
        <Field label="Email">
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
        </Field>
        <Field label="Password">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
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

// Three-step registration: fill form → Supabase sends OTP to email → enter code → done.
function RegisterScreen({ goLogin, notify }) {
  const [step, setStep] = useState("form"); // form | verify
  const [form, setForm] = useState({ name: "", phone: "", idNumber: "", kraPin: "", email: "", password: "" });
  const [photo, setPhoto] = useState(null);
  const [otp, setOtp] = useState("");
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

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { notify("Email is required."); return; }
    if (!PASSWORD_RULE.test(form.password.trim())) { notify("Password doesn't meet the requirements — " + PASSWORD_HINT); return; }
    setBusy(true);
    try {
      // ---------------------------------------------------------------
      // TEMP — OTP EMAIL VERIFICATION BYPASSED. TODO: re-enable before
      // this goes anywhere near real members.
      //
      // Normal flow (still intact below, just not called right now):
      //   signUp() -> setStep("verify") -> user enters the 6-digit code
      //   -> submitOtp() calls verifySignupCode() -> insertMember() using
      //   the confirmed session's user id.
      //
      // Bypass flow (active now): signUp() returns `user` immediately
      // (Supabase still creates the auth user even if the email isn't
      // confirmed yet), so we use `user.id` straight away and skip the
      // "verify" step / submitOtp entirely.
      //
      // To restore OTP later: delete this block, uncomment the two lines
      // marked below, and delete the bypass block that follows them.
      //   await signUp(form.email.trim(), form.password.trim());
      //   setStep("verify");
      //
      // NOTE: this only works end-to-end if Supabase Dashboard ->
      // Authentication -> Providers -> Email -> "Confirm email" is turned
      // OFF. If it's ON, signUp() still succeeds here, but the member's
      // later signIn() will fail with "Email not confirmed" until they
      // click a confirmation link Supabase still auto-sends — so either
      // turn that setting off too, or expect that failure during testing.
      // ---------------------------------------------------------------
      const { user } = await signUp(form.email.trim(), form.password.trim());
      if (!user) throw new Error("Sign up failed — try again.");
      const members = await fetchMembers();
      const isFirst = members.filter((m) => m.status === "active").length === 0;
      await insertMember({
        id: user.id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        idNumber: form.idNumber.trim(),
        kraPin: form.kraPin.trim(),
        email: form.email.trim(),
        photo: photo || null,
        role: isFirst ? "chair" : "member",
        status: isFirst ? "active" : "pending",
        joinDate: todayISO(),
      });
      notify(isFirst ? "Registered as Chairperson — you can sign in now." : "Registered! Await Chairperson approval, then sign in.");
      goLogin();
    } catch (err) {
      notify(err.message || "Registration failed.");
    }
    setBusy(false);
  };

  // NOTE: submitOtp is currently unreachable — submitForm above bypasses
  // the "verify" step entirely. Left in place so re-enabling OTP is just
  // a matter of restoring the two lines noted in the TODO comment above.
  const submitOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { notify("Enter the code from your email."); return; }
    setBusy(true);
    try {
      const { session } = await verifySignupCode(form.email.trim(), otp.trim());
      if (!session?.user) throw new Error("Verification failed — try again.");
      // Create the member profile in the DB using the auth user's UUID as the id
      const members = await fetchMembers();
      const isFirst = members.filter((m) => m.status === "active").length === 0;
      await insertMember({
        id: session.user.id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        idNumber: form.idNumber.trim(),
        kraPin: form.kraPin.trim(),
        email: form.email.trim(),
        photo: photo || null,
        role: isFirst ? "chair" : "member",
        status: isFirst ? "active" : "pending",
        joinDate: todayISO(),
      });
      notify(isFirst ? "Registered as Chairperson — you can sign in now." : "Registered! Await Chairperson approval, then sign in.");
      setStep("form");
      goLogin();
    } catch (err) {
      notify(err.message || "Verification failed.");
    }
    setBusy(false);
  };

  if (step === "verify") {
    // NOTE: currently unreachable while the OTP bypass in submitForm is
    // active (step never gets set to "verify"). Kept intact for when
    // OTP verification is turned back on.
    return (
      <Card style={{ background: "#FFFDF8" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: "#6B3A28", marginBottom: 10 }}>
          Verify your email
        </div>
        <div style={{ fontSize: 12.5, color: "#5B5138", marginBottom: 14 }}>
          A 6-digit code was sent to <b>{form.email}</b>. Check your inbox (and spam folder).
        </div>
        <form onSubmit={submitOtp}>
          <Field label="Verification code">
            <input style={{ ...inputStyle, letterSpacing: 6, fontSize: 20, textAlign: "center" }} value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} required />
          </Field>
          <Btn type="submit" full variant="gold" disabled={busy}>{busy ? "Verifying…" : "Verify & complete"}</Btn>
        </form>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => setStep("form")} style={{ background: "none", border: "none", color: "#8B8264", fontSize: 12.5, cursor: "pointer", padding: 0 }}>← Back</button>
          <button onClick={async () => { try { await resendSignupCode(form.email.trim()); notify("New code sent."); } catch (e) { notify(e.message); } }} style={{ background: "none", border: "none", color: "#8B4A2B", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>Resend code</button>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ background: "#FFFDF8" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: "#6B3A28", marginBottom: 14 }}>
        New member registration
      </div>
      <form onSubmit={submitForm}>
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
        <Field label="Email">
          <input style={inputStyle} type="email" value={form.email} onChange={set("email")} required />
          <div style={{ fontSize: 11, color: "#A79B78", marginTop: 4 }}>We'll send a verification code here, then notify you of approval.</div>
        </Field>
        <Field label="Passport photo (optional)">
          <input style={{ ...inputStyle, fontSize: 12 }} type="file" accept="image/*" onChange={onPhotoChange} />
          {photo && <img src={photo} alt="preview" style={{ marginTop: 8, width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "1px solid #D8CCA8" }} />}
        </Field>
        <Field label="Create a password">
          <PasswordInput value={form.password} onChange={set("password")} placeholder="8+ chars, upper, lower, symbol" required />
          <div style={{ fontSize: 11, color: "#A79B78", marginTop: 4 }}>{PASSWORD_HINT}</div>
        </Field>
        <Btn type="submit" full variant="gold" icon={<UserPlus size={16} />} disabled={busy}>
          {busy ? "Creating account…" : "Create account & verify email"}
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
  const [fines, setFines] = useState([]);
  const [rotation, setRotation] = useState({ order: [], currentIndex: 0, cyclesCompleted: 0 });
  const [authMode, setAuthMode] = useState("login");
  const [me, setMe] = useState(null);
  const [page, setPage] = useState("home");
  const [morePage, setMorePage] = useState(null);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  const notify = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(""), 2600);
  }, []);

  // Track online/offline
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Load all data from Supabase on mount (also restore session)
  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          const [m, s, l, mt, an, co, fi, rot] = await Promise.all([
            fetchMembers(), fetchSavings(), fetchLoans(), fetchMeetings(),
            fetchAnnouncements(), fetchConstitution(DEFAULT_CONSTITUTION),
            fetchFines(), fetchRotation(),
          ]);
          setMembers(m); setSavings(s); setLoans(l); setMeetings(mt);
          setAnnouncements(an); setConstitution(co); setFines(fi); setRotation(rot);
          const me2 = m.find((mbr) => mbr.id === session.user.id);
          if (me2 && me2.status === "active") setMe(me2);
        }
      } catch (err) {
        console.error("Load error", err);
      }
      const pending = await queueCount();
      setPendingSync(pending);
      setLoading(false);
    })();
  }, []);

  // Listen for auth state changes (e.g. sign-out from another tab)
  useEffect(() => {
    return onAuthChange(async (session) => {
      if (!session) { setMe(null); setPage("home"); }
    });
  }, []);

  // Flush offline queue when connection is restored
  useEffect(() => {
    if (!online || pendingSync === 0) return;
    (async () => {
      const { synced } = await flushQueue({
        saving: async (payload) => { const s = await insertSaving(payload); setSavings((prev) => [s, ...prev]); },
      });
      if (synced > 0) {
        const pending = await queueCount();
        setPendingSync(pending);
        notify(`${synced} offline record${synced > 1 ? "s" : ""} synced.`);
        const s = await fetchSavings();
        setSavings(s);
      }
    })();
  }, [online]); // eslint-disable-line

  // Keep `me` profile fresh when members list updates
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
          <Loader2 size={26} color="#C99A2E" style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AuthShell>
    );
  }

  if (!me) {
    return (
      <AuthShell>
        {authMode === "login" ? (
          <LoginScreen
            onLogin={async (member) => {
              // Load full dataset after sign-in
              const [m, s, l, mt, an, co, fi, rot] = await Promise.all([
                fetchMembers(), fetchSavings(), fetchLoans(), fetchMeetings(),
                fetchAnnouncements(), fetchConstitution(DEFAULT_CONSTITUTION),
                fetchFines(), fetchRotation(),
              ]);
              setMembers(m); setSavings(s); setLoans(l); setMeetings(mt);
              setAnnouncements(an); setConstitution(co); setFines(fi); setRotation(rot);
              setMe(member);
            }}
            goRegister={() => setAuthMode("register")}
            notify={notify}
          />
        ) : (
          <RegisterScreen goLogin={() => setAuthMode("login")} notify={notify} />
        )}
        <Toast msg={toast} />
      </AuthShell>
    );
  }

  const official = isOfficial(me);
  const isChair = me.role === "chair";
  const isTreasurer = me.role === "treasurer";
  const isSecretary = me.role === "secretary";

  // Memoize expensive aggregates
  const mySavingsTotal = useMemo(() => savings.filter((s) => s.memberId === me.id).reduce((a, b) => a + Number(b.amount), 0), [savings, me.id]);
  const groupSavingsTotal = useMemo(() => savings.reduce((a, b) => a + Number(b.amount), 0), [savings]);
  const totalLoansOut = useMemo(() => loans.filter((l) => ["approved", "active"].includes(l.status)).reduce((a, b) => a + Number(b.balance), 0), [loans]);
  const totalFinesCollected = useMemo(() => fines.filter((f) => f.status === "paid").reduce((a, b) => a + Number(b.amount), 0), [fines]);
  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);

  const persist = {
    // Members
    updateMember: async (id, patch) => {
      const updated = await updateMember(id, patch);
      setMembers((prev) => prev.map((m) => m.id === id ? { ...m, ...updated } : m));
      return updated;
    },
    removeMember: async (id) => {
      await deleteMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    },
    // Savings — offline-capable
    appendSaving: async (item) => {
      if (!online) {
        await enqueue("saving", item);
        const count = await queueCount();
        setPendingSync(count);
        notify("Saved offline — will sync when connected.");
        return;
      }
      const saved = await insertSaving(item);
      setSavings((prev) => [saved, ...prev]);
    },
    reloadSavings: async () => { const s = await fetchSavings(); setSavings(s); },
    // Loans
    appendLoan: async (item) => { const saved = await insertLoan(item); setLoans((prev) => [saved, ...prev]); },
    updateLoan: async (id, patch) => { const updated = await updateLoan(id, patch); setLoans((prev) => prev.map((l) => l.id === id ? { ...l, ...updated } : l)); },
    // Meetings — attendance can be queued offline too
    appendMeeting: async (item) => {
      if (!online) {
        await enqueue("meeting", item);
        const count = await queueCount();
        setPendingSync(count);
        notify("Meeting saved offline — will sync when connected.");
        return;
      }
      const saved = await insertMeeting(item);
      setMeetings((prev) => [saved, ...prev]);
    },
    // Announcements
    appendAnnouncement: async (item) => { const saved = await insertAnnouncement(item); setAnnouncements((prev) => [saved, ...prev]); },
    // Fines
    appendFine: async (item) => { const saved = await insertFine(item); setFines((prev) => [saved, ...prev]); },
    updateFine: async (id, patch) => { const updated = await updateFine(id, patch); setFines((prev) => prev.map((f) => f.id === id ? { ...f, ...updated } : f)); },
    // Rotation
    setRotation: async (rot) => { setRotation(rot); await saveRotation(rot); },
    // Constitution
    constitution: async (text) => { setConstitution(text); await saveConstitution(text); },
    // Bulk member list setter (used by profile save)
    members: (next) => setMembers(next),
  };

  const handleLogout = async () => {
    await signOut();
    setMe(null);
    setPage("home");
    setMembers([]); setSavings([]); setLoans([]); setMeetings([]);
    setAnnouncements([]); setFines([]);
  };

  const dismissWelcome = async () => {
    await persist.updateMember(me.id, { congratulated: true });
  };

  const showWelcome = me.status === "active" && !me.congratulated;

  const ctx = {
    me, official, isChair, isTreasurer, isSecretary, members, savings, loans, meetings, announcements, constitution,
    fines, rotation, persist, notify, activeMembers, online, pendingSync,
    mySavingsTotal, groupSavingsTotal, totalLoansOut, totalFinesCollected,
  };

  let body;
  if (page === "more" && morePage) {
    body = <MorePages.detail page={morePage} ctx={ctx} onBack={() => setMorePage(null)} openMore={setMorePage} />;
  } else {
    switch (page) {
      case "home": body = <HomePage ctx={ctx} goto={setPage} openMore={(key) => { setPage("more"); setMorePage(key); }} />; break;
      case "savings": body = <SavingsPage ctx={ctx} />; break;
      case "loans": body = <LoansPage ctx={ctx} />; break;
      case "meetings": body = <MeetingsPage ctx={ctx} />; break;
      case "more": body = <MorePages.menu ctx={ctx} open={setMorePage} onLogout={handleLogout} />; break;
      default: body = null;
    }
  }

  return (
    <div style={{ fontFamily: "Work Sans, sans-serif", background: "#F7F2E4", minHeight: 560, maxWidth: 430, margin: "0 auto", position: "relative", paddingBottom: 78 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {!online && (
        <div style={{ background: "#8B4A2B", color: "#fff", textAlign: "center", fontSize: 11.5, padding: "5px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <WifiOff size={13} /> Offline mode — savings and attendance will sync when connected
          {pendingSync > 0 && ` (${pendingSync} pending)`}
        </div>
      )}
      {online && pendingSync > 0 && (
        <div style={{ background: "#C99A2E", color: "#16302A", textAlign: "center", fontSize: 11.5, padding: "5px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Wifi size={13} /> Syncing {pendingSync} offline record{pendingSync > 1 ? "s" : ""}…
        </div>
      )}
      {body}
      {showWelcome && <WelcomeModal me={me} onDismiss={dismissWelcome} onViewCertificate={() => { setPage("more"); setMorePage("certificate"); dismissWelcome(); }} />}
      <Toast msg={toast} />
      <nav
        style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 430, background: "#FFFDF8",
          borderTop: "1px solid #EAE0C4", display: "flex",
          padding: "8px 6px calc(8px + env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 16px rgba(22,48,42,0.06)",
        }}
      >
        {NAV.map((n) => {
          const Icon = n.icon;
          const activeKey = page === "more" ? "more" : page;
          const active = activeKey === n.key;
          return (
            <button key={n.key} onClick={() => { setPage(n.key); setMorePage(null); }}
              style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", color: active ? "#6B3A28" : "#A79B78" }}>
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

function HomePage({ ctx, goto, openMore }) {
  const { me, official, isChair, isSecretary, activeMembers, savings, loans, fines, rotation, members, announcements, mySavingsTotal, groupSavingsTotal, totalLoansOut, totalFinesCollected } = ctx;
  const pendingLoans = loans.filter((l) => l.status === "pending");
  const latestAnnouncements = [...announcements].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 2);
  const myUnpaidFines = fines.filter((f) => f.memberId === me.id && f.status === "unpaid").reduce((a, b) => a + Number(b.amount), 0);
  const unpaidFinesCount = fines.filter((f) => f.status === "unpaid").length;
  const rotationOrder = rotation.order || [];
  const currentRecipientId = rotationOrder[rotation.currentIndex % (rotationOrder.length || 1)];
  const currentRecipientName = rotationOrder.length
    ? (members.find((m) => m.id === currentRecipientId)?.name || "Unknown")
    : null;

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
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <Card style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: "#8B8264", fontWeight: 600 }}>Loans out</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: "#6B3A28", marginTop: 4 }}>
              {fmtKES(totalLoansOut)}
            </div>
          </Card>
          <Card style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: "#8B8264", fontWeight: 600 }}>Active members</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: "#6B3A28", marginTop: 4 }}>
              {activeMembers.length}
            </div>
          </Card>
        </div>

        {/* Merry-go-round + Fines — now on the dashboard, not just buried in More */}
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button onClick={() => openMore("rotation")} style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <Card style={{ height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#8B8264", fontWeight: 600 }}>
                <RefreshCw size={12} /> Merry-go-round
              </div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700, color: "#6B3A28", marginTop: 4, lineHeight: 1.3 }}>
                {currentRecipientName ? currentRecipientName.split(" ")[0] : "Not set up"}
              </div>
              {rotationOrder.length > 0 && (
                <div style={{ fontSize: 10.5, color: "#A79B78", marginTop: 2 }}>
                  {rotation.currentIndex + 1} of {rotationOrder.length}
                </div>
              )}
            </Card>
          </button>
          <button onClick={() => openMore("fines")} style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <Card style={{ height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#8B8264", fontWeight: 600 }}>
                <Landmark size={12} /> Fines
              </div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700, color: "#6B3A28", marginTop: 4 }}>
                {official ? `${unpaidFinesCount} unpaid` : fmtKES(myUnpaidFines)}
              </div>
              <div style={{ fontSize: 10.5, color: "#A79B78", marginTop: 2 }}>
                {official ? "across the group" : myUnpaidFines > 0 ? "you owe" : "none owed"}
              </div>
            </Card>
          </button>
        </div>

        <div style={{ fontSize: 10.5, color: "#A79B78", marginTop: 6, textAlign: "center" }}>
          Group figures are visible to every member for transparency. {fmtKES(totalFinesCollected)} in fines collected to date.
        </div>

        {isChair && pendingLoans.length > 0 && (
          <Card style={{ marginTop: 14, borderColor: "#EBD8CC", background: "#FBF3EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={18} color="#8B4A2B" />
              <div style={{ fontSize: 13.5, color: "#8B4A2B", fontWeight: 600 }}>
                {pendingLoans.length} loan request{pendingLoans.length > 1 ? "s" : ""} awaiting your decision
              </div>
            </div>
          </Card>
        )}

        {official && !me.onboarded && (
          <OnboardingTip ctx={ctx} />
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
          <QuickAction icon={<Award size={18} />} label="Certificate" onClick={() => openMore("certificate")} />
        </div>
      </div>
    </div>
  );
}

const ROLE_TIPS = {
  chair: "As Chairperson: approve new members, grant/reject loans (Loans tab), and sign off on large loans alongside the Treasurer.",
  treasurer: "As Treasurer: help the Chairperson keep an eye on savings and loan balances, and co-sign loans of KES 50,000+.",
  secretary: "As Secretary: you're the only one who can log meetings — minutes and attendance (Meetings tab). Everyone else sees them read-only.",
};

function OnboardingTip({ ctx }) {
  const { me, persist } = ctx;
  const tip = ROLE_TIPS[me.role];
  if (!tip) return null;
  return (
    <Card style={{ marginTop: 14, background: "#F0DDD0", borderColor: "#E0C4AE" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ fontSize: 12.5, color: "#6B3A28", lineHeight: 1.5 }}>{tip}</div>
        <button onClick={() => persist.updateMember(me.id, { onboarded: true })} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
          <X size={16} color="#6B3A28" />
        </button>
      </div>
    </Card>
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
// Converts local Kenyan formats (07XX..., 01XX..., +2547XX...) to the
// 2547XXXXXXXX / 2541XXXXXXXX MSISDN format Daraja requires.
function toMsisdn(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.startsWith("7") || digits.startsWith("1")) return "254" + digits;
  return digits;
}

function SavingsPage({ ctx }) {
  const { me, isChair, isTreasurer, members, savings, persist, notify } = ctx;
  const canManageFinance = isChair || isTreasurer;
  const [showForm, setShowForm] = useState(false);
  const [memberId, setMemberId] = useState(me.id);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [mpesaAmount, setMpesaAmount] = useState("");
  const [mpesaState, setMpesaState] = useState("idle"); // idle | waiting | success | failed
  const [mpesaMsg, setMpesaMsg] = useState("");
  const pollRef = useRef(null);

  const visible = canManageFinance ? savings : savings.filter((s) => s.memberId === me.id);
  const sorted = [...visible].sort((a, b) => (a.date < b.date ? 1 : -1));
  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return notify("Enter a valid amount.");
    const entry = { id: uid(), memberId: canManageFinance ? memberId : me.id, amount: Number(amount), date: todayISO(), note: note.trim(), recordedBy: me.id };
    await persist.appendSaving(entry);
    notify("Contribution recorded.");
    setAmount(""); setNote(""); setShowForm(false);
  };

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => () => stopPolling(), []);

  const payWithMpesa = async () => {
    if (!mpesaAmount || Number(mpesaAmount) <= 0) return notify("Enter a valid amount.");
    if (!me.phone) return notify("Add a phone number to your profile first.");
    setMpesaState("waiting");
    setMpesaMsg("Sending prompt to your phone…");
    try {
      const res = await fetch("/api/mpesa-stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: me.id, memberName: me.name, phone: toMsisdn(me.phone), amount: Number(mpesaAmount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMpesaState("failed");
        setMpesaMsg(data.error || "Could not start the M-PESA payment.");
        return;
      }
      setMpesaMsg("Check your phone and enter your M-PESA PIN to complete payment…");
      const checkoutId = data.checkoutRequestId;
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts += 1;
        try {
          const statusRes = await fetch(`/api/mpesa-status?checkoutRequestId=${encodeURIComponent(checkoutId)}`);
          const statusData = await statusRes.json();
          if (statusData.status === "success") {
            stopPolling();
            setMpesaState("success");
            setMpesaMsg(`Payment received${statusData.receipt ? ` (receipt ${statusData.receipt})` : ""}!`);
            await persist.reloadSavings();
            setMpesaAmount("");
          } else if (statusData.status === "failed") {
            stopPolling();
            setMpesaState("failed");
            setMpesaMsg(statusData.resultDesc || "Payment was not completed.");
          } else if (attempts >= 20) { // ~60s at 3s intervals
            stopPolling();
            setMpesaState("failed");
            setMpesaMsg("No response yet — check your M-PESA messages, or try again.");
          }
        } catch {
          // transient network error while polling — keep trying until attempts run out
        }
      }, 3000);
    } catch (err) {
      setMpesaState("failed");
      setMpesaMsg(err.message || "Could not reach the payment service.");
    }
  };

  return (
    <div>
      <TopBar title="Savings" subtitle={canManageFinance ? "All member contributions" : "Your contribution history"} />
      <div style={{ padding: 16 }}>
        {!canManageFinance && (
          <Card style={{ marginBottom: 14, background: "#F0DDD0", borderColor: "#E0C4AE" }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "#6B3A28", marginBottom: 8 }}>Pay via M-PESA</div>
            {mpesaState === "idle" || mpesaState === "failed" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...inputStyle, flex: 1 }} type="number" min="1" placeholder="Amount (KES)" value={mpesaAmount} onChange={(e) => setMpesaAmount(e.target.value)} />
                <Btn variant="gold" onClick={payWithMpesa}>Pay</Btn>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {mpesaState === "waiting" && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                {mpesaState === "success" && <CheckCircle2 size={16} color="#1B4332" />}
                <span style={{ fontSize: 12.5, color: "#6B3A28" }}>{mpesaMsg}</span>
              </div>
            )}
            {mpesaState === "failed" && <div style={{ fontSize: 11.5, color: "#8B4A2B", marginTop: 6 }}>{mpesaMsg}</div>}
            {(mpesaState === "success" || mpesaState === "failed") && (
              <button onClick={() => setMpesaState("idle")} style={{ background: "none", border: "none", color: "#8B4A2B", fontSize: 11.5, fontWeight: 700, marginTop: 6, cursor: "pointer", padding: 0 }}>
                Make another payment
              </button>
            )}
          </Card>
        )}

        <Btn variant="ghost" icon={<Plus size={16} />} onClick={() => setShowForm((s) => !s)}>
          {canManageFinance ? "Record a contribution manually" : "Record a cash contribution"}
        </Btn>


        {showForm && (
          <Card style={{ marginTop: 14 }}>
            <form onSubmit={submit}>
              {canManageFinance && (
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
                  {canManageFinance && <div style={{ fontWeight: 700, fontSize: 13.5, color: "#6B3A28" }}>{memberName(s.memberId)}</div>}
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
  const { me, isChair, isTreasurer, members, loans, persist, notify } = ctx;
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
      repayments: [], balance: Number(amount), approvals: [],
    };
    await persist.appendLoan(entry);
    notify("Loan request submitted.");
    setAmount(""); setPurpose(""); setShowForm(false);
  };

  const isLarge = (l) => Number(l.amount) >= LARGE_LOAN_THRESHOLD;
  const interestFor = (principal) => Math.round(Number(principal) * (LOAN_INTEREST_RATE_PCT / 100));
  const totalDueFor = (principal) => Number(principal) + interestFor(principal);

  // Loans under the threshold need only the Chairperson's sign-off. Loans
  // at/above LARGE_LOAN_THRESHOLD need both Chair + Treasurer to approve
  // before the loan actually goes live — a two-signature safeguard.
  const decide = async (loan, decision) => {
    if (decision === "rejected") {
      await persist.updateLoan(loan.id, { status: "rejected", dateApproved: todayISO() });
      notify("Loan rejected.");
      return;
    }
    const interestAmount = interestFor(loan.amount);
    const totalDue = totalDueFor(loan.amount);
    if (!isLarge(loan)) {
      await persist.updateLoan(loan.id, {
        status: "approved", dateApproved: todayISO(), approvals: ["chair"],
        interestRate: LOAN_INTEREST_RATE_PCT, interestAmount, totalDue, balance: totalDue,
      });
      notify("Loan approved.");
      return;
    }
    // Large loan: record this official's signature, only flip to approved once both are in.
    const approvals = Array.from(new Set([...(loan.approvals || []), me.role]));
    const bothSigned = approvals.includes("chair") && approvals.includes("treasurer");
    await persist.updateLoan(loan.id, {
      approvals,
      status: bothSigned ? "approved" : "pending",
      dateApproved: bothSigned ? todayISO() : null,
      ...(bothSigned ? { interestRate: LOAN_INTEREST_RATE_PCT, interestAmount, totalDue, balance: totalDue } : {}),
    });
    notify(bothSigned ? "Both signatures collected — loan approved." : `Your signature recorded. Needs ${approvals.includes("chair") ? "Treasurer" : "Chairperson"} sign-off too.`);
  };

  const recordRepayment = async (loan) => {
    if (!repayAmt || Number(repayAmt) <= 0) return notify("Enter a valid repayment amount.");
    const amt = Number(repayAmt);
    const newBalance = Math.max(0, loan.balance - amt);
    await persist.updateLoan(loan.id, {
      repayments: [...loan.repayments, { amount: amt, date: todayISO() }],
      balance: newBalance,
      status: newBalance === 0 ? "repaid" : "active",
    });
    notify("Repayment recorded.");
    setRepayFor(null); setRepayAmt("");
  };

  const statusTone = { pending: "gold", approved: "green", active: "green", rejected: "rust", repaid: "grey" };
  const canSignThis = (l) => isLarge(l) ? (isChair || isTreasurer) : isChair;
  const alreadySigned = (l) => (l.approvals || []).includes(me.role);

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
              <div style={{ fontSize: 11, color: "#A79B78", marginBottom: 10, lineHeight: 1.5 }}>
                {amount && Number(amount) > 0 && (
                  <>Interest at {LOAN_INTEREST_RATE_PCT}% flat: {fmtKES(interestFor(amount))} — total to repay {fmtKES(totalDueFor(amount))}.<br /></>
                )}
                Loans of {fmtKES(LARGE_LOAN_THRESHOLD)} or more need sign-off from both the Chairperson and Treasurer.
              </div>
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <Badge tone={statusTone[l.status]}>{l.status}</Badge>
                    {isLarge(l) && <Badge tone="rust">2-signature</Badge>}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, borderTop: "1px dashed #EAE0C4", paddingTop: 10 }}>
                  <div style={{ fontSize: 12.5, color: "#5B5138" }}>Principal: <b>{fmtKES(l.amount)}</b></div>
                  {(l.status === "approved" || l.status === "active" || l.status === "repaid") && (
                    <div style={{ fontSize: 12.5, color: "#5B5138" }}>Balance: <b>{fmtKES(l.balance)}</b></div>
                  )}
                </div>
                {(l.status === "approved" || l.status === "active" || l.status === "repaid") && l.interestAmount != null && (
                  <div style={{ fontSize: 11, color: "#A79B78", marginTop: 4 }}>
                    +{fmtKES(l.interestAmount)} interest ({l.interestRate}% flat) · total due {fmtKES(l.totalDue)}
                  </div>
                )}
                {isLarge(l) && l.status === "pending" && (l.approvals || []).length > 0 && (
                  <div style={{ fontSize: 11.5, color: "#8B4A2B", marginTop: 6 }}>
                    Signed so far: {(l.approvals || []).map(roleLabel).join(", ")}
                  </div>
                )}

                {(isChair || isTreasurer) && l.status === "pending" && canSignThis(l) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {!alreadySigned(l) && (
                      <Btn variant="primary" icon={<Check size={15} />} onClick={() => decide(l, "approved")}>
                        {isLarge(l) ? `Sign as ${roleLabel(me.role)}` : "Grant loan"}
                      </Btn>
                    )}
                    {isChair && (
                      <Btn variant="ghost" icon={<X size={15} />} onClick={() => decide(l, "rejected")}>Reject</Btn>
                    )}
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
    await persist.appendMeeting(entry);
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
    { key: "fines", label: "Fines", icon: Landmark },
    { key: "rotation", label: "Merry-go-round", icon: RefreshCw },
    { key: "announcements", label: "Announcements", icon: Megaphone },
    { key: "constitution", label: "Constitution", icon: FileText },
    { key: "certificate", label: "My certificate", icon: Award },
    { key: "qr", label: "My QR card", icon: QrCode },
    { key: "export", label: "Export data", icon: Download },
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
  const { me, isChair, members, persist, notify } = ctx;
  const pending = members.filter((m) => m.status === "pending");
  const active = members.filter((m) => m.status === "active");

  const approve = async (m) => {
    await persist.updateMember(m.id, { status: "active" });
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
    await persist.removeMember(m.id);
    notify(`${m.name}'s registration removed.`);
    if (m.email) {
      try {
        await fetch("/api/send-denial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: m.email, name: m.name }),
        });
      } catch {
        // Non-fatal — rejection still succeeds even if the email can't be sent.
      }
    }
  };
  const setRole = async (m, role) => {
    await persist.updateMember(m.id, { role });
    notify(`${m.name} is now ${roleLabel(role)}.`);
  };

  return (
    <DetailShell title="Members & approvals" onBack={onBack}>
      {!isChair && (
        <Card style={{ marginBottom: 14, background: "#F0DDD0", borderColor: "#E0C4AE" }}>
          <div style={{ fontSize: 12, color: "#6B3A28" }}>View only — only the Chairperson can approve members or change roles.</div>
        </Card>
      )}
      {pending.length > 0 && (
        <>
          <SectionTitle>Pending approval ({pending.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((m) => (
              <Card key={m.id}>
                <div style={{ fontWeight: 700, color: "#6B3A28" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#8B8264" }}>{m.phone} · ID {m.idNumber}</div>
                {isChair && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Btn variant="primary" icon={<Check size={15} />} onClick={() => approve(m)}>Approve</Btn>
                    <Btn variant="ghost" icon={<X size={15} />} onClick={() => reject(m)}>Reject</Btn>
                  </div>
                )}
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
            {isChair ? (
              <select style={{ ...inputStyle, width: 118, padding: "6px 8px", fontSize: 12 }} value={m.role} onChange={(e) => setRole(m, e.target.value)}>
                <option value="member">Member</option>
                <option value="chair">Chair</option>
                <option value="treasurer">Treasurer</option>
                <option value="secretary">Secretary</option>
              </select>
            ) : (
              <Badge tone="grey">{roleLabel(m.role)}</Badge>
            )}
          </Card>
        ))}
      </div>
    </DetailShell>
  );
}

function AnnouncementsPage({ ctx, onBack }) {
  const { me, isChair, announcements, activeMembers, persist, notify } = ctx;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState(null);
  const [alsoSms, setAlsoSms] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);
  const sorted = [...announcements].sort((a, b) => (a.date < b.date ? 1 : -1));

  const onImageChange = async (e) => {
    try {
      const resized = await resizeImageCover(e.target.files?.[0]);
      if (resized) setImage(resized);
    } catch (err) {
      notify(err.message);
      e.target.value = "";
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return notify("Add a title.");
    const entry = { id: uid(), title: title.trim(), body: body.trim(), image: image || null, date: todayISO(), postedBy: me.id };
    await persist.appendAnnouncement(entry);
    notify("Announcement posted.");

    if (alsoSms) {
      setSmsBusy(true);
      const recipients = activeMembers.filter((m) => m.phone).map((m) => ({ phone: toMsisdn(m.phone), name: m.name }));
      try {
        const res = await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipients, message: `${GROUP_SHORT}: ${entry.title} — ${entry.body}`.slice(0, 300) }),
        });
        const data = await res.json();
        notify(res.ok ? `SMS sent to ${recipients.length} member${recipients.length === 1 ? "" : "s"}.` : (data.error || "SMS failed to send."));
      } catch {
        notify("Could not reach the SMS service.");
      }
      setSmsBusy(false);
    }
    setTitle(""); setBody(""); setImage(null);
  };

  return (
    <DetailShell title="Announcements" onBack={onBack}>
      {isChair && (
        <Card style={{ marginBottom: 16 }}>
          <form onSubmit={submit}>
            <Field label="Title">
              <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <Field label="Message">
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Field label="Picture (optional)">
              <label style={{ display: "flex", alignItems: "center", gap: 8, border: "1px dashed #D8CCA8", borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontSize: 13, color: "#8B4A2B" }}>
                <ImagePlus size={16} />
                {image ? "Change picture" : "Add a picture"}
                <input type="file" accept="image/*" onChange={onImageChange} style={{ display: "none" }} />
              </label>
              {image && (
                <img src={image} alt="preview" style={{ marginTop: 8, width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 10, border: "1px solid #D8CCA8" }} />
              )}
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#5B5138", marginBottom: 12 }}>
              <input type="checkbox" checked={alsoSms} onChange={(e) => setAlsoSms(e.target.checked)} />
              Also send as SMS to all active members
            </label>
            <Btn type="submit" variant="gold" icon={<Megaphone size={15} />} disabled={smsBusy}>
              {smsBusy ? "Sending SMS…" : "Post to group"}
            </Btn>
          </form>
        </Card>
      )}
      {sorted.length === 0 ? (
        <Card><EmptyState icon={<Megaphone size={22} color="#C9BE9E" />} text="No announcements yet." /></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((a) => (
            <Card key={a.id} style={{ padding: a.image ? 0 : 16, overflow: "hidden" }}>
              {a.image && (
                <img src={a.image} alt={a.title} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
              )}
              <div style={a.image ? { padding: 16 } : undefined}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#6B3A28" }}>{a.title}</div>
                <div style={{ fontSize: 12.5, color: "#6B6350", marginTop: 3 }}>{a.body}</div>
                <div style={{ fontSize: 11, color: "#A79B78", marginTop: 6 }}>{a.date}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DetailShell>
  );
}

/* --------------------------------- Fines ----------------------------------- */
function FinesPage({ ctx, onBack }) {
  const { me, official, isChair, members, fines, persist, notify } = ctx;
  const [showForm, setShowForm] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";
  const visible = official ? fines : fines.filter((f) => f.memberId === me.id);
  const sorted = [...visible].sort((a, b) => (a.date < b.date ? 1 : -1));
  const myUnpaid = fines.filter((f) => f.memberId === me.id && f.status === "unpaid").reduce((a, b) => a + Number(b.amount), 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!memberId) return notify("Choose a member.");
    if (!amount || Number(amount) <= 0) return notify("Enter a valid amount.");
    const entry = { id: uid(), memberId, amount: Number(amount), reason: reason.trim(), date: todayISO(), status: "unpaid", recordedBy: me.id };
    await persist.appendFine(entry);
    notify("Fine recorded.");
    setAmount(""); setReason(""); setMemberId(""); setShowForm(false);
  };

  const markPaid = async (f) => {
    await persist.updateFine(f.id, { status: "paid", paidDate: todayISO() });
    notify("Marked as paid.");
  };

  return (
    <DetailShell title="Fines" onBack={onBack}>
      {!official && myUnpaid > 0 && (
        <Card style={{ marginBottom: 14, borderColor: "#EBD8CC", background: "#FBF3EB" }}>
          <div style={{ fontSize: 13, color: "#8B4A2B", fontWeight: 700 }}>You have {fmtKES(myUnpaid)} in unpaid fines.</div>
        </Card>
      )}
      {isChair && (
        <>
          <Btn variant="gold" icon={<Plus size={16} />} onClick={() => setShowForm((s) => !s)}>Issue a fine</Btn>
          {showForm && (
            <Card style={{ marginTop: 14 }}>
              <form onSubmit={submit}>
                <Field label="Member">
                  <select style={inputStyle} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                    <option value="">Choose…</option>
                    {members.filter((m) => m.status === "active").map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Amount (KES)">
                  <input style={inputStyle} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </Field>
                <Field label="Reason">
                  <input style={inputStyle} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. missed 2 consecutive meetings" />
                </Field>
                <Btn type="submit" full variant="primary">Save fine</Btn>
              </form>
            </Card>
          )}
        </>
      )}
      <SectionTitle>{official ? "All fines" : "My fines"}</SectionTitle>
      {sorted.length === 0 ? (
        <Card><EmptyState icon={<AlertCircle size={22} color="#C9BE9E" />} text="No fines recorded." /></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((f) => (
            <Card key={f.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  {official && <div style={{ fontWeight: 700, fontSize: 13.5, color: "#6B3A28" }}>{memberName(f.memberId)}</div>}
                  <div style={{ fontSize: 12.5, color: "#6B6350", marginTop: 2 }}>{f.reason || "No reason given"}</div>
                  <div style={{ fontSize: 11, color: "#A79B78", marginTop: 4 }}>{f.date}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <Badge tone={f.status === "paid" ? "green" : "rust"}>{f.status}</Badge>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6B3A28" }}>{fmtKES(f.amount)}</div>
                </div>
              </div>
              {isChair && f.status === "unpaid" && (
                <div style={{ marginTop: 10 }}>
                  <Btn variant="ghost" icon={<Check size={15} />} onClick={() => markPaid(f)}>Mark paid</Btn>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </DetailShell>
  );
}

/* ----------------------------- Rotation (merry-go-round) --------------------------- */
function RotationPage({ ctx, onBack }) {
  const { me, isChair, members, activeMembers, rotation, persist, notify } = ctx;
  const order = rotation.order || [];
  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown (removed)";
  const currentId = order[rotation.currentIndex % (order.length || 1)];

  const resetOrder = async () => {
    const ids = activeMembers.map((m) => m.id);
    await persist.setRotation({ order: ids, currentIndex: 0, cyclesCompleted: 0 });
    notify("Rotation order set.");
  };

  const advance = async () => {
    if (order.length === 0) return notify("Set the rotation order first.");
    const nextIndex = rotation.currentIndex + 1;
    const completed = nextIndex >= order.length;
    await persist.setRotation({
      order,
      currentIndex: completed ? 0 : nextIndex,
      cyclesCompleted: rotation.cyclesCompleted + (completed ? 1 : 0),
    });
    notify(completed ? "Full cycle complete — back to the start!" : "Advanced to the next member.");
  };

  return (
    <DetailShell title="Merry-go-round" onBack={onBack}>
      <Card>
        <div style={{ fontSize: 11.5, color: "#8B8264", fontWeight: 600 }}>Currently receiving</div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: "#6B3A28", marginTop: 4 }}>
          {order.length ? memberName(currentId) : "Not set up yet"}
        </div>
        {order.length > 0 && (
          <div style={{ fontSize: 12, color: "#A79B78", marginTop: 4 }}>
            Position {rotation.currentIndex + 1} of {order.length} · {rotation.cyclesCompleted} full cycle{rotation.cyclesCompleted === 1 ? "" : "s"} completed
          </div>
        )}
      </Card>

      {isChair && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Btn variant="gold" icon={<ChevronRight size={16} />} onClick={advance}>Advance to next</Btn>
          <Btn variant="ghost" onClick={resetOrder}>{order.length ? "Reset order" : "Set up order"}</Btn>
        </div>
      )}

      <SectionTitle>Rotation order</SectionTitle>
      {order.length === 0 ? (
        <Card><EmptyState icon={<Users size={22} color="#C9BE9E" />} text="No rotation set up yet." /></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {order.map((id, i) => (
            <Card key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: i === rotation.currentIndex ? "#F0DDD0" : "#FFFDF8" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#A79B78", width: 20 }}>{i + 1}</div>
                <Avatar member={members.find((m) => m.id === id)} size={28} />
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#6B3A28" }}>{memberName(id)}</div>
              </div>
              {i === rotation.currentIndex && <Badge tone="gold">Next</Badge>}
            </Card>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#A79B78", marginTop: 10, lineHeight: 1.5 }}>
        "Set up order" uses the current active-member list in join order. Re-running it starts the rotation over — use "Advance to next" for normal cycling.
      </div>
    </DetailShell>
  );
}

/* -------------------------------- Data export -------------------------------- */
function toCsv(rows, columns) {
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => c.label).join(",");
  const body = rows.map((r) => columns.map((c) => escape(typeof c.value === "function" ? c.value(r) : r[c.value])).join(",")).join("\n");
  return header + "\n" + body;
}
function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Lightweight PDF using canvas — no library needed.
// Each row is a line of text; the page is broken when it runs out of height.
function downloadPdf(filename, title, columns, rows, memberName) {
  const W = 595, H = 842, M = 36, TH = 14, RH = 16;
  const canvas = document.createElement("canvas");
  const pages = [];
  let y = M, ctx2d;

  const newPage = () => {
    canvas.width = W; canvas.height = H;
    ctx2d = canvas.getContext("2d");
    ctx2d.fillStyle = "#F7F2E4"; ctx2d.fillRect(0, 0, W, H);
    ctx2d.fillStyle = "#6B3A28"; ctx2d.font = "bold 13px sans-serif";
    ctx2d.fillText(title + " — NYISH", M, M + 8);
    ctx2d.fillText(`Generated ${todayISO()}`, W - M - 110, M + 8);
    y = M + 30;
    // Column headers
    ctx2d.fillStyle = "#EAE0C4"; ctx2d.fillRect(M, y, W - M * 2, TH + 4);
    ctx2d.fillStyle = "#6B3A28"; ctx2d.font = "bold 9px sans-serif";
    const colW = (W - M * 2) / columns.length;
    columns.forEach((c, i) => ctx2d.fillText(c.label, M + i * colW + 2, y + TH - 2));
    y += TH + 6;
  };

  newPage();
  rows.forEach((row) => {
    if (y + RH > H - M) {
      pages.push(canvas.toDataURL("image/jpeg", 0.92));
      newPage();
    }
    ctx2d.fillStyle = rows.indexOf(row) % 2 === 0 ? "#FFFDF8" : "#F0EBD8";
    ctx2d.fillRect(M, y - 2, W - M * 2, RH);
    ctx2d.fillStyle = "#3A3524"; ctx2d.font = "9px sans-serif";
    const colW = (W - M * 2) / columns.length;
    columns.forEach((c, i) => {
      const val = typeof c.value === "function" ? c.value(row) : row[c.value];
      ctx2d.fillText(String(val ?? ""), M + i * colW + 2, y + RH - 6, colW - 4);
    });
    y += RH;
  });
  pages.push(canvas.toDataURL("image/jpeg", 0.92));

  // Build a minimal PDF manually
  const imgs = pages;
  let pdf = "%PDF-1.4\n";
  const objs = [];
  const add = (str) => { const n = objs.length + 1; objs.push(str); return n; };

  const imgObjs = imgs.map((dataUrl, i) => {
    const base64 = dataUrl.split(",")[1];
    const bytes = atob(base64).length;
    const obj = add(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes} >>\nstream\n${String.fromCharCode(...new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0))))}\nendstream`);
    return obj;
  });

  const pageObjs = imgs.map((_, i) => {
    const imgN = imgObjs[i];
    return add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${objs.length + 2} 0 R /Resources << /XObject << /Im${i} ${imgN} 0 R >> >> >>`);
  });
  const contentObjs = imgs.map((_, i) =>
    add(`<< /Length ${(`q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`).length} >>\nstream\nq ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q\nendstream`)
  );

  // Simpler approach: download as multi-page HTML print-to-PDF
  const html = `<!DOCTYPE html><html><head><style>body{margin:0}img{width:100%;page-break-after:always}</style></head><body>${imgs.map((src) => `<img src="${src}">`).join("")}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename.replace(".pdf", ".html"); a.click();
  URL.revokeObjectURL(url);
}

function ExportPage({ ctx, onBack }) {
  const { members, savings, loans, fines, isChair, isTreasurer } = ctx;
  const canManageFinance = isChair || isTreasurer;
  const mName = (id) => members.find((m) => m.id === id)?.name || "Unknown";

  const MEMBER_COLS = [
    { label: "Name", value: "name" }, { label: "Phone", value: "phone" },
    { label: "ID", value: "idNumber" }, { label: "KRA PIN", value: "kraPin" },
    { label: "Email", value: "email" }, { label: "Role", value: "role" },
    { label: "Status", value: "status" }, { label: "Joined", value: "joinDate" },
  ];
  const FINE_COLS = [
    { label: "Member", value: (r) => mName(r.memberId) }, { label: "Amount", value: "amount" },
    { label: "Reason", value: "reason" }, { label: "Status", value: "status" }, { label: "Date", value: "date" },
  ];
  const SAVING_COLS = [
    { label: "Member", value: (r) => mName(r.memberId) }, { label: "Amount", value: "amount" },
    { label: "Date", value: "date" }, { label: "Note", value: "note" }, { label: "Source", value: "source" },
  ];
  const LOAN_COLS = [
    { label: "Member", value: (r) => mName(r.memberId) }, { label: "Amount", value: "amount" },
    { label: "Purpose", value: "purpose" }, { label: "Status", value: "status" },
    { label: "Balance", value: "balance" }, { label: "Interest", value: "interestAmount" },
    { label: "Total Due", value: "totalDue" }, { label: "Requested", value: "dateRequested" },
  ];

  const allExporters = [
    { label: "Members", count: members.length, restricted: false, cols: MEMBER_COLS, rows: members, file: "nyish_members" },
    { label: "Fines", count: fines.length, restricted: false, cols: FINE_COLS, rows: fines, file: "nyish_fines" },
    { label: "Savings", count: savings.length, restricted: true, cols: SAVING_COLS, rows: savings, file: "nyish_savings" },
    { label: "Loans", count: loans.length, restricted: true, cols: LOAN_COLS, rows: loans, file: "nyish_loans" },
  ];
  const exporters = allExporters.filter((e) => !e.restricted || canManageFinance);

  return (
    <DetailShell title="Export data" onBack={onBack}>
      <div style={{ fontSize: 12.5, color: "#5B5138", marginBottom: 14, lineHeight: 1.5 }}>
        CSV: open in Excel/Sheets. PDF: opens in browser for print or save.
        {!canManageFinance && <span style={{ color: "#8B4A2B" }}> Savings and loans visible to Chairperson and Treasurer only.</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {exporters.map((ex) => (
          <Card key={ex.label}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#6B3A28" }}>{ex.label}</div>
                <div style={{ fontSize: 11.5, color: "#A79B78" }}>{ex.count} record{ex.count === 1 ? "" : "s"}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" icon={<Download size={14} />} onClick={() => downloadCsv(`${ex.file}.csv`, toCsv(ex.rows, ex.cols))} disabled={ex.count === 0}>CSV</Btn>
              <Btn variant="ghost" icon={<FileText size={14} />} onClick={() => downloadPdf(`${ex.file}.pdf`, ex.label, ex.cols, ex.rows, mName)} disabled={ex.count === 0}>PDF</Btn>
            </div>
          </Card>
        ))}
      </div>
    </DetailShell>
  );
}

function ConstitutionPage({ ctx, onBack }) {
  const { isChair, constitution, persist, notify } = ctx;
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
        {isChair && !editing && <Btn variant="ghost" onClick={() => { setDraft(constitution); setEditing(true); }}>Edit</Btn>}
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

function ProfilePage({ ctx, onBack, openMore }) {
  const { me, persist, notify } = ctx;
  const [form, setForm] = useState({
    name: me.name, email: me.email || "", kraPin: me.kraPin || "",
    idNumber: me.idNumber || "", nextOfKin: me.nextOfKin || "", nextOfKinPhone: me.nextOfKinPhone || "",
  });
  const [photo, setPhoto] = useState(me.photo || null);
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPhotoChange = async (e) => {
    try {
      const dataUrl = await fileToDataURL(e.target.files?.[0]);
      if (dataUrl) setPhoto(dataUrl);
    } catch (err) { notify(err.message); e.target.value = ""; }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await persist.updateMember(me.id, { ...form, photo });
      notify("Profile updated.");
    } catch (err) { notify(err.message || "Save failed."); }
    setBusy(false);
  };

  const changePassword = async () => {
    if (!PASSWORD_RULE.test(pw.next.trim())) return notify("Password doesn't meet the requirements — " + PASSWORD_HINT);
    if (pw.next.trim() !== pw.confirm.trim()) return notify("New password and confirmation don't match.");
    setBusy(true);
    try {
      // Use Supabase Auth's built-in password update — no current password
      // needed because the user is already authenticated via a valid session.
      const { error } = await supabase.auth.updateUser({ password: pw.next.trim() });
      if (error) throw error;
      setPw({ next: "", confirm: "" });
      notify("Password changed successfully.");
    } catch (err) { notify(err.message || "Password change failed."); }
    setBusy(false);
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
        <Field label="Full name"><input style={inputStyle} value={form.name} onChange={set("name")} /></Field>
        <Field label="Email"><input style={inputStyle} type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="National ID number"><input style={inputStyle} value={form.idNumber} onChange={set("idNumber")} /></Field>
        <Field label="KRA PIN"><input style={inputStyle} value={form.kraPin} onChange={set("kraPin")} placeholder="A0XXXXXXXXZ" /></Field>
        <Field label="Next of kin name"><input style={inputStyle} value={form.nextOfKin} onChange={set("nextOfKin")} /></Field>
        <Field label="Next of kin phone"><input style={inputStyle} value={form.nextOfKinPhone} onChange={set("nextOfKinPhone")} placeholder="07XXXXXXXX" /></Field>
        <Btn variant="primary" full onClick={saveProfile} disabled={busy}>Save profile</Btn>
      </Card>

      <SectionTitle>QR membership card</SectionTitle>
      <Card>
        <div style={{ fontSize: 12.5, color: "#5B5138", marginBottom: 10 }}>Officials can scan your QR card to record attendance or savings quickly.</div>
        <Btn variant="ghost" full icon={<QrCode size={16} />} onClick={() => openMore && openMore("qr")}>View my QR card</Btn>
      </Card>

      <SectionTitle>Change password</SectionTitle>
      <Card>
        <Field label="New password">
          <PasswordInput value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
          <div style={{ fontSize: 11, color: "#A79B78", marginTop: 4 }}>{PASSWORD_HINT}</div>
        </Field>
        <Field label="Confirm new password">
          <PasswordInput value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
        </Field>
        <Btn variant="ghost" full onClick={changePassword} disabled={busy}>Update password</Btn>
      </Card>
    </DetailShell>
  );
}

/* ─── QR Membership Card ─────────────────────────────────────────────── */
function QrCardPage({ ctx, onBack }) {
  const { me } = ctx;
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawQr(canvasRef.current, memberQrData(me), { size: 220 }).catch(() => {});
  }, [me]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `NYISH_QR_${me.name.replace(/\s+/g, "_")}.png`;
    a.click();
  };

  return (
    <DetailShell title="My QR card" onBack={onBack}>
      <Card style={{ textAlign: "center" }}>
        <Avatar member={me} size={60} />
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: "#6B3A28", marginTop: 10 }}>{me.name}</div>
        <div style={{ fontSize: 12, color: "#A79B78", marginBottom: 16 }}>{roleLabel(me.role)} · {GROUP_SHORT}</div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <canvas ref={canvasRef} style={{ borderRadius: 12, border: "1px solid #D8CCA8" }} />
        </div>
        <div style={{ fontSize: 11, color: "#A79B78", marginTop: 10 }}>
          Show this to officials to record attendance or savings.
        </div>
      </Card>
      <div style={{ marginTop: 14 }}>
        <Btn variant="ghost" full icon={<Download size={16} />} onClick={download}>Download QR card (PNG)</Btn>
      </div>
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
  detail: ({ page, ctx, onBack, openMore }) => {
    switch (page) {
      case "profile": return <ProfilePage ctx={ctx} onBack={onBack} openMore={openMore} />;
      case "members": return <MembersPage ctx={ctx} onBack={onBack} />;
      case "fines": return <FinesPage ctx={ctx} onBack={onBack} />;
      case "rotation": return <RotationPage ctx={ctx} onBack={onBack} />;
      case "announcements": return <AnnouncementsPage ctx={ctx} onBack={onBack} />;
      case "constitution": return <ConstitutionPage ctx={ctx} onBack={onBack} />;
      case "certificate": return <CertificatePage ctx={ctx} onBack={onBack} />;
      case "qr": return <QrCardPage ctx={ctx} onBack={onBack} />;
      case "export": return <ExportPage ctx={ctx} onBack={onBack} />;
      default: return null;
    }
  },
};
