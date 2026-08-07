'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { campagnes as campagneApi, type CampagneFormulaire, type CampagneReponse } from '@/lib/api'
import { PageHeader, Skeleton, Empty, useToast, fmtDateTime } from '@/components/ui'
import { ArrowLeft, Inbox } from 'lucide-react'

export default function CampagneReponsesPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const toast = useToast()
  const [campagne, setCampagne] = useState<CampagneFormulaire | null>(null)
  const [reponses, setReponses] = useState<CampagneReponse[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="p-6 lg:p-8">
      <button onClick={() => router.push('/campagne')} className="flex items-center gap-2 text-sm text-muted hover:text-gold mb-4">
        <ArrowLeft size={14} /> Retour aux avis
      </button>
      <PageHeader
        title={campagne?.title ?? '...'}
        subtitle={`${reponses.length} réponse${reponses.length > 1 ? 's' : ''}`}
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
    </div>
  )
}