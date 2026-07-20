// supabase/functions/stk-push/index.ts
//
// Deploy with:
//   supabase functions deploy stk-push
//
// Requires these secrets (supabase secrets set NAME=value):
//   DARAJA_ENV               "sandbox" | "production"
//   DARAJA_CONSUMER_KEY      from your Daraja app
//   DARAJA_CONSUMER_SECRET   from your Daraja app
//   DARAJA_SHORTCODE         your paybill/till number (the "common bank account")
//   DARAJA_PASSKEY           Lipa Na M-PESA Online Passkey for that shortcode
//   DARAJA_CALLBACK_URL      the deployed URL of the stk-callback function, e.g.
//                            https://<project-ref>.supabase.co/functions/v1/stk-callback
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically by the
// Supabase Edge Runtime — no need to set those yourself.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Normalizes Kenyan numbers like 07XXXXXXXX / +2547XXXXXXXX / 2547XXXXXXXX
// into the 2547XXXXXXXX format Daraja expects.
function normalizePhone(raw: string) {
  let p = raw.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  return p;
}

function daraja(env: string) {
  return env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

async function getAccessToken(env: string, key: string, secret: string) {
  const base = daraja(env);
  const auth = btoa(`${key}:${secret}`);
  const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error("Daraja auth failed: " + (await res.text()));
  const data = await res.json();
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { phone, amount, memberId } = await req.json();
    if (!phone || !amount || !memberId) {
      return json({ error: "phone, amount and memberId are required" }, 400);
    }

    const env = Deno.env.get("DARAJA_ENV") || "sandbox";
    const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("DARAJA_SHORTCODE");
    const passkey = Deno.env.get("DARAJA_PASSKEY");
    const callbackUrl = Deno.env.get("DARAJA_CALLBACK_URL");

    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
      return json({ error: "M-PESA is not fully configured on the server (missing Daraja secrets)." }, 500);
    }

    const msisdn = normalizePhone(String(phone));
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const accessToken = await getAccessToken(env, consumerKey, consumerSecret);

    const stkRes = await fetch(`${daraja(env)}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(Number(amount)),
        PartyA: msisdn,
        PartyB: shortcode,
        PhoneNumber: msisdn,
        CallBackURL: callbackUrl,
        AccountReference: `NYISH-${memberId}`,
        TransactionDesc: "NYISH savings contribution",
      }),
    });

    const stkData = await stkRes.json();
    if (!stkRes.ok || stkData.errorCode) {
      return json({ error: stkData.errorMessage || stkData.ResponseDescription || "STK push failed" }, 502);
    }

    // Remember which member/amount this CheckoutRequestID belongs to, so the
    // callback (which only gets Safaricom's own identifiers) knows who to
    // credit once payment is confirmed.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await supabase.from("nyish_store").upsert({
      key: `stk_pending:${stkData.CheckoutRequestID}`,
      value: JSON.stringify({ memberId, amount: Number(amount), phone: msisdn, createdAt: Date.now() }),
    });

    return json({
      ok: true,
      checkoutRequestId: stkData.CheckoutRequestID,
      merchantRequestId: stkData.MerchantRequestID,
      customerMessage: stkData.CustomerMessage,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
