import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const getPublicUrl = (bucket, path) => {
  if (!path) return null
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
