'use client'
import { useEffect, useState, useCallback } from 'react'
import { blog as blogApi, type BlogPost } from '@/lib/api'
import { Modal, Confirm, Badge, PageHeader, Skeleton, Empty, SearchBar, useToast, fmtDate } from '@/components/ui'
import { FileText, Plus, Eye, Edit, Trash2, Globe, EyeOff } from 'lucide-react'

export default function BlogPage() {
  const toast = useToast()
  const [items, setItems] = useState<BlogPost[]>([])
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals
  const [editPost, setEditPost] = useState<Partial<BlogPost> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deletePost, setDeletePost] = useState<BlogPost | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await blogApi.adminList()
      setItems(result.data)
      setIsMock(result.isMock)
    } catch { toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => { setEditPost({ title: '', title_en: '', excerpt: '', content: '', is_published: false }); setIsNew(true) }
  const openEdit = (p: BlogPost) => { setEditPost({ ...p }); setIsNew(false) }

  const handleSave = async () => {
    if (!editPost?.title?.trim()) { toast.error('Le titre est requis'); return }
    setActionLoading(true)
    try {
      if (isNew) {
        await blogApi.create(editPost)
        toast.success('Article créé ✓')
      } else {
        await blogApi.update(editPost.id!, editPost)
        toast.success('Article mis à jour ✓')
      }
      setEditPost(null); load()
    } catch (e: unknown) {
      if (isMock) { toast.success(isNew ? 'Article créé (démo)' : 'Article mis à jour (démo)'); setEditPost(null) }
      else toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally { setActionLoading(false) }
  }

  const handlePublishToggle = async (p: BlogPost) => {
    try {
      if (p.is_published) await blogApi.update(p.id, { is_published: false })
      else await blogApi.publish(p.id)
      toast.success(p.is_published ? 'Article dépublié' : 'Article publié ✓')
      load()
    } catch {
      if (isMock) { toast.success('Action effectuée (démo)'); load() }
    }
  }

  const handleDelete = async () => {
    if (!deletePost) return
    setActionLoading(true)
    try {
      await blogApi.delete(deletePost.id)
      toast.success('Article supprimé')
      setDeletePost(null); load()
    } catch {
      if (isMock) { toast.success('Supprimé (démo)'); setDeletePost(null) }
    } finally { setActionLoading(false) }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Blog"
        subtitle={`${items.length} articles${isMock ? ' (démo)' : ''}`}
        action={<button onClick={openNew} className="btn-gold flex items-center gap-2"><Plus size={16} /> Nouvel article</button>}
      />
      {isMock && <MockBanner />}

      <div className="glass-card p-4 mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un article…" />
      </div>

      {loading ? <div className="p-6"><Skeleton rows={4} /></div> : !filtered.length
        ? <Empty icon={FileText} message="Aucun article" />
        : (
          <div className="space-y-3">
            {filtered.map(p => (
              <div key={p.id} className="glass-card p-5 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-display font-semibold text-primary text-base">{p.title}</h3>
                    <Badge value={p.is_published ? 'active' : 'draft'} />
                  </div>
                  <p className="text-sm text-secondary line-clamp-2 mb-2">{p.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span>Par {p.author?.full_name}</span>
                    <span>Créé le {fmtDate(p.created_at)}</span>
                    {p.published_at && <span>Publié le {fmtDate(p.published_at)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handlePublishToggle(p)} title={p.is_published ? 'Dépublier' : 'Publier'}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all
                      ${p.is_published ? 'hover:bg-orange-500/10 text-orange-400' : 'hover:bg-green-500/10 text-green-400'}`}>
                    {p.is_published ? <EyeOff size={15} /> : <Globe size={15} />}
                  </button>
                  <button onClick={() => openEdit(p)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all">
                    <Edit size={15} />
                  </button>
                  <button onClick={() => setDeletePost(p)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Create/Edit Modal */}
      <Modal open={!!editPost} onClose={() => setEditPost(null)} title={isNew ? 'Nouvel article' : 'Modifier l\'article'} size="xl">
        {editPost && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Titre (FR) *</label>
                <input value={editPost.title || ''} onChange={e => setEditPost(p => ({ ...p, title: e.target.value }))}
                  className="input-glass" placeholder="Titre en français" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Titre (EN)</label>
                <input value={editPost.title_en || ''} onChange={e => setEditPost(p => ({ ...p, title_en: e.target.value }))}
                  className="input-glass" placeholder="Title in English" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Extrait</label>
              <textarea value={editPost.excerpt || ''} onChange={e => setEditPost(p => ({ ...p, excerpt: e.target.value }))}
                rows={2} className="input-glass resize-none" placeholder="Résumé court de l'article" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Contenu (Markdown)</label>
              <textarea value={editPost.content || ''} onChange={e => setEditPost(p => ({ ...p, content: e.target.value }))}
                rows={10} className="input-glass resize-y font-mono text-xs" placeholder="Contenu de l'article en Markdown…" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setEditPost(p => ({ ...p, is_published: !p?.is_published }))}
                  className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${editPost.is_published ? 'bg-gold' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${editPost.is_published ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-secondary">Publier immédiatement</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditPost(null)} className="btn-glass flex-1" disabled={actionLoading}>Annuler</button>
              <button onClick={handleSave} className="btn-gold flex-1" disabled={actionLoading}>
                {actionLoading ? <Spinner /> : isNew ? 'Créer l\'article' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm delete */}
      <Confirm open={!!deletePost} onClose={() => setDeletePost(null)} onConfirm={handleDelete}
        title="Supprimer l'article"
        message={`Êtes-vous sûr de vouloir supprimer "${deletePost?.title}" ? Cette action est irréversible.`}
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
