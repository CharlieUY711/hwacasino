import { supabase } from '@/lib/supabaseClient'

export async function registerWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  return data
}
