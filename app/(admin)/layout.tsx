'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { createWebSocket } from '@/lib/api'
import {
  LayoutDashboard, Users, RefreshCw, PiggyBank, Wallet,
  Bell, FileText, HelpCircle, Mail, Activity,
  LogOut, Sun, Moon, ShieldCheck, Menu, X, ChevronRight
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['superadmin','admin','moderator','monitoring'] },
  { href: '/users', icon: Users, label: 'Utilisateurs', roles: ['superadmin','admin','moderator'] },
  { href: '/esso', icon: RefreshCw, label: 'ESSO — Tontines', roles: ['superadmin','admin','moderator'] },
  { href: '/tironiennes', icon: PiggyBank, label: 'Tironiennes', roles: ['superadmin','admin'] },
  { href: '/transactions', icon: Wallet, label: 'Transactions', roles: ['superadmin','admin','monitoring'] },
  { href: '/notifications', icon: Bell, label: 'Notifications', roles: ['superadmin','admin'] },
  { href: '/blog', icon: FileText, label: 'Blog', roles: ['superadmin','admin','moderator'] },
  { href: '/faq', icon: HelpCircle, label: 'FAQ', roles: ['superadmin','admin','moderator'] },
  { href: '/messages', icon: Mail, label: 'Messages', roles: ['superadmin','admin','moderator'] },
  { href: '/monitoring', icon: Activity, label: 'Monitoring', roles: ['superadmin','admin','monitoring'] },
]

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Administrateur',
  moderator: 'Modérateur', monitoring: 'Monitoring'
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [wsNotif, setWsNotif] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // WebSocket for live notifications
  useEffect(() => {
    if (!user) return
    const ws = createWebSocket(user.id, () => {
      setWsNotif(n => n + 1)
    })
    wsRef.current = ws
    return () => ws.close()
  }, [user])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  )
  if (!user) return null

  const visibleNav = NAV.filter(n => n.roles.includes(user.role))

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-primary relative">
      {/* Ambient orbs */}
      <div className="orb-container pointer-events-none">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar fixed inset-y-0 left-0 z-50 flex flex-col w-64 transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>

        {/* Logo */}
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))', boxShadow: '0 4px 12px var(--gold-glow)' }}>
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg text-primary">BankVi</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted hover:text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="divider mx-4 my-0" />

        {/* User info */}
        <div className="px-4 py-4">
          <div className="glass-card px-3 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))' }}>
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{user.full_name}</p>
              <p className="text-xs text-gold truncate">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                  ${active
                    ? 'bg-gradient-to-r from-gold/20 to-gold/5 text-gold border border-gold/20'
                    : 'text-secondary hover:text-primary hover:bg-white/5'
                  }`}
              >
                <item.icon size={17} className={active ? 'text-gold' : 'text-muted group-hover:text-primary transition-colors'} />
                <span className="flex-1">{item.label}</span>
                {item.href === '/notifications' && wsNotif > 0 && (
                  <span className="w-5 h-5 rounded-full bg-gold text-white text-[10px] font-bold flex items-center justify-center">
                    {wsNotif > 9 ? '9+' : wsNotif}
                  </span>
                )}
                {active && <ChevronRight size={14} className="text-gold" />}
              </Link>
            )
          })}
        </nav>

        <div className="divider mx-4 my-0" />

        {/* Bottom controls */}
        <div className="px-3 py-4 flex items-center gap-2">
          <button onClick={toggle}
            className="btn-glass flex-1 flex items-center justify-center gap-2 text-xs py-2">
            {theme === 'dark'
              ? <><Sun size={14} /> Clair</>
              : <><Moon size={14} /> Sombre</>
            }
          </button>
          <button onClick={handleLogout}
            className="w-10 h-9 flex items-center justify-center rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
            title="Déconnexion">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 glass border-b border-gold/10 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-muted hover:text-primary">
            <Menu size={20} />
          </button>
          <span className="font-display font-semibold text-primary">BankVi Admin</span>
        </header>

        {/* Page content */}
        <main className="flex-1 relative z-10 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
