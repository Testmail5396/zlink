import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  designers as seedDesigners,
  folders as seedFolders,
  links as seedLinks,
  DEFAULT_MODULES,
} from "../data/mockData";
import { useAuth } from "./AuthContext";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

/* Maximum nesting depth for folders */
export const MAX_FOLDER_DEPTH = 10;

/* ── localStorage persistence ──────────────────────── */
const STORAGE_KEY = "designfolio_data";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.designers && data.folders && data.links) return data;
    }
  } catch { /* corrupted — fall through to seed */ }
  return null;
}

function saveToStorage(designers, folders, links, modules) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ designers, folders, links, modules }));
  } catch { /* storage full — silently ignore */ }
}

const FAV_KEY = "designfolio_fav_designers";
const MAX_FAVS = 5;

function loadFavs() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveFavs(ids) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch {}
}

/* ── Activity tracking (last seen per designer) ────── */
const SEEN_KEY = "designfolio_seen";

function loadSeen(designerList) {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // First load: mark all existing designers as seen NOW
  const initial = {};
  designerList.forEach(d => { initial[d.id] = new Date().toISOString(); });
  return initial;
}

function saveSeen(seen) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch {}
}

// ID counter — initialized inside AppProvider from actual data on mount
let _idCounter = 1000;
const genId = (prefix) => `${prefix}${++_idCounter}`;

// Avatar initials helper
function initials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-500","bg-rose-500","bg-blue-500","bg-emerald-500",
  "bg-amber-500","bg-cyan-500","bg-pink-500","bg-indigo-500",
];

export function AppProvider({ children }) {
  const { authUser } = useAuth();

  /* Load data from localStorage at mount time (after auth is ready) */
  const [designers, setDesigners] = useState(() => {
    const s = loadFromStorage();
    return s?.designers ?? [...seedDesigners];
  });
  const [folders, setFolders] = useState(() => {
    const s = loadFromStorage();
    return s?.folders ?? [...seedFolders];
  });
  const [links, setLinks] = useState(() => {
    const s = loadFromStorage();
    return s?.links ?? [...seedLinks];
  });
  const [modules, setModules] = useState(() => {
    const s = loadFromStorage();
    return s?.modules ?? [...DEFAULT_MODULES];
  });
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'designer'|'folder'|'link', id }

  /* Initialize ID counter from actual data (once per mount) */
  const idInitRef = useRef(false);
  if (!idInitRef.current) {
    const allIds = [...designers.map(d => d.id), ...folders.map(f => f.id), ...links.map(l => l.id)];
    let max = 1000;
    allIds.forEach(id => {
      const n = parseInt(String(id).replace(/\D/g, ""), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    if (max > _idCounter) _idCounter = max;
    idInitRef.current = true;
  }

  /* Derive currentUser from authenticated user + designer profile */
  const currentUser = useMemo(() => {
    if (!authUser) return null;
    const designer = designers.find(d => d.id === authUser.designerId);
    return {
      id: authUser.designerId,
      name: authUser.name,
      email: authUser.email,
      role: designer?.role || authUser.role || "",
      avatar: designer?.avatar || initials(authUser.name),
      avatarColor: designer?.avatarColor || AVATAR_COLORS[0],
      userId: authUser.id,
    };
  }, [authUser, designers]);

  // Ref for addFolder depth check (avoids stale closure)
  const foldersRef = useRef(folders);
  foldersRef.current = folders;
  const [modal, setModal] = useState(null); // { type, data }
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);
  const [favDesigners, setFavDesigners] = useState(loadFavs);
  const [lastSeenDesigners, setLastSeenDesigners] = useState(() => loadSeen(designers));

  // ── Persist to localStorage on every change ───
  useEffect(() => {
    saveToStorage(designers, folders, links, modules);
  }, [designers, folders, links, modules]);

  useEffect(() => {
    saveFavs(favDesigners);
  }, [favDesigners]);

  useEffect(() => {
    saveSeen(lastSeenDesigners);
  }, [lastSeenDesigners]);

  // ── Notification ──────────────────────────────
  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2500);
  }, []);

  // ── Modal helpers ─────────────────────────────
  const openModal = useCallback((type, data = {}) => setModal({ type, data }), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ── Activity tracking ─────────────────────────
  const markDesignerSeen = useCallback((designerId) => {
    setLastSeenDesigners(prev => ({
      ...prev,
      [designerId]: new Date().toISOString(),
    }));
  }, []);

  // ── Designers ─────────────────────────────────
  const addDesigner = useCallback((fields) => {
    setDesigners(prev => {
      const idx = prev.length % AVATAR_COLORS.length;
      const newDesigner = {
        id: genId("d"),
        name: fields.name.trim(),
        email: fields.email?.trim() || "",
        role: fields.role?.trim() || "",
        avatar: initials(fields.name),
        avatarColor: AVATAR_COLORS[idx],
        profileImage: fields.profileImage || null,
        createdAt: new Date().toISOString(),
      };
      // Mark new designer as seen
      setLastSeenDesigners(s => ({ ...s, [newDesigner.id]: new Date().toISOString() }));
      showNotification(`${newDesigner.name} added`);
      return [...prev, newDesigner];
    });
  }, [showNotification]);

  const updateDesigner = useCallback((id, fields) => {
    setDesigners(prev => prev.map(d =>
      d.id === id
        ? { ...d, ...fields, avatar: initials(fields.name || d.name) }
        : d
    ));
    showNotification("Designer updated");
  }, [showNotification]);

  const deleteDesigner = useCallback((id) => {
    setDesigners(prev => prev.filter(d => d.id !== id));
    setFolders(prev => prev.filter(f => f.designerId !== id));
    setLinks(prev => prev.filter(l => l.designerId !== id));
    setFavDesigners(prev => prev.filter(fid => fid !== id));
    setSelectedItem(prev => prev?.id === id ? null : prev);
    setLastSeenDesigners(prev => { const next = { ...prev }; delete next[id]; return next; });
    showNotification("Designer deleted");
  }, [showNotification]);

  const toggleFavDesigner = useCallback((id) => {
    setFavDesigners(prev => {
      if (prev.includes(id)) {
        return prev.filter(fid => fid !== id);
      }
      if (prev.length >= MAX_FAVS) {
        showNotification(`Maximum ${MAX_FAVS} pinned designers`, "error");
        return prev;
      }
      return [...prev, id];
    });
  }, [showNotification]);

  // ── Folders ───────────────────────────────────
  const addFolder = useCallback((fields) => {
    // Enforce max nesting depth
    if (fields.parentFolderId) {
      let depth = 0;
      let currentId = fields.parentFolderId;
      const cur = foldersRef.current;
      while (currentId) {
        depth++;
        const f = cur.find(fo => fo.id === currentId);
        currentId = f?.parentFolderId || null;
      }
      if (depth >= MAX_FOLDER_DEPTH) {
        showNotification(`Maximum folder depth is ${MAX_FOLDER_DEPTH} levels`, "error");
        return null;
      }
    }

    const now = new Date().toISOString();
    const newFolder = {
      id: genId("fo"),
      designerId: fields.designerId,
      parentFolderId: fields.parentFolderId || null,
      name: fields.name.trim(),
      isPersonal: fields.isPersonal || false,
      createdAt: now,
      updatedAt: now,
    };
    setFolders(prev => [...prev, newFolder]);
    showNotification(`"${newFolder.name}" created`);
    return newFolder;
  }, [showNotification]);

  const updateFolder = useCallback((id, fields) => {
    setFolders(prev => prev.map(f =>
      f.id === id ? { ...f, ...fields, updatedAt: new Date().toISOString() } : f
    ));
    showNotification("Folder updated");
  }, [showNotification]);

  const deleteFolder = useCallback((id) => {
    setFolders(prev => {
      // Recursively collect all folder IDs to delete
      const collectIds = (folderId, allFolders) => {
        const children = allFolders.filter(f => f.parentFolderId === folderId).map(f => f.id);
        return [folderId, ...children.flatMap(cid => collectIds(cid, allFolders))];
      };
      const idsToDelete = collectIds(id, prev);
      setLinks(lPrev => lPrev.filter(l => !idsToDelete.includes(l.folderId)));
      setSelectedItem(sPrev => idsToDelete.includes(sPrev?.id) ? null : sPrev);
      return prev.filter(f => !idsToDelete.includes(f.id));
    });
    showNotification("Folder deleted");
  }, [showNotification]);

  // ── Links ─────────────────────────────────────
  const addLink = useCallback((fields) => {
    const now = new Date().toISOString();
    const newLink = {
      id: genId("l"),
      designerId: fields.designerId,
      folderId: fields.folderId || null,
      title: fields.title.trim(),
      url: fields.url.trim(),
      description: fields.description?.trim() || "",
      thumbnail: fields.thumbnail?.trim() || null,
      sharedWith: fields.sharedWith || [],
      modules: fields.modules || [],
      createdAt: now,
      updatedAt: now,
    };
    setLinks(prev => [...prev, newLink]);
    showNotification("Link added");
    return newLink;
  }, [showNotification]);

  const updateLink = useCallback((id, fields) => {
    setLinks(prev => prev.map(l =>
      l.id === id ? { ...l, ...fields, updatedAt: new Date().toISOString() } : l
    ));
    showNotification("Link updated");
  }, [showNotification]);

  const deleteLink = useCallback((id) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    setSelectedItem(prev => prev?.id === id ? null : prev);
    showNotification("Link deleted");
  }, [showNotification]);

  // ── Silent move (no notification — used by drag & drop) ──
  const moveLinkSilent = useCallback((id, fields) => {
    setLinks(prev => prev.map(l =>
      l.id === id ? { ...l, ...fields, updatedAt: new Date().toISOString() } : l
    ));
  }, []);

  const moveFolderSilent = useCallback((id, fields) => {
    setFolders(prev => prev.map(f =>
      f.id === id ? { ...f, ...fields, updatedAt: new Date().toISOString() } : f
    ));
  }, []);

  // ── Modules ──────────────────────────────
  const addModule = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    // Reject duplicate (case-insensitive)
    if (modules.some(m => m.toLowerCase() === trimmed.toLowerCase())) return false;
    setModules(prev => [...prev, trimmed]);
    showNotification(`"${trimmed}" module added`);
    return true;
  }, [modules, showNotification]);

  // ── Helpers ───────────────────────────────────
  const getDesignerTopFolders = useCallback((designerId) =>
    folders.filter(f => f.designerId === designerId && f.parentFolderId === null),
    [folders]);

  const getSubFolders = useCallback((folderId) =>
    folders.filter(f => f.parentFolderId === folderId),
    [folders]);

  const getFolderLinks = useCallback((folderId) =>
    links.filter(l => l.folderId === folderId),
    [links]);

  const getAllDesignerLinks = useCallback((designerId) =>
    links.filter(l => l.designerId === designerId),
    [links]);

  const getAllDesignerFolders = useCallback((designerId) =>
    folders.filter(f => f.designerId === designerId),
    [folders]);

  const getDesignerRootLinks = useCallback((designerId) =>
    links.filter(l => l.designerId === designerId && !l.folderId),
    [links]);

  const copyLink = useCallback((url) => {
    navigator.clipboard?.writeText(url).catch(() => {});
    showNotification("Link copied!");
  }, [showNotification]);

  // Collect all personal folder IDs for a designer (folder + all descendants)
  const getPersonalFolderIds = useCallback((designerId) => {
    const personalRoots = folders.filter(f => f.designerId === designerId && f.isPersonal);
    const collectDescendants = (folderId) => {
      const children = folders.filter(f => f.parentFolderId === folderId);
      return [folderId, ...children.flatMap(c => collectDescendants(c.id))];
    };
    return personalRoots.flatMap(f => collectDescendants(f.id));
  }, [folders]);

  // Check if a folder is inside a personal folder tree (folder itself or any ancestor is personal)
  const isFolderPersonal = useCallback((folderId) => {
    let currentId = folderId;
    while (currentId) {
      const f = folders.find(fo => fo.id === currentId);
      if (!f) return false;
      if (f.isPersonal) return true;
      currentId = f.parentFolderId;
    }
    return false;
  }, [folders]);

  const getFolderPath = useCallback((folderId) => {
    const path = [];
    let current = folders.find(f => f.id === folderId);
    while (current) {
      path.unshift(current.name);
      const parentId = current.parentFolderId;
      // eslint-disable-next-line no-loop-func
      current = parentId ? folders.find(f => f.id === parentId) : null;
    }
    return path.join(" / ");
  }, [folders]);

  const value = {
    // State
    designers, folders, links, modules,
    selectedItem, setSelectedItem,
    modal, openModal, closeModal,
    searchQuery, setSearchQuery,
    notification,
    currentUser,
    favDesigners,
    lastSeenDesigners,
    // Actions
    addDesigner, updateDesigner, deleteDesigner, toggleFavDesigner,
    addFolder, updateFolder, deleteFolder,
    addLink, updateLink, deleteLink,
    moveLinkSilent, moveFolderSilent, addModule,
    copyLink, showNotification,
    markDesignerSeen,
    // Helpers
    getDesignerTopFolders, getSubFolders, getFolderLinks,
    getAllDesignerLinks, getAllDesignerFolders, getDesignerRootLinks, getFolderPath,
    getPersonalFolderIds, isFolderPersonal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
