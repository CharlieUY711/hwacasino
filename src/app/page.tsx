'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmail } from '@/modules/auth/login'
import { registerWithEmail } from '@/modules/auth/register'
import { validateInviteCode, markInviteUsed } from '@/modules/auth/invite'

const GOLD = '#D4AF37'
const DARK = '#0a0a0a'

type Step = 'code' | 'welcome' | 'register' | 'login'

export default function Home() {
  const router = useRouter()
  const [step, setStep]           = useState<Step>('code')
  const [code, setCode]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [username, setUsername]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [inviteId, setInviteId]   = useState<string|null>(null)
  const [reward, setReward]       = useState(0)
  const [bonusLabel, setBonusLabel] = useState('')

  async function handleVerify() {
    if (!code.trim()) { setError('Ingresá tu código'); return }
    setLoading(true); setError('')
    try {
      const result = await validateInviteCode(code.trim().toUpperCase())
      if (!result.valid) { setError('Código inválido o ya utilizado'); setLoading(false); return }
      
      // Obtener bonus_label
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { data } = await sb.from('invites').select('bonus_label, reward_value').eq('id', result.id!).single()
      
      setInviteId(result.id)
      setReward(result.reward_value)
      setBonusLabel(data?.bonus_label || `¡Tu código te da ${result.reward_value.toLocaleString('es-UY')} Chips de bienvenida!`)
      setStep('welcome')
    } catch { setError('Error al verificar. Intentá de nuevo.') }
    setLoading(false)
  }

  async function handleLogin() {
    if (!email.trim() || !password) { setError('Completá todos los campos'); return }
    setLoading(true); setError('')
    try {
      await loginWithEmail(email, password)
      router.push('/roulette/play?room=vip-1')
    } catch { setError('Email o contraseña incorrectos') }
    setLoading(false)
  }

  async function handleRegister() {
    if (!email.trim() || !username.trim() || !password) { setError('Completá todos los campos'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true); setError('')
    try {
      const regData = await registerWithEmail(email, password, username)
      if (inviteId && regData.user) {
        await markInviteUsed(inviteId, regData.user.id, reward)
      }
      router.push('/roulette/play?room=vip-1')
    } catch (e: any) { setError(e?.message ?? 'Error al registrar') }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 8, color: '#fff',
    fontSize: '0.95rem', fontFamily: 'Inter, sans-serif',
    outline: 'none', boxSizing: 'border-box',
  }

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '14px',
    background: loading ? 'rgba(80,60,0,0.3)' : 'linear-gradient(180deg,#f5d060 0%,#d4af37 50%,#a07820 100%)',
    border: 'none',
    borderBottom: loading ? '1px solid rgba(212,175,55,0.2)' : '3px solid #7a5a10',
    borderRadius: 8, color: loading ? 'rgba(212,175,55,0.4)' : '#1a0e00',
    fontSize: '0.85rem', fontFamily: 'Inter, sans-serif',
    fontWeight: 700, letterSpacing: '0.1em',
    cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
  }

  const linkStyle: React.CSSProperties = {
    background: 'none', border: 'none',
    color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem',
    cursor: 'pointer', textAlign: 'center', width: '100%',
  }

  return (
    <div style={{ minHeight: '100dvh', background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <img src="/logo-dorado.jpg" alt="HWA" style={{ height: 128, width: 'auto', borderRadius: 14 }} />
        <div style={{ marginTop: 12, fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em' }}>PRIVATE MEMBERS ONLY</div>
      </div>

      <div style={{ width: '100%', maxWidth: 380, background: '#111', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── CÓDIGO ── */}
        {step === 'code' && (<>
          <div>
            <div style={{ fontSize: '1rem', color: GOLD, fontWeight: 600, marginBottom: 4 }}>Código de acceso</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Ingresá tu código de invitación</div>
          </div>
          <input style={inputStyle} placeholder="VIP-XXXX-XXXX-XXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" spellCheck={false} />
          {error && <div style={{ fontSize: '0.75rem', color: '#f87171', textAlign: 'center' }}>{error}</div>}
          <button style={btnStyle} onClick={handleVerify} disabled={loading}>{loading ? 'Verificando...' : 'VERIFICAR'}</button>
          <button style={linkStyle} onClick={() => { setStep('login'); setError('') }}>Ya tengo cuenta → Ingresar</button>
        </>)}

        {/* ── BIENVENIDA ── */}
        {step === 'welcome' && (<>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎰</div>
            <div style={{ fontSize: '1rem', color: GOLD, fontWeight: 600, marginBottom: 8 }}>¡Código válido!</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{bonusLabel}</div>
          </div>
          <button style={btnStyle} onClick={() => { setStep('register'); setError('') }}>CREAR MI CUENTA</button>
          <button style={linkStyle} onClick={() => { setStep('code'); setError('') }}>← Volver</button>
        </>)}

        {/* ── REGISTRO ── */}
        {step === 'register' && (<>
          <div>
            <div style={{ fontSize: '1rem', color: GOLD, fontWeight: 600, marginBottom: 4 }}>Crear cuenta</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Código: {code}</div>
          </div>
          <input style={inputStyle} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <input style={inputStyle} placeholder="Nombre de usuario" value={username} onChange={e => setUsername(e.target.value)} autoCapitalize="none" spellCheck={false} />
          <div style={{ position: 'relative' }}>
            <input style={{...inputStyle, paddingRight: '44px'}} placeholder="Contraseña" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} autoComplete="new-password" />
            <button onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '1rem', padding: 0 }}>{showPass ? '🙈' : '👁'}</button>
          </div>
          {error && <div style={{ fontSize: '0.75rem', color: '#f87171', textAlign: 'center' }}>{error}</div>}
          <button style={btnStyle} onClick={handleRegister} disabled={loading}>{loading ? 'Creando cuenta...' : 'REGISTRARME'}</button>
          <button style={linkStyle} onClick={() => { setStep('welcome'); setError('') }}>← Volver</button>
        </>)}

        {/* ── LOGIN ── */}
        {step === 'login' && (<>
          <div>
            <div style={{ fontSize: '1rem', color: GOLD, fontWeight: 600, marginBottom: 4 }}>Ingresar</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Bienvenido de vuelta</div>
          </div>
          <input style={inputStyle} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <div style={{ position: 'relative' }}>
            <input style={{...inputStyle, paddingRight: '44px'}} placeholder="Contraseña" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="current-password" />
            <button onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '1rem', padding: 0 }}>{showPass ? '🙈' : '👁'}</button>
          </div>
          {error && <div style={{ fontSize: '0.75rem', color: '#f87171', textAlign: 'center' }}>{error}</div>}
          <button style={btnStyle} onClick={handleLogin} disabled={loading}>{loading ? 'Ingresando...' : 'INGRESAR'}</button>
          <button style={linkStyle} onClick={() => { setStep('code'); setError('') }}>← Volver</button>
        </>)}

      </div>

      <div style={{ marginTop: 24, fontSize: '0.6rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em', textAlign: 'center' }}>HWA CASINO · ACCESO RESTRINGIDO</div>
    </div>
  )
}
