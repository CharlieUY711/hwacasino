$base = "C:\Carlos\HWA\hwacasino"

Set-Content "$base\src\app\page.tsx" -Encoding UTF8 -Value @'
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmail } from '@/modules/auth/login'
import { registerWithEmail } from '@/modules/auth/register'
import { validateInviteCode, markInviteUsed } from '@/modules/auth/invite'

const TEMPLATE = 'VIP-0000-AAAA-0A0A'
const SLOT_TYPES: Array<'fixed' | 'digit' | 'alpha' | 'dash'> = [
  'fixed','fixed','fixed',
  'dash',
  'digit','digit','digit','digit',
  'dash',
  'alpha','alpha','alpha','alpha',
  'dash',
  'digit','alpha','digit','alpha',
]

const EDITABLE_INDICES = SLOT_TYPES
  .map((t, i) => (t !== 'fixed' && t !== 'dash' ? i : -1))
  .filter(i => i >= 0)

const GOLD = '#D4AF37'

export default function Home() {
  const router = useRouter()
  const [chars, setChars] = useState<string[]>(Array(TEMPLATE.length).fill(''))
  const [shake, setShake] = useState(false)
  const [submitted, setSubmitted] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [validating, setValidating] = useState(false)
  const [inviteId, setInviteId] = useState<string | null>(null)
  const [focusedIdx, setFocusedIdx] = useState<number>(-1)

  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [showRegister, setShowRegister] = useState(false)
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regError, setRegError] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  async function handleLogin() {
    setLoginError(null)
    if (!loginEmail || !loginPassword) { setLoginError('Completa todos los campos.'); return }
    setLoginLoading(true)
    try {
      await loginWithEmail(loginEmail, loginPassword)
      router.push('/lobby')
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Error inesperado.')
    } finally { setLoginLoading(false) }
  }

  async function handleRegister() {
    setRegError(null)
    if (!regEmail || !regPassword || !regConfirm) { setRegError('Completa todos los campos.'); return }
    if (regPassword !== regConfirm) { setRegError('Las contraseñas no coinciden.'); return }
    if (regPassword.length < 6) { setRegError('Minimo 6 caracteres.'); return }
    setRegLoading(true)
    try {
      await registerWithEmail(regEmail, regPassword)
      if (inviteId) await markInviteUsed(inviteId)
      router.push('/lobby')
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Error inesperado.')
    } finally { setRegLoading(false) }
  }

  const handleValidate = useCallback(async () => {
    const allFilled = EDITABLE_INDICES.every(i => chars[i] !== '')
    if (!allFilled || validating || submitted === 'success') return
    const entered = TEMPLATE.split('').map((ch, i) => {
      if (SLOT_TYPES[i] === 'fixed') return ch
      if (SLOT_TYPES[i] === 'dash') return '-'
      return chars[i] || '_'
    }).join('')
    setValidating(true)
    setStatusMsg('VERIFICANDO...')
    const result = await validateInviteCode(entered)
    if (result.valid) {
      setInviteId(result.id)
      setSubmitted('success')
      setStatusMsg('CODIGO VALIDO')
      setShowRegister(true)
      setShowLogin(false)
    } else {
      setSubmitted('error')
      setStatusMsg('CODIGO INVALIDO')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
    setValidating(false)
  }, [chars, validating, submitted])

  function handleSlotKey(e: React.KeyboardEvent<HTMLInputElement>, editIdx: number) {
    const realIdx = EDITABLE_INDICES[editIdx]
    e.preventDefault()

    if (e.key === 'Enter') { handleValidate(); return }

    if (e.key === 'Backspace') {
      setSubmitted('idle'); setStatusMsg(''); setShowRegister(false); setInviteId(null)
      setChars(prev => {
        const next = [...prev]
        if (prev[realIdx] !== '') {
          next[realIdx] = ''
        } else if (editIdx > 0) {
          const prevReal = EDITABLE_INDICES[editIdx - 1]
          next[prevReal] = ''
          setTimeout(() => {
            const el = document.getElementById(`slot-${editIdx - 1}`)
            el?.focus()
          }, 0)
        }
        return next
      })
      return
    }

    if (e.key === 'ArrowLeft' && editIdx > 0) {
      document.getElementById(`slot-${editIdx - 1}`)?.focus(); return
    }
    if (e.key === 'ArrowRight' && editIdx < EDITABLE_INDICES.length - 1) {
      document.getElementById(`slot-${editIdx + 1}`)?.focus(); return
    }

    const char = e.key.toUpperCase()
    if (char.length !== 1) return
    if (!/^[A-Za-z0-9]$/.test(char)) return

    const slotType = SLOT_TYPES[realIdx]
    const isDigit = slotType === 'digit' && /^[0-9]$/.test(char)
    const isAlpha = slotType === 'alpha' && /^[A-Za-z]$/.test(char)

    if (isDigit || isAlpha) {
      setSubmitted('idle'); setStatusMsg(''); setShowRegister(false); setInviteId(null)
      setChars(prev => { const n = [...prev]; n[realIdx] = char; return n })
      if (editIdx < EDITABLE_INDICES.length - 1) {
        setTimeout(() => document.getElementById(`slot-${editIdx + 1}`)?.focus(), 0)
      }
    }
  }

  function slotColor(realIdx: number): string {
    const type = SLOT_TYPES[realIdx]
    if (type === 'dash') return 'rgba(255,255,255,0.10)'
    if (submitted === 'success') return GOLD
    if (submitted === 'error') return '#e05252'
    if (type === 'fixed') return 'rgba(255,255,255,0.85)'
    return chars[realIdx] !== '' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)'
  }

  const allFilled = EDITABLE_INDICES.every(i => chars[i] !== '')

  const fieldStyle: React.CSSProperties = {
    width: '100%', height: '38px',
    background: 'rgba(255,255,255,0.09)',
    border: 'none', borderRadius: '2px',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 300, fontSize: '0.75rem', letterSpacing: '0.1em',
    padding: '0 12px', outline: 'none', boxSizing: 'border-box' as const,
  }

  const whiteBtnStyle: React.CSSProperties = {
    width: '100%', height: '38px',
    background: 'rgba(255,255,255,0.90)',
    border: 'none', borderRadius: '2px',
    color: '#000',
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.35em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    transition: 'background 0.25s ease',
    boxSizing: 'border-box' as const,
  }

  const goldLinkStyle: React.CSSProperties = {
    background: 'transparent', border: 'none', boxShadow: 'none', padding: '0',
    fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.93rem',
    letterSpacing: '0.35em', color: GOLD, textTransform: 'uppercase' as const,
    cursor: 'pointer', outline: 'none', transition: 'opacity 0.25s ease',
  }

  const diamonds: { letter: string; fontSize: number }[] = [
    { letter: 'S', fontSize: 10 }, { letter: 'O', fontSize: 8 },
    { letter: 'F', fontSize: 9 },  { letter: 'I', fontSize: 9 },
  ]

  // Construir los grupos de slots separados por puntos dorados
  const groups: number[][] = [[], [], [], []]
  let gIdx = 0
  EDITABLE_INDICES.forEach((realIdx) => {
    if (SLOT_TYPES[realIdx] === 'digit' && gIdx === 0 && groups[0].length === 4) gIdx++
    groups[gIdx].push(realIdx)
    if (groups[gIdx].length === 4 && gIdx < 3) gIdx++
  })

  let editCounter = 0

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', position: 'relative', cursor: 'default' }}>

      <div className="corner-ornament tl animate-fade-in delay-1200" />
      <div className="corner-ornament tr animate-fade-in delay-1200" />
      <div className="corner-ornament bl animate-fade-in delay-1200" />
      <div className="corner-ornament br animate-fade-in delay-1200" />
      <div style={{ position: 'absolute', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ─── CONTENIDO PRINCIPAL (se funde cuando login abierto) ─── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '100%', maxWidth: '480px', padding: '0 24px',
        position: 'absolute', zIndex: 10,
        opacity: showLogin ? 0 : 1,
        pointerEvents: showLogin ? 'none' : 'auto',
        transition: 'opacity 0.4s ease',
      }}>

        <div className="animate-fade-in delay-200" style={{ marginBottom: '28px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          {diamonds.map(({ letter, fontSize }, i) => (
            <svg key={i} width="20" height="20" viewBox="0 0 20 20" fill="none">
              <polygon points="10,1 19,10 10,19 1,10" fill={GOLD} opacity="0.7" />
              <text x="10" y="10" textAnchor="middle" dominantBaseline="central"
                fontFamily="'Montserrat', sans-serif" fontSize={fontSize} fontWeight="700"
                fill="rgba(255,255,255,0.5)">
                {letter}
              </text>
            </svg>
          ))}
        </div>

        <h1 className="animate-fade-in-up delay-200 gold-shimmer" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 'clamp(1.7rem, 6vw, 2.2rem)', letterSpacing: '0.55em', marginBottom: '6px', whiteSpace: 'nowrap' }}>
          HWA CASINO
        </h1>
        <p className="animate-fade-in-up delay-400" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '0.6rem', letterSpacing: '0.55em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '52px' }}>
          Private Members Only
        </p>
        <div className="line-expand" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)', marginBottom: '52px', alignSelf: 'stretch' }} />
        <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '0.58rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '30px' }}>
          VIP CODE
        </p>

        {/* ─── SLOTS con puntos dorados ─── */}
        <div className={shake ? 'error-shake' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0px', marginBottom: '32px', userSelect: 'none', width: '88%', maxWidth: '340px' }}>
          {TEMPLATE.split('').map((_, realIdx) => {
            const type = SLOT_TYPES[realIdx]
            const color = slotColor(realIdx)

            if (type === 'dash') {
              return (
                <span key={realIdx} style={{ color: GOLD, fontSize: '6px', margin: '0 4px', lineHeight: 1, paddingBottom: '2px' }}>●</span>
              )
            }

            const isEditable = type !== 'fixed'
            const editIdx = isEditable ? editCounter++ : -1
            const displayChar = type === 'fixed' ? TEMPLATE[realIdx] : (chars[realIdx] || '')

            return (
              <span key={realIdx} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', flex: '1 1 0', maxWidth: '22px', position: 'relative' }}>
                {isEditable ? (
                  <input
                    id={`slot-${editIdx}`}
                    maxLength={1}
                    value={chars[realIdx]}
                    onKeyDown={e => handleSlotKey(e, editIdx)}
                    onChange={() => {}}
                    onFocus={() => setFocusedIdx(editIdx)}
                    onBlur={() => setFocusedIdx(-1)}
                    style={{
                      width: '100%', height: '1.43rem',
                      background: 'transparent', border: 'none', outline: 'none',
                      textAlign: 'center', caretColor: 'transparent',
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 300, fontSize: '1.1rem',
                      color: displayChar ? color : 'transparent',
                      padding: 0, margin: 0,
                    }}
                  />
                ) : (
                  <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400, fontSize: '1.1rem', color, lineHeight: 1.3, minHeight: '1.43rem', textAlign: 'center', display: 'block', width: '100%' }}>
                    {displayChar}
                  </span>
                )}
                <span style={{ display: 'block', width: '100%', height: '1px', marginTop: '3px', background: focusedIdx === editIdx ? GOLD : color, transition: 'background 0.2s ease' }} />
              </span>
            )
          })}
        </div>

        {/* STATUS */}
        <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300, fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', height: '20px', marginBottom: '24px', color: submitted === 'success' ? GOLD : submitted === 'error' ? '#e05252' : validating ? 'rgba(255,255,255,0.3)' : 'transparent', transition: 'color 0.3s ease' }}>
          {statusMsg}
        </div>

        {/* VALIDATE / RESET */}
        <div style={{ marginBottom: '32px' }}>
          {submitted === 'error' ? (
            <button onClick={() => { setChars(Array(TEMPLATE.length).fill('')); setSubmitted('idle'); setStatusMsg(''); setShowRegister(false); setInviteId(null) }}
              style={{ ...goldLinkStyle, color: '#e05252' }}>
              RESET CODE
            </button>
          ) : (
            <button onClick={handleValidate} disabled={!allFilled || submitted === 'success' || validating}
              style={{ ...goldLinkStyle, opacity: allFilled && submitted !== 'success' && !validating ? 1 : 0.3 }}>
              {validating ? '...' : 'VALIDAR'}
            </button>
          )}
        </div>

        {/* REGISTER */}
        <div style={{ display: 'grid', gridTemplateRows: showRegister ? '1fr' : '0fr', transition: 'grid-template-rows 0.35s ease', width: '88%', maxWidth: '340px' }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '24px' }}>
              <input type="email" placeholder="CORREO" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={fieldStyle} />
              <input type="password" placeholder="CONTRASENA" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={fieldStyle} />
              <input type="password" placeholder="CONFIRMAR CONTRASENA" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRegister() }} style={fieldStyle} />
              <button onClick={handleRegister} disabled={regLoading}
                style={{ ...whiteBtnStyle, background: regLoading ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.90)', cursor: regLoading ? 'not-allowed' : 'pointer' }}>
                {regLoading ? '...' : 'REGISTRAR'}
              </button>
              {regError && <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: '#e05252', textAlign: 'center', margin: '4px 0 0' }}>{regError}</p>}
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />

        {/* LOGIN TRIGGER */}
        <button style={goldLinkStyle} onClick={() => { setShowLogin(true); setShowRegister(false) }}>
          LOGIN
        </button>

      </div>

      {/* ─── LOGIN PANEL (aparece centrado cuando showLogin) ─── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '100%', maxWidth: '340px', padding: '0 24px',
        position: 'absolute', zIndex: 20,
        opacity: showLogin ? 1 : 0,
        pointerEvents: showLogin ? 'auto' : 'none',
        transition: 'opacity 0.4s ease',
      }}>

        <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '0.58rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '24px' }}>
          ACCESO MIEMBROS
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <input type="email" placeholder="EMAIL" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={fieldStyle} />
          <input type="password" placeholder="PASSWORD" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleLogin() }} style={fieldStyle} />
          <button onClick={handleLogin} disabled={loginLoading}
            style={{ ...whiteBtnStyle, background: loginLoading ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.90)', cursor: loginLoading ? 'not-allowed' : 'pointer' }}>
            {loginLoading ? '...' : 'INGRESAR'}
          </button>
          {loginError && <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: '#e05252', textAlign: 'center', margin: '4px 0 0' }}>{loginError}</p>}
        </div>

        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)', margin: '24px 0' }} />

        <button onClick={() => setShowLogin(false)} style={{ ...goldLinkStyle, fontSize: '0.7rem', opacity: 0.5 }}>
          ← VOLVER
        </button>

      </div>

    </main>
  )
}
'@

Write-Host "Listo. Corre: npm run dev" -ForegroundColor Green
