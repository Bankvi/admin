'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  evenements as evtApi, typesTickets as ticketApi, mediaUrl,
  type EvenementAdmin, type TypeTicketAdmin, type EvenementStats,
  type ScanEntry, type DetailField,
} from '@/lib/api'
import {
  Modal, Confirm, Badge, Skeleton, Empty, useToast,
  fmtDate, fmtDateTime, fmtAmount,
} from '@/components/ui'
import {
  ArrowLeft, Ticket, Plus, Edit, Trash2, Globe, Ban, Save,
  ImageIcon, X, MapPin, Calendar, Wallet, ScanLine, PiggyBank,
} from 'lucide-react'
import { toLocalInput, slugify, num, Field, Cover, InfoBox } from '../shared'

const emptyDetail: DetailField = { name: '', type: 'text', label: '', value: '' }

const emptyTicket: Partial<TypeTicketAdmin> = {
  nom: '', description: '', prix: '', promo_percent: 0,
  stock_initial: 0, is_active: true, ordre: 0, details: { fields: [] },
}

export default function EvenementDetailPage() {
  const toast = useToast()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [evt, setEvt] = useState<EvenementAdmin | null>(null)
  const [stats, setStats] = useState<EvenementStats | null>(null)
  const [scans, setScans] = useState<ScanEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Édition de l'évènement
  const [edit, setEdit] = useState<Partial<EvenementAdmin> | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  // Types de tickets
  const [ticketForm, setTicketForm] = useState<Partial<TypeTicketAdmin> | null>(null)
  const [ticketIsNew, setTicketIsNew] = useState(false)
  const [ticketImage, setTicketImage] = useState<File | null>(null)
  const [ticketImagePreview, setTicketImagePreview] = useState<string | null>(null)
  const [ticketToDelete, setTicketToDelete] = useState<TypeTicketAdmin | null>(null)

  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'publier' | 'annuler' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const e = await evtApi.detail(id)
      setEvt(e)
      const [s, sc] = await Promise.all([
        evtApi.stats(id).catch(() => null),
        evtApi.scans(id).catch(() => [] as ScanEntry[]),
      ])
      setStats(s)
      setScans(Array.isArray(sc) ? sc : sc.results)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Évènement introuvable')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => { load() }, [load])

  const verrouille = !!evt && evt.statut !== 'brouillon'

  // ── Édition de l'évènement ───────────────────────────────────
  const openEdit = () => {
    if (!evt) return
    setEdit({ ...evt, details: evt.details && 'fields' in evt.details ? evt.details : { fields: [] } })
    setCoverFile(null)
    setCoverPreview(mediaUrl(evt.cover))
  }

  const editDetails = (edit?.details && 'fields' in edit.details ? edit.details.fields : []) as DetailField[]
  const setEditDetails = (fields: DetailField[]) =>
    setEdit(p => ({ ...p, details: { fields } }))

  const saveEvenement = async () => {
    if (!edit?.titre?.trim()) { toast.error('Le titre est requis'); return }
    setSaving(true)
    try {
      const cleanFields = editDetails
        .filter(f => f.label.trim() && (f.value || '').trim())
        .map(f => ({ ...f, name: f.name.trim() || slugify(f.label), type: f.type || 'text' }))
      await evtApi.update(id, {
        titre: edit.titre,
        titre_en: edit.titre_en,
        lieu: edit.lieu,
        description: edit.description,
        description_en: edit.description_en,
        date_debut: edit.date_debut,
        date_fin: edit.date_fin,
        date_fin_vente: edit.date_fin_vente,
        details: { fields: cleanFields },
      })
      if (coverFile) await evtApi.uploadCover(id, coverFile)
      toast.success('Évènement mis à jour')
      setEdit(null); setCoverFile(null); load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  // ── Publier / Annuler ────────────────────────────────────────
  const runAction = async () => {
    if (!confirmAction) return
    setSaving(true)
    try {
      if (confirmAction === 'publier') {
        await evtApi.publier(id)
        toast.success('Évènement publié')
      } else {
        await evtApi.annuler(id)
        toast.success('Évènement annulé — épargnes remboursées')
      }
      setConfirmAction(null); load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  // ── Types de tickets ─────────────────────────────────────────
  const openNewTicket = () => {
    setTicketForm({ ...emptyTicket })
    setTicketIsNew(true)
    setTicketImage(null)
    setTicketImagePreview(null)
  }
  const openEditTicket = (t: TypeTicketAdmin) => {
    setTicketForm({ ...t, details: t.details && 'fields' in t.details ? t.details : { fields: [] } })
    setTicketIsNew(false)
    setTicketImage(null)
    setTicketImagePreview(mediaUrl(t.image))
  }

  const ticketDetails = (ticketForm?.details && 'fields' in ticketForm.details
    ? ticketForm.details.fields : []) as DetailField[]
  const setTicketDetails = (fields: DetailField[]) =>
    setTicketForm(p => ({ ...p, details: { fields } }))

  const saveTicket = async () => {
    if (!ticketForm?.nom?.trim()) { toast.error('Le nom du ticket est requis'); return }
    if (num(ticketForm.prix) <= 0) { toast.error('Le prix doit être supérieur à 0'); return }
    if (ticketIsNew && num(ticketForm.stock_initial) <= 0) {
      toast.error('Le stock doit être supérieur à 0'); return
    }
    setSaving(true)
    try {
      const cleanFields = ticketDetails
        .filter(f => f.label.trim() && (f.value || '').trim())
        .map(f => ({ ...f, name: f.name.trim() || slugify(f.label), type: f.type || 'text' }))

      let ticketId = ticketForm.id
      if (ticketIsNew) {
        const created = await ticketApi.create(id, {
          nom: ticketForm.nom,
          nom_en: ticketForm.nom_en,
          description: ticketForm.description,
          description_en: ticketForm.description_en,
          prix: String(num(ticketForm.prix)),
          promo_percent: String(num(ticketForm.promo_percent)),
          stock_initial: num(ticketForm.stock_initial),
          is_active: ticketForm.is_active !== false,
          ordre: num(ticketForm.ordre),
          details: { fields: cleanFields },
        })
        ticketId = created.id
        toast.success('Type de ticket créé')
      } else {
        // Après publication : seuls la promo, le libellé et l'activation restent modifiables
        const payload: Partial<TypeTicketAdmin> = {
          nom: ticketForm.nom,
          nom_en: ticketForm.nom_en,
          description: ticketForm.description,
          description_en: ticketForm.description_en,
          promo_percent: String(num(ticketForm.promo_percent)),
          is_active: ticketForm.is_active !== false,
          ordre: num(ticketForm.ordre),
          details: { fields: cleanFields },
        }
        if (!verrouille) payload.prix = String(num(ticketForm.prix))
        await ticketApi.update(ticketForm.id!, payload)
        toast.success('Type de ticket mis à jour')
      }
      if (ticketImage && ticketId) await ticketApi.uploadImage(ticketId, ticketImage)
      setTicketForm(null); setTicketImage(null); load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const deleteTicket = async () => {
    if (!ticketToDelete) return
    setSaving(true)
    try {
      await ticketApi.delete(ticketToDelete.id)
      toast.success('Type de ticket supprimé')
      setTicketToDelete(null); load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  // ── Rendu ────────────────────────────────────────────────────
  if (loading) {
    return <div className="p-6 lg:p-8"><Skeleton rows={8} /></div>
  }
  if (!evt) {
    return (
      <div className="p-6 lg:p-8">
        <Empty icon={Ticket} message="Évènement introuvable" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* En-tête */}
      <div className="flex items-start gap-4 mb-8">
        <button
          title="Retour"
          onClick={() => router.push('/evenements')}
          className="w-9 h-9 flex items-center justify-center rounded-xl btn-glass flex-shrink-0 mt-1"
        >
          <ArrowLeft size={16} />
        </button>
        <Cover url={evt.cover} size={64} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold text-primary">{evt.titre}</h1>
            <Badge value={evt.statut} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} /> {fmtDateTime(evt.date_debut)}
            </span>
            {evt.lieu && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} /> {evt.lieu}
              </span>
            )}
            <span>Ventes jusqu&apos;au {fmtDate(evt.date_fin_vente)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={openEdit} className="btn-glass flex items-center gap-2 text-sm">
            <Edit size={14} /> Modifier
          </button>
          {evt.statut === 'brouillon' && (
            <button
              onClick={() => setConfirmAction('publier')}
              className="btn-gold flex items-center gap-2 text-sm"
            >
              <Globe size={14} /> Publier
            </button>
          )}
          {(evt.statut === 'publie' || evt.statut === 'termine') && (
            <button
              onClick={() => setConfirmAction('annuler')}
              className="btn-danger flex items-center gap-2 text-sm"
            >
              <Ban size={14} /> Annuler
            </button>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MiniStat
          icon={Wallet}
          label="Revenus"
          value={fmtAmount(num(stats?.evente_balance ?? evt.evente_balance))}
        />
        <MiniStat icon={Ticket} label="Tickets vendus" value={String(evt.tickets_vendus)} />
        <MiniStat icon={ScanLine} label="Tickets scannés" value={String(stats?.tickets_scannes ?? evt.nb_scans)} />
        <MiniStat
          icon={PiggyBank}
          label="Épargnes actives"
          value={String(stats?.tironiennes.actives ?? 0)}
        />
      </div>

      {/* Épargnes évènement */}
      {stats && stats.tironiennes.total > 0 && (
        <div className="glass-card p-5 mb-6">
          <h2 className="font-display text-lg font-semibold text-primary mb-4">
            Épargnes Tironienne
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <InfoBox label="Total" value={stats.tironiennes.total} />
            <InfoBox label="Actives" value={stats.tironiennes.actives} />
            <InfoBox label="Terminées" value={stats.tironiennes.terminees} />
            <InfoBox label="Annulées" value={stats.tironiennes.annulees} />
            <InfoBox label="Épargne en cours" value={fmtAmount(stats.tironiennes.epargne_en_cours)} />
          </div>
        </div>
      )}

      {/* Types de tickets */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="flex items-center justify-between p-5 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-primary">Types de tickets</h2>
            <p className="text-xs text-muted mt-0.5">
              {verrouille
                ? 'Évènement lancé : les prix et les stocks sont figés. Seule la promo reste modifiable.'
                : 'Le stock est figé dès la création du type de ticket.'}
            </p>
          </div>
          {!verrouille && (
            <button onClick={openNewTicket} className="btn-gold flex items-center gap-2 text-sm">
              <Plus size={14} /> Ajouter
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {!(evt.types_tickets || []).length
            ? <Empty icon={Ticket} message="Aucun type de ticket. Ajoutez-en avant de publier." />
            : (
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>Ticket</th><th>Prix</th><th>Promo</th><th>Prix effectif</th>
                    <th>Stock</th><th>Réservé</th><th>Vendu</th><th>Dispo</th><th>Actif</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {(evt.types_tickets || []).map(t => (
                    <tr key={t.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Cover url={t.image} size={38} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-primary truncate">{t.nom}</p>
                            {t.description && (
                              <p className="text-xs text-muted truncate max-w-[220px]">{t.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-secondary">{fmtAmount(num(t.prix))}</td>
                      <td className="text-sm">
                        {num(t.promo_percent) > 0
                          ? <span className="badge badge-verified">-{num(t.promo_percent)}%</span>
                          : <span className="text-muted text-xs">—</span>}
                      </td>
                      <td className="text-sm font-semibold text-gold">{fmtAmount(num(t.prix_effectif))}</td>
                      <td className="text-sm text-secondary">{t.stock_initial}</td>
                      <td className="text-sm text-secondary">{t.stock_reserve}</td>
                      <td className="text-sm text-secondary">{t.stock_vendu}</td>
                      <td className="text-sm font-medium text-primary">{t.stock_disponible}</td>
                      <td>
                        <Badge value={t.is_active ? 'active' : 'inactive'} />
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            title="Modifier"
                            onClick={() => openEditTicket(t)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-gold transition-all"
                          >
                            <Edit size={14} />
                          </button>
                          {t.stock_vendu === 0 && t.stock_reserve === 0 && (
                            <button
                              title="Supprimer"
                              onClick={() => setTicketToDelete(t)}
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

      {/* Scans */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 pb-4">
          <h2 className="font-display text-lg font-semibold text-primary">Contrôles à l&apos;entrée</h2>
          <p className="text-xs text-muted mt-0.5">{scans.length} ticket(s) scanné(s)</p>
        </div>
        <div className="overflow-x-auto">
          {!scans.length
            ? <Empty icon={ScanLine} message="Aucun ticket scanné pour le moment" />
            : (
              <table className="table-glass">
                <thead>
                  <tr><th>Code</th><th>Porteur</th><th>Type</th><th>Scanné par</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {scans.slice(0, 50).map(s => (
                    <tr key={s.id}>
                      <td className="text-sm font-mono text-gold">{s.code_ticket}</td>
                      <td className="text-sm text-primary">{s.nom_porteur}</td>
                      <td className="text-xs text-secondary">{s.type_ticket_nom}</td>
                      <td className="text-xs text-secondary">{s.scanne_par_nom || '—'}</td>
                      <td className="text-xs text-secondary">{fmtDateTime(s.scanne_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {/* ── Modal édition évènement ──────────────────────────────────── */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Modifier l'évènement" size="lg">
        {edit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Titre *">
                <input
                  className="input-glass w-full"
                  value={edit.titre || ''}
                  onChange={e => setEdit(p => ({ ...p, titre: e.target.value }))}
                />
              </Field>
              <Field label="Lieu">
                <input
                  className="input-glass w-full"
                  value={edit.lieu || ''}
                  onChange={e => setEdit(p => ({ ...p, lieu: e.target.value }))}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Début">
                <input
                  title="Début"
                  type="datetime-local"
                  className="input-glass w-full"
                  value={toLocalInput(edit.date_debut)}
                  onChange={e => setEdit(p => ({ ...p, date_debut: e.target.value }))}
                />
              </Field>
              <Field label="Fin">
                <input
                  title="Fin"
                  type="datetime-local"
                  className="input-glass w-full"
                  value={toLocalInput(edit.date_fin)}
                  onChange={e => setEdit(p => ({ ...p, date_fin: e.target.value }))}
                />
              </Field>
              <Field label="Fin des ventes">
                <input
                  title="Fin des ventes"
                  type="datetime-local"
                  className="input-glass w-full"
                  value={toLocalInput(edit.date_fin_vente)}
                  onChange={e => setEdit(p => ({ ...p, date_fin_vente: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                className="input-glass w-full min-h-[80px]"
                value={edit.description || ''}
                onChange={e => setEdit(p => ({ ...p, description: e.target.value }))}
              />
            </Field>

            <Field label="Image de couverture">
              {coverPreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden glass">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Aperçu" className="w-full h-full object-cover" />
                  <label className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs cursor-pointer">
                    Remplacer
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        setCoverFile(f); setCoverPreview(URL.createObjectURL(f))
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className="glass rounded-xl h-28 flex flex-col items-center justify-center gap-2 cursor-pointer text-muted hover:text-gold transition-all">
                  <ImageIcon size={22} />
                  <span className="text-xs">Choisir une image</span>
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setCoverFile(f); setCoverPreview(URL.createObjectURL(f))
                    }}
                  />
                </label>
              )}
            </Field>

            <DetailsEditor
              fields={editDetails}
              onChange={setEditDetails}
              hint="Ex : Organisateur, Dress code, Âge minimum…"
            />

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEdit(null)} className="btn-glass flex-1" disabled={saving}>
                Annuler
              </button>
              <button onClick={saveEvenement} className="btn-gold flex-1 flex items-center justify-center gap-2" disabled={saving}>
                <Save size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal type de ticket ─────────────────────────────────────── */}
      <Modal
        open={!!ticketForm}
        onClose={() => setTicketForm(null)}
        title={ticketIsNew ? 'Nouveau type de ticket' : 'Modifier le type de ticket'}
        size="lg"
      >
        {ticketForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom *">
                <input
                  className="input-glass w-full"
                  value={ticketForm.nom || ''}
                  onChange={e => setTicketForm(p => ({ ...p, nom: e.target.value }))}
                  placeholder="VIP"
                />
              </Field>
              <Field label="Ordre d'affichage">
                <input
                  title="Ordre"
                  type="number"
                  className="input-glass w-full"
                  value={String(ticketForm.ordre ?? 0)}
                  onChange={e => setTicketForm(p => ({ ...p, ordre: Number(e.target.value) }))}
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                className="input-glass w-full min-h-[70px]"
                value={ticketForm.description || ''}
                onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Accès loge + boisson offerte"
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field
                label="Prix (XOF) *"
                hint={verrouille && !ticketIsNew ? 'Figé — évènement lancé' : undefined}
              >
                <input
                  title="Prix"
                  type="number"
                  className="input-glass w-full"
                  value={String(ticketForm.prix ?? '')}
                  disabled={verrouille && !ticketIsNew}
                  onChange={e => setTicketForm(p => ({ ...p, prix: e.target.value }))}
                />
              </Field>
              <Field label="Promo (%)" hint="Réduction BankVi">
                <input
                  title="Promo"
                  type="number"
                  min={0}
                  max={100}
                  className="input-glass w-full"
                  value={String(ticketForm.promo_percent ?? 0)}
                  onChange={e => setTicketForm(p => ({ ...p, promo_percent: e.target.value }))}
                />
              </Field>
              <Field
                label="Stock *"
                hint={ticketIsNew ? 'Non modifiable après création' : 'Figé à la création'}
              >
                <input
                  title="Stock"
                  type="number"
                  className="input-glass w-full"
                  value={String(ticketForm.stock_initial ?? 0)}
                  disabled={!ticketIsNew}
                  onChange={e => setTicketForm(p => ({ ...p, stock_initial: Number(e.target.value) }))}
                />
              </Field>
            </div>

            {num(ticketForm.prix) > 0 && (
              <div className="glass rounded-xl p-3 text-sm">
                <span className="text-muted">Prix payé par l&apos;utilisateur : </span>
                <span className="font-semibold text-gold">
                  {fmtAmount(Math.round(num(ticketForm.prix) * (100 - num(ticketForm.promo_percent)) / 100))}
                </span>
              </div>
            )}

            <Field label="Image du ticket">
              {ticketImagePreview ? (
                <div className="relative w-40 h-28 rounded-xl overflow-hidden glass">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ticketImagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                  <button
                    title="Retirer"
                    onClick={() => { setTicketImage(null); setTicketImagePreview(null) }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/60 text-white flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="glass rounded-xl w-40 h-28 flex flex-col items-center justify-center gap-2 cursor-pointer text-muted hover:text-gold transition-all">
                  <ImageIcon size={20} />
                  <span className="text-xs">Choisir</span>
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setTicketImage(f); setTicketImagePreview(URL.createObjectURL(f))
                    }}
                  />
                </label>
              )}
            </Field>

            <DetailsEditor
              fields={ticketDetails}
              onChange={setTicketDetails}
              hint="Ex : Accès, Place assise, Boisson incluse…"
            />

            <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={ticketForm.is_active !== false}
                onChange={e => setTicketForm(p => ({ ...p, is_active: e.target.checked }))}
              />
              Ticket visible dans l&apos;application
            </label>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setTicketForm(null)} className="btn-glass flex-1" disabled={saving}>
                Annuler
              </button>
              <button onClick={saveTicket} className="btn-gold flex-1" disabled={saving}>
                {saving ? 'Enregistrement…' : ticketIsNew ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={confirmAction === 'publier'}
        onClose={() => setConfirmAction(null)}
        onConfirm={runAction}
        title="Publier l'évènement"
        message="L'évènement deviendra visible dans l'application et les épargnes pourront être lancées. Les prix et les stocks seront alors figés."
        loading={saving}
      />
      <Confirm
        open={confirmAction === 'annuler'}
        onClose={() => setConfirmAction(null)}
        onConfirm={runAction}
        title="Annuler l'évènement"
        message="Toutes les épargnes en cours seront remboursées dans les portefeuilles et le stock réservé sera libéré. Cette action est irréversible."
        danger
        loading={saving}
      />
      <Confirm
        open={!!ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        onConfirm={deleteTicket}
        title="Supprimer le type de ticket"
        message={`Supprimer « ${ticketToDelete?.nom} » ? Possible uniquement car aucun ticket n'est vendu ni réservé.`}
        danger
        loading={saving}
      />
    </div>
  )
}

// ── Sous-composants ────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: string
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className="text-gold" />
        <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-display text-xl font-bold text-primary">{value}</p>
    </div>
  )
}

function DetailsEditor({ fields, onChange, hint }: {
  fields: DetailField[]; onChange: (f: DetailField[]) => void; hint?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted uppercase tracking-wide">Détails personnalisés</p>
        <button
          onClick={() => onChange([...fields, { ...emptyDetail }])}
          className="btn-glass text-xs px-2 py-1 flex items-center gap-1"
        >
          <Plus size={12} /> Ajouter
        </button>
      </div>
      {fields.length === 0 && hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              className="input-glass flex-1"
              placeholder="Libellé"
              value={f.label}
              onChange={e => {
                const next = [...fields]
                next[i] = { ...f, label: e.target.value, name: slugify(e.target.value) }
                onChange(next)
              }}
            />
            <input
              className="input-glass flex-1"
              placeholder="Valeur"
              value={f.value || ''}
              onChange={e => {
                const next = [...fields]
                next[i] = { ...f, value: e.target.value }
                onChange(next)
              }}
            />
            <button
              title="Retirer ce détail"
              onClick={() => onChange(fields.filter((_, j) => j !== i))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
