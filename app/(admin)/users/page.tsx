'use client'
import { useEffect, useState, useCallback } from 'react'
import { users as usersApi, type User } from '@/lib/api'
import { Modal, Confirm, Badge, Pagination, PageHeader, Skeleton, Empty, SearchBar, useToast, fmtDate, fmtPhone } from '@/components/ui'
import { Users, Eye, ShieldCheck, ShieldX, UserX, UserCheck, Filter, Activity } from 'lucide-react'

const PAGE_SIZE = 20

export default function UsersPage() {
  const toast = useToast()
  const [items, setItems] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [kycFilter, setKycFilter] = useState('')

  const [detailUser, setDetailUser] = useState<User | null>(null)
  const [kycUser, setKycUser] = useState<User | null>(null)
  const [toggleUser, setToggleUser] = useState<User | null>(null)
  const [kycAction, setKycAction] = useState<'approve'|'reject'>('approve')
  const [kycReason, setKycReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      p.set('page', String(page)); p.set('page_size', String(PAGE_SIZE))
      if (search) p.set('search', search)
      if (kycFilter) p.set('kyc_status', kycFilter)
      const result = await usersApi.list(p.toString())
      setItems(result.data.results)
      setTotal(result.data.count)
      setIsMock(result.isMock)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }, [page, search, kycFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, kycFilter])

  const handleKYCReview = async () => {
    if (!kycUser) return
    setActionLoading(true)
    try {
      await usersApi.reviewKYC(kycUser.id, kycAction, kycReason)
      toast.success(kycAction === 'approve' ? 'KYC approuvé ✓' : 'KYC rejeté')
      setKycUser(null); setKycReason(''); load()
    } catch {
      if (isMock) { toast.success(kycAction === 'approve' ? 'KYC approuvé (démo)' : 'KYC rejeté (démo)'); setKycUser(null); setKycReason('') }
      else toast.error('Erreur lors de la révision')
    } finally { setActionLoading(false) }
  }

  const handleToggle = async () => {
    if (!toggleUser) return
    setActionLoading(true)
    try {
      await usersApi.toggleActive(toggleUser.id)
      toast.success(toggleUser.is_active ? 'Compte suspendu' : 'Compte réactivé')
      setToggleUser(null); load()
    } catch {
      if (isMock) { toast.success('Action effectuée (démo)'); setToggleUser(null) }
      else toast.error('Erreur')
    } finally { setActionLoading(false) }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Utilisateurs" subtitle={`${total} comptes${isMock ? ' (démo)' : ''}`} />
      {isMock && <MockBanner />}

      <div className="glass-card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Nom, téléphone, email…" />
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted" />
          <select value={kycFilter} onChange={e => setKycFilter(e.target.value)} className="input-glass w-auto text-sm">
            <option value="">Tous statuts KYC</option>
            <option value="pending">En attente</option>
            <option value="submitted">Soumis</option>
            <option value="verified">Vérifié</option>
            <option value="rejected">Rejeté</option>
          </select>
        </div>
        {/* KYC pending quick badge */}
        {items.filter(u => u.kyc_status === 'submitted').length > 0 && (
          <button onClick={() => setKycFilter('submitted')}
            className="badge badge-submitted animate-pulse-gold cursor-pointer">
            {items.filter(u => u.kyc_status === 'submitted').length} KYC à valider
          </button>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <div className="p-6"><Skeleton /></div> : !items.length
            ? <Empty icon={Users} message="Aucun utilisateur trouvé" />
            : (
              <table className="table-glass">
                <thead>
                  <tr><th>Utilisateur</th><th>Téléphone</th><th>Rôle</th><th>KYC</th><th>Score</th><th>Inscription</th><th>Statut</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {items.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background:'linear-gradient(135deg,var(--gold-light),var(--gold-dark))' }}>
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-primary text-sm">{u.full_name}</p>
                            <p className="text-xs text-muted truncate max-w-[160px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-secondary">{fmtPhone(u.phone)}</td>
                      <td><Badge value={u.role} /></td>
                      <td><Badge value={u.kyc_status} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-white/10">
                            <div className="h-full rounded-full" style={{ width:`${u.trust_score}%`, background:'linear-gradient(90deg,var(--gold-dark),var(--gold-light))' }} />
                          </div>
                          <span className="text-xs text-muted">{u.trust_score}</span>
                        </div>
                      </td>
                      <td className="text-xs text-secondary">{fmtDate(u.created_at)}</td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-active' : 'badge-rejected'}`}>
                          {u.is_active ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailUser(u)} title="Détails"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all">
                            <Eye size={14} />
                          </button>
                          {u.kyc_status === 'submitted' && (
                            <button onClick={() => { setKycUser(u); setKycAction('approve') }} title="Réviser KYC"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gold/10 text-gold transition-all animate-pulse-gold">
                              <ShieldCheck size={14} />
                            </button>
                          )}
                          <button onClick={() => setToggleUser(u)} title={u.is_active ? 'Suspendre' : 'Réactiver'}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                              ${u.is_active ? 'hover:bg-red-500/10 text-muted hover:text-red-400' : 'hover:bg-green-500/10 text-muted hover:text-green-400'}`}>
                            {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
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
      <Modal open={!!detailUser} onClose={() => setDetailUser(null)} title="Profil utilisateur" size="lg">
        {detailUser && (
          <div className="space-y-5">
            <div className="glass rounded-2xl p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                style={{ background:'linear-gradient(135deg,var(--gold-light),var(--gold-dark))' }}>
                {detailUser.first_name[0]}{detailUser.last_name[0]}
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-primary">{detailUser.full_name}</h3>
                <p className="text-sm text-muted">{detailUser.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge value={detailUser.kyc_status} />
                  <Badge value={detailUser.role} />
                  <span className={`badge ${detailUser.is_active ? 'badge-active' : 'badge-rejected'}`}>{detailUser.is_active ? 'Actif' : 'Suspendu'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Téléphone', fmtPhone(detailUser.phone)],
                ['Genre', detailUser.gender === 'M' ? 'Masculin' : detailUser.gender === 'F' ? 'Féminin' : '—'],
                ['Date de naissance', fmtDate(detailUser.date_of_birth)],
                ['Langue', detailUser.preferred_language?.toUpperCase() || '—'],
                ['Tél. vérifié', detailUser.is_phone_verified ? '✓ Oui' : '✗ Non'],
                ['Email vérifié', detailUser.is_email_verified ? '✓ Oui' : '✗ Non'],
                ['KYC soumis le', fmtDate(detailUser.kyc_submitted_at)],
                ['KYC validé le', fmtDate(detailUser.kyc_reviewed_at)],
                ['Score confiance', `${detailUser.trust_score} / 100`],
                ['Membre depuis', fmtDate(detailUser.created_at)],
              ].map(([label, value]) => (
                <div key={String(label)} className="glass rounded-xl p-3">
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm font-medium text-primary">{value}</p>
                </div>
              ))}
            </div>

            {/* Score bar */}
            <div className="glass rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-muted uppercase tracking-wide">Score de confiance</span>
                <span className="text-xs font-bold text-gold">{detailUser.trust_score}/100</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all" style={{ width:`${detailUser.trust_score}%`, background:'linear-gradient(90deg,var(--gold-dark),var(--gold-light))' }} />
              </div>
            </div>

            <div className="flex gap-3">
              {detailUser.kyc_status === 'submitted' && (
                <button onClick={() => { setDetailUser(null); setKycUser(detailUser); setKycAction('approve') }}
                  className="btn-gold flex-1 flex items-center justify-center gap-2">
                  <ShieldCheck size={15} /> Réviser le KYC
                </button>
              )}
              <button onClick={() => { setDetailUser(null); setToggleUser(detailUser) }}
                className={detailUser.is_active ? 'btn-danger flex-1' : 'btn-glass flex-1'}>
                {detailUser.is_active ? '🚫 Suspendre' : '✓ Réactiver'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* KYC Review Modal */}
      <Modal open={!!kycUser} onClose={() => { setKycUser(null); setKycReason('') }} title="Révision KYC">
        {kycUser && (
          <div className="space-y-5">
            <div className="glass rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0"
                style={{ background:'linear-gradient(135deg,var(--gold-light),var(--gold-dark))' }}>
                {kycUser.first_name[0]}{kycUser.last_name[0]}
              </div>
              <div>
                <p className="font-semibold text-primary">{kycUser.full_name}</p>
                <p className="text-xs text-muted">Soumis le {fmtDate(kycUser.kyc_submitted_at)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Décision</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setKycAction('approve')}
                  className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all
                    ${kycAction==='approve' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/10 text-muted hover:border-green-500/40'}`}>
                  <ShieldCheck size={15} /> Approuver
                </button>
                <button onClick={() => setKycAction('reject')}
                  className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all
                    ${kycAction==='reject' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-white/10 text-muted hover:border-red-500/40'}`}>
                  <ShieldX size={15} /> Rejeter
                </button>
              </div>
            </div>

            {kycAction === 'reject' && (
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  Motif du rejet <span className="text-red-400">*</span>
                </label>
                <textarea value={kycReason} onChange={e => setKycReason(e.target.value)}
                  placeholder="Ex: Document illisible, photo floue, selfie ne correspond pas…"
                  rows={3} className="input-glass resize-none" />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setKycUser(null); setKycReason('') }} className="btn-glass flex-1" disabled={actionLoading}>Annuler</button>
              <button onClick={handleKYCReview}
                disabled={actionLoading || (kycAction==='reject' && !kycReason.trim())}
                className={kycAction==='approve' ? 'btn-gold flex-1' : 'btn-danger flex-1'}>
                {actionLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
                  : kycAction==='approve' ? '✓ Confirmer l\'approbation' : '✗ Confirmer le rejet'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toggle Confirm */}
      <Confirm open={!!toggleUser} onClose={() => setToggleUser(null)} onConfirm={handleToggle}
        title={toggleUser?.is_active ? 'Suspendre le compte' : 'Réactiver le compte'}
        message={toggleUser?.is_active
          ? `Suspendre ${toggleUser?.full_name} ? L'utilisateur ne pourra plus se connecter.`
          : `Réactiver le compte de ${toggleUser?.full_name} ?`}
        danger={toggleUser?.is_active} loading={actionLoading} />
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
