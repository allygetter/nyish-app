// POST /api/send-denial
// Body: { email, name }
// Uses the same Resend setup as /api/send-welcome.js — see PROGRESS.md
// "Enabling the welcome email" for the required env vars.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, name } = req.body || {};
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
        subject: "Update on your NYISH registration",
        html: `
          <p>Hi ${name},</p>
          <p>Thank you for your interest in joining the Nguumo Young
          Investors Self Help Group (NYISH). After review, we're not able
          to approve your registration at this time.</p>
          <p>If you believe this was a mistake, or would like to know more,
          please reach out to one of the group's officials directly.</p>
        `,
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
