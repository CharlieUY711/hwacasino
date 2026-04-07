'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

const GOLD = '#D4AF37'
const GOLD_BG = '#fef3c7'
const GOLD_TEXT = '#78350f'

// ── Types ──────────────────────────────────────────────────────────────
interface AdminStats {
  totalUsers: number
  activeNow: number
  totalNectarInPlay: number
  depositsToday: number
  depositsTodayUsd: number
  pendingDeposits: number
  houseProfitToday: number
  roundsToday: number
  webUsers: number
  telegramUsers: number
}

interface UserRow {
  id: string
  username: string
  role: string
  telegram_id: number | null
  created_at: string
  balance: number
  bet_count: number
}

interface DepositRow {
  id: string
  user_id: string
  username: string
  amount_usd: number
  nectar_amount: number
  paypal_order_id: string
  status: string
  created_at: string
}

interface InviteRow {
  id: string
  code: string
  used: boolean
  used_at: string | null
  invited_username: string | null
}

type Panel = 'overview' | 'users' | 'deposits' | 'invites' | 'transactions' | 'roulette' | 'settings'

// ── Styles helpers ─────────────────────────────────────────────────────
const card = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(212,175,55,0.15)',
  borderRadius: '12px',
  padding: '20px',
}

const metricCard = {
  background: 'rgba(212,175,55,0.05)',
  border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: '10px',
  padding: '16px 20px',
}

const badge = (color: 'green' | 'amber' | 'red' | 'blue' | 'gold') => {
  const map = {
    green: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    amber: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    red:   { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
    blue:  { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    gold:  { bg: 'rgba(212,175,55,0.15)', color: GOLD },
  }
  return {
    display: 'inline-block',
    background: map[color].bg,
    color: map[color].color,
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 500,
  }
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: '6px',
  color: 'rgba(255,255,255,0.85)',
  padding: '8px 12px',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
}

// ── Main component ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()
  const [activePanel, setActivePanel] = useState<Panel>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [deposits, setDeposits] = useState<DepositRow[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('')
  const [generating, setGenerating] = useState(false)

  // ── Auth guard: only role=admin/superadmin ─────────────────────────
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
        router.push('/lobby')
      }
    }
    checkAdmin()
  }, [router])

  // ── Load data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Unauthorized')
      const data = await res.json()
      setStats(data.stats)
      setUsers(data.users)
      setDeposits(data.deposits)
      setInvites(data.invites)
    } catch {
      router.push('/lobby')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  // ── Actions ───────────────────────────────────────────────────────
  async function generateInviteCode() {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/invites', { method: 'POST' })
      const { code } = await res.json()
      setInvites(prev => [{ id: Date.now().toString(), code, used: false, used_at: null, invited_username: null }, ...prev])
    } finally {
      setGenerating(false)
    }
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/admin/invites?id=${id}`, { method: 'DELETE' })
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  async function captureDeposit(depositId: string) {
    await fetch('/api/admin/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId, action: 'complete' }),
    })
    loadData()
  }

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(userFilter.toLowerCase())
  )

  // ── Layout ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d' }}>
      <div style={{ color: GOLD, fontFamily: 'Montserrat, sans-serif', letterSpacing: '3px', fontSize: '13px' }}>
        CARGANDO...
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0d0d', fontFamily: 'Montserrat, sans-serif', color: 'rgba(255,255,255,0.85)' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: 'rgba(255,255,255,0.02)',
        borderRight: '1px solid rgba(212,175,55,0.12)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: GOLD, letterSpacing: '4px' }}>HWA</div>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', marginTop: '2px' }}>CASINO PRIVADO</div>
          <div style={{ width: '28px', height: '1px', background: GOLD, marginTop: '8px', opacity: 0.6 }} />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {[
            { id: 'overview', label: 'Overview', icon: '\u25a0' },
            { id: 'users', label: 'Usuarios', icon: '\u25b2', badge: stats?.totalUsers },
            { id: 'deposits', label: 'Dep\u00f3sitos', icon: '\u25c6', badge: stats?.pendingDeposits || undefined },
            { id: 'invites', label: 'Invitaciones', icon: '\u2665' },
            { id: 'transactions', label: 'Transacciones', icon: '\u25a0' },
            { id: 'roulette', label: 'Ruleta Stats', icon: '\u25cb' },
            { id: 'settings', label: 'Configuraci\u00f3n', icon: '\u25a0' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id as Panel)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 20px',
                background: activePanel === item.id ? 'rgba(212,175,55,0.08)' : 'transparent',
                borderLeft: activePanel === item.id ? `2px solid ${GOLD}` : '2px solid transparent',
                border: 'none', cursor: 'pointer',
                color: activePanel === item.id ? GOLD : 'rgba(255,255,255,0.45)',
                fontSize: '13px', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '12px', width: '14px' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge ? (
                <span style={{ background: GOLD, color: '#1a0e00', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '8px' }}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#1a0e00', flexShrink: 0 }}>AD</div>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>Admin</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>superadmin</div>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{
          padding: '0 28px', height: '52px',
          borderBottom: '1px solid rgba(212,175,55,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.3)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
            {{ overview: 'Overview del Casino', users: 'Gesti\u00f3n de Usuarios', deposits: 'Dep\u00f3sitos PayPal', invites: 'C\u00f3digos VIP', transactions: 'Historial de Transacciones', roulette: 'Ruleta \u2014 Estad\u00edsticas', settings: 'Configuraci\u00f3n' }[activePanel]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
              En vivo
            </div>
            <button onClick={loadData} style={{ ...inputStyle, width: 'auto', padding: '6px 14px', cursor: 'pointer' }}>
              \u21bb Actualizar
            </button>
          </div>
        </header>

        <div style={{ padding: '24px 28px', flex: 1 }}>

          {/* ── OVERVIEW ─────────────────────────────────── */}
          {activePanel === 'overview' && stats && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <MetricCard label="NECTAR EN JUEGO" value={stats.totalNectarInPlay.toLocaleString('es-UY')} delta={`${stats.activeNow} jugadores ahora`} gold />
                <MetricCard label="USUARIOS ACTIVOS" value={stats.totalUsers.toString()} delta={`${stats.activeNow} en mesa ahora`} />
                <MetricCard label="DEP\u00d3SITOS HOY (USD)" value={`$${stats.depositsToday}`} delta={`${stats.depositsTodayUsd} operaciones`} />
                <MetricCard label="GANANCIA CASA HOY" value={stats.houseProfitToday.toLocaleString('es-UY')} delta="Nectar neto" gold />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div style={{ ...card, gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: GOLD, marginBottom: '16px' }}>Plataformas activas</div>
                  <ProgressRow label="Web (hwacasino.com)" pct={Math.round((stats.webUsers / stats.totalUsers) * 100)} count={`${stats.webUsers} usuarios`} />
                  <ProgressRow label="Telegram Bot" pct={Math.round((stats.telegramUsers / stats.totalUsers) * 100)} count={`${stats.telegramUsers} usuarios`} />
                </div>
                <div style={card}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: GOLD, marginBottom: '16px' }}>Dep\u00f3sitos pendientes</div>
                  <div style={{ fontSize: '32px', fontWeight: 500, color: stats.pendingDeposits > 0 ? '#f59e0b' : '#22c55e', marginBottom: '8px' }}>
                    {stats.pendingDeposits}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                    {stats.pendingDeposits > 0 ? 'requieren revisi\u00f3n' : 'todo al d\u00eda'}
                  </div>
                  {stats.pendingDeposits > 0 && (
                    <button onClick={() => setActivePanel('deposits')} style={{ marginTop: '12px', ...inputStyle, width: 'auto', padding: '6px 14px', cursor: 'pointer', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>
                      Ver dep\u00f3sitos \u2192
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── USERS ────────────────────────────────────── */}
          {activePanel === 'users' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <MetricCard label="USUARIOS TOTALES" value={stats?.totalUsers.toString() ?? '0'} delta="desde el inicio" />
                <MetricCard label="CON TELEGRAM" value={stats?.telegramUsers.toString() ?? '0'} delta="vinculados al bot" />
                <MetricCard label="SOLO WEB" value={stats?.webUsers.toString() ?? '0'} delta="hwacasino.com" />
              </div>

              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: GOLD }}>Todos los usuarios</div>
                  <input
                    placeholder="Buscar usuario..."
                    value={userFilter}
                    onChange={e => setUserFilter(e.target.value)}
                    style={{ ...inputStyle, width: '200px' }}
                  />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', letterSpacing: '0.8px' }}>
                      {['USUARIO', 'PLATAFORMA', 'BALANCE (NECTAR)', 'APUESTAS', 'ROL', 'DESDE'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: GOLD, fontWeight: 700 }}>
                              {(u.username || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            {u.username}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={badge(u.telegram_id ? 'gold' : 'blue')}>
                            {u.telegram_id ? 'Web+TG' : 'Web'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: GOLD, fontWeight: 500 }}>
                          {u.balance?.toLocaleString('es-UY') ?? '0'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)' }}>{u.bet_count}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={badge(u.role === 'admin' || u.role === 'superadmin' ? 'red' : 'green')}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                          {new Date(u.created_at).toLocaleDateString('es-UY', { day: '2-digit', month: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── DEPOSITS ─────────────────────────────────── */}
          {activePanel === 'deposits' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <MetricCard label="TOTAL EMITIDO (USD)" value={`$${stats?.depositsToday ?? 0}`} gold />
                <MetricCard label="PENDIENTES" value={stats?.pendingDeposits.toString() ?? '0'} delta="revisar ahora" />
                <MetricCard label="OPERACIONES HOY" value={stats?.depositsTodayUsd.toString() ?? '0'} />
                <MetricCard label="MODO PAYPAL" value="SANDBOX" delta="cambiar en settings" />
              </div>

              <div style={card}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: GOLD, marginBottom: '16px' }}>Dep\u00f3sitos recientes</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', letterSpacing: '0.8px' }}>
                      {['USUARIO', 'USD', 'NECTAR', 'ORDER ID', 'ESTADO', 'FECHA', 'ACCIONES'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{d.username}</td>
                        <td style={{ padding: '10px 12px' }}>${d.amount_usd?.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', color: GOLD, fontWeight: 500 }}>{d.nectar_amount?.toLocaleString('es-UY')}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                          {d.paypal_order_id?.substring(0, 12)}...
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={badge(d.status === 'completed' ? 'green' : d.status === 'pending' ? 'amber' : 'red')}>
                            {d.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                          {new Date(d.created_at).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {d.status === 'pending' && (
                            <button
                              onClick={() => captureDeposit(d.id)}
                              style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: '#22c55e', cursor: 'pointer' }}
                            >
                              Completar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── INVITES ───────────────────────────────────── */}
          {activePanel === 'invites' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <MetricCard label="TOTAL C\u00d3DIGOS" value={invites.length.toString()} />
                <MetricCard label="USADOS" value={invites.filter(i => i.used).length.toString()} delta="jugadores registrados" />
                <MetricCard label="DISPONIBLES" value={invites.filter(i => !i.used).length.toString()} delta="sin usar" gold />
              </div>

              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: GOLD }}>C\u00f3digos VIP</div>
                  <button
                    onClick={generateInviteCode}
                    disabled={generating}
                    style={{ padding: '8px 16px', background: GOLD, color: '#1a0e00', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {generating ? 'Generando...' : '+ Generar c\u00f3digo'}
                  </button>
                </div>

                {invites.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: '14px', color: inv.used ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)', letterSpacing: '1px' }}>{inv.code}</div>
                      <div style={{ fontSize: '10px', marginTop: '3px', color: inv.used ? 'rgba(255,255,255,0.25)' : '#22c55e' }}>
                        {inv.used ? `usado por ${inv.invited_username ?? 'desconocido'} \u2022 ${inv.used_at ? new Date(inv.used_at).toLocaleDateString('es-UY') : ''}` : 'disponible'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={badge(inv.used ? 'amber' : 'green')}>{inv.used ? 'Usado' : 'Libre'}</span>
                      {!inv.used && (
                        <>
                          <button onClick={() => navigator.clipboard.writeText(inv.code)} style={{ ...inputStyle, width: 'auto', padding: '4px 10px', cursor: 'pointer', fontSize: '11px' }}>
                            copiar
                          </button>
                          <button onClick={() => revokeInvite(inv.id)} style={{ ...inputStyle, width: 'auto', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                            revocar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ROULETTE STATS ────────────────────────────── */}
          {activePanel === 'roulette' && stats && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <MetricCard label="RONDAS HOY" value={stats.roundsToday.toString()} />
                <MetricCard label="NECTAR APOSTADO HOY" value={stats.houseProfitToday.toLocaleString('es-UY')} gold />
                <MetricCard label="GANANCIA CASA" value={stats.houseProfitToday.toLocaleString('es-UY')} gold />
                <MetricCard label="HOUSE EDGE EFECTIVO" value="4.2%" delta="te\u00f3rico 2.7%" />
              </div>
              <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>Stats detalladas de rondas disponibles aqu\u00ed</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Conectar con roulette_rounds + round_bets para historial completo</div>
              </div>
            </>
          )}

          {/* ── TRANSACTIONS ─────────────────────────────── */}
          {activePanel === 'transactions' && (
            <div style={card}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: GOLD, marginBottom: '16px' }}>Historial de transacciones</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '40px' }}>
                Conectar con tabla transactions de Supabase para historial completo.
                <br /><br />
                Columnas: id, user_id, type, amount, direction, reference_id, metadata, created_at
              </div>
            </div>
          )}

          {/* ── SETTINGS ─────────────────────────────────── */}
          {activePanel === 'settings' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={card}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: GOLD, marginBottom: '20px' }}>Configuraci\u00f3n de plataforma</div>
                {[
                  { label: 'ROUND_DURATION_SECONDS', defaultValue: '40', type: 'number' },
                  { label: 'Bono bienvenida (Nectar)', defaultValue: '1000', type: 'number' },
                  { label: 'M\u00ednimo dep\u00f3sito (USD)', defaultValue: '10', type: 'number' },
                  { label: 'M\u00e1ximo dep\u00f3sito (USD)', defaultValue: '1000', type: 'number' },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', marginBottom: '6px' }}>{f.label}</div>
                    <input type={f.type} defaultValue={f.defaultValue} style={inputStyle} />
                  </div>
                ))}
                <button style={{ width: '100%', padding: '10px', background: GOLD, color: '#1a0e00', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'Montserrat, sans-serif', marginTop: '8px' }}>
                  Guardar cambios
                </button>
              </div>

              <div style={card}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: GOLD, marginBottom: '20px' }}>Estado del sistema</div>
                {[
                  { label: 'Supabase DB', status: 'Conectado', color: 'green' as const },
                  { label: 'Realtime Presence', status: 'Activo', color: 'green' as const },
                  { label: 'PayPal API', status: 'Sandbox', color: 'amber' as const },
                  { label: 'Telegram Bot', status: 'Running', color: 'green' as const },
                  { label: 'Vercel Deploy', status: 'OK', color: 'green' as const },
                  { label: 'Retiros', status: 'No implementado', color: 'red' as const },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                    <span style={badge(s.color)}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────
function MetricCard({ label, value, delta, gold }: { label: string; value: string; delta?: string; gold?: boolean }) {
  return (
    <div style={{
      background: gold ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${gold ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '10px', padding: '16px 18px',
    }}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 500, color: gold ? GOLD : 'rgba(255,255,255,0.85)', lineHeight: 1 }}>{value}</div>
      {delta && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>{delta}</div>}
    </div>
  )
}

function ProgressRow({ label, pct, count }: { label: string; pct: number; count: string }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
        <span style={{ color: 'rgba(255,255,255,0.35)' }}>{count}</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: GOLD, borderRadius: '2px' }} />
      </div>
    </div>
  )
}

