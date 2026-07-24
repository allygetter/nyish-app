// POST /api/mpesa-callback — called by Safaricom, not by the app directly.
// This must be reachable at a public HTTPS URL (MPESA_CALLBACK_URL) for
// Daraja to deliver the result to.

import { getAdminClient, loadValueServer, deleteKeyServer, appendToListServer, saveValueServer } from "./_supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Always 200 back to Safaricom quickly, even on our own errors — Daraja
  // retries on non-200, which would otherwise create duplicate savings
  // entries. Real failures are logged server-side (Vercel function logs)
  // instead.
  try {
    const stk = req.body?.Body?.stkCallback;
    if (!stk) {
      res.status(200).json({ ok: true });
      return;
    }

    const admin = getAdminClient();
    const pending = await loadValueServer(admin, `mpesa_pending:${stk.CheckoutRequestID}`);

    if (stk.ResultCode === 0 && pending) {
      const items = stk.CallbackMetadata?.Item || [];
      const get = (name) => items.find((i) => i.Name === name)?.Value;
      const receipt = get("MpesaReceiptNumber");
      const paidAmount = get("Amount") || pending.amount;

      await appendToListServer(admin, "savings", {
        id: `mpesa_${stk.CheckoutRequestID}`,
        memberId: pending.memberId,
        amount: Number(paidAmount),
        date: new Date().toISOString().slice(0, 10),
        note: `M-PESA (${receipt || "receipt pending"})`,
        recordedBy: pending.memberId,
        source: "mpesa",
      });

      await saveValueServer(admin, `mpesa_result:${stk.CheckoutRequestID}`, { status: "success", receipt });
    } else {
      // User cancelled, timed out, or it failed — record the outcome so
      // the client's polling can stop and show a real message.
      await saveValueServer(admin, `mpesa_result:${stk.CheckoutRequestID}`, {
        status: "failed",
        resultDesc: stk.ResultDesc,
      });
    }

    await deleteKeyServer(admin, `mpesa_pending:${stk.CheckoutRequestID}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("mpesa-callback error", err);
    res.status(200).json({ ok: true }); // still 200 — see comment above
  }
}
