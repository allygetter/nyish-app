// GET /api/mpesa-status?checkoutRequestId=...
// The client polls this after initiating an STK push, since the actual
// result arrives asynchronously via /api/mpesa-callback from Safaricom.

import { getAdminClient, loadValueServer } from "./_supabaseAdmin.js";

export default async function handler(req, res) {
  const { checkoutRequestId } = req.query || {};
  if (!checkoutRequestId) {
    res.status(400).json({ error: "checkoutRequestId is required" });
    return;
  }
  try {
    const admin = getAdminClient();
    const result = await loadValueServer(admin, `mpesa_result:${checkoutRequestId}`);
    if (!result) {
      res.status(200).json({ status: "pending" });
      return;
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown error" });
  }
}
