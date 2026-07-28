import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getMemberProfile(userId) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

export async function uploadPhoto(file, userId) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const { error: upError } = await supabase.storage
    .from('member-photos')
    .upload(fileName, file, { upsert: true })
  if (upError) throw upError
  const { data: { publicUrl } } = supabase.storage
    .from('member-photos')
    .getPublicUrl(fileName)
  return publicUrl
}
