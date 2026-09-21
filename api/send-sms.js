// POST /api/send-sms
// Body: { recipients: [{ phone, name }], message }
// phone should be in 2547XXXXXXXX format (see toMsisdn() in App.jsx).
//
// Requires these Vercel server env vars (from africastalking.com — the
// sandbox app is free and good enough to test the wiring before paying
// for production SMS credits):
//   AT_USERNAME   your Africa's Talking username ("sandbox" for testing)
//   AT_API_KEY    your API key
//   AT_SENDER_ID  (optional) your registered short code/sender ID

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { recipients, message } = req.body || {};
  if (!Array.isArray(recipients) || recipients.length === 0 || !message) {
    res.status(400).json({ error: "recipients (non-empty array) and message are required" });
    return;
  }

  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const senderId = process.env.AT_SENDER_ID;
  if (!username || !apiKey) {
    res.status(500).json({ error: "SMS is not configured on the server yet (missing AT_USERNAME / AT_API_KEY)." });
    return;
  }

  const base = username === "sandbox"
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

  const body = new URLSearchParams({
    username,
    to: recipients.map((r) => r.phone).join(","),
    message,
  });
  if (senderId) body.set("from", senderId);

  try {
    const atRes = await fetch(base, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
    const data = await atRes.json();
    if (!atRes.ok) {
      res.status(502).json({ error: "Africa's Talking rejected the request", detail: data });
      return;
    }
    res.status(200).json({ ok: true, result: data });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown error sending SMS" });
  }
}
