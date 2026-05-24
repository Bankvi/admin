'use client'
import { useEffect, useState, useCallback } from 'react'
import { tironiennes as tiroApi, type Tironienne, type TironiенneDeposit } from '@/lib/api'
import { Modal, Badge, Pagination, PageHeader, Skeleton, Empty, SearchBar, useToast, fmtDate, fmtAmount } from '@/components/ui'
import { PiggyBank, Eye, Filter, Calendar } from 'lucide-react'

const PAGE_SIZE = 20

export default function TiroPage() {
  const toast = useToast()
  const [data, setData] = useState<{ data: { count: number; next: string | null; previous: string | null; results: Tironienne[] }; isMock: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [detail, setDetail] = useState<Tironienne | null>(null)
  const [deposits, setDeposits] = useState<TironiенneDeposit[]>([])
  const [depositsLoading, setDepositsLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      p.set('page', String(page)); p.set('page_size', String(PAGE_SIZE))
      if (search) p.set('search', search)
      if (modeFilter) p.set('mode', modeFilter)
      const result = await tiroApi.list(p.toString())
      setData(result as typeof data)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }, [page, search, modeFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, modeFilter])

  const openDetail = async (t: Tironienne) => {
    setDetail(t); setDepositsLoading(true)
    try { setDeposits(await tiroApi.deposits(t.id)) }
    catch { setDeposits([]) }
    finally { setDepositsLoading(false) }
  }

  const items = data?.data?.results || []
  const total = data?.data?.count || 0
  const isMock = data?.isMock

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Tironiennes" subtitle={`${total} épargnes enregistrées`} />
      {isMock && <MockBanner />}

      <div className="glass-card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Nom, utilisateur…" />
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted" />
          <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="input-glass w-auto text-sm">
            <option value="">Tous les modes</option>
            <option value="locked">Bloqué</option>
            <option value="semi_flexible">Semi-flexible</option>
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <div className="p-6"><Skeleton /></div> : !items.length
            ? <Empty icon={PiggyBank} message="Aucune tironienne trouvée" />
            : (
              <table className="table-glass">
                <thead>
                  <tr><th>Utilisateur</th><th>Nom</th><th>Objectif</th><th>Progrès</th><th>Mode</th><th>Statut</th><th>Fréquence</th><th>Créée le</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map(t => (
                    <tr key={t.id}>
                      <td>
                        <p className="text-sm font-medium text-primary">{t.user?.full_name}</p>
                        <p className="text-xs text-muted">{t.user?.phone}</p>
                      </td>
                      <td className="font-medium text-primary text-sm">{t.name}</td>
                      <td className="font-semibold text-primary">{fmtAmount(t.target_amount)}</td>
                      <td>
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(t.progress_percent, 100)}%`, background: 'linear-gradient(90deg,var(--gold-dark),var(--gold-light))' }} />
                          </div>
                          <span className="text-xs text-gold font-semibold w-8">{t.progress_percent}%</span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">{fmtAmount(t.current_amount)}</p>
                      </td>
                      <td><Badge value={t.mode} /></td>
                      <td><Badge value={t.status} /></td>
                      <td className="text-xs text-secondary">{t.frequency === 'monthly' ? 'Mensuel' : t.frequency === 'weekly' ? 'Hebdo' : 'Quotidien'}</td>
                      <td className="text-xs text-secondary">{fmtDate(t.created_at)}</td>
                      <td>
                        <button onClick={() => openDetail(t)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
        <div className="p-4"><Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} /></div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Détails Tironienne" size="lg">
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Utilisateur', detail.user?.full_name], ['Téléphone', detail.user?.phone],
                ['Nom', detail.name], ['Mode', detail.mode === 'locked' ? 'Bloqué' : 'Semi-flexible'],
                ['Objectif', fmtAmount(detail.target_amount)], ['Épargné', fmtAmount(detail.current_amount)],
                ['Versement', fmtAmount(detail.contribution_amount)], ['Pénalité', detail.penalty_percent > 0 ? `${detail.penalty_percent}%` : 'Aucune'],
                ['Déblocage', fmtDate(detail.unlock_date)], ['Prochaine échéance', fmtDate(detail.next_due_date)],
              ].map(([l, v]) => (
                <div key={String(l)} className="glass rounded-xl p-3">
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">{l}</p>
                  <p className="text-sm font-medium text-primary">{v}</p>
                </div>
              ))}
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-muted uppercase tracking-wide">Progression</span>
                <span className="text-xs font-bold text-gold">{detail.progress_percent}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${Math.min(detail.progress_percent, 100)}%`, background: 'linear-gradient(90deg,var(--gold-dark),var(--gold-light))' }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted">{fmtAmount(detail.current_amount)}</span>
                <span className="text-xs text-muted">{fmtAmount(detail.target_amount)}</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                <Calendar size={13} /> Historique des versements
              </h4>
              {depositsLoading ? <div className="animate-shimmer h-24 rounded-xl" /> : deposits.length === 0
                ? <p className="text-xs text-muted text-center py-4">Aucun versement enregistré</p>
                : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {deposits.map(d => (
                      <div key={d.id} className="glass rounded-xl px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gold">{fmtAmount(d.amount)}</p>
                          <p className="text-xs text-muted">{d.note}</p>
                        </div>
                        <p className="text-xs text-secondary">{fmtDate(d.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function MockBanner() {
  return (
    <div className="mb-4 px-3 py-2 rounded-xl text-xs flex items-center gap-2" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#ca8a04' }}>
      ⚠️ Backend hors ligne — affichage des données de démonstration
    </div>
  )
}
