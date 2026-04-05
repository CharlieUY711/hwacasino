'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LobbyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/')
        return
      }
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', session.user.id)
        .single()

      setBalance(wallet?.balance ?? 0)
      setLoading(false)
    }
    checkSession()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) return (
    <main style={{ minHeight: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.3em', fontSize: '0.7rem' }}>CARGANDO...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
      <h1 style={{ color: '#D4AF37', fontFamily: 'Montserrat, sans-serif', fontWeight: 200, letterSpacing: '0.5em', fontSize: '1.2rem' }}>
        LOBBY
      </h1>
      {balance !== null && (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat, sans-serif', fontWeight: 300, letterSpacing: '0.3em', fontSize: '0.7rem' }}>
          BALANCE: <span style={{ color: '#D4AF37' }}>{balance}</span> CHIPS
        </p>
      )}
      <button
        onClick={handleLogout}
        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', fontFamily: 'Montserrat, sans-serif', fontWeight: 300, fontSize: '0.6rem', letterSpacing: '0.3em', cursor: 'pointer', textTransform: 'uppercase' }}>
        SALIR
      </button>
    </main>
  )
}
