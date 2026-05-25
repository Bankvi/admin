'use client'
import { useEffect, useState } from 'react'
import { dashboard, type DashboardStats } from '@/lib/api'
import { StatCard, fmtAmount } from '@/components/ui'
import { Users, RefreshCw, Wallet, Mail, ShieldAlert, TrendingUp, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const GOLD = ['#D59C7C','#E8B898','#B87A5A','#C4926A']

const TT_STYLE = {
  contentStyle: { background:'var(--glass-bg-strong)', border:'1px solid var(--glass-border-gold)', borderRadius:12, color:'var(--text-primary)', fontSize:12 }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboard.stats().then(r => { setStats(r.data); setIsMock(r.isMock) }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-8 space-y-6">
      <div className="h-8 w-56 animate-shimmer rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-shimmer rounded-2xl" />)}
      </div>
    </div>
  )

  const kycData = stats ? [
    { name:'Vérifiés', value: stats.users.verified },
    { name:'En attente', value: stats.users.pending_kyc },
    { name:'Autres', value: Math.max(0, stats.users.total - stats.users.verified - stats.users.pending_kyc) },
  ] : []

  const essoData = stats ? [
    { name:'Actifs', value: stats.esso.active },
    { name:'Bloqués', value: stats.esso.blocked },
    { name:'Autres', value: Math.max(0, stats.esso.total - stats.esso.active - stats.esso.blocked) },
  ] : []

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="font-display text-3xl font-bold text-primary">Tableau de bord</h1>
        <p className="text-muted text-sm mt-1">
          Vue d'ensemble BankVi — {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </p>
      </div>

      {isMock && (
        <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-fade-in"
          style={{ background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.2)', color:'#ca8a04' }}>
          <Activity size={16} /> Backend hors ligne — données de démonstration affichées
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <StatCard label="Utilisateurs total" value={stats?.users.total ?? 0} icon={Users} />
        <StatCard label="KYC en attente" value={stats?.users.pending_kyc ?? 0} icon={ShieldAlert} color="234,179,8" />
        <StatCard label="ESSO actifs" value={stats?.esso.active ?? 0} icon={RefreshCw} color="34,197,94" />
        <StatCard label="Volume du jour" value={fmtAmount(stats?.transactions_today?.volume ?? 0)} icon={Wallet} />
      </div>

      {/* Alerte messages */}
      {(stats?.messages?.unread ?? 0) > 0 && (
        <div className="glass-card p-4 flex items-center gap-3 border-l-2 border-l-red-500 animate-fade-in">
          <Mail size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-primary flex-1">
            <span className="font-semibold text-red-400">{stats!.messages!.unread} message{stats!.messages!.unread > 1 ? 's' : ''} non lu{stats!.messages!.unread > 1 ? 's' : ''}</span>
            {' '}en attente dans la boîte de contact
          </p>
          <a href="/messages" className="text-xs text-gold hover:underline font-medium flex-shrink-0">Voir →</a>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KYC Donut */}
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-gold" />
            <h3 className="font-display font-semibold text-primary">Distribution KYC</h3>
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="60%" height={180}>
              <PieChart>
                <Pie data={kycData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value" strokeWidth={0}>
                  {kycData.map((_, i) => <Cell key={i} fill={GOLD[i]} />)}
                </Pie>
                <Tooltip {...TT_STYLE} formatter={(v: number) => [v + ' utilisateurs']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {kycData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: GOLD[i] }} />
                  <div>
                    <p className="text-xs text-secondary">{d.name}</p>
                    <p className="text-sm font-bold text-primary">{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ESSO bar */}
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-6">
            <RefreshCw size={18} className="text-gold" />
            <h3 className="font-display font-semibold text-primary">État des ESSO</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={essoData} barSize={48}>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip {...TT_STYLE} />
              <Bar dataKey="value" radius={[8,8,0,0]}>
                {essoData.map((_, i) => <Cell key={i} fill={GOLD[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick numbers */}
      <div className="glass-card p-6 animate-fade-in">
        <h3 className="font-display font-semibold text-primary mb-5">Activité aujourd'hui</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 divide-x divide-white/5">
          {[
            { label:'Transactions', v: stats?.transactions_today?.count ?? 0 },
            { label:'Volume', v: fmtAmount(stats?.transactions_today?.volume ?? 0) },
            { label:'Total ESSO', v: stats?.esso.total ?? 0 },
            { label:'ESSO bloqués', v: stats?.esso.blocked ?? 0 },
          ].map(item => (
            <div key={item.label} className="text-center px-4">
              <p className="font-display text-2xl font-bold text-gold">{item.v}</p>
              <p className="text-xs text-muted mt-1 uppercase tracking-wide">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
        {[
          { href:'/users?kyc_status=submitted', label:'Valider KYC', icon:'🪪', count: stats?.users.pending_kyc },
          { href:'/esso?status=paused', label:'ESSO bloqués', icon:'⚠️', count: stats?.esso.blocked },
          { href:'/messages?status=unread', label:'Messages', icon:'📬', count: stats?.messages?.unread },
          { href:'/transactions', label:'Transactions', icon:'💳', count: stats?.transactions_today?.count ?? 0 },
        ].map(link => (
          <a key={link.href} href={link.href}
            className="glass-card p-4 flex items-center gap-3 hover:border-gold/30 transition-all animate-fade-in group">
            <span className="text-2xl">{link.icon}</span>
            <div>
              <p className="text-sm font-semibold text-primary group-hover:text-gold transition-colors">{link.label}</p>
              {link.count !== undefined && link.count !== null && (
                <p className="text-xs text-muted">{link.count} élément{Number(link.count) > 1 ? 's' : ''}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
