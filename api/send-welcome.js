// POST /api/send-welcome
// Body: { email, name, certificatePngBase64 }  (base64, no data-URL prefix)
//
// Requires the RESEND_API_KEY environment variable (Vercel → Project →
// Settings → Environment Variables). Uses Resend's HTTP API directly, no
// extra package needed.
//
// This is a scaffold: the app does NOT call this yet. Wire it up from
// ProfilePage/MembersPage's approve() action once you have Resend set up
// (see README "Resend" section) — call:
//   fetch("/api/send-welcome", { method: "POST", body: JSON.stringify({...}) })
// right after a member's status flips to "active".

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, name, certificatePngBase64 } = req.body || {};
  if (!email || !name) {
    res.status(400).json({ error: "email and name are required" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM || "NYISH <onboarding@resend.dev>";
  if (!apiKey) {
    res.status(500).json({ error: "RESEND_API_KEY is not configured on the server" });
    return;
  }

  const attachments = certificatePngBase64
    ? [{ filename: "NYISH_Certificate.png", content: certificatePngBase64 }]
    : [];

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: "Karibu! You're now a confirmed NYISH member",
        html: `
          <p>Hi ${name},</p>
          <p>Your registration with the Nguumo Young Investors Self Help Group
          (NYISH) has been approved — you're now an active member.</p>
          <p>Your membership certificate is attached. You can also view and
          re-download it any time from the app under <b>More → My certificate</b>.</p>
          <p>Karibu tena!</p>
        `,
        attachments,
      }),
    });

    if (!resendRes.ok) {
      const body = await resendRes.text();
      res.status(502).json({ error: "Resend rejected the request", detail: body });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown error sending email" });
  }
}
