// lib/mock.ts — Données de fallback quand le backend ne répond pas
import type { User, Esso, Transaction, Tironienne, Notification, BlogPost, FAQ, ContactMessage, DashboardStats } from './api'

export const MOCK_STATS: DashboardStats = {
  users: { total: 247, verified: 189, pending_kyc: 23 },
  esso: { total: 42, active: 28, blocked: 5 },
  transactions_today: { count: 87, volume: 4250000 },
  messages: { unread: 3 },
}

const mkUser = (i: number, role = 'user', kyc = 'verified'): User => ({
  id: `usr-${i}`, phone: `+2289100000${i}`, email: `user${i}@bankvi.com`,
  first_name: ['Amavi','Akosua','Kodjo','Edem','Kafui','Selom','Dzidzor','Mawuli'][i % 8],
  last_name: ['Koffi','Abla','Togbevi','Lawson','Abotsi','Agbeko','Zottor','Dovi'][i % 8],
  full_name: `${['Amavi','Akosua','Kodjo','Edem','Kafui','Selom','Dzidzor','Mawuli'][i % 8]} ${['Koffi','Abla','Togbevi','Lawson','Abotsi','Agbeko','Zottor','Dovi'][i % 8]}`,
  role: role as User['role'], kyc_status: kyc as User['kyc_status'],
  trust_score: 40 + (i * 7) % 60, is_active: i % 8 !== 6,
  is_verified: kyc === 'verified', is_phone_verified: true, is_email_verified: true,
  gender: i % 2 === 0 ? 'M' : 'F', date_of_birth: '1990-01-01', profile_photo: null,
  preferred_language: 'fr', created_at: new Date(Date.now() - i * 8640000).toISOString(),
  kyc_submitted_at: new Date(Date.now() - i * 4320000).toISOString(),
  kyc_reviewed_at: kyc === 'verified' ? new Date(Date.now() - i * 2160000).toISOString() : null,
})

export const MOCK_USERS: User[] = [
  ...Array.from({ length: 3 }, (_, i) => mkUser(i, ['admin','moderator','monitoring'][i], 'verified')),
  ...Array.from({ length: 12 }, (_, i) => mkUser(i + 3, 'user', ['verified','verified','submitted','pending','rejected','verified'][i % 6])),
]

export const MOCK_ESSOS: Esso[] = Array.from({ length: 12 }, (_, i) => ({
  id: `esso-${i}`, name: ['Tontine Famille Mensah','ESSO Commerce Lomé','Esso Collègues Agence','Tontine Quartier Bé','ESSO Amis Université'][i % 5],
  description: 'Tontine digitale communautaire BankVi',
  creator: MOCK_USERS[i % 5 + 3],
  contribution_amount: [5000,10000,15000,25000,50000][i % 5],
  frequency: ['monthly','weekly','monthly','weekly','monthly'][i % 5] as Esso['frequency'],
  draw_mode: ['fixed','random','wheel'][i % 3] as Esso['draw_mode'],
  status: ['active','active','paused','completed','draft'][i % 5] as Esso['status'],
  current_cycle: i % 3 + 1, total_cycles: 4 + i % 3, max_members: 20, auto_renew: i % 2 === 0,
  launched_at: new Date(Date.now() - i * 30 * 86400000).toISOString(), completed_at: null,
  next_due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
  created_at: new Date(Date.now() - i * 35 * 86400000).toISOString(), member_count: 3 + i % 4,
}))

const TX_TYPES = ['deposit','withdrawal','esso_payment','esso_gain','internal_transfer','tironienne_deposit']
const TX_STATUS = ['completed','completed','completed','failed','processing','pending']
export const MOCK_TRANSACTIONS: Transaction[] = Array.from({ length: 30 }, (_, i) => {
  const amt = [5000,10000,25000,50000,100000][i % 5]
  const fee = Math.floor(amt * 0.04)
  return {
    id: `tx-${i}`, reference: `BKV${String(i).padStart(12,'0')}`,
    wallet: `wlt-${i}`, transaction_type: TX_TYPES[i % 6],
    payment_method: ['flooz','tmoney','wallet'][i % 3],
    amount: amt, fee_amount: fee, net_amount: amt - fee,
    status: TX_STATUS[i % 6] as Transaction['status'],
    description: 'Transaction BankVi',
    fedapay_transaction_id: i % 3 === 0 ? `fp-${100000 + i}` : null,
    blockchain_tx_hash: i % 4 === 0 ? `0x${'a'.repeat(64)}` : null,
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
    completed_at: new Date(Date.now() - i * 3600000 + 120000).toISOString(),
  }
})

export const MOCK_TIRONIENNES: Tironienne[] = Array.from({ length: 8 }, (_, i) => ({
  id: `tiro-${i}`, user: MOCK_USERS[i % 5 + 3],
  name: ['Achat moto Yamaha','Frais scolaires 2025','Voyage Europe','Fonds urgence','Projet immobilier'][i % 5],
  description: 'Épargne personnelle programmable',
  target_amount: [500000,200000,2000000,150000,5000000][i % 5],
  current_amount: [125000,80000,800000,60000,150000][i % 5],
  contribution_amount: [25000,20000,100000,15000,50000][i % 5],
  frequency: ['monthly','monthly','monthly','monthly','monthly'][i % 5],
  mode: i % 2 === 0 ? 'locked' : 'semi_flexible',
  penalty_percent: i % 2 === 0 ? 0 : 5,
  status: i === 7 ? 'completed' : 'active',
  unlock_date: new Date(Date.now() + 180 * 86400000).toISOString(),
  next_due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
  created_at: new Date(Date.now() - i * 30 * 86400000).toISOString(),
  progress_percent: [25,40,40,40,3][i % 5],
}))

export const MOCK_NOTIFICATIONS: Notification[] = Array.from({ length: 20 }, (_, i) => ({
  id: `notif-${i}`, user: `usr-${i % 8 + 3}`,
  notification_type: ['esso_gain','esso_late','wallet_deposit','tironienne_reminder','kyc_approved','system'][i % 6],
  title: ['🎉 Vous avez gagné !','⚠️ Cotisation en retard','Dépôt reçu','💰 Rappel d\'épargne','✅ KYC validé','Bienvenue !'][i % 6],
  body: ['Félicitations ! Vous avez été tiré au sort dans un ESSO.','Un membre est en retard dans votre ESSO.','Votre wallet a été crédité de 50 000 XOF.','Votre versement mensuel est dû aujourd\'hui.','Votre identité a été vérifiée avec succès.','Bienvenue sur BankVi !'][i % 6],
  channel: i % 2 === 0 ? 'push' : 'in_app',
  is_read: i % 3 !== 0, is_sent: true,
  sent_at: new Date(Date.now() - i * 3600000).toISOString(),
  created_at: new Date(Date.now() - i * 3600000).toISOString(),
}))

export const MOCK_BLOG: BlogPost[] = [
  { id:'bp-1', title:'Qu\'est-ce qu\'une tontine et pourquoi la digitaliser ?', title_en:'What is a tontine?', slug:'qu-est-ce-qu-une-tontine',
    excerpt:'La tontine est l\'une des pratiques financières les plus anciennes d\'Afrique de l\'Ouest.', content:'[contenu complet de l\'article…]',content_en:'[contenu complet de l\'article…]',
    is_published:true, author: MOCK_USERS[0], published_at: new Date(Date.now()-60*86400000).toISOString(), created_at: new Date(Date.now()-62*86400000).toISOString() },
  { id:'bp-2', title:'Comment fonctionne la blockchain dans BankVi ?', title_en:'How does blockchain work in BankVi?', slug:'blockchain-bankvi',
    excerpt:'BankVi utilise Polygon pour garantir la transparence des transactions critiques.', content:'[contenu…]',content_en:'[contenu…]',
    is_published:true, author: MOCK_USERS[0], published_at: new Date(Date.now()-45*86400000).toISOString(), created_at: new Date(Date.now()-47*86400000).toISOString() },
  { id:'bp-3', title:'Guide complet onboarding BankVi', title_en:'BankVi onboarding guide', slug:'guide-onboarding',
    excerpt:'[Brouillon] Guide pas à pas pour les nouveaux utilisateurs.', content:'[brouillon…]',content_en:'[brouillon…]',
    is_published:false, author: MOCK_USERS[1], published_at: null, created_at: new Date(Date.now()-5*86400000).toISOString() },
]

export const MOCK_FAQS: FAQ[] = [
  { id:'faq-1', question:"Qu'est-ce qu'un ESSO ?", answer:'Un ESSO est une tontine digitale sur BankVi.', category:'esso', order:1, is_active:true },
  { id:'faq-2', question:"Quels opérateurs Mobile Money ?", answer:'Flooz (Moov) et T-Money (Togocel).', category:'paiement', order:1, is_active:true },
  { id:'faq-3', question:"Comment vérifier mon identité ?", answer:'Depuis votre profil, section KYC.', category:'kyc', order:1, is_active:true },
  { id:'faq-4', question:"Puis-je créer plusieurs Tironiennes ?", answer:'Oui, autant que vous voulez.', category:'tironienne', order:1, is_active:true },
  { id:'faq-5', question:"Quels sont les frais ?", answer:'4% sur dépôts et retraits.', category:'paiement', order:2, is_active:true },
  { id:'faq-6', question:"Combien de membres dans un ESSO ?", answer:'Entre 2 et 20 membres.', category:'esso', order:2, is_active:true },
]

export const MOCK_MESSAGES: ContactMessage[] = [
  { id:'msg-1', full_name:'Kokou Agbenyefia', email:'kokou@gmail.com', subject:'Retrait non reçu',
    message:'Bonjour, j\'ai effectué un retrait de 20 000 XOF il y a 3h mais je n\'ai rien reçu.',
    status:'resolved', reply:'Bonjour, nous avons vérifié. Le crédit a été effectué à 16h32.',
    replied_at: new Date(Date.now()-15*86400000).toISOString(), created_at: new Date(Date.now()-15*86400000).toISOString() },
  { id:'msg-2', full_name:'Yewande Assih', email:'yewande@yahoo.fr', subject:'Ajouter membre ESSO',
    message:'Comment puis-je ajouter un membre à mon ESSO déjà lancé ?',
    status:'resolved', reply:'Il n\'est pas possible d\'ajouter des membres après le lancement.',
    replied_at: new Date(Date.now()-8*86400000).toISOString(), created_at: new Date(Date.now()-8*86400000).toISOString() },
  { id:'msg-3', full_name:'Amos Tchalla', email:'amos@gmail.com', subject:'Demande de partenariat commercial',
    message:'Je suis responsable d\'une coopérative de 150 membres à Kpalimé. Seriez-vous intéressés par un partenariat ?',
    status:'in_progress', reply:'', replied_at:null, created_at: new Date(Date.now()-3*86400000).toISOString() },
  { id:'msg-4', full_name:'Isabelle Kuma', email:'isabelle@hotmail.com', subject:'KYC rejeté sans explication',
    message:'Mon KYC a été rejeté mais le motif est flou. Pouvez-vous m\'aider ?',
    status:'in_progress', reply:'', replied_at:null, created_at: new Date(Date.now()-86400000).toISOString() },
  { id:'msg-5', full_name:'Gbégnon Dossou', email:'gbenou@gmail.com', subject:'Suggestion : notifications WhatsApp',
    message:'Pourriez-vous ajouter les notifications via WhatsApp ? Merci !',
    status:'unread', reply:'', replied_at:null, created_at: new Date().toISOString() },
]

export const MOCK_LOGS = {
  auth_logins: Array.from({length:20},(_,i)=>({ user_id:`usr-${i}`, ip:`196.168.${i}.1`, action:'login', created_at: new Date(Date.now()-i*3600000).toISOString() })),
  auth_failures: Array.from({length:8},(_,i)=>({ phone:`+2289100000${i}`, ip:`196.0.${i}.1`, reason:'wrong_password', created_at: new Date(Date.now()-i*7200000).toISOString() })),
  esso_actions: Array.from({length:15},(_,i)=>({ esso_id:`esso-${i}`, action:['launch','draw','cancel'][i%3], user_id:`usr-${i}`, created_at: new Date(Date.now()-i*3600000).toISOString() })),
  esso_draws: Array.from({length:10},(_,i)=>({ esso_id:`esso-${i}`, cycle:i+1, winner_id:`usr-${i}`, hash:`0x${'a'.repeat(64)}`, created_at: new Date(Date.now()-i*86400000).toISOString() })),
  kyc_submissions: Array.from({length:12},(_,i)=>({ user_id:`usr-${i}`, status:'submitted', created_at: new Date(Date.now()-i*3600000).toISOString() })),
  kyc_reviews: Array.from({length:10},(_,i)=>({ user_id:`usr-${i}`, action:i%3===0?'reject':'approve', reviewer:`usr-0`, created_at: new Date(Date.now()-i*7200000).toISOString() })),
  admin_actions: Array.from({length:10},(_,i)=>({ admin_id:`usr-0`, action:['kyc_approve','user_suspend','esso_cancel'][i%3], target:`usr-${i}`, created_at: new Date(Date.now()-i*3600000).toISOString() })),
}
