'use client'
import { useEffect, useState, useCallback } from 'react'
import { faq as faqApi, type FAQ } from '@/lib/api'
import { Modal, Confirm, PageHeader, Skeleton, Empty, useToast } from '@/components/ui'
import { HelpCircle, Plus, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

const CATEGORIES: Record<string, string> = {
  esso: '🔄 ESSO', paiement: '💳 Paiement', kyc: '🪪 KYC / Compte', tironienne: '🏦 Tironienne'
}

export default function FAQPage() {
  const toast = useToast()
  const [items, setItems] = useState<FAQ[]>([])
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<Partial<FAQ> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleteItem, setDeleteItem] = useState<FAQ | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [grouped, setGrouped] = useState<{ cat: string, label: string, items: FAQ[] }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await faqApi.adminList()
      const data = Array.isArray(result.data) ? result.data : result.data.results;
      setItems(data);
      setGrouped(Object.entries(CATEGORIES).map(([cat, label]) => ({
        cat, label, items: data.filter(f => f.category === cat).sort((a, b) => a.order - b.order)
      })))
      setIsMock(result.isMock)
    } catch { toast.error('Erreur de chargement') }
    finally { setLoading(false) }

  }, [])

  useEffect(() => { 
    const loadData = async () => {
      await load();
    };
    loadData();
    // load()
  }, [load])

  /*const grouped = Object.entries(CATEGORIES).map(([cat, label]) => ({

    cat, label, items: items.filter(f => f.category === cat).sort((a, b) => a.order - b.order)

  }))

  const grouped = Object.entries(CATEGORIES).map(([cat, label]) => {
    // On s'assure que items est bien un tableau, sinon on utilise un tableau vide []
    const safeItems = Array.isArray(items) ? items : [];

    return {
      cat,
      label,
      items: safeItems.filter(f => f.category === cat).sort((a, b) => a.order - b.order)
    };
  });*/

  const handleSave = async () => {
    if (!editItem?.question?.trim() || !editItem?.answer?.trim()) { toast.error('Question et réponse requises'); return }
    setActionLoading(true)
    try {
      if (isNew) { await faqApi.create(editItem); toast.success('FAQ ajoutée ✓') }
      else { await faqApi.update(editItem.id!, editItem); toast.success('FAQ mise à jour ✓') }
      setEditItem(null); load()
    } catch {
      if (isMock) { toast.success('Action effectuée (démo)'); setEditItem(null) }
      else toast.error('Erreur lors de la sauvegarde')
    } finally { setActionLoading(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setActionLoading(true)
    try {
      await faqApi.delete(deleteItem.id)
      toast.success('FAQ supprimée')
      setDeleteItem(null); load()
    } catch {
      if (isMock) { toast.success('Supprimée (démo)'); setDeleteItem(null) }
    } finally { setActionLoading(false) }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="FAQ" subtitle={`${items.length} questions${isMock ? ' (démo)' : ''}`}
        action={<button onClick={() => { setEditItem({ question: '', answer: '', category: 'esso', order: 1, is_active: true }); setIsNew(true) }} className="btn-gold flex items-center gap-2"><Plus size={16} /> Nouvelle question</button>} />
      {isMock && <MockBanner />}

      {loading ? <Skeleton rows={6} /> : (
        <div className="space-y-6">
          {grouped.map(({ cat, label, items: catItems }) => (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="font-display font-semibold text-primary">{label}</h2>
                <span className="badge badge-gold">{catItems.length}</span>
              </div>
              {catItems.length === 0
                ? <p className="text-xs text-muted ml-2">Aucune question dans cette catégorie</p>
                : (
                  <div className="space-y-2">
                    {catItems.map(fq => (
                      <div key={fq.id} className="glass-card overflow-hidden">
                        <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpanded(expanded === fq.id ? null : fq.id)}>
                          <button className="text-muted mt-0.5 flex-shrink-0">
                            {expanded === fq.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-primary">{fq.question}</p>
                            {expanded === fq.id && (
                              <p className="text-sm text-secondary mt-3 leading-relaxed">{fq.answer}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <span className={`badge ${fq.is_active ? 'badge-active' : 'badge-rejected'}`}>{fq.is_active ? 'Actif' : 'Inactif'}</span>
                            <button onClick={() => { setEditItem({ ...fq }); setIsNew(false) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => setDeleteItem(fq)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={isNew ? 'Nouvelle question FAQ' : 'Modifier la FAQ'} size="lg">
        {editItem && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Question (FR) *</label>
              <input value={editItem.question || ''} onChange={e => setEditItem(p => ({ ...p, question: e.target.value }))}
                className="input-glass" placeholder="Quelle est votre question ?" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Réponse (FR) *</label>
              <textarea value={editItem.answer || ''} onChange={e => setEditItem(p => ({ ...p, answer: e.target.value }))}
                rows={4} className="input-glass resize-none" placeholder="Réponse complète…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Catégorie</label>
                <select value={editItem.category || 'esso'} onChange={e => setEditItem(p => ({ ...p, category: e.target.value }))} className="input-glass">
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Ordre</label>
                <input type="number" min={1} value={editItem.order || 1} onChange={e => setEditItem(p => ({ ...p, order: parseInt(e.target.value) }))} className="input-glass" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setEditItem(p => ({ ...p, is_active: !p?.is_active }))}
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${editItem.is_active ? 'bg-gold' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${editItem.is_active ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-secondary">Question active (visible sur le site)</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditItem(null)} className="btn-glass flex-1" disabled={actionLoading}>Annuler</button>
              <button onClick={handleSave} className="btn-gold flex-1" disabled={actionLoading}>
                {actionLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" /> : isNew ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        title="Supprimer la FAQ"
        message={`Supprimer "${deleteItem?.question}" ?`}
        danger loading={actionLoading} />
    </div>
  )
}

function MockBanner() {
  return <div className="mb-4 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#ca8a04' }}>⚠️ Backend hors ligne — données de démonstration</div>
}
