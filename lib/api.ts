// lib/api.ts — Client API centralisé BankVi Admin
// Toutes les routes pointent vers BACK_URL (variable d'environnement)
// Fallback sur mockdata si le backend ne répond pas

const BASE = process.env.NEXT_PUBLIC_BACK_URL || 'http://localhost:8000'
const API = `${BASE}/api/v1`

// ── Token management ─────────────────────────────────────────
export function getTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null }
  return {
    access: localStorage.getItem('bv_access'),
    refresh: localStorage.getItem('bv_refresh'),
  }
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem('bv_access', access)
  localStorage.setItem('bv_refresh', refresh)
}
export function clearTokens() {
  localStorage.removeItem('bv_access')
  localStorage.removeItem('bv_refresh')
}

// ── Core fetch ───────────────────────────────────────────────
async function apiFetch<T = unknown>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const { access, refresh } = getTokens()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (access) headers['Authorization'] = `Bearer ${access}`

  let res: Response
  try {
    res = await fetch(`${API}${path}`, { ...options, headers, signal: AbortSignal.timeout(10000) })
  } catch {
    throw new Error('NETWORK_ERROR')
  }

  if (res.status === 401 && retry && refresh) {
    const r = await fetch(`${API}/auth/token/refresh/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    }).catch(() => null)
    if (r?.ok) {
      const data = await r.json()
      setTokens(data.access, refresh)
      return apiFetch(path, options, false)
    } else {
      clearTokens()
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Session expirée')
    }
  }

  if (!res.ok) {
    let msg = `Erreur ${res.status}`
    try { const e = await res.json(); msg = e.message || e.detail || e.error || msg } catch {}
    throw new Error(msg)
  }
  if (res.status === 204) return {} as T
  const json = await res.json()
  return (json.data !== undefined ? json.data : json) as T
}

const get   = <T>(p: string) => apiFetch<T>(p)
const post  = <T>(p: string, b: unknown) => apiFetch<T>(p, { method:'POST', body: JSON.stringify(b) })
const patch = <T>(p: string, b: unknown) => apiFetch<T>(p, { method:'PATCH', body: JSON.stringify(b) })
const put   = <T>(p: string, b: unknown) => apiFetch<T>(p, { method:'PUT', body: JSON.stringify(b) })
const del   = <T>(p: string) => apiFetch<T>(p, { method:'DELETE' })

// ── Fallback wrapper ─────────────────────────────────────────
async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<{ data: T; isMock: boolean }> {
  try {
    const data = await fn()
    return { data, isMock: false }
  } catch (e) {
    const err = e instanceof Error ? e.message : ''
    if (err === 'NETWORK_ERROR' || err.includes('503') || err.includes('502') || err.includes('504')) {
      return { data: fallback, isMock: true }
    }
    throw e
  }
}

// ── Auth ─────────────────────────────────────────────────────
export const auth = {
  // Étape 1 : login → envoie l'OTP si 2FA
  login: (phone: string, password: string) =>
    post<{ user: User; tokens: { access: string; refresh: string }; requires_otp?: boolean; otp_token?: string }>(
      '/auth/login/', { phone, password }
    ),
  // Étape 2 : vérifier l'OTP admin
  verifyOTP: (otp_token: string, code: string) =>
    post<{ user: User; tokens: { access: string; refresh: string } }>(
      '/auth/otp/verify/', { otp_token, code, purpose: 'admin_login' }
    ),
  // Envoyer un nouvel OTP
  sendOTP: (purpose = 'admin_login') =>
    post('/auth/otp/send/', { purpose }),
  logout: (refresh_token: string) => post('/auth/logout/', { refresh_token }),
  verify: () => get<{ user: User }>('/auth/verify/'),
}

// ── Dashboard ────────────────────────────────────────────────
export const dashboard = {
  stats: async () => {
    const { MOCK_STATS } = await import('./mock')
    return withFallback(() => get<DashboardStats>('/admin-panel/stats/'), MOCK_STATS)
  },
}

// ── Users ────────────────────────────────────────────────────
export const users = {
  list: async (params?: string) => {
    const { MOCK_USERS } = await import('./mock')
    const mock: PaginatedResponse<User> = { count: MOCK_USERS.length, next: null, previous: null, results: MOCK_USERS }
    return withFallback(() => get<PaginatedResponse<User>>(`/admin-panel/users/${params ? '?'+params : ''}`), mock)
  },
  detail: (id: string) => get<User>(`/admin-panel/users/${id}/`),
  toggleActive: (id: string) => post(`/admin-panel/users/${id}/toggle-active/`, {}),
  reviewKYC: (userId: string, action: 'approve' | 'reject', reject_reason?: string) =>
    post(`/admin-panel/users/${userId}/kyc/review/`, { action, reject_reason }),
}

// ── ESSO ─────────────────────────────────────────────────────
export const esso = {
  list: async (params?: string) => {
    const { MOCK_ESSOS } = await import('./mock')
    const mock: PaginatedResponse<Esso> = { count: MOCK_ESSOS.length, next: null, previous: null, results: MOCK_ESSOS }
    return withFallback(() => get<PaginatedResponse<Esso>>(`/esso/admin/${params ? '?'+params : ''}`), mock)
  },
  detail: (id: string) => get<EssoDetail>(`/esso/admin/${id}/`),
  cancel: (id: string) => post(`/esso/admin/${id}/cancel/`, {}),
  cycles: (id: string) => get<EssoCycle[]>(`/esso/${id}/cycles/`),
}

// ── Tironiennes ──────────────────────────────────────────────
export const tironiennes = {
  list: async (params?: string) => {
    const { MOCK_TIRONIENNES } = await import('./mock')
    const mock: PaginatedResponse<Tironienne> = { count: MOCK_TIRONIENNES.length, next: null, previous: null, results: MOCK_TIRONIENNES }
    return withFallback(() => get<PaginatedResponse<Tironienne>>(`/tironienne/${params ? '?'+params : ''}`), mock)
  },
  detail: (id: string) => get<Tironienne>(`/tironienne/${id}/`),
  deposits: (id: string) => get<TironiенneDeposit[]>(`/tironienne/${id}/deposits/`),
}

// ── Wallet & Transactions ────────────────────────────────────
export const wallet = {
  adminTransactions: async (params?: string) => {
    const { MOCK_TRANSACTIONS } = await import('./mock')
    const mock: PaginatedResponse<Transaction> = { count: MOCK_TRANSACTIONS.length, next: null, previous: null, results: MOCK_TRANSACTIONS }
    return withFallback(() => get<PaginatedResponse<Transaction>>(`/wallet/admin/transactions/${params ? '?'+params : ''}`), mock)
  },
  freezeWallet: (userId: string) => post(`/wallet/admin/${userId}/freeze/`, {}),
}

// ── Notifications ────────────────────────────────────────────
export const notifs = {
  list: async (params?: string) => {
    const { MOCK_NOTIFICATIONS } = await import('./mock')
    const mock: PaginatedResponse<Notification> = { count: MOCK_NOTIFICATIONS.length, next: null, previous: null, results: MOCK_NOTIFICATIONS }
    return withFallback(() => get<PaginatedResponse<Notification>>(`/notifications/${params ? '?'+params : ''}`), mock)
  },
}

// ── Blog ─────────────────────────────────────────────────────
export const blog = {
  list: async () => {
    const { MOCK_BLOG } = await import('./mock')
    return withFallback(() => get<BlogPost[]>('/public/blog/'), MOCK_BLOG)
  },
  detail: (slug: string) => get<BlogPost>(`/public/blog/${slug}/`),
  // Admin CRUD (routes à ajouter au backend si nécessaire)
  adminList: async () => {
    const { MOCK_BLOG } = await import('./mock')
    return withFallback(() => get<BlogPost[]>('/admin-panel/blog/'), MOCK_BLOG)
  },
  create: (data: Partial<BlogPost>) => post<BlogPost>('/admin-panel/blog/', data),
  update: (id: string, data: Partial<BlogPost>) => patch<BlogPost>(`/admin-panel/blog/${id}/`, data),
  delete: (id: string) => del(`/admin-panel/blog/${id}/`),
  publish: (id: string) => post(`/admin-panel/blog/${id}/publish/`, {}),
}

// ── FAQ ──────────────────────────────────────────────────────
export const faq = {
  list: async () => {
    const { MOCK_FAQS } = await import('./mock')
    return withFallback(() => get<FAQ[]>('/public/faq/'), MOCK_FAQS)
  },
  adminList: async () => {
    const { MOCK_FAQS } = await import('./mock')
    return withFallback(() => get<FAQ[]>('/admin-panel/faq/'), MOCK_FAQS)
  },
  create: (data: Partial<FAQ>) => post<FAQ>('/admin-panel/faq/', data),
  update: (id: string, data: Partial<FAQ>) => patch<FAQ>(`/admin-panel/faq/${id}/`, data),
  delete: (id: string) => del(`/admin-panel/faq/${id}/`),
}

// ── Contact Messages ─────────────────────────────────────────
export const messages = {
  list: async (params?: string) => {
    const { MOCK_MESSAGES } = await import('./mock')
    const mock: PaginatedResponse<ContactMessage> = { count: MOCK_MESSAGES.length, next: null, previous: null, results: MOCK_MESSAGES }
    return withFallback(() => get<PaginatedResponse<ContactMessage>>(`/admin-panel/messages/${params ? '?'+params : ''}`), mock)
  },
  detail: (id: string) => get<ContactMessage>(`/admin-panel/messages/${id}/`),
  reply: (id: string, reply: string) => post(`/admin-panel/messages/${id}/reply/`, { reply }),
  updateStatus: (id: string, status: string) => patch(`/admin-panel/messages/${id}/`, { status }),
}

// ── Monitoring / Logs ────────────────────────────────────────
export const monitoring = {
  logs: async (collection: string, limit = 50) => {
    const { MOCK_LOGS } = await import('./mock')
    const mockLogs = { logs: (MOCK_LOGS as Record<string, unknown[]>)[collection] || [], collection }
    return withFallback(
      () => get<{ logs: LogEntry[]; collection: string }>(`/admin-panel/logs/?collection=${collection}&limit=${limit}`),
      mockLogs as { logs: LogEntry[]; collection: string }
    )
  },
}

// ── WebSocket ────────────────────────────────────────────────
export function createWebSocket(userId: string, onMessage: (data: unknown) => void) {
  try {
    const wsBase = BASE.replace(/^http/, 'ws')
    const { access } = getTokens()
    const ws = new WebSocket(`${wsBase}/ws/notifications/?token=${access}`)
    ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)) } catch {} }
    ws.onerror = () => {}
    return ws
  } catch {
    return { close: () => {} } as unknown as WebSocket
  }
}

// ── Types ─────────────────────────────────────────────────────
export interface User {
  id: string; phone: string; email: string
  first_name: string; last_name: string; full_name: string
  role: 'superadmin' | 'admin' | 'moderator' | 'monitoring' | 'user'
  kyc_status: 'pending' | 'submitted' | 'verified' | 'rejected'
  trust_score: number; is_active: boolean; is_verified: boolean
  is_phone_verified: boolean; is_email_verified: boolean
  gender: 'M' | 'F' | ''; date_of_birth: string
  profile_photo: string | null; preferred_language: string
  created_at: string; kyc_submitted_at: string | null; kyc_reviewed_at: string | null
}
export interface DashboardStats {
  users: { total: number; verified: number; pending_kyc: number }
  esso: { total: number; active: number; blocked: number }
  transactions_today: { count: number | null; volume: number | null }
  messages?: { unread: number }
}
export interface Esso {
  id: string; name: string; description: string; creator: User
  contribution_amount: number; frequency: 'daily' | 'weekly' | 'monthly'
  draw_mode: 'fixed' | 'random' | 'wheel'
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  current_cycle: number; total_cycles: number; max_members: number
  auto_renew: boolean; launched_at: string | null; completed_at: string | null
  next_due_date: string | null; created_at: string; member_count?: number
}
export interface EssoDetail extends Esso { members: EssoMember[]; cycles: EssoCycle[] }
export interface EssoMember {
  id: string; user_name: string; user_phone: string; user_photo: string | null
  status: string; rotation_order: number; has_received: boolean; joined_at: string
}
export interface EssoCycle {
  id: string; cycle_number: number; status: string; total_collected: number
  winner_name: string | null; draw_result_hash: string; blockchain_tx_hash?: string
  started_at: string; due_date: string; drawn_at: string | null; completed_at: string | null
  contributions?: Contribution[]
}
export interface Contribution {
  id: string; member_name: string; amount: number
  status: 'paid' | 'late' | 'pending' | 'paid_by_creator'
  paid_at: string | null; due_date: string; reminder_count: number
}
export interface Tironienne {
  id: string; user: User; name: string; description: string
  target_amount: number; current_amount: number; contribution_amount: number
  frequency: string; mode: 'locked' | 'semi_flexible'; penalty_percent: number
  status: 'active' | 'completed' | 'cancelled'; unlock_date: string | null
  next_due_date: string | null; created_at: string; progress_percent: number
}
export interface TironiенneDeposit { id: string; amount: number; note: string; created_at: string }
export interface Transaction {
  id: string; reference: string; wallet: string; transaction_type: string
  payment_method: string; amount: number; fee_amount: number; net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  description: string; fedapay_transaction_id: string | null
  blockchain_tx_hash: string | null; created_at: string; completed_at: string | null
}
export interface Notification {
  id: string; user: string; notification_type: string
  title: string; body: string; channel: string
  is_read: boolean; is_sent: boolean; sent_at: string | null; created_at: string
}
export interface BlogPost {
  id: string; title: string; title_en: string; slug: string
  excerpt: string; content: string; is_published: boolean
  author: User; published_at: string | null; created_at: string
}
export interface FAQ {
  id: string; question: string; answer: string
  category: string; order: number; is_active: boolean
}
export interface ContactMessage {
  id: string; full_name: string; email: string; subject: string
  message: string; status: 'unread' | 'in_progress' | 'resolved'
  reply: string; replied_at: string | null; created_at: string
}
export interface LogEntry { [key: string]: unknown; created_at?: string }
export interface PaginatedResponse<T> { count: number; next: string | null; previous: string | null; results: T[] }
