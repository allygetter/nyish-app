// Vercel serverless function — Send SMS / Email notifications
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { to, message, channel = 'sms' } = req.body

  // TODO: Integrate with Africa's Talking (SMS) or SendGrid (Email)
  // Example Africa's Talking:
  // const credentials = { apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME }
  // const AfricasTalking = require('africastalking')(credentials)
  // const sms = AfricasTalking.SMS
  // await sms.send({ to, message })

  console.log(`[${channel.toUpperCase()}] to ${to}: ${message}`)
  res.status(200).json({ sent: true, channel, to, message })
}
