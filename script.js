'use strict';

/* ==========================================================
   AKADEMİKKAPİTAL — Yükseköğretim Arşivi
   Depolama: IndexedDB + İsteğe Bağlı Global Yayın Senkronizasyonu
   ========================================================== */

/* ---------- Sabitler ---------- */
const DB_NAME = 'akademikkapital-db';
const DB_VERSION = 1;
const SESSION_KEY = 'ak_admin_session';
const AUTOSAVE_DELAY_MS = 700;

const ADMIN_EMAIL = 'akademikkapital@gmail.com';
const SUPABASE_MODULE_URL = 'https://esm.sh/@supabase/supabase-js@2';

const MAX_FILE_MB = 50;
const BACKUP_FILE_LIMIT_MB = 50;
const LARGE_FILE_MB = 50;
const FEATURED_COUNT = 8;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_SECONDS = 30;

const MAX_IMAGE_MB = 25;
const MAX_BODY_IMAGES = 40;
const SECTION_ORDER = ['tumu', 'makale', 'haberler', 'duyurular', 'dokuman', 'baglanti', 'hakkimizda'];
const IMAGE_EXT = ['jpg', 'jpeg', 'jfif', 'pjpeg', 'png', 'apng', 'gif', 'webp', 'avif', 'svg',
  'bmp', 'ico', 'tif', 'tiff', 'heic', 'heif', 'jxl'];

const BLOCKED_EXT = [
  'exe', 'bat', 'cmd', 'com', 'scr', 'pif', 'msi', 'msp', 'vbs', 'vbe', 'jse',
  'wsf', 'wsh', 'ps1', 'psm1', 'jar', 'dll', 'lnk', 'hta', 'cpl', 'reg',
  'apk', 'dmg', 'sh', 'js'
];

const SOCIAL_PLATFORMS = [
  { key: 'telegram', label: 'Telegram', inputId: '#socTelegram' },
  { key: 'whatsapp', label: 'WhatsApp', inputId: '#socWhatsApp' },
  { key: 'instagram', label: 'Instagram', inputId: '#socInstagram' },
  { key: 'threads', label: 'Threads', inputId: '#socThreads' },
  { key: 'x', label: 'X (Twitter)', inputId: '#socX' }
];

const TYPES = {
  makale: {
    badge: 'Makale', nav: 'Makale',
    desc: 'Yükseköğretim politikası, mevzuat ve akademik yayın süreçleri üzerine derinlikli incelemeler ile okuma rehberleri.'
  },
  haberler: {
    badge: 'Haber', nav: 'Haberler',
    desc: 'Yükseköğretim gündemindeki gelişmelerin kaynağı belirtilmiş, kısa ve tarih sıralı kayıtları.'
  },
  duyurular: {
    badge: 'Duyuru', nav: 'Duyurular',
    desc: 'Arşive ilişkin bildirimler ile akademik kariyer, ilan ve çağrı duyuruları.'
  },
  dokuman: {
    badge: 'Doküman', nav: 'Doküman Arşivi',
    desc: 'İndirilebilir araştırma dosyaları, veri setleri, şablonlar ve belgeler. Her kayıtta dosya adı ve boyutu belirtilir.'
  },
  baglanti: {
    badge: 'Dış Bağlantı', nav: 'Dış Bağlantılar',
    desc: 'Birincil kaynaklara ve resmî kurumlara yönlendiren bağlantılar. Bağlantılar ilgili kurumların kendi sitelerine açılır.'
  }
};

const ALL_DESC = 'Makale, haber, duyuru, doküman ve dış bağlantı kayıtlarının tarih sıralı, kaynaklı ve aranabilir arşivi.';

const NAV_LABELS = Object.assign({ tumu: 'Tümü', hakkimizda: 'Hakkımızda' },
  Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [k, v.nav])));

/* ---------- Durum ---------- */
const state = {
  items: [],
  filter: 'tumu',
  query: '',
  year: 'all',
  sort: 'desc',
  isAdmin: false,
  adminFilter: 'all',
  adminQuery: '',
  social: { telegram: '', whatsapp: '', instagram: '', threads: '', x: '' }
};

let db = null;
let supabase = null;
let authRedirectTo = null;
let useMemory = false;
let defaultLogo = '';
let autosaveTimer = null;
let isAutosaving = false;
let isRemoteReady = false;
const mem = { items: new Map(), files: new Map(), settings: new Map() };
const KEY_PATH = { items: 'id', files: 'id', settings: 'key' };

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- Analytics / GTM Olay Yardımcısı ---------- */
function trackEvent(eventName, params = {}) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: eventName }, params));
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  } catch (e) { /* analitik hatası akışı durdurmaz */ }
}

/* ---------- Supabase: ortak arşiv, editör girişi ve canlı güncellemeler ---------- */
async function initializeSupabase() {
  const configResponse = await fetch('/api/config', { cache: 'no-store' });
  if (!configResponse.ok) throw new Error('Supabase yapılandırması alınamadı.');
  const config = await configResponse.json();
  authRedirectTo = config.redirectTo || `${window.location.origin}/auth/callback`;
  const { createClient } = await import(SUPABASE_MODULE_URL);
  supabase = createClient(config.url, config.key, {
    auth: {
      storage: window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  isRemoteReady = true;

  const { data: { session } } = await supabase.auth.getSession();
  state.isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL;
  if (session && !state.isAdmin) await supabase.auth.signOut();

  supabase.auth.onAuthStateChange((_event, sessionState) => {
    const isAllowed = sessionState?.user?.email?.toLowerCase() === ADMIN_EMAIL;
    state.isAdmin = isAllowed;
    if (sessionState && !isAllowed) {
      void supabase.auth.signOut();
      return;
    }
    updateAdminUI();
    if (isAllowed) void migrateLocalArchiveIfCloudIsEmpty();
  });

  supabase.channel('public-archive-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'archive_items' }, () => {
      void refreshRemoteArchive();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'archive_settings' }, () => {
      void refreshRemoteSettings();
    })
    .subscribe();
}

async function refreshRemoteArchive() {
  await loadItems();
  refreshAll();
}

async function refreshRemoteSettings() {
  await Promise.all([loadLogo(), loadSocial()]);
  renderSocialTargets();
}

async function migrateLocalArchiveIfCloudIsEmpty() {
  if (!supabase || !state.isAdmin) return;
  const { count, error } = await supabase.from('archive_items').select('id', { count: 'exact', head: true });
  if (error || count !== 0) return;
  const localItems = await dbAll('items');
  for (const item of localItems) {
    if (!item || !TYPES[item.type]) continue;
    await syncGlobalPublish('upsert_item', item);
  }
  const localSettings = await dbAll('settings');
  const social = localSettings.find(setting => setting.key === 'social');
  const logo = localSettings.find(setting => setting.key === 'logo');
  if (social) await syncGlobalPublish('social_update', social.value);
  if (logo && logo.value) await syncGlobalPublish('logo_update', { logo: logo.value });
  await refreshRemoteArchive();
  await refreshRemoteSettings();
}

async function syncItemFiles(item) {
  const metas = [item.file, item.image, ...(item.images || [])].filter(Boolean);
  for (const meta of metas) {
    if (meta.url) continue;
    const record = await dbGet('files', meta.id);
    if (!record || !record.blob) continue;
    const path = `${item.id}/${meta.id}-${encodeURIComponent(meta.name || 'file')}`;
    const { error } = await supabase.storage.from('archive-files').upload(path, record.blob, {
      upsert: true,
      contentType: record.type || 'application/octet-stream'
    });
    if (error) throw error;
    const { data } = supabase.storage.from('archive-files').getPublicUrl(path);
    meta.url = data.publicUrl;
  }
}

async function syncGlobalPublish(action, payload) {
  if (!supabase) return { synced: false };
  if (!state.isAdmin) throw new Error('Düzenleme için yetkili editör hesabıyla giriş yapın.');

  let result;
  if (action === 'upsert_item') {
    await syncItemFiles(payload);
    await dbPut('items', payload);
    result = await supabase.from('archive_items').upsert({
      id: payload.id,
      payload,
      updated_at: new Date().toISOString()
    });
  } else if (action === 'delete_item') {
    result = await supabase.from('archive_items').delete().eq('id', payload.id);
  } else {
    const key = action === 'social_update' ? 'social' : 'logo';
    const value = action === 'social_update' ? payload :
      action === 'logo_reset' ? { logo: null } : { logo: payload.logo || null };
    result = await supabase.from('archive_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    });
  }
  if (result.error) throw result.error;
  return { synced: true };
}

/* ==========================================================
   Veritabanı katmanı
   ========================================================== */
function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB desteklenmiyor'));
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { return reject(e); }
    req.onupgradeneeded = () => {
      const d = req.result;
      Object.entries(KEY_PATH).forEach(([store, keyPath]) => {
        if (!d.objectStoreNames.contains(store)) d.createObjectStore(store, { keyPath });
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Veritabanı engellendi'));
  });
}

function idb(store, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = fn(tx.objectStore(store));
    let result;
    if (request) request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function dbAll(store) {
  if (useMemory) return [...mem[store].values()];
  return idb(store, 'readonly', os => os.getAll());
}
async function dbGet(store, key) {
  if (useMemory) return mem[store].get(key);
  return idb(store, 'readonly', os => os.get(key));
}
async function dbPut(store, value) {
  if (useMemory) { mem[store].set(value[KEY_PATH[store]], value); return; }
  return idb(store, 'readwrite', os => os.put(value));
}
async function dbDel(store, key) {
  if (useMemory) { mem[store].delete(key); return; }
  return idb(store, 'readwrite', os => os.delete(key));
}

/* ==========================================================
   Yardımcılar
   ========================================================== */
function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(16).slice(2);
}

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function isoFromDate(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function todayISO() { return isoFromDate(new Date()); }

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoFromDate(d);
}

function isValidISO(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || ''); }

function parseDate(iso) {
  if (!isValidISO(iso)) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const fmtLong = iso => parseDate(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMonth = iso => parseDate(iso).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const fmtShort = iso => parseDate(iso).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });

function fmtSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

const norm = s => String(s || '').toLocaleLowerCase('tr-TR');

function safeUrl(input) {
  let v = String(input || '').trim();
  if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
  try {
    const u = new URL(v);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
  } catch (e) { return null; }
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
}

function fileExt(name) {
  const m = /\.([^.]+)$/.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}

function checkFile(file) {
  if (BLOCKED_EXT.includes(fileExt(file.name))) {
    return `".${fileExt(file.name)}" uzantılı çalıştırılabilir dosyalar güvenlik nedeniyle yüklenemez.`;
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `Dosya ${MAX_FILE_MB} MB sınırını aşıyor (${fmtSize(file.size)}).`;
  }
  return null;
}

async function checkStorageFor(bytes) {
  const MB = 1024 * 1024;
  if (useMemory) {
    return bytes > 100 * MB
      ? 'Tarayıcı depolaması kullanılamadığı için büyük dosyalar kaydedilemez (özel gezinti penceresi olabilir).'
      : null;
  }
  try {
    if (bytes > LARGE_FILE_MB * MB && navigator.storage && navigator.storage.persist) {
      await navigator.storage.persist();
    }
  } catch (e) { /* isteğe bağlı */ }
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { quota, usage } = await navigator.storage.estimate();
      if (quota && usage != null && quota - usage < bytes * 1.05) {
        return `Tarayıcı depolama alanı yetersiz (boş alan: ${fmtSize(Math.max(0, quota - usage))}, gereken: ${fmtSize(bytes)}). Disk alanı açın veya daha küçük bir dosya seçin.`;
      }
    }
  } catch (e) { /* tahmin alınamazsa kaydı yine de dene */ }
  return null;
}

function coverOf(it) {
  return it.image || (it.images && it.images[0]) || null;
}

const IMG_TOKEN = /\[\[\s*G[ÖöOo]RSEL\s*:\s*(\d+)\s*\]\]/gi;

function remapPlaceholders(text, fn) {
  return String(text || '')
    .replace(IMG_TOKEN, (m, n) => {
      const r = fn(Number(n));
      return r == null ? '' : `[[GÖRSEL:${r}]]`;
    })
    .replace(/\n{3,}/g, '\n\n');
}

function cleanPastedText(raw, opts) {
  const o = Object.assign({ unwrap: true, bullets: true, autoTitle: true, autoSummary: true }, opts);
  const before = String(raw || '').replace(/\r\n?/g, '\n');
  const blankBefore = before.split('\n').filter(l => !l.trim()).length;

  let t = before
    .replace(/[​-‍﻿­]/g, '')
    .replace(/[   ]/g, ' ')
    .replace(/\t/g, ' ');
  t = t.split('\n').map(l => l.replace(/ {2,}/g, ' ').trim()).join('\n');
  if (o.bullets) {
    t = t.split('\n').map(l => l.replace(/^([•·▪●◦‣∙]|\*(?=\s))\s*/, '- ')).join('\n');
  }
  t = t.replace(/\n{3,}/g, '\n\n').trim();

  let title = '';
  if (o.autoTitle) {
    const lines = t.split('\n');
    if (lines.length > 1 && lines[0].length <= 200) {
      title = lines[0].replace(/^#+\s*/, '').trim();
      t = lines.slice(1).join('\n').replace(/^\n+/, '');
    }
  }

  const isBlockLine = l => /^(-\s|\d+[.)]\s|##\s)/.test(l);
  let paras = t ? t.split(/\n{2,}/) : [];
  if (o.unwrap) {
    paras = paras.map(p => {
      const lines = p.split('\n');
      if (lines.length < 2 || lines.some(isBlockLine)) return p;
      return lines.reduce((acc, l) =>
        (/-$/.test(acc) && /^[a-zçğıöşü]/.test(l)) ? acc.slice(0, -1) + l : acc + ' ' + l);
    });
  }

  let summary = '';
  if (o.autoSummary && paras.length && !isBlockLine(paras[0].split('\n')[0])) {
    const first = paras[0];
    if (first.length <= 400) {
      summary = first.replace(/\n/g, ' ');
      if (paras.length > 1) paras = paras.slice(1);
    } else {
      const flat = first.replace(/\n/g, ' ');
      const cut = flat.slice(0, 400);
      const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
      summary = stop > 120 ? cut.slice(0, stop + 1) : cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s]+$/, '') + '…';
    }
  }

  const body = paras.join('\n\n');
  return {
    title, summary, body,
    stats: {
      inChars: before.length, outChars: title.length + summary.length + body.length,
      blankBefore, paragraphs: paras.length
    }
  };
}

function isImageLike(name, type) {
  return String(type || '').startsWith('image/') || IMAGE_EXT.includes(fileExt(name));
}

function checkImage(file) {
  if (!isImageLike(file.name, file.type)) {
    return 'Lütfen bir görsel dosyası seçin (JPG, PNG, WebP, GIF, AVIF, SVG, HEIC vb.).';
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return `Görsel ${MAX_IMAGE_MB} MB sınırını aşıyor (${fmtSize(file.size)}).`;
  }
  return null;
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

function setAutosaveLabel(text) {
  const el = $('#autosaveStatus');
  if (el) el.textContent = text;
}

function openDialog(dlg) {
  if (!dlg.open) dlg.showModal();
  document.body.classList.add('modal-open');
}

function blockEl(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length && lines.every(l => /^[-•]\s+/.test(l))) {
    return h('ul', {}, lines.map(l => h('li', {}, l.replace(/^[-•]\s+/, ''))));
  }
  if (lines.length && lines.every(l => /^\d+[.)]\s+/.test(l))) {
    return h('ol', {}, lines.map(l => h('li', {}, l.replace(/^\d+[.)]\s+/, ''))));
  }
  return h('p', { style: 'white-space: pre-line' }, block.trim());
}

function renderRichText(box, text, onImage) {
  const prepared = String(text || '').replace(IMG_TOKEN, (m, n) => `\n\n[[GÖRSEL:${n}]]\n\n`);
  prepared.split(/\n{2,}/).map(s => s.trim()).filter(Boolean).forEach(block => {
    const tok = /^\[\[GÖRSEL:(\d+)\]\]$/.exec(block);
    if (tok) {
      const el = onImage ? onImage(Number(tok[1])) : null;
      if (el) box.append(el);
      return;
    }
    const first = block.split('\n')[0];
    if (/^##\s+/.test(first)) {
      box.append(h('h3', { class: 'reader-h' }, first.replace(/^##\s+/, '')));
      const rest = block.split('\n').slice(1).join('\n').trim();
      if (rest) box.append(blockEl(rest));
    } else {
      box.append(blockEl(block));
    }
  });
}

function noteLines(text) {
  return String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
}

/* ==========================================================
   Sosyal Medya Bağlantıları
   ========================================================== */
function socialIconSvg(key) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const addPath = (d, extra = {}) => {
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', d);
    for (const [k, v] of Object.entries(extra)) p.setAttribute(k, v);
    svg.appendChild(p);
  };

  if (key === 'telegram') {
    addPath('M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z');
  } else if (key === 'whatsapp') {
    addPath('M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.453 3.484 1.313 5l-1.375 5.031 5.156-1.359c1.469.797 3.109 1.219 4.781 1.219h.016c5.516 0 9.969-4.453 9.969-9.969 0-2.672-1.047-5.172-2.922-7.062s-4.391-2.929-7.367-2.929zm5.828 14.141c-.25.703-1.438 1.344-1.984 1.422-.516.078-1.156.109-1.859-.109-.422-.141-.969-.313-1.672-.609-2.938-1.266-4.859-4.203-5.008-4.406-.141-.188-1.188-1.578-1.188-3.016 0-1.438.75-2.141 1.016-2.438.266-.297.578-.375.766-.375s.375 0 .547.016c.172.016.406-.063.641.484.25.578.828 2.016.906 2.172.078.156.125.328.031.516s-.141.313-.281.484-.297.375-.422.5c-.141.141-.297.297-.125.578.172.281.766 1.266 1.641 2.047 1.125 1 2.078 1.313 2.375 1.453.297.141.469.125.641-.063.172-.188.734-.859.938-1.156.203-.297.391-.25.656-.156.266.094 1.688.797 1.984.938.297.141.484.219.563.344.078.125.078.719-.172 1.422z');
  } else if (key === 'instagram') {
    addPath('M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 0 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z');
  } else if (key === 'threads') {
    addPath('M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.762 2.119-1.207 3.583-1.286a13.85 13.85 0 0 1 3.028.142c-.126-.742-.37-1.335-.731-1.766-.48-.572-1.22-.864-2.198-.868h-.022c-.913 0-1.85.276-2.464.724l-1.158-1.59c.956-.698 2.248-1.113 3.637-1.113h.03c1.564.006 2.79.48 3.548 1.372.662.779 1.044 1.854 1.137 3.194.283.128.554.27.812.427 1.253.763 2.154 1.825 2.54 2.99.514 1.554.44 4.197-1.564 6.163-1.82 1.785-4.015 2.559-7.125 2.582zm.23-9.366c-1.807.098-2.752.847-2.697 1.855.052.936.935 1.547 2.244 1.477 1.077-.058 1.912-.465 2.482-1.21.418-.546.686-1.295.798-2.228a11.79 11.79 0 0 0-2.827.106z');
  } else if (key === 'x') {
    addPath('M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z');
  }

  return svg;
}

function normalizeSocialMap(raw) {
  const out = { telegram: '', whatsapp: '', instagram: '', threads: '', x: '' };
  if (!raw || typeof raw !== 'object') return out;
  for (const p of SOCIAL_PLATFORMS) {
    const u = safeUrl(raw[p.key]);
    if (u) out[p.key] = u;
  }
  return out;
}

function renderSocialTargets() {
  const targets = [
    { wrap: $('#headerSocial'), list: $('#headerSocialLinks') },
    { wrap: $('#footerSocial'), list: $('#footerSocialLinks') }
  ];

  const active = SOCIAL_PLATFORMS.filter(p => !!state.social[p.key]);

  targets.forEach(({ wrap, list }) => {
    if (!wrap || !list) return;
    list.replaceChildren();
    if (!active.length) {
      wrap.hidden = true;
      return;
    }
    active.forEach(p => {
      const a = h('a', {
        class: 'social-link',
        href: state.social[p.key],
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `${p.label} — Bizi Takip Edin`,
        title: `${p.label} — Bizi Takip Edin`
      }, socialIconSvg(p.key));
      list.append(a);
    });
    wrap.hidden = false;
  });
}

function fillSocialInputs() {
  const err = $('#socialError');
  if (err) { err.textContent = ''; err.hidden = true; }
  SOCIAL_PLATFORMS.forEach(p => {
    const inp = $(p.inputId);
    if (inp) inp.value = state.social[p.key] || '';
  });
}

async function loadSocial() {
  try {
    if (supabase && isRemoteReady) {
      const { data, error } = await supabase.from('archive_settings').select('value').eq('key', 'social').maybeSingle();
      if (error) throw error;
      state.social = normalizeSocialMap(data && data.value);
    } else {
      const rec = await dbGet('settings', 'social');
      state.social = normalizeSocialMap(rec && rec.value);
    }
  } catch (e) {
    state.social = normalizeSocialMap(null);
  }
  renderSocialTargets();
}

async function saveSocial(silent = false) {
  const err = $('#socialError');
  if (err) { err.textContent = ''; err.hidden = true; }

  const next = { telegram: '', whatsapp: '', instagram: '', threads: '', x: '' };
  for (const p of SOCIAL_PLATFORMS) {
    const inp = $(p.inputId);
    const rawVal = inp ? inp.value.trim() : '';
    if (!rawVal) {
      next[p.key] = '';
      continue;
    }
    const valid = safeUrl(rawVal);
    if (!valid) {
      const msg = `${p.label} için geçerli bir http(s) bağlantısı girin.`;
      if (err) { err.textContent = msg; err.hidden = false; }
      if (!silent && inp) inp.focus();
      return;
    }
    next[p.key] = valid;
    if (inp) inp.value = valid;
  }

  try {
    await dbPut('settings', { key: 'social', value: next });
    state.social = next;
    renderSocialTargets();
    await syncGlobalPublish('social_update', next);
    setAutosaveLabel('Kaydedildi');
    if (!silent) toast('Sosyal medya bağlantıları kaydedildi ve yayınlandı.');
  } catch (e) {
    const msg = 'Sosyal medya bağlantıları kaydedilemedi.';
    if (err) { err.textContent = msg; err.hidden = false; }
    else toast(msg);
  }
}

/* ==========================================================
   SHA-256 (giriş doğrulaması)
   ========================================================== */
/* SHA256-START */
function sha256Fallback(ascii) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j, result = '';
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = sha256Fallback.h = sha256Fallback.h || [];
  const k = sha256Fallback.k = sha256Fallback.k || [];
  let primeCounter = k[lengthProperty];
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return null;
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength);
  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
          w[i - 16]
          + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
          + w[i - 7]
          + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
        ) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? 0 : '') + b.toString(16);
    }
  }
  return result;
}
/* SHA256-END */

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  if (window.crypto && crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { /* yedek yönteme geç */ }
  }
  return sha256Fallback(String.fromCharCode(...bytes));
}

/* ==========================================================
   Başlangıç verileri (yalnızca ilk açılışta)
   ========================================================== */
async function seedIfNeeded() {
  if (isRemoteReady) return;
  const seeded = await dbGet('settings', 'seeded');
  if (seeded) return;

  const now = Date.now();

  async function seedFile(name, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const id = uid();
    await dbPut('files', { id, blob, name, type: 'text/plain', size: blob.size });
    return { id, name, type: 'text/plain', size: blob.size };
  }

  const guideFile = await seedFile('arsiv-kullanim-notu.txt', [
    'AKADEMİKKAPİTAL — Arşiv Kullanım Notu',
    '',
    '1. Kategoriler',
    '   Makale, Haberler, Duyurular, Doküman Arşivi ve Dış Bağlantılar bölümleri üst menüden seçilir.',
    '',
    '2. Arama ve süzme',
    '   Üstteki arama kutusu başlık, özet, metin ve kaynak alanlarında çalışır. Yıl düğmeleri kayıtları yıla göre süzer.',
    '',
    '3. Okuma',
    '   Bir kaydın başlığına veya "Oku" düğmesine tıklayınca özet, tam metin, ilgili bağlantı/belge',
    '   ve "Referanslar ve notlar" bölümü aynı pencerede görüntülenir.',
    '',
    '4. Yedekleme',
    '   İçerikler depolamada tutulur. Editör panelindeki Ayarlar sekmesinden .json yedeği alınabilir.'
  ].join('\n'));

  const templateFile = await seedFile('kaynak-kayit-sablonu.txt', [
    'AKADEMİKKAPİTAL — Kaynak Kayıt Şablonu',
    '',
    'Başlık            :',
    'Kategori          : (Makale / Haberler / Duyurular / Doküman Arşivi / Dış Bağlantılar)',
    'Yayın tarihi      : (GG.AA.YYYY)',
    'Kaynak / kurum    :',
    'Birincil kaynak   : (Resmî Gazete, kurum sayfası, özgün veri tablosu vb. bağlantısı)',
    'Kısa özet         : (en çok 2 cümle)',
    'Tam metin         :',
    'Referanslar/notlar: (her satıra bir madde: künye, istatistik notu, yürürlük tarihi)'
  ].join('\n'));

  const seeds = [
    {
      type: 'duyurular', date: daysAgoISO(1),
      title: 'AkademikKapital arşivi yayında',
      summary: 'Arşivin bölümleri, kayıt düzeni ve kullanım biçimi hakkında kısa bilgilendirme.',
      source: 'AkademikKapital Editörlüğü',
      body: [
        '## Arşivin kapsamı',
        'Bu arşiv; yükseköğretim mevzuatı, sınav ve yerleştirme süreçleri, akademik kariyer ilanları, araştırma çağrıları ve veri kaynakları ile ilgili kayıtları tek yerde ve tarih sırasıyla toplar.',
        '## Bölümler',
        '- Makale: politika, mevzuat ve yöntem üzerine incelemeler\n- Haberler: kaynaklı ve kısa gelişme kayıtları\n- Duyurular: arşiv ve akademik kariyer duyuruları\n- Doküman Arşivi: indirilebilir dosya ve şablonlar\n- Dış Bağlantılar: resmî kurum ve birincil kaynak bağlantıları'
      ].join('\n\n'),
      notes: 'Kullanım ayrıntıları için Doküman Arşivi’ndeki “Arşiv kullanım notu” kaydına bakınız.'
    },
    {
      type: 'makale', date: daysAgoISO(5),
      title: 'Mevzuatı birincil kaynaktan okumak: bir yöntem notu',
      summary: 'Bir düzenlemeyi doğru ve güncel okumak için izlenebilecek beş adımlık çerçeve.',
      source: 'AkademikKapital Editörlüğü',
      body: [
        'Yükseköğretim mevzuatı sık güncellenir; ikincil özetler zamanla eskiyebilir.',
        '## Beş adımlık çerçeve',
        '1. Metni bulun: Kanun, yönetmelik veya kurul kararının özgün metnini Resmî Gazete ya da Mevzuat Bilgi Sistemi’nde arayın.\n2. Yürürlük tarihini kontrol edin.\n3. Değişiklikleri izleyin.\n4. Kurum açıklamasına bakın.\n5. İkincil yorumu en son okuyun.'
      ].join('\n\n'),
      url: 'https://www.resmigazete.gov.tr',
      notes: 'Resmî Gazete: yayım tarihi ve sayısı ile özgün metin.'
    },
    {
      type: 'dokuman', date: daysAgoISO(2),
      title: 'Arşiv kullanım notu',
      summary: 'Arama, süzme, okuma ve yedekleme adımlarını anlatan kısa kullanım belgesi (TXT).',
      source: 'AkademikKapital Editörlüğü',
      body: 'Doküman Arşivi kayıtlarına PDF, görsel, ZIP ve diğer dosya türleri eklenebilir.',
      notes: 'Dosya biçimi: düz metin (UTF-8).',
      file: guideFile
    },
    {
      type: 'dokuman', date: daysAgoISO(6),
      title: 'Kaynak kayıt şablonu',
      summary: 'Yeni kayıt hazırlarken kullanılabilecek alan listesi (TXT).',
      source: 'AkademikKapital Editörlüğü',
      body: 'Yeni kayıt hazırlarken başlık, kategori, tarih, kaynak ve referans alanlarını düzenleyebilirsiniz.',
      notes: 'Resmî metin ile editör yorumunun ayrı yazılması önerilir.',
      file: templateFile
    }
  ];

  const links = [
    ['Yükseköğretim Kurulu (YÖK)', 'https://www.yok.gov.tr', 'YÖK', 'Yükseköğretim Kurulu’nun resmî internet sitesi.', 'Yükseköğretim mevzuatı, kurul kararları ve kurumsal duyurular için birincil kaynak.'],
    ['Ölçme, Seçme ve Yerleştirme Merkezi (ÖSYM)', 'https://www.osym.gov.tr', 'ÖSYM', 'ÖSYM’nin resmî internet sitesi.', 'Sınav takvimi, kılavuzlar, başvuru ve yerleştirme duyuruları için birincil kaynak.'],
    ['Resmî Gazete', 'https://www.resmigazete.gov.tr', 'T.C. Resmî Gazete', 'Mevzuat değişikliklerinin yayımlandığı resmî yayın organı.', 'Kanun, yönetmelik ve kurul kararlarının özgün metinleri ile yayım tarihleri için birincil kaynak.'],
    ['Mevzuat Bilgi Sistemi', 'https://www.mevzuat.gov.tr', 'T.C. Cumhurbaşkanlığı', 'Güncel mevzuat metinlerinin tek noktadan yayımlandığı sistem.', 'Değişiklikleri işlenmiş kanun, yönetmelik ve diğer düzenleyici işlemlerin metinleri.']
  ];

  const records = seeds.slice();
  links.forEach(([title, url, source, summary, body], i) => {
    records.push({
      type: 'baglanti', date: daysAgoISO(20 + i), title, summary, body, url, source,
      notes: `Bağlantı adresi: ${hostOf(url)}`
    });
  });

  for (let i = 0; i < records.length; i++) {
    await dbPut('items', Object.assign({ id: uid(), createdAt: now - i * 1000, updatedAt: now - i * 1000 }, records[i]));
  }
  await dbPut('settings', { key: 'seeded', value: true });
}

/* ==========================================================
   Veri yükleme ve görünüm
   ========================================================== */
async function loadItems() {
  if (supabase && isRemoteReady) {
    const { data, error } = await supabase.from('archive_items').select('payload');
    if (error) throw error;
    const all = (data || []).map(row => row.payload).filter(Boolean);
    state.items = all.filter(it => it && TYPES[it.type] && isValidISO(it.date));
    return;
  }
  const all = await dbAll('items');
  state.items = all.filter(it => it && TYPES[it.type] && isValidISO(it.date));
}

function sortItems(arr, dir) {
  const m = dir === 'asc' ? 1 : -1;
  return arr.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 * m : 1 * m;
    return ((a.createdAt || 0) - (b.createdAt || 0)) * m;
  });
}

function visibleItems() {
  const q = norm(state.query.trim());
  const arr = state.items.filter(it => {
    if (state.filter !== 'tumu' && it.type !== state.filter) return false;
    if (state.year !== 'all' && !it.date.startsWith(state.year)) return false;
    if (q) {
      const hay = norm([it.title, it.summary, it.body, it.source, it.notes, it.file && it.file.name, it.image && it.image.alt].join(' '));
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  return sortItems(arr, state.sort);
}

let thumbUrls = [];
let thumbGen = 0;

function revokeThumbs() {
  thumbGen++;
  thumbUrls.forEach(u => URL.revokeObjectURL(u));
  thumbUrls = [];
}

async function fillThumb(img, meta) {
  const gen = thumbGen;
  if (meta.url) { img.src = meta.url; return; }
  try {
    const rec = await dbGet('files', meta.id);
    if (!rec || gen !== thumbGen) return;
    const url = URL.createObjectURL(rec.blob);
    thumbUrls.push(url);
    img.addEventListener('error', () => {
      const entry = img.closest('.entry');
      const box = img.closest('.entry-thumb');
      if (entry) entry.classList.remove('has-thumb');
      if (box) box.remove();
    }, { once: true });
    img.src = url;
  } catch (e) { /* görsel isteğe bağlıdır */ }
}

function badgeEl(type) {
  return h('span', { class: `badge badge-${type}` }, TYPES[type].badge);
}

function entryEl(it) {
  const d = parseDate(it.date);
  const actions = h('div', { class: 'entry-actions' },
    h('button', { class: 'btn btn-small', type: 'button', onclick: () => openReader(it.id) }, 'Oku')
  );
  if (it.type === 'dokuman' && it.file) {
    actions.append(h('button', { class: 'btn btn-small btn-navy', type: 'button', onclick: () => downloadFile(it) }, 'İndir ↓'));
  }
  if (it.url) {
    actions.append(h('a', { class: 'btn btn-small btn-navy', href: it.url, target: '_blank', rel: 'noopener noreferrer' },
      it.type === 'baglanti' ? 'Bağlantıyı Aç ↗' : 'Kaynağa Git ↗'));
  }
  if (state.isAdmin) {
    actions.append(
      h('button', { class: 'btn btn-small btn-outline', type: 'button', onclick: () => openAdminForm(it.id) }, 'Düzenle'),
      h('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: () => deleteItem(it.id) }, 'Sil')
    );
  }

  let thumb = null;
  const cover = coverOf(it);
  if (cover) {
    const img = h('img', { class: 'thumb-img', alt: '', loading: 'lazy', decoding: 'async' });
    thumb = h('button', {
      class: 'entry-thumb', type: 'button', 'aria-label': `Görseli ve kaydı aç: ${it.title}`,
      onclick: () => openReader(it.id)
    }, img);
    fillThumb(img, cover);
  }

  return h('article', { class: 'entry' + (thumb ? ' has-thumb' : '') },
    h('div', { class: 'entry-date', 'aria-hidden': 'true' },
      h('span', { class: 'day' }, String(d.getDate())),
      h('span', { class: 'mon' }, fmtShort(it.date))
    ),
    h('div', { class: 'entry-main' },
      h('div', { class: 'entry-meta' },
        badgeEl(it.type),
        h('span', {}, fmtLong(it.date)),
        it.source ? h('span', {}, it.source) : null,
        it.file ? h('span', {}, `${it.file.name} · ${fmtSize(it.file.size)}`) : null
      ),
      h('h3', { class: 'entry-title' },
        h('button', { class: 'title-link', type: 'button', onclick: () => openReader(it.id) }, it.title)
      ),
      it.summary ? h('p', { class: 'entry-summary' }, it.summary) : null,
      actions
    ),
    thumb
  );
}

function featuredCard(it, i, n) {
  const d = parseDate(it.date);
  let media;
  const cover = coverOf(it);
  if (cover) {
    const img = h('img', { class: 'thumb-img', alt: '', loading: 'lazy', decoding: 'async' });
    media = h('button', {
      class: 'feat-media', type: 'button', tabindex: '-1', 'aria-hidden': 'true',
      onclick: () => openReader(it.id)
    }, img);
    fillThumb(img, cover);
  } else {
    media = h('button', {
      class: `feat-media feat-placeholder ph-${it.type}`, type: 'button', tabindex: '-1', 'aria-hidden': 'true',
      onclick: () => openReader(it.id)
    }, h('span', { class: 'ph-day' }, String(d.getDate())), h('span', { class: 'ph-mon' }, fmtShort(it.date)));
  }
  return h('article', {
    class: 'feat-card', role: 'group', 'aria-roledescription': 'kayıt', 'aria-label': `${i + 1} / ${n}`
  },
    media,
    h('div', { class: 'feat-body' },
      h('div', { class: 'entry-meta' },
        badgeEl(it.type),
        h('span', {}, fmtLong(it.date)),
        it.file ? h('span', {}, fmtSize(it.file.size)) : null
      ),
      h('h4', { class: 'feat-title' },
        h('button', { class: 'title-link', type: 'button', onclick: () => openReader(it.id) }, it.title)),
      it.summary ? h('p', { class: 'feat-summary' }, it.summary) : null
    )
  );
}

function renderFeatured() {
  const sec = $('#featured');
  const track = $('#featuredTrack');
  track.replaceChildren();
  const show = state.filter === 'tumu' && !state.query.trim() && state.year === 'all';
  const items = sortItems(state.items.slice(), 'desc').slice(0, FEATURED_COUNT);
  sec.hidden = !show || items.length === 0;
  if (sec.hidden) return;
  items.forEach((it, i) => track.append(featuredCard(it, i, items.length)));
  track.scrollLeft = 0;
  updateFeaturedNav();
}

function updateFeaturedNav() {
  const track = $('#featuredTrack');
  if (!track || $('#featured').hidden) return;
  const max = track.scrollWidth - track.clientWidth;
  $('#featPrev').disabled = track.scrollLeft <= 2;
  $('#featNext').disabled = track.scrollLeft >= max - 2;
  const cards = $$('.feat-card', track);
  let first = cards.findIndex(c => c.offsetLeft >= track.scrollLeft - 8);
  if (first < 0) first = cards.length - 1;
  $('#featuredPos').textContent = cards.length ? `${first + 1} / ${cards.length}` : '';
}

function scrollFeatured(dir) {
  const track = $('#featuredTrack');
  const card = $('.feat-card', track);
  const step = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;
  const per = Math.max(1, Math.floor(track.clientWidth / step));
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  track.scrollBy({ left: dir * step * per, behavior: reduce ? 'auto' : 'smooth' });
}

function renderYearChips() {
  const years = [...new Set(state.items.map(it => it.date.slice(0, 4)))].sort().reverse();
  if (state.year !== 'all' && !years.includes(state.year)) state.year = 'all';
  const box = $('#yearChips');
  box.replaceChildren();
  if (years.length < 2) { box.hidden = true; return; }
  box.hidden = false;
  [['all', 'Tüm yıllar'], ...years.map(y => [y, y])].forEach(([val, label]) => {
    box.append(h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(state.year === val),
      onclick: () => { state.year = val; renderYearChips(); renderList(); }
    }, label));
  });
}

function renderList() {
  const list = $('#contentList');
  revokeThumbs();
  list.replaceChildren();
  const items = visibleItems();
  $('#listDesc').textContent = state.filter === 'tumu' ? ALL_DESC : (TYPES[state.filter] ? TYPES[state.filter].desc : '');

  let lastKey = null;
  for (const it of items) {
    const key = it.date.slice(0, 7);
    if (key !== lastKey) {
      list.append(h('h3', { class: 'month-heading' }, fmtMonth(it.date)));
      lastKey = key;
    }
    list.append(entryEl(it));
  }
  renderFeatured();
}

function renderView() {
  const isAbout = state.filter === 'hakkimizda';
  $('#viewAbout').hidden = !isAbout;
  $('#viewArchive').hidden = isAbout;
  $$('.main-nav a').forEach(a => {
    if (a.dataset.filter === state.filter) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = (isAbout ? 'Hakkımızda' : NAV_LABELS[state.filter]) + ' — AkademikKapital — Yükseköğretim Arşivi';
  if (!isAbout) { renderYearChips(); renderList(); }
  $('#ctaPublish').hidden = !['tumu', 'makale', 'haberler'].includes(state.filter);
  trackEvent('section_view', { section: state.filter });
}

function applyHash() {
  const key = decodeURIComponent(location.hash.slice(1));
  state.filter = NAV_LABELS[key] ? key : 'tumu';
  renderView();
  window.scrollTo({ top: 0 });
}

function refreshAll() {
  renderView();
  if ($('#adminDialog').open) renderAdminList();
}

/* ==========================================================
   Okuyucu penceresi ve dosya indirme
   ========================================================== */
let readerObjectUrl = null;
let readerFigureUrl = null;
let readerFigureToken = 0;

function clearReaderFigure() {
  readerFigureToken++;
  if (readerFigureUrl) { URL.revokeObjectURL(readerFigureUrl); readerFigureUrl = null; }
  const img = $('#readerImage');
  img.removeAttribute('src');
  img.alt = '';
  $('#readerFigure').hidden = true;
  $('#readerCaption').hidden = true;
  $('#readerCaption').textContent = '';
}

let readerBodyUrls = [];

function revokeBodyUrls() {
  readerBodyUrls.forEach(u => URL.revokeObjectURL(u));
  readerBodyUrls = [];
}

async function loadBodyFigures(it) {
  revokeBodyUrls();
  const out = [];
  const list = it.images || [];
  for (let i = 0; i < list.length; i++) {
    const meta = list[i];
    try {
      if (meta.url) {
        out.push(h('figure', { class: 'body-figure' },
          h('img', { src: meta.url, alt: meta.alt || `${it.title} — görsel ${i + 1}`, loading: 'lazy', decoding: 'async' }),
          meta.alt ? h('figcaption', {}, meta.alt) : null));
        continue;
      }
      const rec = await dbGet('files', meta.id);
      if (!rec) { out.push(null); continue; }
      const url = URL.createObjectURL(rec.blob);
      readerBodyUrls.push(url);
      const fig = h('figure', { class: 'body-figure' },
        h('img', {
          src: url, alt: meta.alt || `${it.title} — görsel ${i + 1}`, loading: 'lazy', decoding: 'async',
          onerror: ev => { const f = ev.target.closest('figure'); if (f) f.hidden = true; }
        }),
        meta.alt ? h('figcaption', {}, meta.alt) : null);
      out.push(fig);
    } catch (e) { out.push(null); }
  }
  return out;
}

async function loadReaderFigure(it) {
  clearReaderFigure();
  if (!it.image) return;
  const token = readerFigureToken;
  try {
    const rec = it.image.url ? null : await dbGet('files', it.image.id);
    if ((!rec && !it.image.url) || token !== readerFigureToken) return;
    readerFigureUrl = rec ? URL.createObjectURL(rec.blob) : '';
    const alt = it.image.alt || '';
    const img = $('#readerImage');
    img.alt = alt || it.title;
    img.src = it.image.url || readerFigureUrl;
    if (alt) { $('#readerCaption').textContent = alt; $('#readerCaption').hidden = false; }
    $('#readerFigure').hidden = false;
  } catch (e) { /* görsel isteğe bağlıdır */ }
}

async function downloadFile(it) {
  if (!it.file) return;
  try {
    const rec = it.file.url ? null : await dbGet('files', it.file.id);
    if (!rec && !it.file.url) { toast('Dosya bulunamadı.'); return; }
    const url = it.file.url || URL.createObjectURL(rec.blob);
    const a = h('a', { href: url, download: (rec && rec.name) || it.file.name || 'dosya', target: '_blank', rel: 'noopener noreferrer' });
    document.body.append(a);
    a.click();
    a.remove();
    trackEvent('file_download', { item_id: it.id, file_name: it.file.name });
    if (!it.file.url) setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (e) {
    toast('Dosya indirilemedi.');
  }
}

async function openReader(id) {
  const it = state.items.find(x => x.id === id);
  if (!it) return;

  trackEvent('item_read', { item_id: it.id, item_type: it.type, item_title: it.title });

  const badge = $('#readerBadge');
  badge.className = `badge badge-${it.type}`;
  badge.textContent = TYPES[it.type].badge;
  $('#readerTitle').textContent = it.title;
  $('#readerMeta').textContent = [fmtLong(it.date), it.source].filter(Boolean).join(' · ');

  loadReaderFigure(it);

  const lead = $('#readerLead');
  const hasBody = !!(it.body && it.body.trim());
  lead.textContent = hasBody ? (it.summary || '') : '';
  lead.hidden = !(hasBody && it.summary);

  const body = $('#readerBody');
  body.replaceChildren();
  const figs = await loadBodyFigures(it);
  const used = new Set();
  renderRichText(body, it.body || it.summary || '', n => {
    const f = figs[n - 1];
    if (!f || used.has(n)) return null;
    used.add(n);
    return f;
  });
  figs.forEach((f, i) => { if (f && !used.has(i + 1)) body.append(f); });

  const extra = $('#readerExtra');
  extra.replaceChildren();
  if (readerObjectUrl) { URL.revokeObjectURL(readerObjectUrl); readerObjectUrl = null; }

  if (it.url) {
    extra.append(h('div', { class: 'file-card' },
      h('span', {},
        h('span', { class: 'file-label' }, it.type === 'baglanti' ? 'Bağlantı' : 'İlgili kaynak'),
        h('strong', {}, hostOf(it.url))),
      h('a', { class: 'btn btn-small btn-navy', href: it.url, target: '_blank', rel: 'noopener noreferrer' }, 'Bağlantıyı Aç ↗')
    ));
  }

  if (it.type === 'dokuman') {
    if (it.file) {
      extra.append(h('div', { class: 'file-card' },
        h('span', {},
          h('span', { class: 'file-label' }, 'Doküman'),
          h('strong', {}, it.file.name), ` · ${fmtSize(it.file.size)}`),
        h('button', { class: 'btn btn-small btn-navy', type: 'button', onclick: () => downloadFile(it) }, 'Dosyayı İndir ↓')
      ));
      if ((it.file.type || '').startsWith('image/')) {
        try {
          const rec = await dbGet('files', it.file.id);
          if (rec) {
            readerObjectUrl = URL.createObjectURL(rec.blob);
            extra.append(h('img', { class: 'reader-img', src: readerObjectUrl, alt: it.file.name }));
          }
        } catch (e) { /* önizleme isteğe bağlı */ }
      }
    } else {
      extra.append(h('p', { class: 'muted' }, 'Bu kayda dosya eklenmemiş.'));
    }
  }

  const notes = noteLines(it.notes);
  const notesBox = $('#readerNotes');
  const notesList = $('#readerNotesList');
  notesList.replaceChildren();
  notes.forEach(n => notesList.append(h('li', {}, n)));
  notesBox.hidden = notes.length === 0;

  const info = $('#readerInfo');
  info.replaceChildren();
  const rows = [
    ['Kategori', TYPES[it.type].nav],
    ['Yayın tarihi', fmtLong(it.date)],
    it.source ? ['Kaynak / kurum', it.source] : null,
    (it.updatedAt && Math.abs(it.updatedAt - (it.createdAt || it.updatedAt)) > 60000)
      ? ['Son güncelleme', fmtLong(isoFromDate(new Date(it.updatedAt)))] : null
  ].filter(Boolean);
  rows.forEach(([k, v]) => info.append(h('dt', {}, k), h('dd', {}, v)));

  openDialog($('#readerDialog'));
  const sc = $('#readerDialog .dialog-scroll');
  if (sc) sc.scrollTop = 0;
}

/* ==========================================================
   Giriş / çıkış
   ========================================================== */
let failedAttempts = 0;
let lockedUntil = 0;

let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';
  $('#loginTitle').textContent = isSignup ? 'Editör hesabı oluştur' : 'Yönetici Girişi';
  $('#loginForm button[type="submit"]').textContent = isSignup ? 'Hesap Oluştur' : 'Giriş Yap';
  $('#loginPassword').autocomplete = isSignup ? 'new-password' : 'current-password';
  $('#authModeToggle').textContent = isSignup ? 'Zaten hesabınız var mı? Giriş yapın' : 'İlk kez mi? Editör hesabı oluşturun';
  $('#loginError').hidden = true;
}

function updateAdminUI() {
  document.body.classList.toggle('is-admin', state.isAdmin);
  $('#adminBtn').textContent = state.isAdmin ? 'Editör Paneli' : 'Yönetici Girişi / Editör';
  $('#adminBtn').setAttribute('aria-label', state.isAdmin ? 'Editör paneli' : 'Yönetici girişi / editör');
}

function showLoginError(msg) {
  const e = $('#loginError');
  e.textContent = msg;
  e.hidden = false;
}

async function handleLogin(ev) {
  ev.preventDefault();
  $('#loginError').hidden = true;

  if (!supabase) return showLoginError('Supabase bağlantısı kurulamadı. Sayfayı yenileyip tekrar deneyin.');
  const email = $('#loginEmail').value.trim().toLowerCase();
  const password = $('#loginPassword').value;
  if (!email || !password) return showLoginError('E-posta ve şifre alanlarını doldurun.');
  if (email !== ADMIN_EMAIL) return showLoginError(`Editör hesabı ${ADMIN_EMAIL} adresiyle sınırlandırılmıştır.`);
  if (authMode === 'signup' && password.length < 8) return showLoginError('Şifre en az 8 karakter olmalıdır.');

  const result = authMode === 'signup'
    ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectTo } })
    : await supabase.auth.signInWithPassword({ email, password });

  if (result.error) {
    const message = (result.error.message || '').toLowerCase();
    if (message.includes('confirm')) {
      return showLoginError('E-posta onayı gerekiyor. Gelen kutunuzdaki bağlantıyı kullanıp sonra giriş yapın.');
    }
    if (authMode === 'signup' && (message.includes('password') || message.includes('weak'))) {
      return showLoginError('Daha güçlü, en az 8 karakterli bir şifre seçin.');
    }
    if (message.includes('rate') || result.error.status === 429) {
      return showLoginError('Çok fazla deneme yapıldı. Bir süre bekleyip yeniden deneyin.');
    }
    return showLoginError(authMode === 'signup'
      ? 'Hesap oluşturulamadı. E-posta adresiyle kayıt durumunu kontrol edin veya daha sonra tekrar deneyin.'
      : 'Giriş başarısız. E-posta ve şifrenizi kontrol edin; gerekiyorsa e-postanızı onaylayın.');
  }

  if (authMode === 'signup' && !result.data.session) {
    $('#loginPassword').value = '';
    return showLoginError('Hesap oluşturuldu. E-postanızı onaylayıp giriş yapın.');
  }
  const user = result.data.user;
  if (user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    await supabase.auth.signOut();
    return showLoginError('Bu hesap editör yetkisine sahip değil.');
  }

  failedAttempts = 0;
  state.isAdmin = true;
  $('#loginPassword').value = '';
  $('#loginDialog').close();
  updateAdminUI();
  await migrateLocalArchiveIfCloudIsEmpty();
  await refreshRemoteArchive();
  await refreshRemoteSettings();
  openAdminPanel();
}

function logout() {
  clearTimeout(autosaveTimer);
  state.isAdmin = false;
  void supabase?.auth.signOut();
  $('#adminDialog').close();
  updateAdminUI();
  refreshAll();
  toast('Çıkış yapıldı.');
}

/* ==========================================================
   Yönetici paneli + Otomatik Kayıt
   ========================================================== */
function openAdminPanel() {
  renderAdminList();
  showTab('list');
  refreshLogoPreview();
  fillSocialInputs();
  setAutosaveLabel('Otomatik kayıt aktif');
  openDialog($('#adminDialog'));
}

function showTab(name) {
  $$('.tab').forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });
  $('#tabList').hidden = name !== 'list';
  $('#tabForm').hidden = name !== 'form';
  $('#tabSettings').hidden = name !== 'settings';
  $('#tabImport').hidden = name !== 'import';
  if (name === 'settings') {
    refreshLogoPreview();
    fillSocialInputs();
  }
}

function renderAdminList() {
  const q = norm(state.adminQuery.trim());
  const arr = sortItems(state.items.filter(it =>
    (state.adminFilter === 'all' || it.type === state.adminFilter) &&
    (!q || norm(it.title).includes(q))
  ), 'desc');

  $('#adminCount').textContent = `${arr.length} kayıt listeleniyor (toplam ${state.items.length}).`;
  const ul = $('#adminList');
  ul.replaceChildren();

  if (!arr.length) {
    ul.append(h('li', { class: 'muted' }, 'Kayıt bulunamadı.'));
    return;
  }

  arr.forEach(it => {
    ul.append(h('li', { class: 'admin-row' },
      h('div', {},
        h('div', { class: 'admin-row-meta' }, badgeEl(it.type), h('span', {}, fmtLong(it.date)),
          (it.image || (it.images && it.images.length)) ? h('span', {}, 'Görselli') : null,
          it.file ? h('span', {}, `${it.file.name} (${fmtSize(it.file.size)})`) : null),
        h('p', { class: 'admin-row-title' }, it.title)
      ),
      h('div', { class: 'admin-row-actions' },
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => openReader(it.id) }, 'Görüntüle'),
        h('button', { class: 'btn btn-small btn-outline', type: 'button', onclick: () => openAdminForm(it.id) }, 'Düzenle'),
        h('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: () => deleteItem(it.id) }, 'Sil')
      )
    ));
  });
}

function toggleFormRows() {
  const type = $('#fType').value;
  $('#rowFile').hidden = type !== 'dokuman';
  $('#urlLabel').textContent = type === 'baglanti'
    ? 'Bağlantı adresi (URL) — zorunlu'
    : 'İlgili kaynak bağlantısı (isteğe bağlı)';
}

let formImages = [];
let galleryUrls = [];

function clearGalleryUrls() {
  galleryUrls.forEach(u => URL.revokeObjectURL(u));
  galleryUrls = [];
}

function resetGallery(it) {
  clearGalleryUrls();
  formImages = ((it && it.images) || []).map(m => ({ meta: m, file: null, alt: m.alt || '', url: null, imgEl: null }));
  renderGallery();
  formImages.forEach(e => {
    dbGet('files', e.meta.id).then(rec => {
      if (!rec || !formImages.includes(e)) return;
      e.url = URL.createObjectURL(rec.blob);
      galleryUrls.push(e.url);
      if (e.imgEl) e.imgEl.src = e.url;
    }).catch(() => {});
  });
}

function insertPlaceholder(n) {
  const ta = $('#fBody');
  const v = ta.value;
  const pos = typeof ta.selectionStart === 'number' ? ta.selectionStart : v.length;
  const before = v.slice(0, pos).replace(/\s+$/, '');
  const after = v.slice(pos).replace(/^\s+/, '');
  const token = `[[GÖRSEL:${n}]]`;
  ta.value = (before ? before + '\n\n' : '') + token + (after ? '\n\n' + after : '');
  const caret = (before ? before.length + 2 : 0) + token.length;
  ta.focus();
  ta.setSelectionRange(caret, caret);
  scheduleAutosave();
  toast(`${token} metne eklendi.`);
}

function removeGalleryImage(i) {
  formImages.splice(i, 1);
  $('#fBody').value = remapPlaceholders($('#fBody').value, n => (n === i + 1 ? null : n > i + 1 ? n - 1 : n));
  renderGallery();
  scheduleAutosave();
}

function autoPlaceImages() {
  const ta = $('#fBody');
  const used = new Set();
  ta.value.replace(IMG_TOKEN, (m, n) => { used.add(Number(n)); return m; });
  const free = formImages.map((_, i) => i + 1).filter(n => !used.has(n));
  if (!free.length) { toast('Tüm fotoğraflar zaten metne eklenmiş.'); return; }
  const paras = ta.value.trim().split(/\n{2,}/).filter(Boolean);
  if (!paras.length) {
    ta.value = free.map(n => `[[GÖRSEL:${n}]]`).join('\n\n');
    scheduleAutosave();
    return;
  }
  const after = new Map();
  free.forEach((n, k) => {
    let idx = Math.round(((k + 1) * paras.length) / (free.length + 1)) - 1;
    idx = Math.max(0, Math.min(paras.length - 1, idx));
    if (!after.has(idx)) after.set(idx, []);
    after.get(idx).push(`[[GÖRSEL:${n}]]`);
  });
  const out = [];
  paras.forEach((p, i) => { out.push(p); (after.get(i) || []).forEach(tk => out.push(tk)); });
  ta.value = out.join('\n\n');
  scheduleAutosave();
  toast(`${free.length} fotoğraf paragraf aralarına yerleştirildi.`);
}

function renderGallery() {
  const ul = $('#galleryList');
  ul.replaceChildren();
  $('#autoPlaceImages').disabled = formImages.length === 0;
  if (!formImages.length) {
    ul.append(h('li', { class: 'muted' }, 'Henüz metin içi fotoğraf eklenmedi.'));
    return;
  }
  formImages.forEach((e, i) => {
    const n = i + 1;
    const img = h('img', { class: 'gallery-thumb', alt: '' });
    if (e.url) img.src = e.url;
    e.imgEl = img;
    const alt = h('input', {
      type: 'text', maxlength: '200', value: e.alt, placeholder: 'Kısa açıklama (alt yazı)',
      'aria-label': `Fotoğraf ${n} açıklaması`,
      oninput: ev => { e.alt = ev.target.value; scheduleAutosave(); }
    });
    const src = e.file || e.meta;
    ul.append(h('li', { class: 'gallery-item' },
      img,
      h('div', { class: 'gallery-meta' },
        h('code', {}, `[[GÖRSEL:${n}]]`),
        h('span', { class: 'hint' }, `${src.name} · ${fmtSize(src.size)}`),
        alt),
      h('div', { class: 'gallery-actions' },
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => insertPlaceholder(n) }, 'Metne ekle'),
        h('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: () => removeGalleryImage(i) }, 'Kaldır'))
    ));
  });
}

function runImportClean() {
  const raw = $('#rawText').value;
  if (!raw.trim()) { toast('Önce ham metni yapıştırın.'); return; }
  const r = cleanPastedText(raw, {
    autoTitle: $('#optTitle').checked, autoSummary: $('#optSummary').checked,
    unwrap: $('#optUnwrap').checked, bullets: $('#optBullets').checked
  });
  $('#impTitle').value = r.title.slice(0, 200);
  $('#impSummary').value = r.summary.slice(0, 400);
  $('#impBody').value = r.body;
  $('#impStats').textContent =
    `Giriş: ${r.stats.inChars} karakter, ${r.stats.blankBefore} boş satır → Çıkış: ${r.stats.outChars} karakter, ` +
    `${r.stats.paragraphs} paragraf (içerik). Alanları düzenleyip forma aktarabilirsiniz.`;
  $('#importResult').hidden = false;
}

function resetImport() {
  ['#rawText', '#impTitle', '#impSummary', '#impBody'].forEach(s => { $(s).value = ''; });
  $('#importResult').hidden = true;
}

function sendImportToForm() {
  const title = $('#impTitle').value.trim();
  const summary = $('#impSummary').value.trim();
  const body = $('#impBody').value.trim();
  if (!title && !body) { toast('Aktarılacak başlık veya içerik yok.'); return; }
  openAdminForm();
  $('#fTitle').value = title.slice(0, 200);
  $('#fSummary').value = summary.slice(0, 400);
  $('#fBody').value = body;
  scheduleAutosave();
  toast('Metin forma aktarıldı ve taslak olarak kaydedildi.');
}

let formPreviewUrl = null;

function clearFormPreview() {
  if (formPreviewUrl) { URL.revokeObjectURL(formPreviewUrl); formPreviewUrl = null; }
  $('#imagePreview').removeAttribute('src');
  $('#imagePreviewBox').hidden = true;
  $('#removeImageWrap').hidden = true;
}

function showFormPreview(blob, canRemove) {
  clearFormPreview();
  formPreviewUrl = URL.createObjectURL(blob);
  $('#imagePreview').src = formPreviewUrl;
  $('#imagePreviewBox').hidden = false;
  $('#removeImageWrap').hidden = !canRemove;
}

function restoreExistingPreview() {
  clearFormPreview();
  const id = $('#fId').value;
  const it = id ? state.items.find(x => x.id === id) : null;
  if (it && it.image) {
    dbGet('files', it.image.id).then(rec => {
      if (rec && $('#fId').value === it.id && !$('#fImage').files[0]) showFormPreview(rec.blob, true);
    }).catch(() => {});
  }
}

function formError(msg) {
  const e = $('#formError');
  e.textContent = msg || '';
  e.hidden = !msg;
}

function openAdminForm(id) {
  const it = id ? state.items.find(x => x.id === id) : null;
  $('#formHeading').textContent = it ? 'İçeriği Düzenle' : 'Yeni İçerik';
  $('#fId').value = it ? it.id : '';
  $('#fType').value = it ? it.type : 'makale';
  $('#fDate').value = it ? it.date : todayISO();
  $('#fTitle').value = it ? it.title : '';
  $('#fSummary').value = it ? (it.summary || '') : '';
  $('#fBody').value = it ? (it.body || '') : '';
  $('#fUrl').value = it ? (it.url || '') : '';
  $('#fSource').value = it ? (it.source || '') : '';
  $('#fNotes').value = it ? (it.notes || '') : '';
  $('#fFile').value = '';
  $('#fImage').value = '';
  $('#fImageRemove').checked = false;
  $('#fImageAlt').value = it && it.image ? (it.image.alt || '') : '';
  restoreExistingPreview();
  resetGallery(it);
  const cur = $('#currentFile');
  if (it && it.file) {
    cur.textContent = `Mevcut dosya: ${it.file.name} (${fmtSize(it.file.size)}) — yeni dosya seçerseniz değiştirilir.`;
    cur.hidden = false;
  } else {
    cur.hidden = true;
  }
  formError('');
  toggleFormRows();
  showTab('form');
  if (!$('#adminDialog').open) { renderAdminList(); openDialog($('#adminDialog')); }
}

/* Ortak Kayıt / Yayınlama Fonksiyonu (Otomatik Kayıt ve "Tamam — Yayına Al" için) */
async function persistItem({ publishToVisitors = false, silent = false } = {}) {
  if (!state.isAdmin) return false;
  if (isAutosaving) return false;

  const existingId = $('#fId').value;
  const existing = existingId ? state.items.find(x => x.id === existingId) : null;
  const type = $('#fType').value;
  const title = $('#fTitle').value.trim();
  const date = $('#fDate').value;

  if (!TYPES[type]) {
    if (!silent) formError('Geçerli bir kategori seçin.');
    return false;
  }
  if (!title) {
    // Otomatik kayıtta başlık henüz boşsa hata göstermeden bekler
    if (!silent) formError('Başlık zorunludur.');
    return false;
  }
  if (!isValidISO(date)) {
    if (!silent) formError('Geçerli bir tarih seçin.');
    return false;
  }

  const rawUrl = $('#fUrl').value.trim();
  const url = safeUrl(rawUrl);
  if (type === 'baglanti' && !url) {
    if (!silent) formError('Geçerli bir http(s) bağlantı adresi girin.');
    return false;
  }
  if (rawUrl && !url) {
    if (!silent) formError('İlgili kaynak bağlantısı geçerli bir http(s) adresi olmalıdır.');
    return false;
  }

  let oldFileToDelete = null;
  let newFileRecord = null;
  let candidateFile = existing && existing.file ? Object.assign({}, existing.file) : null;

  if (type === 'dokuman') {
    const file = $('#fFile').files[0];
    if (file) {
      const problem = checkFile(file);
      if (problem) {
        if (!silent) formError(problem);
        return false;
      }
      newFileRecord = { id: uid(), blob: file, name: file.name, type: file.type || 'application/octet-stream', size: file.size };
      if (existing && existing.file) oldFileToDelete = existing.file.id;
      candidateFile = { id: newFileRecord.id, name: file.name, type: newFileRecord.type, size: file.size };
    } else if (!candidateFile) {
      if (!silent) formError('Doküman Arşivi kaydı için bir dosya seçin.');
      return false;
    }
  } else if (existing && existing.file) {
    oldFileToDelete = existing.file.id;
    candidateFile = null;
  }

  let newImageRecord = null;
  let oldImageToDelete = null;
  let candidateImage = existing && existing.image ? Object.assign({}, existing.image) : null;
  const imgFile = $('#fImage').files[0];
  const imgAlt = $('#fImageAlt').value.trim().slice(0, 200);

  if (imgFile) {
    const problem = checkImage(imgFile);
    if (problem) {
      if (!silent) formError(problem);
      return false;
    }
    newImageRecord = { id: uid(), blob: imgFile, name: imgFile.name, type: imgFile.type || 'image/*', size: imgFile.size };
    if (existing && existing.image) oldImageToDelete = existing.image.id;
    candidateImage = { id: newImageRecord.id, name: imgFile.name, type: newImageRecord.type, size: imgFile.size, alt: imgAlt };
  } else if (candidateImage) {
    if ($('#fImageRemove').checked) {
      oldImageToDelete = candidateImage.id;
      candidateImage = null;
    } else {
      candidateImage = Object.assign({}, candidateImage, { alt: imgAlt });
    }
  }

  const galleryRecords = [];
  const keptGalleryIds = new Set();
  const outImages = [];
  for (const e of formImages) {
    const alt = (e.alt || '').trim().slice(0, 200);
    if (e.file) {
      const problem = checkImage(e.file);
      if (problem) {
        if (!silent) formError(`${e.file.name}: ${problem}`);
        return false;
      }
      const rec = { id: uid(), blob: e.file, name: e.file.name, type: e.file.type || 'image/*', size: e.file.size };
      galleryRecords.push(rec);
      outImages.push({ id: rec.id, name: rec.name, type: rec.type, size: rec.size, alt });
    } else if (e.meta) {
      keptGalleryIds.add(e.meta.id);
      outImages.push(Object.assign({}, e.meta, { alt }));
    }
  }
  const oldGalleryToDelete = ((existing && existing.images) || []).map(m => m.id).filter(gid => !keptGalleryIds.has(gid));

  const needBytes = (newFileRecord ? newFileRecord.size : 0) + (newImageRecord ? newImageRecord.size : 0) +
    galleryRecords.reduce((s, r) => s + r.size, 0);
  if (needBytes) {
    const storageProblem = await checkStorageFor(needBytes);
    if (storageProblem) {
      if (!silent) formError(storageProblem);
      return false;
    }
  }

  const item = existing ? Object.assign({}, existing) : { id: existingId || uid(), createdAt: Date.now() };
  item.type = type;
  item.title = title;
  item.date = date;
  item.summary = $('#fSummary').value.trim();
  item.body = $('#fBody').value.trim();
  item.updatedAt = Date.now();
  item.published = true;

  if (url) item.url = url; else delete item.url;
  const source = $('#fSource').value.trim();
  if (source) item.source = source; else delete item.source;
  const notes = $('#fNotes').value.trim();
  if (notes) item.notes = notes; else delete item.notes;
  if (candidateFile) item.file = candidateFile; else delete item.file;
  if (candidateImage) item.image = candidateImage; else delete item.image;
  if (outImages.length) item.images = outImages; else delete item.images;

  const submitBtn = $('#itemForm button[type="submit"]');
  const idleLabel = submitBtn ? submitBtn.textContent : 'Tamam — Yayına Al';
  isAutosaving = true;
  setAutosaveLabel('Kaydediliyor…');
  if (!silent && submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = needBytes > LARGE_FILE_MB * 1024 * 1024 ? 'Büyük dosya kaydediliyor…' : 'Yayınlanıyor…';
  }

  try {
    if (newFileRecord) await dbPut('files', newFileRecord);
    if (newImageRecord) await dbPut('files', newImageRecord);
    for (const rec of galleryRecords) await dbPut('files', rec);
    await dbPut('items', item);
    $('#fId').value = item.id;

    // Yeni yüklenen dosya/görseller artık kalıcı meta veriye dönüştü
    if (newFileRecord) {
      $('#fFile').value = '';
      const cur = $('#currentFile');
      cur.textContent = `Mevcut dosya: ${item.file.name} (${fmtSize(item.file.size)}) — yeni dosya seçerseniz değiştirilir.`;
      cur.hidden = false;
    }
    if (newImageRecord) {
      $('#fImage').value = '';
      $('#fImageRemove').checked = false;
      restoreExistingPreview();
    }
    if (galleryRecords.length) {
      resetGallery(item);
    }

    for (const gid of oldGalleryToDelete) await dbDel('files', gid);
    if (oldFileToDelete) await dbDel('files', oldFileToDelete);
    if (oldImageToDelete) await dbDel('files', oldImageToDelete);

    await loadItems();
    renderView();
    if ($('#adminDialog').open) renderAdminList();

    if (publishToVisitors) {
      await syncGlobalPublish('upsert_item', item);
      trackEvent('item_published', { item_id: item.id, item_type: item.type });
    }

    formError('');
    setAutosaveLabel(publishToVisitors ? 'Yayında ve kayıtlı' : 'Otomatik kaydedildi');
    return existing;
  } catch (e) {
    if (newFileRecord) await dbDel('files', newFileRecord.id).catch(() => {});
    if (newImageRecord) await dbDel('files', newImageRecord.id).catch(() => {});
    for (const rec of galleryRecords) await dbDel('files', rec.id).catch(() => {});
    const msg = e && e.name === 'QuotaExceededError'
      ? 'Tarayıcı depolama alanı doldu; dosya kaydedilemedi.'
      : 'Kayıt sırasında bir hata oluştu.';
    if (!silent) formError(msg);
    setAutosaveLabel('Kayıt hatası');
    return false;
  } finally {
    isAutosaving = false;
    if (!silent && submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = idleLabel;
    }
  }
}

function scheduleAutosave() {
  if (!state.isAdmin) return;
  if ($('#tabForm') && !$('#tabForm').hidden) {
    setAutosaveLabel('Değişiklik algılandı…');
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      persistItem({ publishToVisitors: false, silent: true });
    }, AUTOSAVE_DELAY_MS);
  } else if ($('#tabSettings') && !$('#tabSettings').hidden) {
    setAutosaveLabel('Değişiklik algılandı…');
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      saveSocial(true);
    }, AUTOSAVE_DELAY_MS);
  }
}

async function saveItem(ev) {
  ev.preventDefault();
  clearTimeout(autosaveTimer);
  const existing = await persistItem({ publishToVisitors: true, silent: false });
  if (existing === false) return;

  clearFormPreview();
  clearGalleryUrls();
  formImages = [];
  showTab('list');
  toast(existing ? 'Değişiklikler kaydedildi ve yayına alındı.' : 'İçerik kaydedildi ve yayına alındı.');
}

async function deleteItem(id) {
  const it = state.items.find(x => x.id === id);
  if (!it) return;
  if (!window.confirm(`"${it.title}" kaydı kalıcı olarak silinsin mi?`)) return;
  try {
    if (it.file) await dbDel('files', it.file.id);
    if (it.image) await dbDel('files', it.image.id);
    for (const m of (it.images || [])) await dbDel('files', m.id);
    await dbDel('items', id);
    await syncGlobalPublish('delete_item', { id });
    trackEvent('item_deleted', { item_id: id, item_type: it.type });
  } catch (e) {
    toast('Kayıt silinemedi.');
    return;
  }
  if ($('#fId').value === id) {
    $('#fId').value = '';
  }
  await loadItems();
  refreshAll();
  renderAdminList();
  toast('Kayıt silindi.');
}

/* ==========================================================
   Logo / profil fotoğrafı
   ========================================================== */
function applyLogo(src) {
  $('#siteLogo').src = src || defaultLogo;
  refreshLogoPreview();
}

function refreshLogoPreview() {
  const prev = $('#logoPreview');
  if (prev) prev.src = $('#siteLogo').src;
}

async function loadLogo() {
  try {
    if (supabase && isRemoteReady) {
      const { data, error } = await supabase.from('archive_settings').select('value').eq('key', 'logo').maybeSingle();
      if (error) throw error;
      applyLogo(data && data.value && data.value.logo);
    } else {
      const rec = await dbGet('settings', 'logo');
      if (rec && rec.value) applyLogo(rec.value);
      else applyLogo(null);
    }
  } catch (e) { applyLogo(null); }
}

function resizeImage(file, maxSide) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || maxSide, img.naturalHeight || maxSide));
      const w = Math.max(1, Math.round((img.naturalWidth || maxSide) * scale));
      const hgt = Math.max(1, Math.round((img.naturalHeight || maxSide) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = hgt;
      canvas.getContext('2d').drawImage(img, 0, 0, w, hgt);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Görsel okunamadı')); };
    img.src = url;
  });
}

async function handleLogoChange(ev) {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast('Lütfen bir görsel dosyası seçin.');
  if (file.size > 10 * 1024 * 1024) return toast('Görsel 10 MB sınırını aşıyor.');
  try {
    const dataUrl = await resizeImage(file, 320);
    await dbPut('settings', { key: 'logo', value: dataUrl });
    applyLogo(dataUrl);
    await syncGlobalPublish('logo_update', { logo: dataUrl });
    setAutosaveLabel('Logo kaydedildi');
    toast('Logo güncellendi ve kaydedildi.');
  } catch (e) {
    toast('Logo güncellenemedi.');
  }
}

async function resetLogo() {
  try {
    await dbDel('settings', 'logo');
    await syncGlobalPublish('logo_reset', {});
  } catch (e) { /* yok say */ }
  applyLogo(null);
  setAutosaveLabel('Varsayılan logo aktif');
  toast('Varsayılan logo geri yüklendi.');
}

/* ==========================================================
   Yedekleme (dışa / içe aktarma)
   ========================================================== */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function exportBackup() {
  try {
    const items = await dbAll('items');
    const files = [];
    const omitted = new Set();
    const limit = BACKUP_FILE_LIMIT_MB * 1024 * 1024;
    for (const it of items) {
      for (const meta of [it.file, it.image, ...(it.images || [])]) {
        if (!meta) continue;
        const rec = await dbGet('files', meta.id);
        if (!rec) continue;
        if (rec.blob.size > limit) { omitted.add(rec.id); continue; }
        files.push({ id: rec.id, name: rec.name, type: rec.type, size: rec.size, data: await blobToDataURL(rec.blob) });
      }
    }
    const outItems = items.map(it => (it.file && omitted.has(it.file.id))
      ? Object.assign({}, it, { file: Object.assign({}, it.file, { omitted: true }) })
      : it);
    const logoRec = await dbGet('settings', 'logo');
    const socialRec = await dbGet('settings', 'social');
    const payload = {
      app: 'akademikkapital', version: 1, exportedAt: new Date().toISOString(),
      items: outItems, files, logo: logoRec ? logoRec.value : null,
      social: normalizeSocialMap(socialRec ? socialRec.value : state.social)
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `akademikkapital-yedek-${todayISO()}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(omitted.size
      ? `Yedek indirildi. ${omitted.size} büyük dosya (>${BACKUP_FILE_LIMIT_MB} MB) yedeğe eklenmedi.`
      : 'Yedek indirildi.');
  } catch (e) {
    toast('Yedek oluşturulamadı.');
  }
}

function cleanImportedItem(raw) {
  if (!raw || typeof raw !== 'object' || !TYPES[raw.type] || !isValidISO(raw.date) || !raw.title) return null;
  const str = (v, max) => String(v || '').slice(0, max);
  const item = {
    id: str(raw.id, 80) || uid(),
    type: raw.type,
    date: raw.date,
    title: str(raw.title, 200),
    summary: str(raw.summary, 400),
    body: str(raw.body, 200000),
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    published: true
  };
  const url = safeUrl(raw.url);
  if (raw.type === 'baglanti' && !url) return null;
  if (url) item.url = url;
  const source = str(raw.source, 120);
  if (source) item.source = source;
  const notes = str(raw.notes, 20000);
  if (notes) item.notes = notes;
  if (raw.type === 'dokuman' && raw.file && raw.file.id) {
    item.file = { id: str(raw.file.id, 80), name: str(raw.file.name, 255), type: str(raw.file.type, 120), size: Number(raw.file.size) || 0 };
    if (raw.file.omitted) item._omitted = true;
  }
  if (raw.image && raw.image.id) {
    item.image = {
      id: str(raw.image.id, 80), name: str(raw.image.name, 255), type: str(raw.image.type, 120),
      size: Number(raw.image.size) || 0, alt: str(raw.image.alt, 200)
    };
  }
  if (Array.isArray(raw.images)) {
    const list = raw.images.filter(m => m && m.id).slice(0, MAX_BODY_IMAGES).map(m => ({
      id: str(m.id, 80), name: str(m.name, 255), type: str(m.type, 120),
      size: Number(m.size) || 0, alt: str(m.alt, 200)
    }));
    if (list.length) item.images = list;
  }
  return item;
}

async function importBackup(ev) {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || data.app !== 'akademikkapital' || !Array.isArray(data.items)) throw new Error('format');

    const existingIds = new Set((await dbAll('items')).map(i => i.id));
    const fileMap = new Map();
    for (const f of (data.files || [])) {
      if (!f || !f.id || typeof f.data !== 'string' || !f.data.startsWith('data:')) continue;
      if (BLOCKED_EXT.includes(fileExt(f.name))) continue;
      const blob = await (await fetch(f.data)).blob();
      fileMap.set(f.id, { id: f.id, blob, name: String(f.name || 'dosya'), type: String(f.type || blob.type), size: blob.size });
    }

    let added = 0;
    for (const raw of data.items) {
      const item = cleanImportedItem(raw);
      if (!item || existingIds.has(item.id)) continue;
      if (item.file) {
        const rec = fileMap.get(item.file.id);
        if (!rec) delete item.file;
        else await dbPut('files', rec);
      }
      if (item.image) {
        const irec = fileMap.get(item.image.id);
        if (!irec || !isImageLike(irec.name, irec.type)) delete item.image;
        else await dbPut('files', irec);
      }
      if (item.images) {
        const kept = [];
        const map = new Map();
        item.images.forEach((m, i) => {
          const r = fileMap.get(m.id);
          if (r && isImageLike(r.name, r.type)) { kept.push({ m, r }); map.set(i + 1, kept.length); }
        });
        for (const k of kept) await dbPut('files', k.r);
        if (kept.length !== item.images.length) {
          item.body = remapPlaceholders(item.body, n => (map.has(n) ? map.get(n) : null));
        }
        if (kept.length) item.images = kept.map(k => k.m); else delete item.images;
      }
      const wasOmitted = !!item._omitted;
      delete item._omitted;
      if (item.type === 'dokuman' && !item.file && !wasOmitted) continue;
      await dbPut('items', item);
      added++;
    }

    if (typeof data.logo === 'string' && data.logo.startsWith('data:image/')) {
      const cur = await dbGet('settings', 'logo');
      if (!cur) { await dbPut('settings', { key: 'logo', value: data.logo }); applyLogo(data.logo); }
    }

    if (data.social && typeof data.social === 'object') {
      const importedSocial = normalizeSocialMap(data.social);
      const hasAnyImported = Object.values(importedSocial).some(Boolean);
      const curSocialRec = await dbGet('settings', 'social');
      if (hasAnyImported && !curSocialRec) {
        await dbPut('settings', { key: 'social', value: importedSocial });
        state.social = importedSocial;
        renderSocialTargets();
        fillSocialInputs();
      }
    }

    await loadItems();
    refreshAll();
    toast(`${added} yeni kayıt içe aktarıldı.`);
  } catch (e) {
    toast('Yedek dosyası okunamadı veya geçersiz.');
  }
}

/* ==========================================================
   Olaylar ve başlatma
   ========================================================== */
function bindEvents() {
  window.addEventListener('hashchange', applyHash);
  $$('.main-nav a').forEach(a => a.addEventListener('click', () => {
    $('#mainNav').classList.remove('open');
    $('#menuToggle').setAttribute('aria-expanded', 'false');
  }));
  $('#menuToggle').addEventListener('click', () => {
    const open = $('#mainNav').classList.toggle('open');
    $('#menuToggle').setAttribute('aria-expanded', String(open));
  });

  const featTrack = $('#featuredTrack');
  let featTick = false;
  featTrack.addEventListener('scroll', () => {
    if (featTick) return;
    featTick = true;
    requestAnimationFrame(() => { featTick = false; updateFeaturedNav(); });
  }, { passive: true });
  featTrack.addEventListener('keydown', e => {
    if (e.target !== featTrack) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollFeatured(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollFeatured(-1); }
  });
  $('#featPrev').addEventListener('click', () => scrollFeatured(-1));
  $('#featNext').addEventListener('click', () => scrollFeatured(1));
  window.addEventListener('resize', updateFeaturedNav);

  // Sabit üst arama ve sıralama
  $('#searchInput').addEventListener('input', e => {
    state.query = e.target.value;
    renderList();
    if (state.query.trim().length >= 2) trackEvent('archive_search', { query_length: state.query.trim().length });
  });
  $('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; renderList(); });

  $$('dialog').forEach(dlg => {
    dlg.addEventListener('click', e => {
      if (e.target === dlg) dlg.close();
      if (e.target.closest && e.target.closest('[data-close]')) dlg.close();
    });
    dlg.addEventListener('close', () => {
      if (!$$('dialog').some(d => d.open)) document.body.classList.remove('modal-open');
      if (dlg.id === 'readerDialog') {
        if (readerObjectUrl) { URL.revokeObjectURL(readerObjectUrl); readerObjectUrl = null; }
        clearReaderFigure();
        revokeBodyUrls();
      }
    });
  });

  $('#adminBtn').addEventListener('click', () => {
    if (state.isAdmin) openAdminPanel();
    else {
      $('#loginError').hidden = true;
      openDialog($('#loginDialog'));
      setTimeout(() => $('#loginEmail').focus(), 30);
    }
  });
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#authModeToggle').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'signup' : 'login'));
  $('#togglePw').addEventListener('click', () => {
    const inp = $('#loginPassword');
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    $('#togglePw').textContent = show ? 'Gizle' : 'Göster';
  });
  $('#logoutBtn').addEventListener('click', logout);

  $$('.tab').forEach(t => t.addEventListener('click', () => {
    if (t.dataset.tab === 'form' && !$('#fId').value && !$('#fTitle').value) openAdminForm();
    else showTab(t.dataset.tab);
  }));
  $('#adminFilter').addEventListener('change', e => { state.adminFilter = e.target.value; renderAdminList(); });
  $('#adminSearch').addEventListener('input', e => { state.adminQuery = e.target.value; renderAdminList(); });
  $('#newItemBtn').addEventListener('click', () => openAdminForm());
  $('#fType').addEventListener('change', () => { toggleFormRows(); scheduleAutosave(); });
  $('#itemForm').addEventListener('submit', saveItem);
  $('#itemForm').addEventListener('input', scheduleAutosave);
  $('#itemForm').addEventListener('change', scheduleAutosave);
  $('#cancelForm').addEventListener('click', () => {
    clearTimeout(autosaveTimer);
    clearFormPreview();
    clearGalleryUrls();
    formImages = [];
    showTab('list');
  });

  $('#fImages').addEventListener('change', e => {
    const files = [...e.target.files];
    e.target.value = '';
    formError('');
    for (const f of files) {
      if (formImages.length >= MAX_BODY_IMAGES) { formError(`En fazla ${MAX_BODY_IMAGES} metin içi fotoğraf eklenebilir.`); break; }
      const problem = checkImage(f);
      if (problem) { formError(`${f.name}: ${problem}`); continue; }
      const url = URL.createObjectURL(f);
      galleryUrls.push(url);
      formImages.push({ meta: null, file: f, alt: '', url, imgEl: null });
    }
    renderGallery();
    scheduleAutosave();
  });
  $('#autoPlaceImages').addEventListener('click', autoPlaceImages);

  $('#cleanRawBtn').addEventListener('click', runImportClean);
  $('#resetImportBtn').addEventListener('click', resetImport);
  $('#sendToFormBtn').addEventListener('click', sendImportToForm);

  $('#fImage').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) { restoreExistingPreview(); return; }
    const problem = checkImage(f);
    if (problem) { e.target.value = ''; formError(problem); restoreExistingPreview(); return; }
    formError('');
    $('#fImageRemove').checked = false;
    showFormPreview(f, false);
    scheduleAutosave();
  });
  $('#readerImage').addEventListener('error', () => {
    if ($('#readerImage').getAttribute('src')) $('#readerFigure').hidden = true;
  });

  $('#logoInput').addEventListener('change', handleLogoChange);
  $('#logoReset').addEventListener('click', resetLogo);
  SOCIAL_PLATFORMS.forEach(p => {
    const inp = $(p.inputId);
    if (inp) inp.addEventListener('input', scheduleAutosave);
  });
  $('#saveSocialBtn').addEventListener('click', () => { clearTimeout(autosaveTimer); saveSocial(false); });
  $('#exportBtn').addEventListener('click', exportBackup);
  $('#importInput').addEventListener('change', importBackup);
}

async function init() {
  defaultLogo = $('#siteLogo').getAttribute('src');
  $('#year').textContent = new Date().getFullYear();
  $('#maxMb').textContent = MAX_FILE_MB >= 1024 ? `${MAX_FILE_MB / 1024} GB` : `${MAX_FILE_MB} MB`;
  $('#maxImgMb').textContent = MAX_IMAGE_MB;
  $('#maxImgMb2').textContent = MAX_IMAGE_MB;

  try {
    db = await openDB();
  } catch (e) {
    useMemory = true;
    $('#storageWarning').hidden = false;
  }

  try {
    await initializeSupabase();
  } catch (e) {
    isRemoteReady = false;
    toast('Ortak veritabanına bağlanılamadı. İnternet bağlantınızı kontrol edin.');
  }

  try {
    await seedIfNeeded();
    await loadItems();
    await loadLogo();
    await loadSocial();
  } catch (e) {
    $('#storageWarning').hidden = false;
    await loadItems().catch(() => {});
    renderSocialTargets();
  }

  bindEvents();
  updateAdminUI();
  toggleFormRows();
  applyHash();
}

document.addEventListener('DOMContentLoaded', init);
