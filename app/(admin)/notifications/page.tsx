'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { notifs, createWebSocket, type Notification } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Badge, Pagination, PageHeader, Skeleton, Empty, useToast, fmtDateTime } from '@/components/ui'
import { Bell, Filter, Wifi, WifiOff } from 'lucide-react'

const PAGE_SIZE = 25

const NOTIF_ICONS: Record<string, string> = {
  esso_gain: '🎉', esso_late: '⚠️', esso_payment: '💳', wallet_deposit: '💰',
  wallet_withdrawal: '📤', tironienne_reminder: '💾', tironienne_goal: '🎯',
  kyc_approved: '✅', system: '📢',
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState<{ data: { count: number; results: Notification[] }; isMock: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [liveItems, setLiveItems] = useState<Notification[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      p.set('page', String(page)); p.set('page_size', String(PAGE_SIZE))
      if (typeFilter) p.set('notification_type', typeFilter)
      if (channelFilter) p.set('channel', channelFilter)
      const result = await notifs.list(p.toString())
      setData(result as typeof data)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }, [page, typeFilter, channelFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [typeFilter, channelFilter])

  // WebSocket live
  useEffect(() => {
    if (!user) return
    try {
      const ws = createWebSocket(user.id, (data: unknown) => {
        const n = data as Notification
        setLiveItems(prev => [n, ...prev].slice(0, 10))
        toast.success(`Nouvelle notification : ${n.title}`)
      })
      wsRef.current = ws
      if (ws && ws.readyState !== undefined) {
        ws.onopen = () => setWsConnected(true)
        ws.onclose = () => setWsConnected(false)
        ws.onerror = () => setWsConnected(false)
      }
    } catch { setWsConnected(false) }
    return () => { wsRef.current?.close() }
  }, [user])

  const items = [...liveItems, ...(data?.data?.results || [])]
  const total = (data?.data?.count || 0) + liveItems.length

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Notifications"
        subtitle={`${total} notifications`}
        action={
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium
            ${wsConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-muted border border-white/10'}`}>
            {wsConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {wsConnected ? 'WebSocket connecté' : 'WebSocket déconnecté'}
          </div>
        }
      />
      {data?.isMock && <MockBanner />}

      {/* Live notifications */}
      {liveItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gold uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            En direct ({liveItems.length})
          </h3>
          <div className="space-y-2">
            {liveItems.map((n, i) => (
              <div key={i} className="glass-card px-4 py-3 flex items-center gap-3 border-l-2" style={{ borderLeftColor: 'var(--gold)' }}>
                <span className="text-lg">{NOTIF_ICONS[n.notification_type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{n.title}</p>
                  <p className="text-xs text-muted truncate">{n.body}</p>
                </div>
                <span className="badge badge-active text-xs flex-shrink-0">Nouveau</span>
              </div>
            ))}
          </div>
          <div className="divider mt-4" />
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-glass w-auto text-sm">
            <option value="">Tous les types</option>
            {Object.entries(NOTIF_ICONS).map(([k]) => (
              <option key={k} value={k}>{NOTIF_ICONS[k]} {k.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="input-glass w-auto text-sm">
          <option value="">Tous les canaux</option>
          <option value="in_app">In-app</option>
          <option value="push">Push FCM</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <div className="p-6"><Skeleton /></div> : !items.length
            ? <Empty icon={Bell} message="Aucune notification trouvée" />
            : (
              <table className="table-glass">
                <thead>
                  <tr><th>Type</th><th>Titre</th><th>Corps</th><th>Canal</th><th>Lu</th><th>Envoyé</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {items.map((n, idx) => (
                    <tr key={n.id || idx}>
                      <td>
                        <span className="text-xl">{NOTIF_ICONS[n.notification_type] || '🔔'}</span>
                      </td>
                      <td className={`text-sm font-medium ${!n.is_read ? 'text-primary' : 'text-secondary'}`}>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block mr-2 mb-0.5" />}
                        {n.title}
                      </td>
                      <td className="text-xs text-secondary max-w-xs truncate">{n.body}</td>
                      <td><span className="badge badge-draft capitalize">{n.channel}</span></td>
                      <td>
                        <span className={`badge ${n.is_read ? 'badge-verified' : 'badge-pending'}`}>
                          {n.is_read ? 'Lu' : 'Non lu'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${n.is_sent ? 'badge-verified' : 'badge-rejected'}`}>
                          {n.is_sent ? 'Envoyé' : 'Échoué'}
                        </span>
                      </td>
                      <td className="text-xs text-secondary whitespace-nowrap">{fmtDateTime(n.sent_at || n.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
        <div className="p-4"><Pagination page={page} total={data?.data?.count || 0} pageSize={PAGE_SIZE} onChange={setPage} /></div>
      </div>
    </div>
  )
}

function MockBanner() {
  return <div className="mb-4 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#ca8a04' }}>⚠️ Backend hors ligne — données de démonstration</div>
}
