'use client'
import { useEffect, ReactNode } from 'react'
import { X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
}
export function Modal({ open, onClose, title, size = 'md', children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) { document.addEventListener('keydown', handler); document.body.style.overflow = 'hidden' }
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null
  const sizeClass = { sm: '', md: '', lg: 'modal-box-lg', xl: 'modal-box-xl' }[size]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${sizeClass}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold text-primary">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:text-primary hover:bg-white/10 transition-all">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Confirm dialog ───────────────────────────────────────────
interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  danger?: boolean
  loading?: boolean
}
export function Confirm({ open, onClose, onConfirm, title, message, danger, loading }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-500/10' : 'bg-gold/10'}`}>
          <AlertTriangle size={20} className={danger ? 'text-red-400' : 'text-gold'} />
        </div>
        <p className="text-secondary text-sm leading-relaxed pt-2">{message}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-glass flex-1" disabled={loading}>Annuler</button>
        <button onClick={onConfirm} className={danger ? 'btn-danger flex-1' : 'btn-gold flex-1'} disabled={loading}>
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" /> : 'Confirmer'}
        </button>
      </div>
    </Modal>
  )
}

// ── Badge ─────────────────────────────────────────────────────
const BADGE_MAP: Record<string, string> = {
  verified: 'badge-verified', pending: 'badge-pending', submitted: 'badge-submitted',
  rejected: 'badge-rejected', active: 'badge-active', paused: 'badge-paused',
  completed: 'badge-completed', draft: 'badge-draft', cancelled: 'badge-rejected',
  unread: 'badge-pending', in_progress: 'badge-submitted', resolved: 'badge-verified',
  fixed: 'badge-gold', random: 'badge-submitted', wheel: 'badge-verified',
  locked: 'badge-rejected', semi_flexible: 'badge-submitted',
}
const BADGE_LABELS: Record<string, string> = {
  verified: 'Vérifié', pending: 'En attente', submitted: 'Soumis',
  rejected: 'Rejeté', active: 'Actif', paused: 'Bloqué',
  completed: 'Terminé', draft: 'Brouillon', cancelled: 'Annulé',
  unread: 'Non lu', in_progress: 'En cours', resolved: 'Résolu',
  fixed: 'Rotation fixe', random: 'Aléatoire', wheel: 'Roue',
  locked: 'Bloqué', semi_flexible: 'Semi-flexible',
  monthly: 'Mensuel', weekly: 'Hebdomadaire', daily: 'Quotidien',
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${BADGE_MAP[value] || 'badge-draft'}`}>
      {BADGE_LABELS[value] || value}
    </span>
  )
}

// ── Pagination ───────────────────────────────────────────────
interface PagProps {
  page: number
  total: number
  pageSize: number
  onChange: (p: number) => void
}
export function Pagination({ page, total, pageSize, onChange }: PagProps) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 px-2">
      <span className="text-xs text-muted">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} sur {total}
      </span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg btn-glass disabled:opacity-30">
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          const n = Math.max(1, Math.min(page - 2, pages - 4)) + i
          if (n > pages) return null
          return (
            <button key={n} onClick={() => onChange(n)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all
                ${n === page ? 'btn-gold' : 'btn-glass'}`}>
              {n}
            </button>
          )
        })}
        <button onClick={() => onChange(page + 1)} disabled={page === pages}
          className="w-8 h-8 flex items-center justify-center rounded-lg btn-glass disabled:opacity-30">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ── Page header ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color, delta }: {
  label: string; value: string | number; icon: React.ElementType
  color?: string; delta?: string
}) {
  return (
    <div className="glass-card p-5 stat-card animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: color ? `rgba(${color}, 0.12)` : 'rgba(213,156,124,0.12)' }}>
          <Icon size={20} style={{ color: color ? `rgb(${color})` : 'var(--gold)' }} />
        </div>
        {delta && <span className={`text-xs font-semibold ${delta.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{delta}</span>}
      </div>
      <p className="font-display text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted mt-1 uppercase tracking-wide">{label}</p>
    </div>
  )
}

// ── Skeleton loader ──────────────────────────────────────────
export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl animate-shimmer" />
      ))}
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────
export function Empty({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
        <Icon size={28} className="text-muted" />
      </div>
      <p className="text-muted text-sm">{message}</p>
    </div>
  )
}

// ── Search input ──────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Rechercher…'}
      className="input-glass w-full max-w-xs"
    />
  )
}

// ── Toast notification ───────────────────────────────────────
export function useToast() {
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    const el = document.createElement('div')
    el.className = `fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl text-sm font-medium animate-fade-in
      ${type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'} text-white backdrop-blur-sm shadow-2xl`
    el.textContent = msg
    document.body.appendChild(el)
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300) }, 3000)
  }
  return { success: (m: string) => show(m, 'success'), error: (m: string) => show(m, 'error') }
}

// ── Format helpers ────────────────────────────────────────────
export function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
export function fmtDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
export function fmtAmount(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XOF'
}
export function fmtPhone(p: string) {
  return p?.replace(/(\+228)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5') || '—'
}
