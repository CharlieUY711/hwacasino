'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmail } from '@/modules/auth/login'
import { registerWithEmail } from '@/modules/auth/register'
import { validateInviteCode, markInviteUsed } from '@/modules/auth/invite'

const GOLD = '#D4AF37'
const DARK = '#0a0a0a'

type Step = 'code' | 'login' | 'register'

export default function Home() {
  const router = useRouter()
  const [step, setStep]         = useState<Step>('code')
  const [code, setCode]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass]   = useState(false)

  async function handleCode() {
    if (!email.trim()) { setError('Ingresá tu email'); return }
    setLoading(true); setError('')
    try {
      // Sin codigo — login directo
      if (!code.trim()) {
        setStep('login')
        setLoading(false)
        return
      }
      // Con codigo — validar y decidir login o registro
      const valid = await validateInviteCode(code.trim().toUpperCase())
      if (!valid) { setError('Código inválido o ya utilizado'); setLoading(false); return }
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const { exists } = await res.json()
      setStep(exists ? 'login' : 'register')
    } catch { setError('Error al validar. Intentá de nuevo.') }
    setLoading(false)
  }

  async function handleLogin() {
    if (!password) { setError('Ingresá tu contraseña'); return }
    setLoading(true); setError('')
    try {
      await loginWithEmail(email, password)
      router.push('/roulette')
    } catch { setError('Email o contraseña incorrectos') }
    setLoading(false)
  }

  async function handleRegister() {
    if (!username || !password) { setError('Completá todos los campos'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true); setError('')
    try {
      const regData = await registerWithEmail(email, password, username)
      const inviteResult = await validateInviteCode(code.trim().toUpperCase())
      if (inviteResult.id && regData.user) {
        await markInviteUsed(inviteResult.id, regData.user.id)
      }
      router.push('/roulette')
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

  return (
    <div style={{ minHeight: '100dvh', background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <img src="/logo-dorado.jpg" alt="HWA" style={{ height: 256, width: 'auto', borderRadius: 16 }} />
        <div style={{ marginTop: 12, fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em' }}>PRIVATE MEMBERS ONLY</div>
      </div>

      <div style={{ width: '100%', maxWidth: 380, background: '#111', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {step === 'code' && (<>
          <div><div style={{ fontSize: '1rem', color: GOLD, fontWeight: 600, marginBottom: 4 }}>Acceso</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Ingresá tu código de invitación y email</div></div>
          <input style={inputStyle} placeholder="Código de invitación" value={code} onChange={e => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" spellCheck={false} />
          <input style={inputStyle} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          {error && <div style={{ fontSize: '0.75rem', color: '#f87171', textAlign: 'center' }}>{error}</div>}
          <button style={btnStyle} onClick={handleCode} disabled={loading}>{loading ? 'Validando...' : 'CONTINUAR'}</button>
        </>)}

        {step === 'login' && (<>
          <div><div style={{ fontSize: '1rem', color: GOLD, fontWeight: 600, marginBottom: 4 }}>Bienvenido de vuelta</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{email}</div></div>
          <div style={{ position: 'relative' }}>
            <input style={{...inputStyle, paddingRight: '44px'}} placeholder="Contraseña" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="current-password" />
            <button onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '1rem', padding: 0 }}>{showPass ? '🙈' : '👁'}</button>
          </div>
          {error && <div style={{ fontSize: '0.75rem', color: '#f87171', textAlign: 'center' }}>{error}</div>}
          <button style={btnStyle} onClick={handleLogin} disabled={loading}>{loading ? 'Ingresando...' : 'INGRESAR'}</button>
          <button onClick={() => { setStep('code'); setError(''); setPassword('') }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'center' }}>← Volver</button>
        </>)}

        {step === 'register' && (<>
          <div><div style={{ fontSize: '1rem', color: GOLD, fontWeight: 600, marginBottom: 4 }}>Crear cuenta</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{email}</div></div>
          <input style={inputStyle} placeholder="Nombre de usuario" value={username} onChange={e => setUsername(e.target.value)} autoCapitalize="none" spellCheck={false} />
          <div style={{ position: 'relative' }}>
            <input style={{...inputStyle, paddingRight: '44px'}} placeholder="Contraseña" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} autoComplete="new-password" />
            <button onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '1rem', padding: 0 }}>{showPass ? '🙈' : '👁'}</button>
          </div>
          {error && <div style={{ fontSize: '0.75rem', color: '#f87171', textAlign: 'center' }}>{error}</div>}
          <button style={btnStyle} onClick={handleRegister} disabled={loading}>{loading ? 'Creando cuenta...' : 'CREAR CUENTA'}</button>
          <button onClick={() => { setStep('code'); setError(''); setPassword(''); setUsername('') }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'center' }}>← Volver</button>
        </>)}

      </div>

      <div style={{ marginTop: 24, fontSize: '0.6rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em', textAlign: 'center' }}>HWA CASINO · ACCESO RESTRINGIDO</div>
    </div>
  )
}
