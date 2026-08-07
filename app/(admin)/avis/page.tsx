'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { campagnes as campagneApi, type CampagneFormulaire, type CampagneFormField } from '@/lib/api'
import { Modal, Confirm, Badge, PageHeader, Skeleton, Empty, SearchBar, useToast, fmtDate } from '@/components/ui'
import { ClipboardList, Plus, Edit, Trash2, Globe, EyeOff, Users, X } from 'lucide-react'

const emptyField: CampagneFormField = { name: '', type: 'text', label: '', nullable: false }

export default function CampagnePage() {
  const toast = useToast()
  const router = useRouter()
  const [items, setItems] = useState<CampagneFormulaire[]>([])
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [editItem, setEditItem] = useState<Partial<CampagneFormulaire> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleteItem, setDeleteItem] = useState<CampagneFormulaire | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await campagneApi.adminList()
      const list = Array.isArray(result.data) ? result.data : result.data.results
      setItems(list)
      setIsMock(result.isMock)
    } catch { toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items?.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setEditItem({ title: '', title_en: '', slug: '', content: '', content_en: '', is_published: false, formulaire: { fields: [{ ...emptyField }] } })
    setIsNew(true)
  }
  const openEdit = (c: CampagneFormulaire) => { setEditItem({ ...c, formulaire: c.formulaire ?? { fields: [] } }); setIsNew(false) }

  const slugify = (s: string) => s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const setFields = (fields: CampagneFormField[]) =>
    setEditItem(p => ({ ...p, formulaire: { fields } }))

  const handleSave = async () => {
    if (!editItem?.title?.trim()) { toast.error('Le titre est requis'); return }
    if (!editItem?.slug?.trim()) { toast.error('Le slug est requis'); return }
    const fields = editItem.formulaire?.fields ?? []
    if (!fields.length || fields.some(f => !f.name.trim() || !f.label.trim())) {
      toast.error('Chaque champ du formulaire doit avoir un nom et un label'); return
    }
    setActionLoading(true)
    try {
      if (isNew) { await campagneApi.create(editItem); toast.success('Avis créé ✓') }
      else { await campagneApi.update(editItem.slug!, editItem); toast.success('Avis mis à jour ✓') }
      setEditItem(null); load()
    } catch (e: unknown) {
      if (isMock) { toast.success(isNew ? 'Créé (démo)' : 'Mis à jour (démo)'); setEditItem(null) }
      else toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally { setActionLoading(false) }
  }

  const handlePublishToggle = async (c: CampagneFormulaire) => {
    try {
      await campagneApi.update(c.slug, { is_published: !c.is_published })
      toast.success(c.is_published ? 'Dépublié' : 'Publié ✓')
      load()
    } catch { if (isMock) { toast.success('Action effectuée (démo)'); load() } }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setActionLoading(true)
    try { await campagneApi.delete(deleteItem.slug); toast.success('Avis supprimé'); setDeleteItem(null); load() }
    catch { if (isMock) { toast.success('Supprimé (démo)'); setDeleteItem(null) } }
    finally { setActionLoading(false) }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Avis / Campagnes"
        subtitle={`${items.length} formulaires${isMock ? ' (démo)' : ''}`}
        action={<button onClick={openNew} className="btn-gold flex items-center gap-2"><Plus size={16} /> Nouvel avis</button>}
      />

      <div className="glass-card p-4 mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un avis…" />
      </div>

      {loading ? <div className="p-6"><Skeleton rows={4} /></div> : !filtered.length
        ? <Empty icon={ClipboardList} message="Aucun avis" />
        : (
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="glass-card p-5 flex items-start gap-4">
                <button onClick={() => router.push(`/campagne/${c.slug}`)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-display font-semibold text-primary text-base">{c.title}</h3>
                    <Badge value={c.is_published ? 'active' : 'draft'} />
                  </div>
                  <p className="text-sm text-secondary line-clamp-2 mb-2">{c.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span>Créé le {fmtDate(c.created_at)}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> Voir les réponses</span>
                  </div>
                </button>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handlePublishToggle(c)} title={c.is_published ? 'Dépublier' : 'Publier'}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all
                      ${c.is_published ? 'hover:bg-orange-500/10 text-orange-400' : 'hover:bg-green-500/10 text-green-400'}`}>
                    {c.is_published ? <EyeOff size={15} /> : <Globe size={15} />}
                  </button>
                  <button onClick={() => openEdit(c)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all">
                    <Edit size={15} />
                  </button>
                  <button onClick={() => setDeleteItem(c)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Create/Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={isNew ? 'Nouvel avis' : "Modifier l'avis"} size="xl">
        {editItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Titre (FR) *</label>
                <input value={editItem.title || ''}
                  onChange={e => setEditItem(p => ({ ...p, title: e.target.value, slug: isNew ? slugify(e.target.value) : p?.slug }))}
                  className="input-glass" placeholder="Titre en français" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Titre (EN)</label>
                <input value={editItem.title_en || ''} onChange={e => setEditItem(p => ({ ...p, title_en: e.target.value }))}
                  className="input-glass" placeholder="Title in English" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Slug *</label>
              <input value={editItem.slug || ''} onChange={e => setEditItem(p => ({ ...p, slug: slugify(e.target.value) }))}
                className="input-glass" placeholder="mon-projet-bankvi" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Contenu (FR) (Markdown)</label>
              <textarea value={editItem.content || ''} onChange={e => setEditItem(p => ({ ...p, content: e.target.value }))}
                rows={6} className="input-glass resize-y font-mono text-xs" placeholder="Présentation du projet…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Contenu (EN) (Markdown)</label>
              <textarea value={editItem.content_en || ''} onChange={e => setEditItem(p => ({ ...p, content_en: e.target.value }))}
                rows={6} className="input-glass resize-y font-mono text-xs" placeholder="Project overview…" />
            </div>

            {/* Champs dynamiques du formulaire */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide">Champs du formulaire</label>
                <button onClick={() => setFields([...(editItem.formulaire?.fields ?? []), { ...emptyField }])}
                  className="text-xs text-gold flex items-center gap-1"><Plus size={12} /> Ajouter un champ</button>
              </div>
              {/*<div className="space-y-2">
                {(editItem.formulaire?.fields ?? []).map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={f.name} onChange={e => {
                      const fields = [...(editItem.formulaire?.fields ?? [])]
                      fields[i] = { ...f, name: e.target.value }; setFields(fields)
                    }} className="input-glass flex-1" placeholder="nom (ex: email)" />
                    <input value={f.label} onChange={e => {
                      const fields = [...(editItem.formulaire?.fields ?? [])]
                      fields[i] = { ...f, label: e.target.value }; setFields(fields)
                    }} className="input-glass flex-1" placeholder="Label affiché" />
                    <select value={f.type} onChange={e => {
                      const fields = [...(editItem.formulaire?.fields ?? [])]
                      fields[i] = { ...f, type: e.target.value }; setFields(fields)
                    }} className="input-glass w-28">
                      <option value="text">Texte</option>
                      <option value="email">Email</option>
                      <option value="tel">Téléphone</option>
                      <option value="number">Nombre</option>
                      <option value="textarea">Zone texte</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-muted whitespace-nowrap">
                      <input type="checkbox" checked={!!f.nullable} onChange={e => {
                        const fields = [...(editItem.formulaire?.fields ?? [])]
                        fields[i] = { ...f, nullable: e.target.checked }; setFields(fields)
                      }} /> Optionnel
                    </label>
                    <button onClick={() => setFields((editItem.formulaire?.fields ?? []).filter((_, idx) => idx !== i))}
                      className="text-muted hover:text-red-400"><X size={14} /></button>
                  </div>
                ))}
              </div>*/}
              <div className="space-y-2">
                {(editItem.formulaire?.fields ?? []).map((f, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_110px_90px_28px] gap-2 items-center">
                    <input
                      value={f.name}
                      onChange={e => {
                        const fields = [...(editItem.formulaire?.fields ?? [])]
                        fields[i] = { ...f, name: e.target.value }; setFields(fields)
                      }}
                      className="input-glass w-full min-w-0"
                      placeholder="nom (ex: email)"
                    />
                    <input
                      value={f.label}
                      onChange={e => {
                        const fields = [...(editItem.formulaire?.fields ?? [])]
                        fields[i] = { ...f, label: e.target.value }; setFields(fields)
                      }}
                      className="input-glass w-full min-w-0"
                      placeholder="Label affiché"
                    />
                    <select
                      value={f.type}
                      onChange={e => {
                        const fields = [...(editItem.formulaire?.fields ?? [])]
                        fields[i] = { ...f, type: e.target.value }; setFields(fields)
                      }}
                      className="input-glass w-full min-w-0"
                    >
                      <option value="text">Texte</option>
                      <option value="email">Email</option>
                      <option value="tel">Téléphone</option>
                      <option value="number">Nombre</option>
                      <option value="textarea">Zone texte</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={!!f.nullable}
                        onChange={e => {
                          const fields = [...(editItem.formulaire?.fields ?? [])]
                          fields[i] = { ...f, nullable: e.target.checked }; setFields(fields)
                        }}
                      />
                      Optionnel
                    </label>
                    <button
                      onClick={() => setFields((editItem.formulaire?.fields ?? []).filter((_, idx) => idx !== i))}
                      className="text-muted hover:text-red-400 justify-self-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setEditItem(p => ({ ...p, is_published: !p?.is_published }))}
                  className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${editItem.is_published ? 'bg-gold' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${editItem.is_published ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-secondary">Publier immédiatement</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditItem(null)} className="btn-glass flex-1" disabled={actionLoading}>Annuler</button>
              <button onClick={handleSave} className="btn-gold flex-1" disabled={actionLoading}>
                {actionLoading ? <Spinner /> : isNew ? "Créer l'avis" : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        title="Supprimer l'avis"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteItem?.title}" ? Toutes les réponses associées seront perdues.`}
        danger loading={actionLoading} />
    </div>
  )
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
}