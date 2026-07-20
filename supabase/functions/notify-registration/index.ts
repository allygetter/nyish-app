// supabase/functions/notify-registration/index.ts
//
// Deploy with:
//   supabase functions deploy notify-registration
//
// Sends two emails using Resend (https://resend.com — free tier is plenty
// for a small self-help group). Swap the fetch call for SendGrid/Mailgun/etc.
// if you'd rather use a different provider; the request shape is the only
// thing that would change.
//
// Requires these secrets:
//   RESEND_API_KEY   from your Resend account
//   RESEND_FROM      a sender address on a domain verified with Resend,
//                    e.g. "NYISH <no-reply@nguumoyoung.org>"
//
// supabase secrets set RESEND_API_KEY=re_xxx
// supabase secrets set RESEND_FROM="NYISH <no-reply@yourdomain.org>"

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

async function sendEmail(apiKey: string, from: string, to: string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend error (${res.status}): ${await res.text()}`);
  }
}

function memberThankYouEmail(name: string) {
  return {
    subject: "Welcome to NYISH — your registration is in! 🌱",
    html: `
      <p>Hi ${name},</p>
      <p>Thank you for registering with <strong>Nguumo Young Investors Self Help Group (NYISH)</strong>.
      We're glad to have you with us as we grow together, one contribution at a time.</p>
      <p>Here's what happens next:</p>
      <ul>
        <li>Your registration has been received and is <strong>pending approval</strong> by our officials.</li>
        <li>Once approved, you'll be able to sign in with your phone number and password to start
        saving, requesting loans, and staying up to date with group meetings and announcements.</li>
        <li>You can download a copy of our constitution anytime from inside the app.</li>
      </ul>
      <p>If you have any questions in the meantime, please reach out to any of our officials.</p>
      <p><em>Karibu NYISH — welcome aboard!</em></p>
      <p>Warm regards,<br/>NYISH Officials<br/>Nguumo Young Investors Self Help Group</p>
    `,
  };
}

function officialAlertEmail(name: string, phone: string, email: string) {
  return {
    subject: `New NYISH member awaiting approval: ${name}`,
    html: `
      <p>A new member has registered and is awaiting your approval:</p>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Phone:</strong> ${phone}</li>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
      <p>Sign in to the NYISH app → Members &amp; approvals to review and approve them.</p>
    `,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { member, officialEmails } = await req.json();
    if (!member?.email || !member?.name) {
      return json({ error: "member.name and member.email are required" }, 400);
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM");
    if (!apiKey || !from) {
      return json({ error: "Email sending isn't configured on the server (missing RESEND_API_KEY/RESEND_FROM)." }, 500);
    }

    const results = { memberEmail: "skipped", officialEmails: "skipped" };

    const thankYou = memberThankYouEmail(member.name);
    await sendEmail(apiKey, from, [member.email], thankYou.subject, thankYou.html);
    results.memberEmail = "sent";

    if (Array.isArray(officialEmails) && officialEmails.length > 0) {
      const alert = officialAlertEmail(member.name, member.phone || "", member.email);
      await sendEmail(apiKey, from, officialEmails, alert.subject, alert.html);
      results.officialEmails = "sent";
    }

    return json({ ok: true, ...results });
  } catch (err) {
    // Registration itself already succeeded by the time this runs — email
    // failures are logged but shouldn't be treated as fatal by the caller.
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
