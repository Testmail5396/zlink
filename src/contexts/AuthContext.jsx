import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import {
  users as seedUsers,
  invites as seedInvites,
  designers as seedDesigners,
  folders as seedFolders,
  links as seedLinks,
  DEFAULT_MODULES,
  hashPassword,
} from "../data/mockData";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/* ── Allowed email domain ── */
const ALLOWED_DOMAIN = "zohocorp.com";

export function isValidDomain(email) {
  return email.toLowerCase().endsWith("@" + ALLOWED_DOMAIN);
}

/* ── localStorage keys ── */
const USERS_KEY        = "designfolio_users";
const AUTH_KEY         = "designfolio_auth";
const INVITES_KEY      = "designfolio_invites";
const DATA_KEY         = "designfolio_data";     // shared with AppContext
const DATA_VER_KEY     = "designfolio_data_ver";
const ZOHO_SESSION_KEY = "zoho_browser_session";  // simulates active Zoho account in browser
const SIGNOFF_KEY      = "designfolio_signoff";   // explicit sign-off flag

/* Current data version — bump this to force-reset localStorage on model changes */
const DATA_VERSION = 3;

/* ── Persistence helpers ── */
function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupted */ }
  return null;
}

function saveUsers(u) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(u)); } catch {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveSession(s) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(s)); } catch {}
}

function clearSession() {
  try { localStorage.removeItem(AUTH_KEY); } catch {}
}

function loadInvites() {
  try {
    const raw = localStorage.getItem(INVITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveInvites(inv) {
  try { localStorage.setItem(INVITES_KEY, JSON.stringify(inv)); } catch {}
}

/* ── Zoho browser session (SSO simulation) ── */
function loadZohoSession() {
  try {
    const raw = localStorage.getItem(ZOHO_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveZohoSession(s) {
  try { localStorage.setItem(ZOHO_SESSION_KEY, JSON.stringify(s)); } catch {}
}

/* ── Explicit sign-off flag ── */
function loadExplicitSignoff() {
  try { return localStorage.getItem(SIGNOFF_KEY) === "true"; } catch { return false; }
}

function markExplicitSignoff() {
  try { localStorage.setItem(SIGNOFF_KEY, "true"); } catch {}
}

function clearExplicitSignoff() {
  try { localStorage.removeItem(SIGNOFF_KEY); } catch {}
}

/* ── Check data version for migration ── */
function checkDataVersion() {
  try {
    const ver = localStorage.getItem(DATA_VER_KEY);
    if (ver && parseInt(ver, 10) >= DATA_VERSION) return true;
  } catch {}
  return false;
}

function setDataVersion() {
  try { localStorage.setItem(DATA_VER_KEY, String(DATA_VERSION)); } catch {}
}

/* ── Avatar helpers ── */
function initials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-500","bg-rose-500","bg-blue-500","bg-emerald-500",
  "bg-amber-500","bg-cyan-500","bg-pink-500","bg-indigo-500",
];

/* ── ID generator ── */
let _idCounter = 5000;
function genId(prefix) { return `${prefix}${++_idCounter}`; }

/* ═══════════════════════════════════════════════════════
   AUTH PROVIDER
   ═══════════════════════════════════════════════════════ */

export function AuthProvider({ children }) {
  // If data version is outdated, clear ALL designfolio localStorage to force fresh seed
  if (!checkDataVersion()) {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith("designfolio_"))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    setDataVersion();
  }

  // Seed Zoho browser session for demo — simulates an active Zoho account
  // (like being logged into Zoho Mail / Cliq in this browser)
  if (!loadZohoSession()) {
    saveZohoSession({ email: "vikash.m@zohocorp.com", name: "Vikash M" });
  }

  const [usersState, setUsersState] = useState(() => loadUsers() || [...seedUsers]);
  const [invitesState, setInvitesState] = useState(() => loadInvites() || [...seedInvites]);
  const [zohoSession, setZohoSession] = useState(() => loadZohoSession());

  // Session initialization — auto-login from Zoho SSO if possible
  const [session, setSession] = useState(() => {
    const saved = loadSession();
    if (saved) return saved;

    // If a Zoho account is active in the browser AND user hasn't explicitly signed off,
    // auto-login without showing the login page (true SSO behaviour)
    const zoho = loadZohoSession();
    const didSignoff = loadExplicitSignoff();
    if (zoho && !didSignoff) {
      const users = loadUsers() || [...seedUsers];
      const user = users.find(u => u.email.toLowerCase() === zoho.email.toLowerCase());
      if (user) {
        const autoSession = { userId: user.id, loginAt: new Date().toISOString(), sso: true };
        saveSession(autoSession);
        return autoSession;
      }
    }

    return null;
  });

  // Derive authenticated user object from session
  const authUser = session
    ? usersState.find(u => u.id === session.userId) || null
    : null;

  // Does the current Zoho browser account have a Designfolio account?
  const zohoHasAccount = useMemo(() => {
    if (!zohoSession) return false;
    return usersState.some(u => u.email.toLowerCase() === zohoSession.email.toLowerCase());
  }, [zohoSession, usersState]);

  /* ── Login (email + password) ── */
  const login = useCallback((email, password) => {
    const normalEmail = email.trim().toLowerCase();

    if (!isValidDomain(normalEmail)) {
      return { ok: false, error: `Only @${ALLOWED_DOMAIN} emails are allowed` };
    }

    const user = usersState.find(u => u.email.toLowerCase() === normalEmail);
    if (!user) {
      return { ok: false, error: "No account found with this email" };
    }

    if (user.passwordHash !== hashPassword(password)) {
      return { ok: false, error: "Incorrect password" };
    }

    const newSession = { userId: user.id, loginAt: new Date().toISOString() };
    setSession(newSession);
    saveSession(newSession);

    // Update Zoho browser session to the logged-in account & clear sign-off flag
    const zohoData = { email: user.email, name: user.name };
    saveZohoSession(zohoData);
    setZohoSession(zohoData);
    clearExplicitSignoff();

    return { ok: true, user };
  }, [usersState]);

  /* ── Login with Zoho SSO (no password needed) ── */
  const loginWithSSO = useCallback(() => {
    const zoho = loadZohoSession();
    if (!zoho) return { ok: false, error: "No Zoho session found" };

    const user = usersState.find(u => u.email.toLowerCase() === zoho.email.toLowerCase());
    if (!user) return { ok: false, error: "No Designfolio account found for this email. Please create an account first." };

    const newSession = { userId: user.id, loginAt: new Date().toISOString(), sso: true };
    setSession(newSession);
    saveSession(newSession);
    clearExplicitSignoff();

    return { ok: true, user };
  }, [usersState]);

  /* ── Signup ── */
  const signup = useCallback(({ name, email, password, role, inviteToken }) => {
    const normalEmail = email.trim().toLowerCase();

    if (!isValidDomain(normalEmail)) {
      return { ok: false, error: `Only @${ALLOWED_DOMAIN} emails are allowed` };
    }

    if (!name.trim()) {
      return { ok: false, error: "Name is required" };
    }

    if (password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters" };
    }

    // Check if email already registered
    if (usersState.find(u => u.email.toLowerCase() === normalEmail)) {
      return { ok: false, error: "An account with this email already exists" };
    }

    // Create new user
    const userId = genId("u");
    const designerId = genId("d");
    const trimmedName = name.trim();
    const trimmedRole = (role || "").trim() || "Designer";

    const newUser = {
      id: userId,
      email: normalEmail,
      passwordHash: hashPassword(password),
      name: trimmedName,
      role: trimmedRole,
      designerId,
      createdAt: new Date().toISOString(),
    };

    // Create matching designer profile
    const idx = usersState.length % AVATAR_COLORS.length;
    const newDesigner = {
      id: designerId,
      name: trimmedName,
      email: normalEmail,
      role: trimmedRole,
      avatar: initials(trimmedName),
      avatarColor: AVATAR_COLORS[idx],
      profileImage: null,
      createdAt: new Date().toISOString(),
    };

    // Save user
    const updatedUsers = [...usersState, newUser];
    setUsersState(updatedUsers);
    saveUsers(updatedUsers);

    // Save designer into app data (shared with AppContext)
    try {
      const raw = localStorage.getItem(DATA_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data && data.designers) {
        data.designers.push(newDesigner);
        localStorage.setItem(DATA_KEY, JSON.stringify(data));
      } else {
        // App data doesn't exist yet — initialize with seed data + new designer
        localStorage.setItem(DATA_KEY, JSON.stringify({
          designers: [...seedDesigners, newDesigner],
          folders: [...seedFolders],
          links: [...seedLinks],
          modules: [...DEFAULT_MODULES],
        }));
      }
    } catch {}

    // Update invite status if applicable
    if (inviteToken) {
      setInvitesState(prev => {
        const updated = prev.map(inv =>
          inv.token === inviteToken
            ? { ...inv, status: "accepted", acceptedAt: new Date().toISOString(), userId }
            : inv
        );
        saveInvites(updated);
        return updated;
      });
    }

    // Auto-login
    const newSession = { userId, loginAt: new Date().toISOString() };
    setSession(newSession);
    saveSession(newSession);

    // Update Zoho browser session to the new account
    const zohoData = { email: normalEmail, name: trimmedName };
    saveZohoSession(zohoData);
    setZohoSession(zohoData);
    clearExplicitSignoff();

    return { ok: true, user: newUser, designer: newDesigner };
  }, [usersState, invitesState]);

  /* ── Update profile (name + role for current user) ── */
  const updateProfile = useCallback(({ name, role }) => {
    if (!session) return;
    const updatedUsers = usersState.map(u =>
      u.id === session.userId
        ? { ...u, name: name.trim(), role: role.trim() }
        : u
    );
    setUsersState(updatedUsers);
    saveUsers(updatedUsers);
  }, [session, usersState]);

  /* ── Logout ── */
  const logout = useCallback(() => {
    setSession(null);
    clearSession();
    // Zoho browser session stays active — only the Designfolio session is cleared.
    // Mark explicit sign-off so auto-login doesn't kick in again.
    markExplicitSignoff();
  }, []);

  /* ── Invite ── */
  const invite = useCallback((email) => {
    const normalEmail = email.trim().toLowerCase();

    if (!isValidDomain(normalEmail)) {
      return { ok: false, error: `Only @${ALLOWED_DOMAIN} emails can be invited` };
    }

    // Check if already registered
    if (usersState.find(u => u.email.toLowerCase() === normalEmail)) {
      return { ok: false, error: "This person already has an account" };
    }

    // Check if already invited (pending)
    if (invitesState.find(inv => inv.email.toLowerCase() === normalEmail && inv.status === "pending")) {
      return { ok: false, error: "An invite is already pending for this email" };
    }

    // Generate token
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const inviteLink = `${window.location.origin}/signup?invite=${token}&email=${encodeURIComponent(normalEmail)}`;

    const newInvite = {
      id: genId("inv"),
      email: normalEmail,
      invitedBy: authUser?.id || null,
      token,
      status: "pending",
      link: inviteLink,
      createdAt: new Date().toISOString(),
    };

    const updated = [...invitesState, newInvite];
    setInvitesState(updated);
    saveInvites(updated);

    return { ok: true, invite: newInvite, link: inviteLink };
  }, [usersState, invitesState, authUser]);

  /* ── Get pending invites ── */
  const getPendingInvites = useCallback(() =>
    invitesState.filter(inv => inv.status === "pending"),
    [invitesState]
  );

  /* ── Find invite by token ── */
  const findInvite = useCallback((token) =>
    invitesState.find(inv => inv.token === token && inv.status === "pending") || null,
    [invitesState]
  );

  const value = {
    authUser,
    isAuthenticated: !!authUser,
    login,
    loginWithSSO,
    signup,
    logout,
    updateProfile,
    invite,
    getPendingInvites,
    findInvite,
    ALLOWED_DOMAIN,
    zohoSession,
    zohoHasAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
