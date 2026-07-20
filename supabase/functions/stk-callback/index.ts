// supabase/functions/stk-callback/index.ts
//
// Deploy with:
//   supabase functions deploy stk-callback --no-verify-jwt
//
// IMPORTANT: this must be deployed with --no-verify-jwt because Safaricom
// calls it directly (no Supabase auth header). Set DARAJA_CALLBACK_URL (used
// by stk-push) to this function's deployed URL:
//   https://<project-ref>.supabase.co/functions/v1/stk-callback
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  // Safaricom expects a 200 + this exact shape even on our own errors, or it
  // will keep retrying the callback indefinitely.
  const ack = () => new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const body = await req.json();
    const stk = body?.Body?.stkCallback;
    if (!stk) return ack();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const pendingKey = `stk_pending:${stk.CheckoutRequestID}`;
    const { data: pendingRow } = await supabase
      .from("nyish_store")
      .select("value")
      .eq("key", pendingKey)
      .maybeSingle();

    if (!pendingRow) return ack(); // unknown/duplicate callback — ignore safely

    const pending = JSON.parse(pendingRow.value);

    if (stk.ResultCode === 0) {
      const items: Array<{ Name: string; Value: unknown }> =
        stk.CallbackMetadata?.Item || [];
      const get = (name: string) => items.find((i) => i.Name === name)?.Value;
      const amount = Number(get("Amount") ?? pending.amount);
      const receipt = get("MpesaReceiptNumber");

      const { data: savingsRow } = await supabase
        .from("nyish_store")
        .select("value")
        .eq("key", "savings")
        .maybeSingle();
      const savings = savingsRow?.value ? JSON.parse(savingsRow.value) : [];

      savings.push({
        id: uid(),
        memberId: pending.memberId,
        amount,
        date: todayISO(),
        note: receipt ? `M-PESA STK (${receipt})` : "M-PESA STK",
        recordedBy: pending.memberId,
      });

      await supabase.from("nyish_store").upsert({ key: "savings", value: JSON.stringify(savings) });
    }
    // ResultCode !== 0 means the member cancelled or entered the wrong PIN —
    // nothing to record, just clean up the pending marker below.

    await supabase.from("nyish_store").delete().eq("key", pendingKey);
    return ack();
  } catch (err) {
    console.error("stk-callback error", err);
    return ack();
  }
});
