'use client'
import { useEffect, useState } from 'react'
import { monitoring, type LogEntry } from '@/lib/api'
import { PageHeader, useToast, fmtDateTime } from '@/components/ui'
import { Activity, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'

const COLLECTIONS = [
  { key: 'auth_logins',      label: '🔑 Connexions', color: 'text-green-400' },
  { key: 'auth_failures',    label: '🚫 Échecs auth', color: 'text-red-400' },
  { key: 'esso_actions',     label: '🔄 Actions ESSO', color: 'text-blue-400' },
  { key: 'esso_draws',       label: '🎰 Tirages ESSO', color: 'text-gold' },
  { key: 'kyc_submissions',  label: '📤 Soumissions KYC', color: 'text-purple-400' },
  { key: 'kyc_reviews',      label: '✅ Révisions KYC', color: 'text-teal-400' },
  { key: 'admin_actions',    label: '🛡️ Actions admin', color: 'text-orange-400' },
]

export default function MonitoringPage() {
  const toast = useToast()
  const [active, setActive] = useState('auth_logins')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [limit, setLimit] = useState(50)

  const load = async (collection: string, lim = limit) => {
    setLoading(true); setExpanded(null)
    try {
      const result = await monitoring.logs(collection, lim)
      setLogs(result.data.logs)
      setIsMock(result.isMock)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(active) }, [active, limit])

  const activeCol = COLLECTIONS.find(c => c.key === active)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Monitoring & Logs"
        subtitle="Audit trail — toutes les actions critiques de la plateforme"
        action={
          <button onClick={() => load(active)} disabled={loading}
            className="btn-glass flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        }
      />
      {isMock && (
        <div className="mb-4 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#ca8a04' }}>
          ⚠️ Backend hors ligne — données de démonstration
        </div>
      )}

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar collections */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="glass-card p-2 space-y-1">
            {COLLECTIONS.map(col => (
              <button key={col.key} onClick={() => setActive(col.key)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2
                  ${active === col.key
                    ? 'bg-gradient-to-r from-gold/20 to-gold/5 text-gold border border-gold/20'
                    : 'text-secondary hover:bg-white/5 hover:text-primary'}`}>
                <span className="text-base leading-none">{col.label.split(' ')[0]}</span>
                <span className="truncate">{col.label.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>

          {/* Limit selector */}
          <div className="glass-card p-3 mt-3">
            <p className="text-xs text-muted mb-2 uppercase tracking-wide">Nombre de logs</p>
            {[25, 50, 100, 200].map(n => (
              <button key={n} onClick={() => setLimit(n)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-sm mb-1 transition-all
                  ${limit === n ? 'text-gold font-semibold' : 'text-secondary hover:text-primary'}`}>
                {n} derniers
              </button>
            ))}
          </div>
        </div>

        {/* Log viewer */}
        <div className="flex-1 min-w-0">
          <div className="glass-card">
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-gold/10">
              <div className="flex items-center gap-3">
                <Activity size={16} className={activeCol?.color || 'text-gold'} />
                <span className="font-semibold text-primary text-sm">{activeCol?.label}</span>
              </div>
              <span className="badge badge-gold">{logs.length} entrées</span>
            </div>

            {/* Content */}
            {loading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 animate-shimmer rounded-xl" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center">
                <Activity size={32} className="text-muted mx-auto mb-3" />
                <p className="text-muted text-sm">Aucun log disponible</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {logs.map((log, i) => {
                  const isExp = expanded === i
                  const keys = Object.keys(log)
                  const mainKeys = keys.filter(k => !['_id', '__v'].includes(k)).slice(0, 3)

                  return (
                    <div key={i}
                      className="px-5 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExp ? null : i)}>
                      <div className="flex items-start gap-3">
                        {/* Toggle */}
                        <button className="text-muted mt-0.5 flex-shrink-0 pt-0.5">
                          {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {/* Summary row */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Timestamp */}
                            {log.created_at && (
                              <span className="text-xs font-mono text-muted flex-shrink-0">
                                {fmtDateTime(log.created_at as string)}
                              </span>
                            )}
                            {/* Key fields preview */}
                            {mainKeys.filter(k => k !== 'created_at').map(k => {
                              const v = log[k]
                              if (!v) return null
                              return (
                                <span key={k} className="flex items-center gap-1 text-xs">
                                  <span className="text-muted">{k}:</span>
                                  <span className={`font-medium truncate max-w-[120px] ${activeCol?.color || 'text-primary'}`}>
                                    {String(v).slice(0, 40)}
                                  </span>
                                </span>
                              )
                            })}
                          </div>

                          {/* Expanded: full JSON */}
                          {isExp && (
                            <div className="mt-3 rounded-xl overflow-hidden"
                              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <div className="px-3 py-1.5 border-b border-white/5 flex items-center justify-between">
                                <span className="text-xs text-muted">Entrée #{i + 1}</span>
                                <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(JSON.stringify(log, null, 2)); toast.success('Copié !') }}
                                  className="text-xs text-muted hover:text-gold transition-colors">Copier JSON</button>
                              </div>
                              <pre className="px-4 py-3 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(log, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
