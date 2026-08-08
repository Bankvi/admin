'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  scan as scanApi, mediaUrl,
  type ScanResult,
} from '@/lib/api'
import { PageHeader, useToast, fmtDateTime, fmtAmount } from '@/components/ui'
import {
  ScanLine, Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle,
  Search, User, RotateCcw,
} from 'lucide-react'

// L'API BarcodeDetector est native (Chrome/Edge desktop et Android).
// Aucune dépendance npm : si elle est absente, on bascule sur la saisie manuelle.
interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike

function getDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
  return w.BarcodeDetector || null
}

export default function ScanPage() {
  const toast = useToast()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const loopRef = useRef<number | null>(null)
  const busyRef = useRef(false)

  const [cameraSupported, setCameraSupported] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [historique, setHistorique] = useState<ScanResult[]>([])

  useEffect(() => {
    const setup = async () =>{
      setCameraSupported(!!getDetectorCtor() && typeof navigator !== 'undefined' && !!navigator.mediaDevices)
    }
    setup()
  }, [])

  // ── Envoi au backend ──────────────────────────────────────────
  const envoyer = useCallback(async (contenu: string, consommer: boolean) => {
    const valeur = contenu.trim()
    if (!valeur) return
    setLoading(true)
    try {
      const r = consommer ? await scanApi.valider(valeur) : await scanApi.verifier(valeur)
      setResult(r)
      setHistorique(h => [r, ...h].slice(0, 20))
      if (r.statut === 'VALIDE' && consommer) toast.success('Entrée autorisée')
      else if (r.statut === 'DEJA_UTILISE') toast.error('Ticket déjà utilisé')
      else if (r.statut === 'INVALIDE') toast.error('Ticket invalide')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur'
      toast.error(msg === 'NETWORK_ERROR' ? 'Backend injoignable' : msg)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Boucle de détection caméra ────────────────────────────────
  const stopCamera = useCallback(() => {
    if (loopRef.current) { window.clearTimeout(loopRef.current); loopRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    const Ctor = getDetectorCtor()
    if (!Ctor) { toast.error('Scan caméra non supporté par ce navigateur'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)

      const detector = new Ctor({ formats: ['qr_code'] })
      const tick = async () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || !streamRef.current) return
        if (!busyRef.current && video.readyState === 4) {
          busyRef.current = true
          try {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              const codes = await detector.detect(canvas)
              if (codes.length > 0 && codes[0].rawValue) {
                stopCamera()
                await envoyer(codes[0].rawValue, true)
                busyRef.current = false
                return
              }
            }
          } catch { /* frame ignorée */ }
          busyRef.current = false
        }
        loopRef.current = window.setTimeout(tick, 350)
      }
      tick()
    } catch {
      toast.error("Impossible d'accéder à la caméra")
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envoyer, stopCamera])

  useEffect(() => () => stopCamera(), [stopCamera])

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Contrôle des tickets"
        subtitle="Scannez le QR code présenté par le porteur"
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Colonne gauche : scanner ───────────────────────────── */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <Camera size={17} className="text-gold" /> Caméra
            </h2>

            <div className="relative rounded-xl overflow-hidden bg-black/40 aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${scanning ? '' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {scanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-gold rounded-2xl" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
                </div>
              )}

              {!scanning && (
                <div className="flex flex-col items-center gap-2 text-muted p-6 text-center">
                  <CameraOff size={26} />
                  <p className="text-xs">
                    {cameraSupported
                      ? 'Caméra arrêtée'
                      : "Ce navigateur ne prend pas en charge le scan par caméra. Utilisez la saisie manuelle ci-dessous."}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4">
              {scanning ? (
                <button onClick={stopCamera} className="btn-glass w-full flex items-center justify-center gap-2">
                  <CameraOff size={15} /> Arrêter
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  disabled={!cameraSupported || loading}
                  className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <ScanLine size={15} /> Démarrer le scan
                </button>
              )}
            </div>
          </div>

          {/* Saisie manuelle */}
          <div className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold text-primary mb-1 flex items-center gap-2">
              <Search size={17} className="text-gold" /> Saisie manuelle
            </h2>
            <p className="text-xs text-muted mb-4">
              Collez ici le contenu du QR code (il commence par <code className="text-gold">BKVT1.</code>)
            </p>

            <textarea
              className="input-glass w-full min-h-[90px] font-mono text-xs"
              placeholder="BKVT1.gAAAAAB…"
              value={manual}
              onChange={e => setManual(e.target.value)}
            />

            <div className="flex gap-3 mt-3">
              <button
                onClick={() => envoyer(manual, false)}
                disabled={loading || !manual.trim()}
                className="btn-glass flex-1 disabled:opacity-40"
                title="Vérifier sans consommer le ticket"
              >
                Vérifier
              </button>
              <button
                onClick={() => envoyer(manual, true)}
                disabled={loading || !manual.trim()}
                className="btn-gold flex-1 disabled:opacity-40"
              >
                {loading ? 'Contrôle…' : 'Valider l\u2019entrée'}
              </button>
            </div>
            <p className="text-[11px] text-muted mt-2">
              « Vérifier » consulte l&apos;état du ticket sans le consommer.
              « Valider l&apos;entrée » le marque comme utilisé — action irréversible.
            </p>
          </div>
        </div>

        {/* ── Colonne droite : résultat ───────────────────────────── */}
        <div className="space-y-4">
          <ResultCard result={result} onReset={() => { setResult(null); setManual('') }} />

          {historique.length > 0 && (
            <div className="glass-card p-5">
              <h2 className="font-display text-lg font-semibold text-primary mb-4">
                Derniers contrôles
              </h2>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {historique.map((h, i) => (
                  <div key={i} className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                    <StatutDot statut={h.statut} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-primary truncate">
                        {h.porteur?.nom || h.code_ticket || '—'}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {h.type_ticket || h.message}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted flex-shrink-0">
                      {h.code_ticket || ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sous-composants ────────────────────────────────────────────
function StatutDot({ statut }: { statut: ScanResult['statut'] }) {
  const color = statut === 'VALIDE' ? '#16a34a' : statut === 'DEJA_UTILISE' ? '#ca8a04' : '#dc2626'
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
}

function ResultCard({ result, onReset }: { result: ScanResult | null; onReset: () => void }) {
  if (!result) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center text-center min-h-[260px]">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
          <ScanLine size={28} className="text-muted" />
        </div>
        <p className="text-muted text-sm">
          Le résultat du contrôle s&apos;affichera ici
        </p>
      </div>
    )
  }

  const config = {
    VALIDE: {
      icon: CheckCircle2, color: '#16a34a',
      bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.35)',
      titre: 'Entrée autorisée',
    },
    DEJA_UTILISE: {
      icon: AlertTriangle, color: '#ca8a04',
      bg: 'rgba(234,179,8,0.10)', border: 'rgba(234,179,8,0.35)',
      titre: 'Ticket déjà utilisé',
    },
    INVALIDE: {
      icon: XCircle, color: '#dc2626',
      bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)',
      titre: 'Ticket invalide',
    },
  }[result.statut]

  const Icon = config.icon
  const photo = mediaUrl(result.porteur?.photo || null)

  return (
    <div
      className="glass-card p-6 animate-fade-in"
      style={{ background: config.bg, borderColor: config.border }}
    >
      <div className="flex items-start gap-4 mb-5">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: config.bg }}
        >
          <Icon size={26} style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-xl font-bold" style={{ color: config.color }}>
            {config.titre}
          </p>
          <p className="text-sm text-secondary mt-1 leading-relaxed">{result.message}</p>
        </div>
        <button
          title="Nouveau contrôle"
          onClick={onReset}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-white/10 transition-all flex-shrink-0"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {result.statut !== 'INVALIDE' && (
        <>
          <div className="flex items-center gap-3 mb-4">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl glass flex items-center justify-center">
                <User size={20} className="text-muted" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate">
                {result.porteur?.nom || '—'}
              </p>
              <p className="text-xs text-muted">{result.porteur?.telephone || ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Info label="Code" value={result.code_ticket || '—'} mono />
            <Info label="Type" value={result.type_ticket || '—'} />
            <Info label="Évènement" value={result.evenement || '—'} />
            <Info
              label="Payé"
              value={result.prix_paye !== undefined ? fmtAmount(Number(result.prix_paye)) : '—'}
            />
            {result.statut === 'DEJA_UTILISE' && (
              <>
                <Info label="Scanné par" value={result.scanne_par || '—'} />
                <Info label="Scanné le" value={fmtDateTime(result.scanne_at || null)} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="glass rounded-xl p-2.5">
      <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-xs font-medium text-primary truncate ${mono ? 'font-mono text-gold' : ''}`}>
        {value}
      </p>
    </div>
  )
}
