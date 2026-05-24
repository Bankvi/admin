'use client'
import { useEffect, useState, useCallback } from 'react'
import { wallet as walletApi, type Transaction } from '@/lib/api'
import { Modal, Badge, Pagination, PageHeader, Skeleton, Empty, useToast, fmtDateTime, fmtAmount } from '@/components/ui'
import { Wallet, Eye, Filter, Activity } from 'lucide-react'

const PAGE_SIZE = 25

const TX_LABELS: Record<string,string> = {
  deposit:'Dépôt', withdrawal:'Retrait', esso_payment:'Cotisation ESSO',
  esso_gain:'Gain ESSO', internal_transfer:'Transfert interne', tironienne_deposit:'Épargne Tironienne',
}
const TX_COLORS: Record<string,string> = {
  deposit:'text-green-400', withdrawal:'text-red-400', esso_gain:'text-gold',
  internal_transfer:'text-blue-400', esso_payment:'text-orange-400', tironienne_deposit:'text-purple-400',
}

export default function TransactionsPage() {
  const toast = useToast()
  const [items, setItems] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [detail, setDetail] = useState<Transaction | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      p.set('page', String(page)); p.set('page_size', String(PAGE_SIZE))
      if (typeFilter) p.set('transaction_type', typeFilter)
      if (statusFilter) p.set('status', statusFilter)
      const result = await walletApi.adminTransactions(p.toString())
      setItems(result.data.results)
      setTotal(result.data.count)
      setIsMock(result.isMock)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }, [page, typeFilter, statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [typeFilter, statusFilter])

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Transactions" subtitle={`${total} transactions${isMock ? ' (démo)' : ''}`} />
      {isMock && (
        <div className="mb-4 px-3 py-2 rounded-xl text-xs flex items-center gap-2"
          style={{ background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.2)', color:'#ca8a04' }}>
          <Activity size={13} /> Backend hors ligne — données de démonstration
        </div>
      )}

      <div className="glass-card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-glass w-auto text-sm">
            <option value="">Tous les types</option>
            {Object.entries(TX_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-glass w-auto text-sm">
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="processing">En cours</option>
          <option value="completed">Complété</option>
          <option value="failed">Échoué</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <div className="p-6"><Skeleton /></div> : !items.length
            ? <Empty icon={Wallet} message="Aucune transaction" />
            : (
              <table className="table-glass">
                <thead>
                  <tr><th>Référence</th><th>Type</th><th>Méthode</th><th>Montant</th><th>Frais</th><th>Net</th><th>Statut</th><th>Date</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map(tx => (
                    <tr key={tx.id}>
                      <td className="font-mono text-xs text-muted">{tx.reference}</td>
                      <td>
                        <span className={`text-xs font-semibold ${TX_COLORS[tx.transaction_type] || 'text-secondary'}`}>
                          {TX_LABELS[tx.transaction_type] || tx.transaction_type}
                        </span>
                      </td>
                      <td className="text-xs text-secondary capitalize">{tx.payment_method}</td>
                      <td className="font-semibold text-primary">{fmtAmount(tx.amount)}</td>
                      <td className="text-xs text-red-400">{tx.fee_amount > 0 ? fmtAmount(tx.fee_amount) : '—'}</td>
                      <td className="font-semibold text-green-400">{fmtAmount(tx.net_amount)}</td>
                      <td><Badge value={tx.status} /></td>
                      <td className="text-xs text-secondary whitespace-nowrap">{fmtDateTime(tx.created_at)}</td>
                      <td>
                        <button onClick={() => setDetail(tx)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all">
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

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Détails de la transaction">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Référence', detail.reference],
                ['Type', TX_LABELS[detail.transaction_type] || detail.transaction_type],
                ['Méthode', detail.payment_method],
                ['Montant', fmtAmount(detail.amount)],
                ['Frais', fmtAmount(detail.fee_amount)],
                ['Net', fmtAmount(detail.net_amount)],
                ['Créé le', fmtDateTime(detail.created_at)],
                ['Complété le', fmtDateTime(detail.completed_at)],
                ['FedaPay ID', detail.fedapay_transaction_id || '—'],
              ].map(([l,v]) => (
                <div key={String(l)} className="glass rounded-xl p-3">
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">{l}</p>
                  <p className="text-sm font-medium text-primary break-all">{v}</p>
                </div>
              ))}
              <div className="glass rounded-xl p-3">
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Statut</p>
                <Badge value={detail.status} />
              </div>
            </div>
            {detail.blockchain_tx_hash && (
              <div className="glass rounded-xl p-3">
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Hash Blockchain ⛓</p>
                <p className="text-xs font-mono text-gold break-all">{detail.blockchain_tx_hash}</p>
              </div>
            )}
            {detail.description && (
              <div className="glass rounded-xl p-3">
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-primary">{detail.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
