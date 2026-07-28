// Vercel serverless function — M-Pesa callback
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { Body: { stkCallback } } = req.body
  console.log('M-Pesa callback:', JSON.stringify(stkCallback, null, 2))

  if (stkCallback.ResultCode === 0) {
    const meta = stkCallback.CallbackMetadata?.Item || []
    const amount = meta.find(i => i.Name === 'Amount')?.Value
    const phone = meta.find(i => i.Name === 'PhoneNumber')?.Value
    const receipt = meta.find(i => i.Name === 'MpesaReceiptNumber')?.Value

    // TODO: lookup member by phone, insert savings record
    // await supabase.from('savings').insert({ member_id: '...', amount, source: 'mpesa', note: `Receipt: ${receipt}` })
  }

  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
