// POST /api/mpesa-stkpush
// Body: { memberId, memberName, phone, amount }
// phone must be a Kenyan MSISDN in 2547XXXXXXXX / 2541XXXXXXXX format.
//
// Requires these Vercel server env vars (Safaricom Daraja — sandbox first,
// then production once you're ready; see PROGRESS.md "M-PESA setup"):
//   MPESA_ENV            "sandbox" or "production"
//   MPESA_CONSUMER_KEY
//   MPESA_CONSUMER_SECRET
//   MPESA_SHORTCODE      your Paybill/Till number (or 174379 for sandbox)
//   MPESA_PASSKEY
//   MPESA_CALLBACK_URL   e.g. https://your-app.vercel.app/api/mpesa-callback
//     (Daraja requires this to be a public HTTPS URL — it cannot call
//     localhost, so STK push can't be tested from your machine directly)
//
// Flow: get an OAuth token -> call Daraja's STK Push endpoint -> store a
// short-lived "pending" record keyed by CheckoutRequestID (so the callback
// endpoint knows which member/amount to credit) -> return the
// CheckoutRequestID to the client so it can poll for completion.

import { getAdminClient, saveListServer } from "./_supabaseAdmin.js";

const BASE = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() + pad(d.getMonth() + 1) + pad(d.getDate()) +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
  );
}

async function getAccessToken(base, key, secret) {
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error("Daraja auth failed: " + (await res.text()));
  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { memberId, memberName, phone, amount } = req.body || {};
  if (!memberId || !phone || !amount || Number(amount) <= 0) {
    res.status(400).json({ error: "memberId, phone and a positive amount are required" });
    return;
  }

  const env = process.env.MPESA_ENV || "sandbox";
  const base = BASE[env] || BASE.sandbox;
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
    res.status(500).json({ error: "M-PESA is not configured on the server yet (missing MPESA_* env vars)." });
    return;
  }

  try {
    const token = await getAccessToken(base, consumerKey, consumerSecret);
    const ts = timestamp();
    const password = Buffer.from(shortcode + passkey + ts).toString("base64");

    const stkRes = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(Number(amount)),
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: "NYISH",
        TransactionDesc: `NYISH savings - ${memberName || memberId}`,
      }),
    });

    const stkData = await stkRes.json();
    if (!stkRes.ok || !stkData.CheckoutRequestID) {
      res.status(502).json({ error: "Daraja rejected the STK push request", detail: stkData });
      return;
    }

    // Remember which member/amount this checkout belongs to, so the
    // callback (which only gets Safaricom's own transaction data) can
    // credit the right person.
    const admin = getAdminClient();
    await saveListServer(admin, `mpesa_pending:${stkData.CheckoutRequestID}`, {
      memberId, memberName, amount: Number(amount), phone, requestedAt: new Date().toISOString(),
    });

    res.status(200).json({ checkoutRequestId: stkData.CheckoutRequestID, customerMessage: stkData.CustomerMessage });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown error initiating STK push" });
  }
}
