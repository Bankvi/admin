'use client'
import { useEffect, useState, useCallback } from 'react'
import { messages as msgsApi, type ContactMessage } from '@/lib/api'
import { Modal, Badge, Pagination, PageHeader, Skeleton, Empty, useToast, fmtDateTime } from '@/components/ui'
import { Mail, Eye, Reply, Filter } from 'lucide-react'

const PAGE_SIZE = 20

export default function MessagesPage() {
  const toast = useToast()
  const [data, setData] = useState<{ data: { count: number; results: ContactMessage[] }; isMock: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [detail, setDetail] = useState<ContactMessage | null>(null)
  const [replyMsg, setReplyMsg] = useState<ContactMessage | null>(null)
  const [replyText, setReplyText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      p.set('page', String(page)); p.set('page_size', String(PAGE_SIZE))
      if (statusFilter) p.set('status', statusFilter)
      const result = await msgsApi.list(p.toString())
      setData(result as typeof data)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [statusFilter])

  const handleReply = async () => {
    if (!replyMsg || !replyText.trim()) { toast.error('La réponse ne peut pas être vide'); return }
    setActionLoading(true)
    try {
      await msgsApi.reply(replyMsg.id, replyText)
      toast.success('Réponse envoyée ✓')
      setReplyMsg(null); setReplyText(''); load()
    } catch {
      if (data?.isMock) { toast.success('Réponse envoyée (démo)'); setReplyMsg(null); setReplyText('') }
      else toast.error('Erreur lors de l\'envoi')
    } finally { setActionLoading(false) }
  }

  const handleMarkInProgress = async (msg: ContactMessage) => {
    try {
      await msgsApi.updateStatus(msg.id, 'in_progress')
      toast.success('Statut mis à jour')
      load()
    } catch {
      if (data?.isMock) toast.success('Mis à jour (démo)')
    }
  }

  const items = data?.data?.results || []
  const total = data?.data?.count || 0
  const unreadCount = items.filter(m => m.status === 'unread').length

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Messages de contact"
        subtitle={`${total} messages${unreadCount > 0 ? ` · ${unreadCount} non lus` : ''}`}
      />
      {data?.isMock && <MockBanner />}

      {/* Alert for unread */}
      {unreadCount > 0 && (
        <div className="glass-card p-4 mb-6 flex items-center gap-3 border-l-2" style={{ borderLeftColor: '#ef4444' }}>
          <Mail size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-primary">
            <span className="font-semibold text-red-400">{unreadCount} message{unreadCount > 1 ? 's' : ''}</span> non lu{unreadCount > 1 ? 's' : ''} en attente de traitement
          </p>
        </div>
      )}

      <div className="glass-card p-4 mb-6 flex items-center gap-3">
        <Filter size={14} className="text-muted" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-glass w-auto text-sm">
          <option value="">Tous les statuts</option>
          <option value="unread">Non lus</option>
          <option value="in_progress">En cours</option>
          <option value="resolved">Résolus</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <div className="p-6"><Skeleton /></div> : !items.length
            ? <Empty icon={Mail} message="Aucun message trouvé" />
            : (
              <table className="table-glass">
                <thead>
                  <tr><th>Expéditeur</th><th>Sujet</th><th>Statut</th><th>Reçu le</th><th>Répondu le</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {items.map(msg => (
                    <tr key={msg.id} className={msg.status === 'unread' ? 'bg-red-500/[0.02]' : ''}>
                      <td>
                        <div className="flex items-center gap-2">
                          {msg.status === 'unread' && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />}
                          <div>
                            <p className={`text-sm font-medium ${msg.status === 'unread' ? 'text-primary' : 'text-secondary'}`}>{msg.full_name}</p>
                            <p className="text-xs text-muted">{msg.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-primary max-w-xs truncate">{msg.subject}</td>
                      <td><Badge value={msg.status} /></td>
                      <td className="text-xs text-secondary whitespace-nowrap">{fmtDateTime(msg.created_at)}</td>
                      <td className="text-xs text-secondary whitespace-nowrap">{msg.replied_at ? fmtDateTime(msg.replied_at) : '—'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetail(msg)} title="Lire"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all">
                            <Eye size={14} />
                          </button>
                          {msg.status !== 'resolved' && (
                            <button onClick={() => { setReplyMsg(msg); setReplyText(msg.reply || '') }} title="Répondre"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gold/10 text-gold transition-all">
                              <Reply size={14} />
                            </button>
                          )}
                          {msg.status === 'unread' && (
                            <button onClick={() => handleMarkInProgress(msg)} title="Marquer en cours"
                              className="text-xs text-muted hover:text-primary px-2 py-1 rounded-lg hover:bg-white/5 transition-all whitespace-nowrap">
                              En cours
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
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Message de contact" size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-4 grid grid-cols-2 gap-3">
              {[['Expéditeur', detail.full_name], ['Email', detail.email], ['Sujet', detail.subject], ['Reçu le', fmtDateTime(detail.created_at)]].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">{l}</p>
                  <p className="text-sm font-medium text-primary">{v}</p>
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-muted uppercase tracking-wide mb-2">Message</p>
              <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">{detail.message}</p>
            </div>
            {detail.reply && (
              <div className="glass rounded-2xl p-4" style={{ border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="text-xs text-green-400 uppercase tracking-wide mb-2">Réponse envoyée — {fmtDateTime(detail.replied_at)}</p>
                <p className="text-sm text-secondary leading-relaxed">{detail.reply}</p>
              </div>
            )}
            {detail.status !== 'resolved' && (
              <button onClick={() => { setDetail(null); setReplyMsg(detail); setReplyText(detail.reply || '') }}
                className="btn-gold w-full flex items-center justify-center gap-2">
                <Reply size={15} /> Répondre à ce message
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Reply Modal */}
      <Modal open={!!replyMsg} onClose={() => { setReplyMsg(null); setReplyText('') }} title="Répondre au message">
        {replyMsg && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted mb-1">À : <span className="text-primary font-medium">{replyMsg.full_name}</span> ({replyMsg.email})</p>
              <p className="text-xs text-muted">Sujet : <span className="text-primary">Re: {replyMsg.subject}</span></p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted mb-2">Message original :</p>
              <p className="text-xs text-secondary leading-relaxed line-clamp-3">{replyMsg.message}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Votre réponse *</label>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                rows={5} className="input-glass resize-none"
                placeholder="Rédigez votre réponse ici. Elle sera envoyée par email à l'expéditeur." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setReplyMsg(null); setReplyText('') }} className="btn-glass flex-1" disabled={actionLoading}>Annuler</button>
              <button onClick={handleReply} disabled={actionLoading || !replyText.trim()} className="btn-gold flex-1">
                {actionLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" /> : '📤 Envoyer la réponse'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function MockBanner() {
  return <div className="mb-4 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#ca8a04' }}>⚠️ Backend hors ligne — données de démonstration</div>
}
