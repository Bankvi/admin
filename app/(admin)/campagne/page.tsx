'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { publicite, typepub, mediaUrl, type Pubs, type PubTypeLigth, type CreatePub } from '@/lib/api'
import { Modal, Confirm, Badge, PageHeader, Skeleton, Empty, SearchBar, useToast, fmtDateTime } from '@/components/ui'
import {
  Megaphone, Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon, Video,
  FileText, Images, Clapperboard, Link as LinkIcon, Tag, X as XIcon
} from 'lucide-react'

type EditState = Partial<CreatePub> & { id?: string }

const MEDIA_TYPES: { value: CreatePub['media_type']; label: string; icon: React.ElementType }[] = [
  { value: 'texte', label: 'Texte seul', icon: FileText },
  { value: 'photo', label: 'Photo', icon: ImageIcon },
  { value: 'video', label: 'Vidéo', icon: Video },
  { value: 'image_list', label: 'Galerie photos', icon: Images },
  { value: 'video_list', label: 'Galerie vidéos', icon: Clapperboard },
]
const MEDIA_ICON: Record<string, React.ElementType> = {
  texte: FileText, photo: ImageIcon, video: Video, image_list: Images, video_list: Clapperboard,
}

function computeStatus(p: Pubs): 'active' | 'expired' | 'inactive' | 'scheduled' {
  const now = Date.now()
  if (!p.is_active) return 'inactive'
  if (p.expired_at && new Date(p.expired_at).getTime() < now) return 'expired'
  if (new Date(p.publish_at).getTime() > now) return 'scheduled'
  return 'active'
}

// datetime-local <-> ISO helpers
function toLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromLocalInput(v?: string) {
  if (!v) return undefined
  return new Date(v).toISOString()
}

export default function CampagnePage() {
  const toast = useToast()
  const [items, setItems] = useState<Pubs[]>([])
  const [types, setTypes] = useState<PubTypeLigth[]>([])
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'expired' | 'inactive'>('all')

  // Modal état édition
  const [editItem, setEditItem] = useState<EditState | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [deleteItem, setDeleteItem] = useState<Pubs | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Ajout rapide de catégorie
  const [showNewType, setShowNewType] = useState(false)
  const [newTypeValue, setNewTypeValue] = useState('')
  const [newTypeLoading, setNewTypeLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pubsRes, typesRes] = await Promise.all([publicite.list(), typepub.list()])
      const pubsData = Array.isArray(pubsRes.data) ? pubsRes.data : pubsRes.data.results
      setItems(pubsData)
      const typesData = Array.isArray(typesRes.data) ? typesRes.data : typesRes.data.results
      setTypes(typesData)
      setIsMock(pubsRes.isMock || typesRes.isMock)
    } catch { toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => items.filter(p => {
    const matchesSearch = !search
      || p.title_fr.toLowerCase().includes(search.toLowerCase())
      || p.title_en.toLowerCase().includes(search.toLowerCase())
      || p.type?.value?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || computeStatus(p) === statusFilter
    return matchesSearch && matchesStatus
  }), [items, search, statusFilter])

  const openNew = () => {
    setEditItem({
      title_fr: '', title_en: '', description_fr: '', description_en: '',
      media_type: 'photo', url: '', is_active: false,
      publish_at: new Date().toISOString(),
      type_id: types[0]?.id || '',
    })
    setMediaFile(null)
    setIsNew(true)
  }
  const openEdit = (p: Pubs) => {
    setEditItem({
      id: p.id, title_fr: p.title_fr, title_en: p.title_en,
      description_fr: p.description_fr || '', description_en: p.description_en || '',
      media_type: p.media_type, url: p.url || '', is_active: p.is_active,
      publish_at: p.publish_at, expired_at: p.expired_at || undefined,
      type_id: p.type?.id || '',
    })
    setMediaFile(null)
    setIsNew(false)
  }

  const handleSave = async () => {
    if (!editItem?.title_fr?.trim()) { toast.error('Le titre (FR) est requis'); return }
    if (!editItem?.type_id) { toast.error('La catégorie est requise'); return }
    setActionLoading(true)
    try {
      const payload: CreatePub = {
        title_fr: editItem.title_fr!, title_en: editItem.title_en || editItem.title_fr!,
        description_fr: editItem.description_fr, description_en: editItem.description_en,
        media_type: editItem.media_type || 'photo', url: editItem.url,
        is_active: !!editItem.is_active, type_id: editItem.type_id!,
        publish_at: editItem.publish_at, expired_at: editItem.expired_at,
      }
      if (isNew) { await publicite.create(payload, mediaFile); toast.success('Campagne créée ✓') }
      else { await publicite.update(editItem.id!, payload, mediaFile); toast.success('Campagne mise à jour ✓') }
      setEditItem(null); load()
    } catch (e: unknown) {
      if (isMock) { toast.success(isNew ? 'Campagne créée (démo)' : 'Campagne mise à jour (démo)'); setEditItem(null) }
      else toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally { setActionLoading(false) }
  }

  const handleToggleActive = async (p: Pubs) => {
    try {
      await publicite.update(p.id, { is_active: !p.is_active })
      toast.success(p.is_active ? 'Campagne désactivée' : 'Campagne activée ✓')
      load()
    } catch {
      if (isMock) { toast.success('Action effectuée (démo)'); load() }
      else toast.error('Erreur')
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setActionLoading(true)
    try {
      await publicite.delete(deleteItem.id)
      toast.success('Campagne supprimée')
      setDeleteItem(null); load()
    } catch {
      if (isMock) { toast.success('Supprimée (démo)'); setDeleteItem(null) }
    } finally { setActionLoading(false) }
  }

  const handleAddType = async () => {
    if (!newTypeValue.trim()) { toast.error('Le nom de la catégorie est requis'); return }
    setNewTypeLoading(true)
    try {
      const key = newTypeValue.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20)
      const created = await typepub.create({ key, value: newTypeValue.trim() })
      setTypes(t => [...t, created])
      setEditItem(p => p ? { ...p, type_id: created.id } : p)
      setNewTypeValue(''); setShowNewType(false)
      toast.success('Catégorie ajoutée ✓')
    } catch {
      toast.error('Impossible de créer la catégorie (backend hors ligne ?)')
    } finally { setNewTypeLoading(false) }
  }

  const MediaIcon = editItem?.media_type ? MEDIA_ICON[editItem.media_type] : ImageIcon

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Campagne"
        subtitle={`${items.length} campagne${items.length > 1 ? 's' : ''}${isMock ? ' (démo)' : ''}`}
        action={<button onClick={openNew} className="btn-gold flex items-center gap-2"><Plus size={16} /> Nouvelle campagne</button>}
      />
      {isMock && <MockBanner />}

      <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher une campagne…" />
        <select title='status' value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="input-glass w-auto text-sm">
          <option value="all">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="scheduled">Programmées</option>
          <option value="expired">Expirées</option>
          <option value="inactive">Inactives</option>
        </select>
      </div>

      {loading ? <div className="p-6"><Skeleton rows={4} /></div> : !filtered.length
        ? <Empty icon={Megaphone} message="Aucune campagne" />
        : (
          <div className="space-y-3">
            {filtered.map(p => {
              const status = computeStatus(p)
              const Icon = MEDIA_ICON[p.media_type] || ImageIcon
              const preview = mediaUrl(p.media_url)
              return (
                <div key={p.id} className="glass-card p-5 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center bg-white/5">
                    {preview && (p.media_type === 'photo' || p.media_type === 'image_list')
                      ? <img src={preview} alt="" className="w-full h-full object-cover" />
                      : <Icon size={20} className="text-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-display font-semibold text-primary text-base">{p.title_fr}</h3>
                      <Badge value={status} />
                      {p.type && (
                        <span className="badge badge-gold flex items-center gap-1">
                          <Tag size={11} /> {p.type.value}
                        </span>
                      )}
                    </div>
                    {p.description_fr && <p className="text-sm text-secondary line-clamp-2 mb-2">{p.description_fr}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                      <span>Publication : {fmtDateTime(p.publish_at)}</span>
                      <span>Expiration : {p.expired_at ? fmtDateTime(p.expired_at) : '—'}</span>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-gold hover:underline">
                          <LinkIcon size={11} /> Lien
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleToggleActive(p)} title={p.is_active ? 'Désactiver' : 'Activer'}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all
                        ${p.is_active ? 'hover:bg-orange-500/10 text-orange-400' : 'hover:bg-green-500/10 text-green-400'}`}>
                      {p.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button title='modifier' onClick={() => openEdit(p)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all">
                      <Edit size={15} />
                    </button>
                    <button title='supprimer' onClick={() => setDeleteItem(p)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Create/Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={isNew ? 'Nouvelle campagne' : 'Modifier la campagne'} size="xl">
        {editItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Titre (FR) *</label>
                <input value={editItem.title_fr || ''} onChange={e => setEditItem(p => ({ ...p, title_fr: e.target.value }))}
                  className="input-glass" placeholder="Titre en français" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Titre (EN)</label>
                <input value={editItem.title_en || ''} onChange={e => setEditItem(p => ({ ...p, title_en: e.target.value }))}
                  className="input-glass" placeholder="Title in English" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Description (FR)</label>
                <textarea value={editItem.description_fr || ''} onChange={e => setEditItem(p => ({ ...p, description_fr: e.target.value }))}
                  rows={3} className="input-glass resize-none" placeholder="Description courte…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Description (EN)</label>
                <textarea value={editItem.description_en || ''} onChange={e => setEditItem(p => ({ ...p, description_en: e.target.value }))}
                  rows={3} className="input-glass resize-none" placeholder="Short description…" />
              </div>
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Catégorie *</label>
              {!showNewType ? (
                <div className="flex items-center gap-2">
                  <select title='categorie' value={editItem.type_id || ''} onChange={e => setEditItem(p => ({ ...p, type_id: e.target.value }))} className="input-glass flex-1">
                    <option value="" disabled>{types.length ? 'Choisir une catégorie…' : 'Aucune catégorie disponible'}</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.value}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowNewType(true)} className="btn-glass flex items-center gap-1 text-xs px-3 flex-shrink-0">
                    <Plus size={13} /> Catégorie
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input value={newTypeValue} onChange={e => setNewTypeValue(e.target.value)}
                    className="input-glass flex-1" placeholder="Nom de la nouvelle catégorie (ex: Promotion)" />
                  <button type="button" onClick={handleAddType} disabled={newTypeLoading} className="btn-gold text-xs px-3 flex-shrink-0">
                    {newTypeLoading ? '…' : 'Ajouter'}
                  </button>
                  <button title='nouveau' type="button" onClick={() => { setShowNewType(false); setNewTypeValue('') }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted flex-shrink-0">
                    <XIcon size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Type de média */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Type de média</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {MEDIA_TYPES.map(mt => (
                  <button key={mt.value} type="button" onClick={() => setEditItem(p => ({ ...p, media_type: mt.value }))}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs transition-all
                      ${editItem.media_type === mt.value ? 'border-gold bg-gold/10 text-gold' : 'border-white/10 text-muted hover:text-primary hover:bg-white/5'}`}>
                    <mt.icon size={16} />
                    {mt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Média */}
            {editItem.media_type !== 'texte' && (
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Fichier média</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {mediaFile
                      ? <MediaIcon size={20} className="text-gold" />
                      : (!isNew && mediaUrl((editItem as unknown as Pubs).media_url))
                        ? <img src={mediaUrl((editItem as unknown as Pubs).media_url) || ''} alt="" className="w-full h-full object-cover" />
                        : <MediaIcon size={20} className="text-muted" />}
                  </div>
                  <div className="flex-1">
                    <input title='file' type="file" accept="image/*,video/*" onChange={e => setMediaFile(e.target.files?.[0] || null)}
                      className="input-glass text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-gold/10 file:text-gold file:text-xs file:cursor-pointer" />
                    {mediaFile && <p className="text-xs text-muted mt-1">{mediaFile.name}</p>}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Lien de redirection (URL)</label>
              <input value={editItem.url || ''} onChange={e => setEditItem(p => ({ ...p, url: e.target.value }))}
                className="input-glass" placeholder="https://…" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Date de publication</label>
                <input title='date' type="datetime-local" value={toLocalInput(editItem.publish_at)}
                  onChange={e => setEditItem(p => ({ ...p, publish_at: fromLocalInput(e.target.value) }))} className="input-glass" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Date d&apos;expiration</label>
                <input title='date' type="datetime-local" value={toLocalInput(editItem.expired_at)}
                  onChange={e => setEditItem(p => ({ ...p, expired_at: fromLocalInput(e.target.value) }))} className="input-glass" />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setEditItem(p => ({ ...p, is_active: !p?.is_active }))}
                className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${editItem.is_active ? 'bg-gold' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${editItem.is_active ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-secondary">Activer immédiatement</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditItem(null)} className="btn-glass flex-1" disabled={actionLoading}>Annuler</button>
              <button onClick={handleSave} className="btn-gold flex-1" disabled={actionLoading}>
                {actionLoading ? <Spinner /> : isNew ? 'Créer la campagne' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm delete */}
      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        title="Supprimer la campagne"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteItem?.title_fr}" ? Cette action est irréversible.`}
        danger loading={actionLoading} />
    </div>
  )
}

function MockBanner() {
  return <div className="mb-4 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#ca8a04' }}>⚠️ Backend hors ligne — données de démonstration</div>
}
function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
}