'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  evenements as evtApi,
  type EvenementAdmin, type DetailField,
} from '@/lib/api'
import {
  Modal, Confirm, Badge, PageHeader, Skeleton, Empty, SearchBar,
  useToast, fmtDate, fmtAmount,
} from '@/components/ui'
import {
  Ticket, Plus, Eye, Trash2, Filter, ImageIcon, X, MapPin, ScanLine,
} from 'lucide-react'
import { toLocalInput, slugify, num, Field, Cover } from './shared'

const emptyDetail: DetailField = { name: '', type: 'text', label: '', value: '' }

export default function EvenementsPage() {
  const toast = useToast()
  const router = useRouter()

  const [items, setItems] = useState<EvenementAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState('')

  const [form, setForm] = useState<Partial<EvenementAdmin> | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<EvenementAdmin | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (statut) p.set('statut', statut)
      p.set('page_size', '100')
      const res = await evtApi.list(p.toString())
      setItems(Array.isArray(res) ? res : res.results)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(e =>
    !search ||
    e.titre.toLowerCase().includes(search.toLowerCase()) ||
    (e.lieu || '').toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setForm({
      titre: '', titre_en: '', slug: '', lieu: '',
      description: '', description_en: '',
      date_debut: '', date_fin: '', date_fin_vente: '',
      details: { fields: [] },
    })
    setCoverFile(null)
    setCoverPreview(null)
  }

  const onCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Le fichier doit être une image'); return }
    if (coverPreview && coverFile) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const details = (form?.details && 'fields' in form.details ? form.details.fields : []) as DetailField[]
  const setDetails = (fields: DetailField[]) =>
    setForm(p => ({ ...p, details: { fields } }))

  const handleSave = async () => {
    if (!form?.titre?.trim()) { toast.error('Le titre est requis'); return }
    if (!form.date_debut || !form.date_fin || !form.date_fin_vente) {
      toast.error('Les trois dates sont requises'); return
    }
    const cleanFields = details
      .filter(f => f.label.trim() && (f.value || '').trim())
      .map(f => ({ ...f, name: f.name.trim() || slugify(f.label), type: f.type || 'text' }))

    setSaving(true)
    try {
      const created = await evtApi.create({
        ...form,
        slug: form.slug?.trim() || slugify(form.titre),
        details: { fields: cleanFields },
      })
      if (coverFile) await evtApi.uploadCover(created.id, coverFile)
      toast.success('Évènement créé')
      setForm(null); setCoverFile(null); setCoverPreview(null)
      router.push(`/evenements/${created.id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await evtApi.delete(toDelete.id)
      toast.success('Évènement supprimé')
      setToDelete(null); load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Évènements"
        subtitle={`${items.length} évènement${items.length > 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/controle-tickets')}
              className="btn-glass flex items-center gap-2"
            >
              <ScanLine size={15} /> Contrôler des tickets
            </button>
            <button onClick={openNew} className="btn-gold flex items-center gap-2">
              <Plus size={15} /> Nouvel évènement
            </button>
          </div>
        }
      />

      <div className="glass-card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Titre, lieu…" />
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted" />
          <select
            title="Filtrer par statut"
            value={statut}
            onChange={e => setStatut(e.target.value)}
            className="input-glass w-auto text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="brouillon">Brouillon</option>
            <option value="publie">Publié</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <div className="p-6"><Skeleton /></div> : !filtered.length
            ? <Empty icon={Ticket} message="Aucun évènement" />
            : (
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>Évènement</th><th>Date</th><th>Fin des ventes</th>
                    <th>Statut</th><th>Tickets vendus</th><th>Revenus</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Cover url={e.cover} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-primary truncate">{e.titre}</p>
                            {e.lieu && (
                              <p className="text-xs text-muted flex items-center gap-1 truncate">
                                <MapPin size={11} /> {e.lieu}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-secondary">{fmtDate(e.date_debut)}</td>
                      <td className="text-xs text-secondary">{fmtDate(e.date_fin_vente)}</td>
                      <td><Badge value={e.statut} /></td>
                      <td className="text-sm font-medium text-primary">{e.tickets_vendus}</td>
                      <td className="text-sm font-semibold text-gold">
                        {fmtAmount(num(e.evente_balance))}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            title="Ouvrir"
                            onClick={() => router.push(`/evenements/${e.id}`)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all"
                          >
                            <Eye size={14} />
                          </button>
                          {e.statut === 'brouillon' && (
                            <button
                              title="Supprimer"
                              onClick={() => setToDelete(e)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-all"
                            >
                              <Trash2 size={14} />
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
      </div>

      {/* ── Création ─────────────────────────────────────────────────────── */}
      <Modal open={!!form} onClose={() => setForm(null)} title="Nouvel évènement" size="lg">
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Titre *">
                <input
                  className="input-glass w-full"
                  value={form.titre || ''}
                  onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
                  placeholder="Concert BankVi Live"
                />
              </Field>
              <Field label="Titre (anglais)">
                <input
                  className="input-glass w-full"
                  value={form.titre_en || ''}
                  onChange={e => setForm(p => ({ ...p, titre_en: e.target.value }))}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Slug" hint="Généré depuis le titre si vide">
                <input
                  className="input-glass w-full"
                  value={form.slug || ''}
                  onChange={e => setForm(p => ({ ...p, slug: slugify(e.target.value) }))}
                  placeholder="concert-bankvi-live"
                />
              </Field>
              <Field label="Lieu">
                <input
                  className="input-glass w-full"
                  value={form.lieu || ''}
                  onChange={e => setForm(p => ({ ...p, lieu: e.target.value }))}
                  placeholder="Palais des Congrès, Lomé"
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Début *">
                <input
                  title="Début"
                  type="datetime-local"
                  className="input-glass w-full"
                  value={toLocalInput(form.date_debut)}
                  onChange={e => setForm(p => ({ ...p, date_debut: e.target.value }))}
                />
              </Field>
              <Field label="Fin *">
                <input
                  title="Fin"
                  type="datetime-local"
                  className="input-glass w-full"
                  value={toLocalInput(form.date_fin)}
                  onChange={e => setForm(p => ({ ...p, date_fin: e.target.value }))}
                />
              </Field>
              <Field label="Fin des ventes *" hint="Doit précéder le début">
                <input
                  title="Fin des ventes"
                  type="datetime-local"
                  className="input-glass w-full"
                  value={toLocalInput(form.date_fin_vente)}
                  onChange={e => setForm(p => ({ ...p, date_fin_vente: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                className="input-glass w-full min-h-[80px]"
                value={form.description || ''}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Field>

            {/* Cover */}
            <Field label="Image de couverture">
              {coverPreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden glass">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Aperçu" className="w-full h-full object-cover" />
                  <button
                    title="Retirer"
                    onClick={() => { setCoverFile(null); setCoverPreview(null) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="glass rounded-xl h-28 flex flex-col items-center justify-center gap-2 cursor-pointer text-muted hover:text-gold transition-all">
                  <ImageIcon size={22} />
                  <span className="text-xs">Choisir une image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onCoverSelect} />
                </label>
              )}
            </Field>

            {/* Détails libres */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted uppercase tracking-wide">Détails personnalisés</p>
                <button
                  onClick={() => setDetails([...details, { ...emptyDetail }])}
                  className="btn-glass text-xs px-2 py-1 flex items-center gap-1"
                >
                  <Plus size={12} /> Ajouter
                </button>
              </div>
              {details.length === 0 && (
                <p className="text-xs text-muted">Aucun détail. Ex : Organisateur, Dress code, Âge minimum…</p>
              )}
              <div className="space-y-2">
                {details.map((f, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="input-glass flex-1"
                      placeholder="Libellé (ex : Organisateur)"
                      value={f.label}
                      onChange={e => {
                        const next = [...details]
                        next[i] = { ...f, label: e.target.value, name: slugify(e.target.value) }
                        setDetails(next)
                      }}
                    />
                    <input
                      className="input-glass flex-1"
                      placeholder="Valeur"
                      value={f.value || ''}
                      onChange={e => {
                        const next = [...details]
                        next[i] = { ...f, value: e.target.value }
                        setDetails(next)
                      }}
                    />
                    <button
                      title="Retirer ce détail"
                      onClick={() => setDetails(details.filter((_, j) => j !== i))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-xl p-3 text-xs text-muted leading-relaxed">
              L&apos;évènement est créé en <strong className="text-primary">brouillon</strong>.
              Ajoutez ensuite les types de tickets, puis publiez-le. Une fois publié,
              les prix et les stocks ne sont plus modifiables.
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setForm(null)} className="btn-glass flex-1" disabled={saving}>
                Annuler
              </button>
              <button onClick={handleSave} className="btn-gold flex-1" disabled={saving}>
                {saving ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer l'évènement"
        message={`Supprimer définitivement « ${toDelete?.titre} » ? Cette action est irréversible.`}
        danger
        loading={deleting}
      />
    </div>
  )
}
