'use client'
import { useEffect, useState, useCallback } from 'react'
import { esso as essoApi, type Esso, type EssoDetail } from '@/lib/api'
import { Modal, Confirm, Badge, Pagination, PageHeader, Skeleton, Empty, SearchBar, useToast, fmtDate, fmtAmount } from '@/components/ui'
import { RefreshCw, Eye, XCircle, Filter, Users, Calendar, Layers, Activity } from 'lucide-react'

const PAGE_SIZE = 20
const FREQ: Record<string, string> = { daily:'Quotidien', weekly:'Hebdomadaire', monthly:'Mensuel' }

export default function EssoPage() {
  const toast = useToast()
  const [items, setItems] = useState<Esso[]>([])
  const [total, setTotal] = useState(0)
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [detailEsso, setDetailEsso] = useState<EssoDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelEsso, setCancelEsso] = useState<Esso | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      p.set('page', String(page)); p.set('page_size', String(PAGE_SIZE))
      if (search) p.set('search', search)
      if (statusFilter) p.set('status', statusFilter)
      const result = await essoApi.list(p.toString())
      setItems(result.data.results)
      setTotal(result.data.count)
      setIsMock(result.isMock)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }, [page, search, statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const openDetail = async (id: string) => {
    setDetailEsso({ id } as EssoDetail); setDetailLoading(true)
    try { setDetailEsso(await essoApi.detail(id)) }
    catch { toast.error('Impossible de charger les détails') }
    finally { setDetailLoading(false) }
  }

  const handleCancel = async () => {
    if (!cancelEsso) return
    setActionLoading(true)
    try {
      await essoApi.cancel(cancelEsso.id)
      toast.success('ESSO annulé')
      setCancelEsso(null); load()
    } catch {
      if (isMock) { toast.success('ESSO annulé (démo)'); setCancelEsso(null) }
      else toast.error('Erreur lors de l\'annulation')
    } finally { setActionLoading(false) }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="ESSO — Tontines" subtitle={`${total} tontines${isMock ? ' (démo)' : ''}`} />
      {isMock && <MockBanner />}

      <div className="glass-card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Nom de tontine…" />
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-glass w-auto text-sm">
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="active">Actif</option>
            <option value="paused">Bloqué</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>
        {items.filter(e => e.status === 'paused').length > 0 && (
          <button onClick={() => setStatusFilter('paused')}
            className="badge badge-paused cursor-pointer animate-pulse-gold">
            {items.filter(e => e.status === 'paused').length} ESSO bloqué(s)
          </button>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <div className="p-6"><Skeleton /></div> : !items.length
            ? <Empty icon={RefreshCw} message="Aucun ESSO trouvé" />
            : (
              <table className="table-glass">
                <thead>
                  <tr><th>Nom</th><th>Créateur</th><th>Cotisation</th><th>Fréquence</th><th>Mode</th><th>Cycle</th><th>Statut</th><th>Lancé le</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {items.map(e => (
                    <tr key={e.id}>
                      <td>
                        <p className="font-medium text-primary text-sm">{e.name}</p>
                        <p className="text-xs text-muted truncate max-w-[200px]">{e.description}</p>
                      </td>
                      <td>
                        <p className="text-sm text-primary">{e.creator?.full_name}</p>
                        <p className="text-xs text-muted">{e.creator?.phone}</p>
                      </td>
                      <td className="font-semibold text-primary">{fmtAmount(e.contribution_amount)}</td>
                      <td className="text-sm text-secondary">{FREQ[e.frequency] || e.frequency}</td>
                      <td><Badge value={e.draw_mode} /></td>
                      <td className="font-mono text-sm text-primary">{e.current_cycle}/{e.total_cycles || '?'}</td>
                      <td><Badge value={e.status} /></td>
                      <td className="text-xs text-secondary">{fmtDate(e.launched_at)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetail(e.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all">
                            <Eye size={14} />
                          </button>
                          {['active','paused','draft'].includes(e.status) && (
                            <button onClick={() => setCancelEsso(e)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-all">
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
        <div className="p-4"><Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} /></div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!detailEsso} onClose={() => setDetailEsso(null)} title="Détails ESSO" size="xl">
        {detailEsso && (
          detailLoading
            ? <div className="py-12 text-center"><div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" /></div>
            : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: RefreshCw, label:'Statut', v: <Badge value={detailEsso.status} /> },
                    { icon: Users, label:'Membres', v:`${detailEsso.members?.length ?? 0}/${detailEsso.max_members}` },
                    { icon: Layers, label:'Cycle', v:`${detailEsso.current_cycle}/${detailEsso.total_cycles}` },
                    { icon: Calendar, label:'Prochaine échéance', v:fmtDate(detailEsso.next_due_date) },
                  ].map(item => (
                    <div key={item.label} className="glass rounded-xl p-3 text-center">
                      <item.icon size={16} className="text-gold mx-auto mb-1" />
                      <p className="text-xs text-muted mb-1">{item.label}</p>
                      <div className="text-sm font-semibold text-primary">{item.v}</div>
                    </div>
                  ))}
                </div>

                {/* Members */}
                {(detailEsso.members?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                      Membres ({detailEsso.members.length})
                    </h4>
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {detailEsso.members.map(m => (
                        <div key={m.id} className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background:'linear-gradient(135deg,var(--gold-light),var(--gold-dark))' }}>
                            #{m.rotation_order}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary">{m.user_name}</p>
                            <p className="text-xs text-muted">{m.user_phone}</p>
                          </div>
                          {m.has_received && <span className="badge badge-verified">Reçu ✓</span>}
                          <Badge value={m.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cycles */}
                {(detailEsso.cycles?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Cycles</h4>
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {detailEsso.cycles.map(c => (
                        <div key={c.id} className="glass rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-primary">Cycle #{c.cycle_number}</span>
                            <Badge value={c.status} />
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                            <div><span className="text-muted">Collecté : </span><span className="font-semibold text-gold">{fmtAmount(c.total_collected)}</span></div>
                            <div><span className="text-muted">Gagnant : </span><span className="font-medium text-primary">{c.winner_name || '—'}</span></div>
                            <div><span className="text-muted">Tirage : </span><span className="font-medium text-primary">{fmtDate(c.drawn_at)}</span></div>
                          </div>
                          {c.draw_result_hash && (
                            <p className="text-xs font-mono text-muted truncate">⛓ {c.draw_result_hash}</p>
                          )}
                          {c.contributions && c.contributions.length > 0 && (
                            <div className="mt-3 space-y-1 border-t border-white/5 pt-3">
                              {c.contributions.map(ct => (
                                <div key={ct.id} className="flex items-center justify-between text-xs">
                                  <span className="text-secondary">{ct.member_name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted">{fmtAmount(ct.amount)}</span>
                                    <Badge value={ct.status} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {['active','paused'].includes(detailEsso.status) && (
                  <button onClick={() => { setDetailEsso(null); setCancelEsso(detailEsso as unknown as Esso) }}
                    className="btn-danger w-full flex items-center justify-center gap-2">
                    <XCircle size={15} /> Annuler cet ESSO
                  </button>
                )}
              </div>
            )
        )}
      </Modal>

      <Confirm open={!!cancelEsso} onClose={() => setCancelEsso(null)} onConfirm={handleCancel}
        title="Annuler l'ESSO"
        message={`Êtes-vous sûr de vouloir annuler "${cancelEsso?.name}" ? Action irréversible. Les membres seront notifiés.`}
        danger loading={actionLoading} />
    </div>
  )
}

function MockBanner() {
  return (
    <div className="mb-4 px-3 py-2 rounded-xl text-xs flex items-center gap-2"
      style={{ background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.2)', color:'#ca8a04' }}>
      <Activity size={13} /> Backend hors ligne — données de démonstration
    </div>
  )
}
