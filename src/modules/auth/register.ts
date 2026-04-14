import { supabase } from '@/lib/supabaseClient'

export async function registerWithEmail(email: string, password: string, username?: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)

  // Guardar username en profiles si se proporcionó
  if (username && data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: email.toLowerCase(),
      username,
    })
  }

  return data
}

