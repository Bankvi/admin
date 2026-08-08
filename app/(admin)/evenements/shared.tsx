'use client'
import { ReactNode } from 'react'
import { Ticket } from 'lucide-react'
import { mediaUrl } from '@/lib/api'

// ISO → valeur utilisable par <input type="datetime-local">
export function toLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function slugify(s: string) {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function num(v: number | string | null | undefined) {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

// ── Champ de formulaire ───────────────────────────────────────
export function Field({ label, hint, children }: {
  label: string; hint?: string; children: ReactNode
}) {
  return (
    <div>
      <label className="block text-xs text-muted uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  )
}

// ── Vignette de couverture ────────────────────────────────────
export function Cover({ url, size = 44 }: { url: string | null; size?: number }) {
  const src = mediaUrl(url)
  if (!src) {
    return (
      <div
        className="rounded-xl glass flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Ticket size={Math.round(size / 2.8)} className="text-muted" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="rounded-xl object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  )
}

// ── Bloc d'information en lecture seule ───────────────────────
export function InfoBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="glass rounded-xl p-3">
      <p className="text-xs text-muted uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm font-medium text-primary">{value}</div>
    </div>
  )
}
