'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { campagnes as campagneApi, type CampagneFormulaire, type CampagneReponse } from '@/lib/api'
import { PageHeader, Skeleton, Empty, useToast, fmtDateTime } from '@/components/ui'
import { ArrowLeft, Inbox, Download } from 'lucide-react'
import { Modal } from '@/components/ui' 



export default function CampagneReponsesPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const toast = useToast()
  const [campagne, setCampagne] = useState<CampagneFormulaire | null>(null)
  const [reponses, setReponses] = useState<CampagneReponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showExport, setShowExport] = useState(false)
  const [selectedCols, setSelectedCols] = useState<string[]>([])


  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, r] = await Promise.all([campagneApi.detail(slug), campagneApi.reponses(slug)])
      setCampagne(c)
      setReponses(Array.isArray(r) ? r : r.results)
    } catch { toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }, [slug])

  useEffect(() => { load() }, [load])

  const columns = campagne?.formulaire?.fields ?? []

  const exportableColumns = [
    ...columns.map(c => ({ key: c.name, label: c.label })),
    { key: 'created_at', label: 'Date' },
  ]

  const toggleCol = (key: string) =>
    setSelectedCols(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key])

  const openExport = () => {
    setSelectedCols(exportableColumns.map(c => c.key)) // tout coché par défaut
    setShowExport(true)
  }

  const csvEscape = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const downloadCSV = () => {
    const cols = exportableColumns.filter(c => selectedCols.includes(c.key))
    if (!cols.length) return

    const header = cols.map(c => csvEscape(c.label)).join(',')
    const rows = reponses.map(r =>
      cols.map(c =>
        csvEscape(c.key === 'created_at' ? fmtDateTime(r.created_at) : r.reponse_data?.[c.key])
      ).join(',')
    )
    const csv = '\uFEFF' + [header, ...rows].join('\n') // \uFEFF = BOM pour Excel (accents)

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${campagne?.slug || 'avis'}-reponses.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExport(false)
  }

  return (
    <div className="p-6 lg:p-8">
      <button onClick={() => router.push('/campagne')} className="flex items-center gap-2 text-sm text-muted hover:text-gold mb-4">
        <ArrowLeft size={14} /> Retour aux avis
      </button>
      <PageHeader
        title={campagne?.title ?? '...'}
        subtitle={`${reponses.length} réponse${reponses.length > 1 ? 's' : ''}`}
        action={
          reponses.length > 0 && (
            <button onClick={openExport} className="btn-glass flex items-center gap-2">
              <Download size={15} /> Exporter CSV
            </button>
          )
        }
      />

      {loading ? <div className="p-6"><Skeleton rows={5} /></div> : !reponses.length
        ? <Empty icon={Inbox} message="Aucune réponse pour le moment" />
        : (
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-muted uppercase tracking-wide">
                  {columns.map(c => <th key={c.name} className="px-4 py-3 font-semibold whitespace-nowrap">{c.label}</th>)}
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody>
                {reponses.map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    {columns.map(c => (
                      <td key={c.name} className="px-4 py-3 text-secondary whitespace-nowrap">
                        {r.reponse_data?.[c.name] ?? '—'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>   
        )}

        <Modal open={showExport} onClose={() => setShowExport(false)} title="Exporter en CSV" size="sm">
              <div className="space-y-4">
                <p className="text-sm text-muted">Choisis les colonnes à inclure dans l'export.</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {exportableColumns.map(c => (
                    <label key={c.key} className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCols.includes(c.key)}
                        onChange={() => toggleCol(c.key)}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowExport(false)} className="btn-glass flex-1">Annuler</button>
                  <button
                    onClick={downloadCSV}
                    disabled={!selectedCols.length}
                    className="btn-gold flex-1 disabled:opacity-50"
                  >
                    Télécharger
                  </button>
                </div>
              </div>
          </Modal>
    </div>
  )
}