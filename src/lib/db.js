import { supabase } from "./supabaseClient.js";

function checkReady() {
  if (!supabase) throw new Error("Supabase is not configured — check your .env.local values.");
}

/* ─── helpers ─── */
function fromRow(r, map) {
  const out = {};
  for (const [k, v] of Object.entries(map)) out[k] = r[v] ?? r[k] ?? null;
  return out;
}

/* ─── members ─── */
function memberToRow(m, partial = false) {
  const row = {};
  const set = (col, val) => { if (!partial || val !== undefined) row[col] = val; };
  set("id", m.id); set("name", m.name); set("phone", m.phone);
  set("id_number", m.idNumber); set("kra_pin", m.kraPin);
  set("email", m.email); set("role", m.role); set("status", m.status);
  set("join_date", m.joinDate); set("photo", m.photo);
  set("next_of_kin", m.nextOfKin); set("next_of_kin_phone", m.nextOfKinPhone);
  set("congratulated", m.congratulated); set("onboarded", m.onboarded);
  if (!partial) { delete row.undefined; }
  // strip undefined values
  Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);
  return row;
}
function memberFromRow(r) {
  return {
    id: r.id, name: r.name, phone: r.phone, idNumber: r.id_number,
    kraPin: r.kra_pin, email: r.email, role: r.role, status: r.status,
    joinDate: r.join_date, photo: r.photo, nextOfKin: r.next_of_kin,
    nextOfKinPhone: r.next_of_kin_phone, congratulated: r.congratulated,
    onboarded: r.onboarded,
  };
}
export async function fetchMembers() {
  checkReady();
  const { data, error } = await supabase.from("members").select("*").order("join_date", { ascending: true });
  if (error) throw error;
  return (data || []).map(memberFromRow);
}
export async function insertMember(m) {
  checkReady();
  const row = memberToRow(m);
  const { data, error } = await supabase.from("members").insert(row).select().single();
  if (error) throw error;
  return memberFromRow(data);
}
export async function upsertMember(m) {
  checkReady();
  const row = memberToRow(m);
  const { data, error } = await supabase.from("members").upsert(row).select().single();
  if (error) throw error;
  return memberFromRow(data);
}
export async function updateMember(id, patch) {
  checkReady();
  const row = memberToRow(patch, true);
  const { data, error } = await supabase.from("members").update(row).eq("id", id).select().single();
  if (error) throw error;
  return memberFromRow(data);
}
export async function deleteMember(id) {
  checkReady();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
}

/* ─── savings ─── */
function savingFromRow(r) {
  return { id: r.id, memberId: r.member_id, amount: Number(r.amount), date: r.date, note: r.note, recordedBy: r.recorded_by, source: r.source };
}
export async function fetchSavings() {
  checkReady();
  const { data, error } = await supabase.from("savings").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(savingFromRow);
}
export async function insertSaving(s) {
  checkReady();
  const { data, error } = await supabase.from("savings").insert({
    member_id: s.memberId, amount: s.amount, date: s.date,
    note: s.note || null, recorded_by: s.recordedBy, source: s.source || "manual",
  }).select().single();
  if (error) throw error;
  return savingFromRow(data);
}

/* ─── loans ─── */
function loanFromRow(r) {
  return {
    id: r.id, memberId: r.member_id, amount: Number(r.amount), purpose: r.purpose,
    status: r.status, dateRequested: r.date_requested, dateApproved: r.date_approved,
    balance: Number(r.balance), repayments: r.repayments || [],
    approvals: r.approvals || [], interestRate: r.interest_rate,
    interestAmount: r.interest_amount, totalDue: r.total_due,
  };
}
export async function fetchLoans() {
  checkReady();
  const { data, error } = await supabase.from("loans").select("*").order("date_requested", { ascending: false });
  if (error) throw error;
  return (data || []).map(loanFromRow);
}
export async function insertLoan(l) {
  checkReady();
  const { data, error } = await supabase.from("loans").insert({
    member_id: l.memberId, amount: l.amount, purpose: l.purpose,
    status: "pending", date_requested: l.dateRequested,
    balance: l.amount, repayments: [], approvals: [],
  }).select().single();
  if (error) throw error;
  return loanFromRow(data);
}
export async function updateLoan(id, patch) {
  checkReady();
  const row = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.dateApproved !== undefined) row.date_approved = patch.dateApproved;
  if (patch.balance !== undefined) row.balance = patch.balance;
  if (patch.repayments !== undefined) row.repayments = patch.repayments;
  if (patch.approvals !== undefined) row.approvals = patch.approvals;
  if (patch.interestRate !== undefined) row.interest_rate = patch.interestRate;
  if (patch.interestAmount !== undefined) row.interest_amount = patch.interestAmount;
  if (patch.totalDue !== undefined) row.total_due = patch.totalDue;
  const { data, error } = await supabase.from("loans").update(row).eq("id", id).select().single();
  if (error) throw error;
  return loanFromRow(data);
}

/* ─── meetings ─── */
function meetingFromRow(r) {
  return { id: r.id, date: r.date, agenda: r.agenda, minutes: r.minutes, attendance: r.attendance || [], createdBy: r.created_by };
}
export async function fetchMeetings() {
  checkReady();
  const { data, error } = await supabase.from("meetings").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(meetingFromRow);
}
export async function insertMeeting(m) {
  checkReady();
  const { data, error } = await supabase.from("meetings").insert({
    date: m.date, agenda: m.agenda, minutes: m.minutes || null,
    attendance: m.attendance, created_by: m.createdBy,
  }).select().single();
  if (error) throw error;
  return meetingFromRow(data);
}

/* ─── announcements ─── */
function announcementFromRow(r) {
  return { id: r.id, title: r.title, body: r.body, image: r.image || null, date: r.date, postedBy: r.posted_by };
}
export async function fetchAnnouncements() {
  checkReady();
  const { data, error } = await supabase.from("announcements").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(announcementFromRow);
}
export async function insertAnnouncement(a) {
  checkReady();
  const { data, error } = await supabase.from("announcements").insert({
    title: a.title, body: a.body, image: a.image || null,
    date: a.date, posted_by: a.postedBy,
  }).select().single();
  if (error) throw error;
  return announcementFromRow(data);
}

/* ─── fines ─── */
function fineFromRow(r) {
  return { id: r.id, memberId: r.member_id, amount: Number(r.amount), reason: r.reason, date: r.date, status: r.status, paidDate: r.paid_date, recordedBy: r.recorded_by };
}
export async function fetchFines() {
  checkReady();
  const { data, error } = await supabase.from("fines").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(fineFromRow);
}
export async function insertFine(f) {
  checkReady();
  const { data, error } = await supabase.from("fines").insert({
    member_id: f.memberId, amount: f.amount, reason: f.reason || null,
    date: f.date, status: "unpaid", recorded_by: f.recordedBy,
  }).select().single();
  if (error) throw error;
  return fineFromRow(data);
}
export async function updateFine(id, patch) {
  checkReady();
  const row = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.paidDate !== undefined) row.paid_date = patch.paidDate;
  const { data, error } = await supabase.from("fines").update(row).eq("id", id).select().single();
  if (error) throw error;
  return fineFromRow(data);
}

/* ─── rotation (single-row config) ─── */
export async function fetchRotation() {
  checkReady();
  const { data } = await supabase.from("nyish_store").select("value").eq("key", "rotation").maybeSingle();
  if (!data) return { order: [], currentIndex: 0, cyclesCompleted: 0 };
  try { return JSON.parse(data.value); } catch { return { order: [], currentIndex: 0, cyclesCompleted: 0 }; }
}
export async function saveRotation(rot) {
  checkReady();
  await supabase.from("nyish_store").upsert({ key: "rotation", value: JSON.stringify(rot) });
}

/* ─── constitution (single text blob) ─── */
export async function fetchConstitution(fallback) {
  checkReady();
  const { data } = await supabase.from("nyish_store").select("value").eq("key", "constitution").maybeSingle();
  if (!data) return fallback;
  return data.value;
}
export async function saveConstitution(text) {
  checkReady();
  await supabase.from("nyish_store").upsert({ key: "constitution", value: text });
}
