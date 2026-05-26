(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auth",
    ()=>auth,
    "blog",
    ()=>blog,
    "clearTokens",
    ()=>clearTokens,
    "createWebSocket",
    ()=>createWebSocket,
    "dashboard",
    ()=>dashboard,
    "esso",
    ()=>esso,
    "faq",
    ()=>faq,
    "getTokens",
    ()=>getTokens,
    "messages",
    ()=>messages,
    "monitoring",
    ()=>monitoring,
    "notifs",
    ()=>notifs,
    "setTokens",
    ()=>setTokens,
    "tironiennes",
    ()=>tironiennes,
    "users",
    ()=>users,
    "wallet",
    ()=>wallet
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
// lib/api.ts — Client API centralisé BankVi Admin
// Toutes les routes pointent vers BACK_URL (variable d'environnement)
// Fallback sur mockdata si le backend ne répond pas
const BASE = ("TURBOPACK compile-time value", "https://bankvi-api.onrender.com") || 'http://localhost:8000';
const API = `${BASE}/api/v1`;
function getTokens() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return {
        access: localStorage.getItem('bv_access'),
        refresh: localStorage.getItem('bv_refresh')
    };
}
function setTokens(access, refresh) {
    localStorage.setItem('bv_access', access);
    localStorage.setItem('bv_refresh', refresh);
}
function clearTokens() {
    localStorage.removeItem('bv_access');
    localStorage.removeItem('bv_refresh');
}
// ── Core fetch ───────────────────────────────────────────────
async function apiFetch(path, options = {}, retry = true) {
    const { access, refresh } = getTokens();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (access) headers['Authorization'] = `Bearer ${access}`;
    let res;
    try {
        res = await fetch(`${API}${path}`, {
            ...options,
            headers,
            signal: AbortSignal.timeout(10000)
        });
    } catch  {
        throw new Error('NETWORK_ERROR');
    }
    if (res.status === 401 && retry && refresh) {
        const r = await fetch(`${API}/auth/token/refresh/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh
            })
        }).catch(()=>null);
        if (r?.ok) {
            const data = await r.json();
            setTokens(data.access, refresh);
            return apiFetch(path, options, false);
        } else {
            clearTokens();
            if ("TURBOPACK compile-time truthy", 1) window.location.href = '/login';
            throw new Error('Session expirée');
        }
    }
    if (!res.ok) {
        let msg = `Erreur ${res.status}`;
        try {
            const e = await res.json();
            msg = e.message || e.detail || e.error || msg;
        } catch  {}
        throw new Error(msg);
    }
    if (res.status === 204) return {};
    const json = await res.json();
    return json.data !== undefined ? json.data : json;
}
const get = (p)=>apiFetch(p);
const post = (p, b)=>apiFetch(p, {
        method: 'POST',
        body: JSON.stringify(b)
    });
const patch = (p, b)=>apiFetch(p, {
        method: 'PATCH',
        body: JSON.stringify(b)
    });
const put = (p, b)=>apiFetch(p, {
        method: 'PUT',
        body: JSON.stringify(b)
    });
const del = (p)=>apiFetch(p, {
        method: 'DELETE'
    });
// ── Fallback wrapper ─────────────────────────────────────────
async function withFallback(fn, fallback) {
    try {
        const data = await fn();
        return {
            data,
            isMock: false
        };
    } catch (e) {
        const err = e instanceof Error ? e.message : '';
        if (err === 'NETWORK_ERROR' || err.includes('503') || err.includes('502') || err.includes('504')) {
            return {
                data: fallback,
                isMock: true
            };
        }
        throw e;
    }
}
const auth = {
    // Étape 1 : login → envoie l'OTP si 2FA
    login: (phone, password)=>post('/auth/login/', {
            phone,
            password
        }),
    // Étape 2 : vérifier l'OTP admin
    verifyOTP: (otp_token, code)=>post('/auth/otp/verify/', {
            otp_token,
            code,
            purpose: 'admin_login'
        }),
    // Envoyer un nouvel OTP
    sendOTP: (purpose = 'admin_login')=>post('/auth/otp/send/', {
            purpose
        }),
    logout: (refresh_token)=>post('/auth/logout/', {
            refresh_token
        }),
    verify: ()=>get('/auth/verify/')
};
const dashboard = {
    stats: async ()=>{
        const { MOCK_STATS } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        return withFallback(()=>get('/admin-panel/stats/'), MOCK_STATS);
    }
};
const users = {
    list: async (params)=>{
        const { MOCK_USERS } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        const mock = {
            count: MOCK_USERS.length,
            next: null,
            previous: null,
            results: MOCK_USERS
        };
        return withFallback(()=>get(`/admin-panel/users/${params ? '?' + params : ''}`), mock);
    },
    detail: (id)=>get(`/admin-panel/users/${id}/`),
    toggleActive: (id)=>post(`/admin-panel/users/${id}/toggle-active/`, {}),
    reviewKYC: (userId, action, reject_reason)=>post(`/admin-panel/users/${userId}/kyc/review/`, {
            action,
            reject_reason
        })
};
const esso = {
    list: async (params)=>{
        const { MOCK_ESSOS } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        const mock = {
            count: MOCK_ESSOS.length,
            next: null,
            previous: null,
            results: MOCK_ESSOS
        };
        return withFallback(()=>get(`/esso/admin/${params ? '?' + params : ''}`), mock);
    },
    detail: (id)=>get(`/esso/admin/${id}/`),
    cancel: (id)=>post(`/esso/admin/${id}/cancel/`, {}),
    cycles: (id)=>get(`/esso/${id}/cycles/`)
};
const tironiennes = {
    list: async (params)=>{
        const { MOCK_TIRONIENNES } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        const mock = {
            count: MOCK_TIRONIENNES.length,
            next: null,
            previous: null,
            results: MOCK_TIRONIENNES
        };
        return withFallback(()=>get(`/tironienne/${params ? '?' + params : ''}`), mock);
    },
    detail: (id)=>get(`/tironienne/${id}/`),
    deposits: (id)=>get(`/tironienne/${id}/deposits/`)
};
const wallet = {
    adminTransactions: async (params)=>{
        const { MOCK_TRANSACTIONS } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        const mock = {
            count: MOCK_TRANSACTIONS.length,
            next: null,
            previous: null,
            results: MOCK_TRANSACTIONS
        };
        return withFallback(()=>get(`/wallet/admin/transactions/${params ? '?' + params : ''}`), mock);
    },
    freezeWallet: (userId)=>post(`/wallet/admin/${userId}/freeze/`, {})
};
const notifs = {
    list: async (params)=>{
        const { MOCK_NOTIFICATIONS } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        const mock = {
            count: MOCK_NOTIFICATIONS.length,
            next: null,
            previous: null,
            results: MOCK_NOTIFICATIONS
        };
        return withFallback(()=>get(`/notifications/${params ? '?' + params : ''}`), mock);
    }
};
const blog = {
    list: async ()=>{
        const { MOCK_BLOG } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        return withFallback(()=>get('/public/blog/'), MOCK_BLOG);
    },
    detail: (slug)=>get(`/public/blog/${slug}/`),
    // Admin CRUD (routes à ajouter au backend si nécessaire)
    adminList: async ()=>{
        const { MOCK_BLOG } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        return withFallback(()=>get('/admin-panel/blog/'), MOCK_BLOG);
    },
    create: (data)=>post('/admin-panel/blog/', data),
    update: (id, data)=>patch(`/admin-panel/blog/${id}/`, data),
    delete: (id)=>del(`/admin-panel/blog/${id}/`),
    publish: (id)=>post(`/admin-panel/blog/${id}/publish/`, {})
};
const faq = {
    list: async ()=>{
        const { MOCK_FAQS } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        return withFallback(()=>get('/public/faq/'), MOCK_FAQS);
    },
    adminList: async ()=>{
        const { MOCK_FAQS } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        return withFallback(()=>get('/admin-panel/faq/'), MOCK_FAQS);
    },
    create: (data)=>post('/admin-panel/faq/', data),
    update: (id, data)=>patch(`/admin-panel/faq/${id}/`, data),
    delete: (id)=>del(`/admin-panel/faq/${id}/`)
};
const messages = {
    list: async (params)=>{
        const { MOCK_MESSAGES } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        const mock = {
            count: MOCK_MESSAGES.length,
            next: null,
            previous: null,
            results: MOCK_MESSAGES
        };
        return withFallback(()=>get(`/admin-panel/messages/${params ? '?' + params : ''}`), mock);
    },
    detail: (id)=>get(`/admin-panel/messages/${id}/`),
    reply: (id, reply)=>post(`/admin-panel/messages/${id}/reply/`, {
            reply
        }),
    updateStatus: (id, status)=>patch(`/admin-panel/messages/${id}/`, {
            status
        })
};
const monitoring = {
    logs: async (collection, limit = 50)=>{
        const { MOCK_LOGS } = await __turbopack_context__.A("[project]/lib/mock.ts [app-client] (ecmascript, async loader)");
        const mockLogs = {
            logs: MOCK_LOGS[collection] || [],
            collection
        };
        return withFallback(()=>get(`/admin-panel/logs/?collection=${collection}&limit=${limit}`), mockLogs);
    }
};
function createWebSocket(userId, onMessage) {
    try {
        const wsBase = BASE.replace(/^http/, 'ws');
        const { access } = getTokens();
        const ws = new WebSocket(`${wsBase}/ws/notifications/?token=${access}`);
        ws.onmessage = (e)=>{
            try {
                onMessage(JSON.parse(e.data));
            } catch  {}
        };
        ws.onerror = ()=>{};
        return ws;
    } catch  {
        return {
            close: ()=>{}
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/hooks/useAuth.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
const Ctx = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({});
function AuthProvider({ children }) {
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const loadUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[loadUser]": async ()=>{
            const { access } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTokens"])();
            if (!access) {
                setLoading(false);
                return;
            }
            try {
                const d = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"].verify();
                setUser(d.user);
            } catch  {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearTokens"])();
            } finally{
                setLoading(false);
            }
        }
    }["AuthProvider.useCallback[loadUser]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            loadUser();
        }
    }["AuthProvider.useEffect"], [
        loadUser
    ]);
    const login = async (phone, password)=>{
        const data = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"].login(phone, password);
        const allowed = [
            'superadmin',
            'admin',
            'moderator',
            'monitoring'
        ];
        if (!allowed.includes(data.user?.role || '')) throw new Error('Accès non autorisé');
        // Si pas d'OTP requis → connexion directe
        if (!data.requires_otp) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setTokens"])(data.tokens.access, data.tokens.refresh);
            setUser(data.user);
            return;
        }
        // Sinon → retourner le token OTP pour l'étape 2
        return {
            requires_otp: true,
            otp_token: data.otp_token
        };
    };
    const loginOTP = async (otp_token, code)=>{
        const data = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"].verifyOTP(otp_token, code);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setTokens"])(data.tokens.access, data.tokens.refresh);
        setUser(data.user);
    };
    const resendOTP = async ()=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"].sendOTP('admin_login');
    };
    const logout = async ()=>{
        const { refresh } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTokens"])();
        if (refresh) try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"].logout(refresh);
        } catch  {}
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearTokens"])();
        setUser(null);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Ctx.Provider, {
        value: {
            user,
            loading,
            login,
            loginOTP,
            resendOTP,
            logout
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/hooks/useAuth.tsx",
        lineNumber: 58,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "adchGi6TzmpZoNXcfR1bX9XeDA0=");
_c = AuthProvider;
const useAuth = ()=>{
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(Ctx);
};
_s1(useAuth, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/hooks/useTheme.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider,
    "useTheme",
    ()=>useTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
const ThemeCtx = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
    theme: 'dark',
    toggle: ()=>{}
});
function ThemeProvider({ children }) {
    _s();
    const [theme, setTheme] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('dark');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ThemeProvider.useEffect": ()=>{
            const saved = localStorage.getItem('bv_theme') || 'dark';
            setTheme(saved);
            document.documentElement.classList.toggle('dark', saved === 'dark');
        }
    }["ThemeProvider.useEffect"], []);
    const toggle = ()=>{
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('bv_theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ThemeCtx.Provider, {
        value: {
            theme,
            toggle
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/hooks/useTheme.tsx",
        lineNumber: 22,
        columnNumber: 10
    }, this);
}
_s(ThemeProvider, "D0ekClnfIGVExrH5c3Ka+aWcxxE=");
_c = ThemeProvider;
const useTheme = ()=>{
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(ThemeCtx);
};
_s1(useTheme, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "ThemeProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0y3a-kh._.js.map