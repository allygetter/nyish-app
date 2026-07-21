import { supabase } from "./supabaseClient.js";

/*
  Each entity lives in its own Supabase table and is written row-by-row
  (insert/update), never as one big JSON blob. The previous version stored
  the whole `members` array as a single JSON string — if two people
  registered around the same time, the second save silently overwrote the
  first person's data ("last write wins"). Real rows fix that.

  See README.md for the `create table` statements.
*/

function checkReady() {
  if (!supabase) throw new Error("Supabase is not configured — check your .env.local values.");
}

/* ------------------------------- members --------------------------------- */
export async function fetchMembers() {
  checkReady();
  const { data, error } = await supabase.from("members").select("*").order("join_date", { ascending: true });
  if (error) throw error;
  return (data || []).map(fromMemberRow);
}

export async function insertMember(member) {
  checkReady();
  const { data, error } = await supabase.from("members").insert(toMemberRow(member)).select().single();
  if (error) throw error;
  return fromMemberRow(data);
}

export async function updateMember(id, patch) {
  checkReady();
  const { data, error } = await supabase.from("members").update(toMemberRow(patch, true)).eq("id", id).select().single();
  if (error) throw error;
  return fromMemberRow(data);
}

function toMemberRow(m, partial = false) {
  const row = {};
  if (!partial || m.name !== undefined) row.name = m.name;
  if (!partial || m.phone !== undefined) row.phone = m.phone;
  if (!partial || m.idNumber !== undefined) row.id_number = m.idNumber;
  if (!partial || m.email !== undefined) row.email = m.email;
  if (!partial || m.role !== undefined) row.role = m.role;
  if (!partial || m.status !== undefined) row.status = m.status;
  if (!partial && m.id) row.id = m.id; // id = auth.users.id, set at signup
  if (!partial) row.join_date = m.joinDate;
  return row;
}
function fromMemberRow(r) {
  return {
    id: r.id, name: r.name, phone: r.phone, idNumber: r.id_number,
    email: r.email, role: r.role, status: r.status, joinDate: r.join_date,
  };
}

/* -------------------------------- savings --------------------------------- */
export async function fetchSavings() {
  checkReady();
  const { data, error } = await supabase.from("savings").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id, memberId: r.member_id, amount: r.amount, date: r.date,
    note: r.note, recordedBy: r.recorded_by, source: r.source,
  }));
}
export async function insertSaving(s) {
  checkReady();
  const { data, error } = await supabase.from("savings").insert({
    member_id: s.memberId, amount: s.amount, date: s.date, note: s.note,
    recorded_by: s.recordedBy, source: s.source || "manual",
  }).select().single();
  if (error) throw error;
  return { id: data.id, memberId: data.member_id, amount: data.amount, date: data.date, note: data.note, recordedBy: data.recorded_by, source: data.source };
}

/* --------------------------------- loans ----------------------------------- */
export async function fetchLoans() {
  checkReady();
  const { data, error } = await supabase.from("loans").select("*").order("date_requested", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromLoanRow);
}
export async function insertLoan(l) {
  checkReady();
  const { data, error } = await supabase.from("loans").insert({
    member_id: l.memberId, amount: l.amount, purpose: l.purpose, status: "pending",
    date_requested: l.dateRequested, balance: l.amount, repayments: [],
  }).select().single();
  if (error) throw error;
  return fromLoanRow(data);
}
export async function updateLoan(id, patch) {
  checkReady();
  const row = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.dateApproved !== undefined) row.date_approved = patch.dateApproved;
  if (patch.balance !== undefined) row.balance = patch.balance;
  if (patch.repayments !== undefined) row.repayments = patch.repayments;
  const { data, error } = await supabase.from("loans").update(row).eq("id", id).select().single();
  if (error) throw error;
  return fromLoanRow(data);
}
function fromLoanRow(r) {
  return {
    id: r.id, memberId: r.member_id, amount: r.amount, purpose: r.purpose,
    status: r.status, dateRequested: r.date_requested, dateApproved: r.date_approved,
    balance: r.balance, repayments: r.repayments || [],
  };
}

/* -------------------------------- meetings --------------------------------- */
export async function fetchMeetings() {
  checkReady();
  const { data, error } = await supabase.from("meetings").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id, date: r.date, agenda: r.agenda, minutes: r.minutes,
    attendance: r.attendance || [], createdBy: r.created_by,
  }));
}
export async function insertMeeting(mt) {
  checkReady();
  const { data, error } = await supabase.from("meetings").insert({
    date: mt.date, agenda: mt.agenda, minutes: mt.minutes,
    attendance: mt.attendance, created_by: mt.createdBy,
  }).select().single();
  if (error) throw error;
  return { id: data.id, date: data.date, agenda: data.agenda, minutes: data.minutes, attendance: data.attendance || [], createdBy: data.created_by };
}

/* ----------------------------- announcements -------------------------------- */
export async function fetchAnnouncements() {
  checkReady();
  const { data, error } = await supabase.from("announcements").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.id, title: r.title, body: r.body, date: r.date, postedBy: r.posted_by }));
}
export async function insertAnnouncement(a) {
  checkReady();
  const { data, error } = await supabase.from("announcements").insert({
    title: a.title, body: a.body, date: a.date, posted_by: a.postedBy,
  }).select().single();
  if (error) throw error;
  return { id: data.id, title: data.title, body: data.body, date: data.date, postedBy: data.posted_by };
}

/* ------------------------------- constitution -------------------------------- */
export async function fetchConstitution(fallback) {
  checkReady();
  const { data, error } = await supabase.from("nyish_store").select("value").eq("key", "constitution").maybeSingle();
  if (error || !data) return fallback;
  return data.value;
}
export async function saveConstitution(text) {
  checkReady();
  const { error } = await supabase.from("nyish_store").upsert({ key: "constitution", value: text });
  if (error) throw error;
}
