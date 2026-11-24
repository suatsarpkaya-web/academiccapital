/**
 * AkademikKapital — Yükseköğretim Yayın ve Veri Arşivi (Vanilla JS)
 * Özellikler:
 * - Tek veri kaynağı (JSON verisi + /api/archive + localStorage)
 * - Sıralama: Yalnızca Yeniden Eskiye (newest) ve Eskiden Yeniye (oldest)
 * - Geniş Yönetim Paneli: Yazı ekleme, düzenleme, silme, görsel yükleme ve editör onay kuyruğu
 * - Dinamik Sosyal Bağlantılar: X (Twitter), Threads, Telegram, WhatsApp, Instagram, YouTube ve özel platform ekleme
 */

document.addEventListener('DOMContentLoaded', () => {
  const ARCHIVE_STORAGE_KEY = 'ak_archive_records_v6';
  const PENDING_STORAGE_KEY = 'ak_pending_submissions_v6';
  const SOCIAL_STORAGE_KEY = 'ak_social_links_v6';
  const ADMIN_PASSCODE = 'akademik2026';
  const PAGE_SIZE = 6;

  const TYPE_LABELS = {
    makale: 'Makale',
    haberler: 'Haberler',
    duyurular: 'Duyurular',
    dokuman: 'Doküman Arşivi',
    baglanti: 'Dış Bağlantılar'
  };

  const PLATFORM_LABELS = {
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    instagram: 'Instagram',
    youtube: 'YouTube',
    threads: 'Threads',
    x: 'X (Twitter)',
    custom: 'Bağlantı'
  };

  const DEFAULT_SOCIAL_LINKS = [
    { id: 'soc-whatsapp', platform: 'whatsapp', label: 'WhatsApp', url: 'https://whatsapp.com/channel/0029Vb6' },
    { id: 'soc-telegram', platform: 'telegram', label: 'Telegram', url: 'https://t.me/akademikkapital' },
    { id: 'soc-instagram', platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/akademikkapital' },
    { id: 'soc-youtube', platform: 'youtube', label: 'YouTube', url: 'https://youtube.com/@akademikkapital' },
    { id: 'soc-threads', platform: 'threads', label: 'Threads', url: 'https://www.threads.net/@akademikkapital' },
    { id: 'soc-x', platform: 'x', label: 'X (Twitter)', url: 'https://x.com/akademikkapital' }
  ];

  // Tek veri kaynağı (JSON yapısı)
  const INITIAL_ARCHIVE_JSON = [
    {
      id: 'yok-2026-rapor',
      type: 'dokuman',
      featured: true,
      title: 'Yükseköğretim Kurumları 2026 Akademik Kadro ve Program Raporu',
      summary: 'Üniversitelerdeki program açılışları, araştırma üniversiteleri göstergeleri ve insan kaynağı dağılımına ilişkin temel veri özeti.',
      body: [
        'Yükseköğretim sisteminde program çeşitliliği, kalite güvencesi ve araştırma kapasitesi verileri her dönem yeniden değerlendirilmektedir.',
        'Bu kayıtta resmî kurum tarafından paylaşılan verilerin temel başlıkları özetlenmiş ve doğrulama için birincil kaynağa bağlantı verilmiştir.'
      ],
      imageUrl: '',
      author: 'Yükseköğretim Kurulu (Veri Özeti)',
      source: 'YÖK Resmî Yayınlar',
      date: '2026-11-18',
      updatedAt: '2026-11-20',
      topic: 'YÖK Politikaları',
      docMeta: 'PDF • 3,2 MB',
      sourceUrl: 'https://www.yok.gov.tr',
      isExternalLink: false,
      apa: 'Yükseköğretim Kurulu. (2026, 18 Kasım). Yükseköğretim kurumları 2026 akademik kadro ve program raporu [Özet kayıt]. AkademikKapital Arşivi. https://akademikkapital.vercel.app/?id=yok-2026-rapor'
    },
    {
      id: 'yonetisim-ozerklik-analiz',
      type: 'makale',
      featured: false,
      title: 'Üniversitelerde Akademik Özerklik, Dijital Dönüşüm ve Kamu Yararı',
      summary: 'Yükseköğretim kurumlarında dijitalleşme ve performans ölçütlerinin akademik özerklik ve kamusal sorumlulukla ilişkisini inceleyen değerlendirme.',
      body: [
        'Modern üniversite yönetişimi; artan öğrenci sayısı, dijital kampüs uygulamaları ve uluslararası görünürlük hedefleri arasında denge kurmaya çalışmaktadır.',
        'Kamusal bir hizmet olarak yükseköğretimin temel ölçütü yalnızca kısa vadeli nicel çıktılar değil, uzun vadeli bilgi üretimi ve kurumsal güven olmalıdır.'
      ],
      imageUrl: '',
      author: 'AkademikKapital Yayın Kurulu',
      source: 'AkademikKapital Analiz',
      date: '2026-11-14',
      updatedAt: '2026-11-14',
      topic: 'Yönetişim ve Özerklik',
      docMeta: '',
      sourceUrl: '',
      isExternalLink: false,
      apa: 'AkademikKapital Yayın Kurulu. (2026, 14 Kasım). Üniversitelerde akademik özerklik, dijital dönüşüm ve kamu yararı. AkademikKapital. https://akademikkapital.vercel.app/?id=yonetisim-ozerklik-analiz'
    },
    {
      id: 'osym-takvim-duyurusu',
      type: 'duyurular',
      featured: false,
      title: '2026 Yılı Son Dönem Merkezi Sınav ve Başvuru Takvimi Güncellemesi',
      summary: 'Ölçme, Seçme ve Yerleştirme Merkezi tarafından yayımlanan güncel sınav ve tercih/başvuru tarihlerine ilişkin özet duyuru.',
      body: [
        'Adayları ve akademik birimleri doğrudan ilgilendiren güncel sınav ve başvuru tarihleri için resmî duyuru metni esas alınmalıdır.'
      ],
      imageUrl: '',
      author: 'ÖSYM Duyuru Özeti',
      source: 'ÖSYM Resmî Sitesi',
      date: '2026-11-10',
      updatedAt: '2026-11-12',
      topic: 'ÖSYM ve Sınavlar',
      docMeta: '',
      sourceUrl: 'https://www.osym.gov.tr',
      isExternalLink: false,
      apa: 'ÖSYM Duyuru Özeti. (2026, 10 Kasım). 2026 yılı son dönem merkezi sınav ve başvuru takvimi güncellemesi. AkademikKapital. https://akademikkapital.vercel.app/?id=osym-takvim-duyurusu'
    },
    {
      id: 'yok-atlas-portal',
      type: 'baglanti',
      featured: false,
      title: 'YÖK Atlas — Yükseköğretim Program ve Tercih İstatistikleri Portalı',
      summary: 'Lisans ve ön lisans programlarına ilişkin yerleşen verileri, başarı sıraları ve kontenjan bilgilerine doğrudan erişim bağlantısı.',
      body: [
        'Yükseköğretim programlarının tarihsel kontenjan ve yerleşen verilerine açık erişim sağlayan dış kurumsal veri portalıdır.'
      ],
      imageUrl: '',
      author: 'Dış Kaynak Dizini',
      source: 'YÖK Atlas',
      date: '2026-10-28',
      updatedAt: '2026-10-28',
      topic: 'Yükseköğretim Verileri',
      docMeta: 'Dış Portal',
      sourceUrl: 'https://yokatlas.yok.gov.tr',
      isExternalLink: true,
      apa: 'YÖK Atlas. (2026, 28 Ekim). Yükseköğretim program ve tercih istatistikleri portalı [Dış bağlantı]. AkademikKapital. https://akademikkapital.vercel.app/?id=yok-atlas-portal'
    },
    {
      id: 'arastirma-fonlari-haber',
      type: 'haberler',
      featured: false,
      title: 'Doktora Sonrası Araştırma ve Uluslararası Hareketlilik Çağrıları',
      summary: 'Araştırmacılara yönelik güncel proje ve hareketlilik çağrılarının takvim ve başvuru koşullarına dair bilgilendirme notu.',
      body: [
        'Temel ve uygulamalı bilimlerde erken kariyer aşamasındaki araştırmacılar için açılan çağrılarda başvuru takvimi ve ev sahibi kurum koşulları öne çıkmaktadır.'
      ],
      imageUrl: '',
      author: 'AkademikKapital Haber Masası',
      source: 'Kurumsal Çağrı Özeti',
      date: '2026-10-19',
      updatedAt: '2026-10-19',
      topic: 'Araştırma ve Fonlar',
      docMeta: '',
      sourceUrl: '',
      isExternalLink: false,
      apa: 'AkademikKapital Haber Masası. (2026, 19 Ekim). Doktora sonrası araştırma ve uluslararası hareketlilik çağrıları. AkademikKapital. https://akademikkapital.vercel.app/?id=arastirma-fonlari-haber'
    },
    {
      id: 'kalite-kurulu-2025',
      type: 'dokuman',
      featured: false,
      title: 'Kurumsal Akreditasyon ve İç Kalite Güvencesi Değerlendirme Notu',
      summary: 'Üniversitelerde iç kalite güvencesi sistemleri, öz değerlendirme raporları ve dış değerlendirme ölçütlerine ilişkin özet belge.',
      body: [
        'İç kalite güvencesi süreçleri; misyon ve stratejik amaçlarla uyumlu ölçülebilir kanıtlara dayanmalıdır.'
      ],
      imageUrl: '',
      author: 'Kalite İzleme Notu',
      source: 'YÖKAK Açık Kaynak',
      date: '2025-12-15',
      updatedAt: '2026-01-10',
      topic: 'Kalite ve Akreditasyon',
      docMeta: 'PDF • 1,8 MB',
      sourceUrl: 'https://portal.yokak.gov.tr',
      isExternalLink: false,
      apa: 'Kalite İzleme Notu. (2025, 15 Aralık). Kurumsal akreditasyon ve iç kalite güvencesi değerlendirme notu. AkademikKapital. https://akademikkapital.vercel.app/?id=kalite-kurulu-2025'
    }
  ];

  // Durum
  let records = [];
  let pendingSubmissions = [];
  let socialLinks = [];
  let pendingUploadedImageDataUrl = '';

  let state = {
    tab: 'tumu',
    q: '',
    sira: 'newest',
    year: 'ALL',
    topic: 'ALL',
    visibleLimit: PAGE_SIZE,
    activeDetailId: null,
    viewMode: 'archive'
  };

  // DOM Elemanları
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const yearFilter = document.getElementById('yearFilter');
  const topicFilter = document.getElementById('topicFilter');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const resultCount = document.getElementById('resultCount');
  const statusBanner = document.getElementById('statusBanner');
  const featuredSection = document.getElementById('featuredSection');
  const featuredCardSlot = document.getElementById('featuredCardSlot');
  const archiveList = document.getElementById('archiveList');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const archiveView = document.getElementById('archiveView');
  const aboutView = document.getElementById('aboutView');
  const detailView = document.getElementById('detailView');

  // =========================================================================
  // Sosyal Medya İkonları (Platformlarla Birebir Eşleşen SVG'ler)
  // =========================================================================
  function renderPlatformIcon(platform) {
    switch (platform) {
      case 'whatsapp':
        return `<svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20.52 3.48A11.82 11.82 0 0 0 12.06 0C5.49 0 .14 5.35.14 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.29-1.65a11.88 11.88 0 0 0 5.77 1.47h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.18-3.47-8.42zm-8.45 18.33h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.73.98 1-3.64-.24-.37a9.85 9.85 0 0 1-1.51-5.23c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.89-9.9 9.89zm5.42-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.49s1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.11 4.52.71.31 1.27.49 1.7.63.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/></svg>`;
      case 'telegram':
        return `<svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M23.91 3.79L20.3 20.84c-.25 1.21-.98 1.5-2 .94l-5.5-4.07-2.66 2.57c-.3.3-.55.55-1.12.55l.4-5.64 10.28-9.28c.45-.4-.1-.62-.69-.22L6.52 13.32 1.05 11.61c-1.19-.37-1.21-1.19.25-1.76L22.39 1.59c.99-.37 1.86.22 1.52 2.2z"/></svg>`;
      case 'instagram':
        return `<svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.72 3.72 0 0 1-.9 1.38 3.72 3.72 0 0 1-1.38.9c-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.88 5.88 0 0 0-2.12 1.38A5.88 5.88 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.39 2.12.66.67 1.33 1.08 2.12 1.39.76.3 1.64.5 2.91.56 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.12-1.39.67-.66 1.08-1.33 1.39-2.12.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 0 0-1.39-2.12A5.88 5.88 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z"/></svg>`;
      case 'youtube':
        return `<svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.12-2.12C19.5 3.57 12 3.57 12 3.57s-7.5 0-9.38.51A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.12 2.12c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3 3 0 0 0 2.12-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4l6.24 3.6-6.24 3.6z"/></svg>`;
      case 'threads':
        return `<svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19.46 10.45a8.44 8.44 0 0 0-.42-.97c-.56-1.15-1.5-2.06-2.72-2.62-1.15-.53-2.52-.78-4.08-.74-1.9.05-3.52.66-4.7 1.77C6.75 8.73 6.13 10.22 6.08 12c-.05 1.78.52 3.31 1.66 4.43 1.15 1.12 2.75 1.7 4.65 1.67 1.64-.03 3.06-.49 4.13-1.35.93-.75 1.54-1.76 1.77-2.93h-2.15c-.18.67-.58 1.22-1.17 1.62-.71.48-1.69.72-2.83.74-1.31.02-2.36-.34-3.12-1.08-.72-.7-1.08-1.68-1.05-2.85h9.65c.03-.38.04-.75.03-1.13-.02-.6-.12-1.16-.29-1.67zm-8.65.13c.13-.95.55-1.69 1.24-2.15.63-.42 1.44-.62 2.38-.6 1.03.02 1.85.26 2.43.7.51.39.83.93.95 1.59h-6.24z"/></svg>`;
      case 'x':
        return `<svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
      default:
        return `<svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M10.59 13.41c.41.41.41 1.09 0 1.5s-1.09.41-1.5 0a3.99 3.99 0 0 1 0-5.66l2.83-2.83a4.008 4.008 0 0 1 5.66 0 3.99 3.99 0 0 1 0 5.66l-1.06 1.06a1 1 0 0 1-1.41-1.41l1.06-1.06a2 2 0 0 0 0-2.83 2 2 0 0 0-2.83 0l-2.83 2.83a2 2 0 0 0 0 2.83zm2.82-2.82c.41-.41 1.09-.41 1.5 0a3.99 3.99 0 0 1 0 5.66l-2.83 2.83a4.008 4.008 0 0 1-5.66 0 3.99 3.99 0 0 1 0-5.66l1.06-1.06a1 1 0 0 1 1.41 1.41l-1.06 1.06a2 2 0 0 0 0 2.83 2 2 0 0 0 2.83 0l2.83-2.83a2 2 0 0 0 0-2.83c-.41-.41-.41-1.09 0-1.5z"/></svg>`;
    }
  }

  function renderSocialNavs() {
    const topNav = document.getElementById('topSocialNav');
    const footerNav = document.getElementById('footerSocialNav');

    const safeLinks = socialLinks.filter((s) => /^https?:\/\//i.test(s.url));

    topNav.innerHTML = safeLinks
      .map(
        (s) =>
          `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(s.label)}" title="${escapeHtml(s.label)}">${renderPlatformIcon(s.platform)}</a>`
      )
      .join('');

    footerNav.innerHTML =
      safeLinks
        .map(
          (s) =>
            `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(s.label)}" title="${escapeHtml(s.label)}">${renderPlatformIcon(s.platform)}</a>`
        )
        .join('') +
      `<a href="feed.xml" id="rssFollowLink" class="rss-link">RSS ile takip et</a>`;
  }

  // =========================================================================
  // Türkçe Karakter Duyarsız Normalizasyon & Eşleşme Vurgulama
  // =========================================================================
  function normalizeTr(str) {
    return String(str || '')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .replace(/ı/g, 'i')
      .replace(/Ğ/g, 'g')
      .replace(/ğ/g, 'g')
      .replace(/Ü/g, 'u')
      .replace(/ü/g, 'u')
      .replace(/Ş/g, 's')
      .replace(/ş/g, 's')
      .replace(/Ö/g, 'o')
      .replace(/ö/g, 'o')
      .replace(/Ç/g, 'c')
      .replace(/ç/g, 'c')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function highlightTrMatches(text, rawQuery) {
    const safeText = escapeHtml(text || '');
    const q = (rawQuery || '').trim();
    if (!q) return safeText;

    const normQuery = normalizeTr(q);
    if (!normQuery) return safeText;

    const orig = String(text || '');
    const map = [];
    let normFull = '';

    for (let i = 0; i < orig.length; i++) {
      const ch = orig[i];
      const nCh = normalizeTr(ch);
      for (let k = 0; k < nCh.length; k++) {
        map.push(i);
      }
      normFull += nCh;
    }

    const ranges = [];
    let searchFrom = 0;
    while (searchFrom <= normFull.length - normQuery.length) {
      const idx = normFull.indexOf(normQuery, searchFrom);
      if (idx === -1) break;
      ranges.push([map[idx], map[idx + normQuery.length - 1] + 1]);
      searchFrom = idx + normQuery.length;
    }

    if (ranges.length === 0) return safeText;

    let out = '';
    let cursor = 0;
    for (const [start, end] of ranges) {
      if (start < cursor) continue;
      out += escapeHtml(orig.slice(cursor, start));
      out += `<mark class="search-hit">${escapeHtml(orig.slice(start, end))}</mark>`;
      cursor = end;
    }
    out += escapeHtml(orig.slice(cursor));
    return out;
  }

  // =========================================================================
  // Backspace Koruması & "/" Arama Kısayolu
  // =========================================================================
  document.addEventListener('keydown', (e) => {
    if (
      e.key === '/' &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !isTypingTarget(document.activeElement)
    ) {
      e.preventDefault();
      if (state.viewMode !== 'archive') {
        showArchiveView();
      }
      searchInput.focus();
      return;
    }

    if (e.key === 'Backspace' || e.keyCode === 8) {
      const active = document.activeElement;
      if (!active || !isTypingTarget(active) || active.readOnly || active.disabled) {
        e.preventDefault();
      }
    }
  });

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      el.isContentEditable ||
      el.getAttribute('contenteditable') === 'true'
    );
  }

  // =========================================================================
  // URL Durum Senkronizasyonu (?q=&tur=&sira=)
  // =========================================================================
  function readStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    const tur = params.get('tur') || 'tumu';
    const sira = params.get('sira') || 'newest';
    const id = params.get('id') || null;

    state.q = q;
    state.tab = TYPE_LABELS[tur] || tur === 'tumu' ? tur : 'tumu';
    state.sira = sira === 'oldest' ? 'oldest' : 'newest';
    state.activeDetailId = id;

    searchInput.value = state.q;
    sortSelect.value = state.sira;
  }

  function syncUrlState() {
    const params = new URLSearchParams(window.location.search);
    if (state.activeDetailId) {
      params.set('id', state.activeDetailId);
    } else {
      params.delete('id');
    }

    if (state.q.trim()) {
      params.set('q', state.q.trim());
    } else {
      params.delete('q');
    }

    if (state.tab && state.tab !== 'tumu' && state.tab !== 'hakkimizda') {
      params.set('tur', state.tab);
    } else {
      params.delete('tur');
    }

    if (state.sira === 'oldest') {
      params.set('sira', 'oldest');
    } else {
      params.delete('sira');
    }

    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
  }

  window.addEventListener('popstate', () => {
    readStateFromUrl();
    if (state.activeDetailId) {
      const found = records.find((r) => r.id === state.activeDetailId);
      if (found) {
        openDetailView(found, false);
        return;
      }
    }
    showArchiveView(false);
  });

  // =========================================================================
  // Veri Yükleme
  // =========================================================================
  async function initApp() {
    readStateFromUrl();
    pendingSubmissions = loadJsonStorage(PENDING_STORAGE_KEY, []);
    socialLinks = loadJsonStorage(SOCIAL_STORAGE_KEY, DEFAULT_SOCIAL_LINKS);
    renderSocialNavs();

    setStatus('loading', 'Arşiv kayıtları yükleniyor...');
    try {
      const res = await fetch('/api/archive', { cache: 'no-store' });
      if (res.ok) {
        const apiData = await res.json();
        if (Array.isArray(apiData) && apiData.length > 0) {
          records = apiData;
          localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(records));
        } else {
          records = loadJsonStorage(ARCHIVE_STORAGE_KEY, INITIAL_ARCHIVE_JSON);
        }
      } else {
        records = loadJsonStorage(ARCHIVE_STORAGE_KEY, INITIAL_ARCHIVE_JSON);
      }
      clearStatus();
    } catch (_) {
      records = loadJsonStorage(ARCHIVE_STORAGE_KEY, INITIAL_ARCHIVE_JSON);
      setStatus('error', 'Sunucu bağlantısı sağlanamadı; yerel arşiv verisi gösteriliyor.');
    }

    populateFilterOptions();
    updateTabUi(state.tab);

    if (state.activeDetailId) {
      const target = records.find((r) => r.id === state.activeDetailId);
      if (target) {
        openDetailView(target, false);
        return;
      }
    }

    renderArchive();
  }

  function populateFilterOptions() {
    const years = Array.from(
      new Set(records.map((r) => (r.date || '').slice(0, 4)).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a));

    yearFilter.innerHTML =
      '<option value="ALL">Tüm Yıllar</option>' +
      years.map((y) => `<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`).join('');
    yearFilter.value = years.includes(state.year) ? state.year : 'ALL';

    const topics = Array.from(
      new Set(records.map((r) => r.topic).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'tr'));

    topicFilter.innerHTML =
      '<option value="ALL">Tüm Konular</option>' +
      topics.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    topicFilter.value = topics.includes(state.topic) ? state.topic : 'ALL';
  }

  function setStatus(kind, message) {
    statusBanner.classList.remove('hidden');
    statusBanner.dataset.kind = kind;
    statusBanner.textContent = message;
  }

  function clearStatus() {
    statusBanner.classList.add('hidden');
    statusBanner.textContent = '';
  }

  // =========================================================================
  // Filtreleme, Sıralama ve Listeleme
  // =========================================================================
  function getMatchedRecords() {
    const normQ = normalizeTr(state.q);

    const list = records.filter((item) => {
      const matchTab = state.tab === 'tumu' || item.type === state.tab;
      const matchYear = state.year === 'ALL' || (item.date || '').startsWith(state.year);
      const matchTopic = state.topic === 'ALL' || item.topic === state.topic;

      const haystack = normalizeTr(
        [item.title, item.summary, item.author, item.source, item.topic, item.docMeta].join(' ')
      );
      const matchQuery = !normQ || haystack.includes(normQ);

      return matchTab && matchYear && matchTopic && matchQuery;
    });

    if (state.sira === 'oldest') {
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } else {
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    return list;
  }

  function renderArchive() {
    const matched = getMatchedRecords();
    const hasCustomFilters =
      Boolean(state.q.trim()) || state.year !== 'ALL' || state.topic !== 'ALL' || state.tab !== 'tumu';
    resetFiltersBtn.classList.toggle('hidden', !hasCustomFilters);

    resultCount.textContent = `${matched.length} kayıt`;

    const featuredItem =
      matched.find((item) => item.featured) ||
      (!hasCustomFilters ? records.find((item) => item.featured) : null);

    if (featuredItem) {
      featuredSection.classList.remove('hidden');
      featuredCardSlot.innerHTML = renderCardHtml(featuredItem, true);
    } else {
      featuredSection.classList.add('hidden');
      featuredCardSlot.innerHTML = '';
    }

    const listCandidates = featuredItem
      ? matched.filter((item) => item.id !== featuredItem.id)
      : matched;

    if (matched.length === 0) {
      archiveList.innerHTML = '';
      loadMoreBtn.classList.add('hidden');
      setStatus('empty', 'Arama veya filtre kriterlerinizle eşleşen kayıt bulunamadı.');
      return;
    }

    if (statusBanner.dataset.kind === 'empty') {
      clearStatus();
    }

    const visibleItems = listCandidates.slice(0, state.visibleLimit);
    archiveList.innerHTML = visibleItems.map((item) => renderCardHtml(item, false)).join('');
    loadMoreBtn.classList.toggle('hidden', listCandidates.length <= state.visibleLimit);
  }

  function renderCardHtml(item, isFeatured) {
    const typeLabel = TYPE_LABELS[item.type] || item.type;
    const readMinutes = estimateReadTime(item);
    const titleHtml = highlightTrMatches(item.title, state.q);
    const summaryHtml = highlightTrMatches(item.summary, state.q);

    const imageBlock = item.imageUrl
      ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="card-media-thumb" loading="lazy">`
      : '';

    const docInfoBlock =
      item.docMeta || item.sourceUrl
        ? `<div class="card-doc-meta">
            <span>${escapeHtml(item.docMeta || 'Kaynak Kayıt')}</span>
            ${
              item.sourceUrl
                ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="external-link-pill">
                    ${item.type === 'baglanti' || item.isExternalLink ? 'Dış siteye git <span aria-hidden="true">&#8599;</span>' : 'Resmî kaynağa git <span aria-hidden="true">&#8599;</span>'}
                  </a>`
                : ''
            }
          </div>`
        : '';

    return `
      <article class="archive-card ${isFeatured ? 'archive-card--featured' : ''}" data-id="${escapeHtml(item.id)}">
        ${imageBlock}
        <div class="card-meta-top">
          <span class="type-badge">${escapeHtml(typeLabel)}</span>
          ${item.topic ? `<span>#${escapeHtml(item.topic)}</span>` : ''}
        </div>

        <h2 class="card-title">
          <button type="button" class="card-title-btn js-open-detail" data-id="${escapeHtml(item.id)}">${titleHtml}</button>
        </h2>

        <p class="card-summary-2line">${summaryHtml}</p>

        ${docInfoBlock}

        <div class="card-footer-line">
          <div class="card-attribution">
            <span><strong>Yazar:</strong> ${escapeHtml(item.author || 'AkademikKapital')}</span>
            <span><strong>Kaynak:</strong> ${escapeHtml(item.source || 'Arşiv')}</span>
            <span><strong>Tarih:</strong> ${formatDateTr(item.date)}</span>
            <span>${readMinutes}</span>
          </div>

          <div class="card-actions">
            <button type="button" class="btn-secondary js-open-detail" data-id="${escapeHtml(item.id)}">Oku</button>
            <button type="button" class="btn-ghost js-share-item" data-id="${escapeHtml(item.id)}">Paylaş</button>
          </div>
        </div>
      </article>
    `;
  }

  // =========================================================================
  // Sekme ve Ayrı "Hakkımızda" Görünümü
  // =========================================================================
  function updateTabUi(tabName) {
    document.querySelectorAll('#sectionTabs .tab-item').forEach((btn) => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });
  }

  function showArchiveView(shouldSync = true) {
    state.viewMode = 'archive';
    state.activeDetailId = null;
    aboutView.classList.add('hidden');
    detailView.classList.add('hidden');
    archiveView.classList.remove('hidden');
    updateTabUi(state.tab === 'hakkimizda' ? 'tumu' : state.tab);
    if (shouldSync) syncUrlState();
    renderArchive();
  }

  function showAboutView() {
    state.viewMode = 'about';
    state.activeDetailId = null;
    archiveView.classList.add('hidden');
    detailView.classList.add('hidden');
    aboutView.classList.remove('hidden');
    updateTabUi('hakkimizda');
    syncUrlState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('sectionTabs').addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.tab-item');
    if (!tabBtn) return;
    const tab = tabBtn.dataset.tab;
    state.visibleLimit = PAGE_SIZE;

    if (tab === 'hakkimizda') {
      showAboutView();
      return;
    }

    state.tab = tab;
    showArchiveView(true);
  });

  document.getElementById('brandHomeLink').addEventListener('click', (e) => {
    e.preventDefault();
    state.tab = 'tumu';
    state.q = '';
    state.year = 'ALL';
    state.topic = 'ALL';
    state.sira = 'newest';
    state.visibleLimit = PAGE_SIZE;
    searchInput.value = '';
    sortSelect.value = 'newest';
    yearFilter.value = 'ALL';
    topicFilter.value = 'ALL';
    showArchiveView(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('backToArchiveBtn').addEventListener('click', () => showArchiveView(true));

  // =========================================================================
  // Tek Sütun Detay Görünümü, Kalıcı URL, Yazdır, Paylaş ve APA Künye
  // =========================================================================
  function openDetailView(item, shouldSync = true) {
    state.viewMode = 'detail';
    state.activeDetailId = item.id;
    archiveView.classList.add('hidden');
    aboutView.classList.add('hidden');
    detailView.classList.remove('hidden');

    const permalink = `${window.location.origin}/?id=${encodeURIComponent(item.id)}`;
    document.getElementById('detailTypeBadge').textContent = TYPE_LABELS[item.type] || item.type;
    document.getElementById('detailTitle').textContent = item.title;
    document.getElementById('detailAuthor').textContent = item.author || 'AkademikKapital';
    document.getElementById('detailSource').textContent = item.source || 'Arşiv';
    document.getElementById('detailDate').textContent = formatDateTr(item.date);
    document.getElementById('detailUpdated').textContent = formatDateTr(item.updatedAt || item.date);
    document.getElementById('detailReadTime').textContent = estimateReadTime(item);
    document.getElementById('detailPermalink').textContent = permalink;

    const figEl = document.getElementById('detailImageFigure');
    const imgEl = document.getElementById('detailImage');
    if (item.imageUrl) {
      imgEl.src = item.imageUrl;
      imgEl.alt = item.title;
      figEl.classList.remove('hidden');
    } else {
      imgEl.src = '';
      imgEl.alt = '';
      figEl.classList.add('hidden');
    }

    const paragraphs = Array.isArray(item.body) && item.body.length > 0
      ? item.body
      : [item.summary || ''];
    document.getElementById('detailBody').innerHTML = paragraphs
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join('');

    const sourceBox = document.getElementById('detailPrimaryLinkBox');
    const sourceAnchor = document.getElementById('detailPrimaryLink');
    if (item.sourceUrl) {
      sourceAnchor.href = item.sourceUrl;
      sourceAnchor.textContent = `${item.source || 'Resmî Kaynak'} (${item.docMeta || 'Bağlantı'}) ↗`;
      sourceBox.classList.remove('hidden');
    } else {
      sourceBox.classList.add('hidden');
    }

    const apaText =
      item.apa ||
      `${item.author || 'AkademikKapital'}. (${(item.date || '2026').slice(0, 4)}). ${item.title}. AkademikKapital. ${permalink}`;
    document.getElementById('detailApaText').textContent = apaText;

    document.getElementById('ogTitle').setAttribute('content', item.title);
    document.getElementById('ogDesc').setAttribute('content', item.summary || item.title);
    document.getElementById('ogUrl').setAttribute('content', permalink);
    document.getElementById('twTitle').setAttribute('content', item.title);
    document.getElementById('twDesc').setAttribute('content', item.summary || item.title);

    if (shouldSync) syncUrlState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', (e) => {
    const detailTrigger = e.target.closest('.js-open-detail');
    if (detailTrigger) {
      const rec = records.find((r) => r.id === detailTrigger.dataset.id);
      if (rec) openDetailView(rec, true);
      return;
    }

    const shareTrigger = e.target.closest('.js-share-item');
    if (shareTrigger) {
      const rec = records.find((r) => r.id === shareTrigger.dataset.id);
      if (rec) shareRecord(rec);
    }
  });

  document.getElementById('detailBackBtn').addEventListener('click', () => showArchiveView(true));
  document.getElementById('printDetailBtn').addEventListener('click', () => window.print());

  document.getElementById('shareDetailBtn').addEventListener('click', () => {
    const rec = records.find((r) => r.id === state.activeDetailId);
    if (rec) shareRecord(rec);
  });

  async function shareRecord(item) {
    const url = `${window.location.origin}/?id=${encodeURIComponent(item.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, text: item.summary, url });
        return;
      } catch (_) {}
    }
    copyToClipboard(url, 'Paylaşım bağlantısı panoya kopyalandı.');
  }

  document.getElementById('copyApaBtn').addEventListener('click', () => {
    copyToClipboard(document.getElementById('detailApaText').textContent, 'APA künyesi panoya kopyalandı.');
  });

  document.getElementById('copyPermalinkBtn').addEventListener('click', () => {
    copyToClipboard(document.getElementById('detailPermalink').textContent, 'Kalıcı bağlantı panoya kopyalandı.');
  });

  // =========================================================================
  // İçerik Gönder (Editör Onay Kuyruğu + Onay Ekranı)
  // =========================================================================
  const contributeDialog = document.getElementById('contributeDialog');
  const contributeForm = document.getElementById('contributeForm');
  const contributeSuccessScreen = document.getElementById('contributeSuccessScreen');

  document.getElementById('openContributeBtn').addEventListener('click', () => {
    contributeForm.reset();
    contributeForm.classList.remove('hidden');
    contributeSuccessScreen.classList.add('hidden');
    document.getElementById('contributeError').textContent = '';
    openDialog(contributeDialog);
  });

  contributeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const errEl = document.getElementById('contributeError');
    const name = document.getElementById('subName').value.trim();
    const inst = document.getElementById('subInstitution').value.trim();
    const email = document.getElementById('subEmail').value.trim();
    const type = document.getElementById('subType').value;
    const title = document.getElementById('subTitle').value.trim();
    const textOrUrl = document.getElementById('subTextOrUrl').value.trim();
    const sourceNote = document.getElementById('subSourceNote').value.trim();
    const confirmed = document.getElementById('subConfirm').checked;

    if (!name || !inst || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !title || !textOrUrl || !sourceNote || !confirmed) {
      errEl.textContent = 'Lütfen tüm zorunlu alanları doldurun ve kaynak/onay kutusunu işaretleyin.';
      return;
    }

    const entry = {
      id: `sub-${Date.now()}`,
      name,
      institution: inst,
      email,
      type,
      title,
      textOrUrl,
      sourceNote,
      submittedAt: new Date().toISOString()
    };

    pendingSubmissions.unshift(entry);
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingSubmissions));

    contributeForm.classList.add('hidden');
    contributeSuccessScreen.classList.remove('hidden');
    document.getElementById('receiptSummaryText').textContent =
      `"${title}" başlıklı öneriniz editör onay kuyruğuna kaydedildi. İnceleme sonrası uygun görülen kayıtlar yayımlanır.`;
  });

  document.getElementById('closeReceiptBtn').addEventListener('click', () => {
    closeDialog(contributeDialog);
  });

  // =========================================================================
  // Hakkımızda E-posta Kopyala & Kısa İletişim Formu
  // =========================================================================
  document.getElementById('copyEmailBtn').addEventListener('click', () => {
    copyToClipboard('akademikkapital@gmail.com', 'İletişim e-posta adresi kopyalandı.');
  });

  document.getElementById('footerCopyEmailBtn').addEventListener('click', () => {
    copyToClipboard('akademikkapital@gmail.com', 'akademikkapital@gmail.com kopyalandı.');
  });

  const quickContactForm = document.getElementById('quickContactForm');
  document.getElementById('toggleContactFormBtn').addEventListener('click', () => {
    quickContactForm.classList.toggle('hidden');
  });

  quickContactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const sender = document.getElementById('contactName').value.trim();
    const msg = document.getElementById('contactMessage').value.trim();
    if (!sender || !msg) return;
    document.getElementById('quickContactStatus').textContent =
      'Mesajınız hazırlandı. Doğrudan iletişim için akademikkapital@gmail.com adresine iletebilirsiniz.';
    quickContactForm.reset();
  });

  // =========================================================================
  // Geniş Yönetim Paneli: Yazı Ekleme, Görsel Yükleme, Sosyal Bağlantılar & Kuyruk
  // =========================================================================
  const adminDialog = document.getElementById('adminDialog');
  const adminRecordForm = document.getElementById('adminRecordForm');
  const adminEditIdInput = document.getElementById('adminEditId');
  const admExistingImageInput = document.getElementById('admExistingImage');
  const admImageFileInput = document.getElementById('admImageFile');
  const admImagePreviewWrap = document.getElementById('admImagePreviewWrap');
  const admImagePreview = document.getElementById('admImagePreview');
  const removeAdmImageBtn = document.getElementById('removeAdmImageBtn');
  const cancelAdminEditBtn = document.getElementById('cancelAdminEditBtn');
  const saveRecordBtn = document.getElementById('saveRecordBtn');

  document.getElementById('footerAdminLink').addEventListener('click', () => {
    openDialog(adminDialog);
  });

  document.getElementById('adminLoginSubmit').addEventListener('click', () => {
    const pass = document.getElementById('adminPassInput').value;
    if (pass === ADMIN_PASSCODE) {
      document.getElementById('adminGate').classList.add('hidden');
      document.getElementById('adminConsole').classList.remove('hidden');
      renderAdminSocialList();
      renderPendingQueue();
      renderAdminRecordsList();
    } else {
      showToast('Yönetici parolası hatalı.');
    }
  });

  // Görsel Yükleme ve Önizleme
  admImageFileInput.addEventListener('change', () => {
    const file = admImageFileInput.files && admImageFileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Lütfen geçerli bir resim dosyası seçin.');
      admImageFileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      pendingUploadedImageDataUrl = dataUrl;
      admImagePreview.src = dataUrl;
      admImagePreviewWrap.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  removeAdmImageBtn.addEventListener('click', () => {
    pendingUploadedImageDataUrl = '';
    admExistingImageInput.value = '';
    admImageFileInput.value = '';
    admImagePreview.src = '';
    admImagePreviewWrap.classList.add('hidden');
  });

  function setImagePreviewForEdit(imageUrl) {
    pendingUploadedImageDataUrl = '';
    admExistingImageInput.value = imageUrl || '';
    admImageFileInput.value = '';
    if (imageUrl) {
      admImagePreview.src = imageUrl;
      admImagePreviewWrap.classList.remove('hidden');
    } else {
      admImagePreview.src = '';
      admImagePreviewWrap.classList.add('hidden');
    }
  }

  // Sosyal Medya / Bağlantı Ekleme ve Yönetme
  const adminSocialForm = document.getElementById('adminSocialForm');
  const adminSocialList = document.getElementById('adminSocialList');

  function renderAdminSocialList() {
    if (!socialLinks.length) {
      adminSocialList.innerHTML = '<p>Henüz sosyal bağlantı eklenmemiş.</p>';
      return;
    }

    adminSocialList.innerHTML = socialLinks
      .map(
        (s) => `
        <div class="social-manage-row">
          <div class="admin-record-info">
            <strong>${escapeHtml(s.label)}</strong>
            <span>${escapeHtml(s.url)}</span>
          </div>
          <div class="admin-record-btns">
            <button type="button" class="btn-danger-ghost js-delete-social" data-id="${escapeHtml(s.id)}">Sil</button>
          </div>
        </div>
      `
      )
      .join('');
  }

  adminSocialForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const platform = document.getElementById('socPlatformSelect').value;
    const customLabel = document.getElementById('socCustomLabel').value.trim();
    const url = document.getElementById('socUrlInput').value.trim();

    if (!/^https?:\/\//i.test(url)) {
      showToast('Lütfen http:// veya https:// ile başlayan geçerli bir bağlantı girin.');
      return;
    }

    const label = customLabel || PLATFORM_LABELS[platform] || 'Bağlantı';
    const existingIdx = socialLinks.findIndex((s) => s.platform === platform && platform !== 'custom');

    if (existingIdx !== -1) {
      socialLinks[existingIdx] = {
        ...socialLinks[existingIdx],
        label,
        url
      };
    } else {
      socialLinks.push({
        id: `soc-${Date.now()}`,
        platform,
        label,
        url
      });
    }

    localStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify(socialLinks));
    renderSocialNavs();
    renderAdminSocialList();
    adminSocialForm.reset();
    showToast(`${label} bağlantısı kaydedildi.`);
  });

  adminSocialList.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.js-delete-social');
    if (!delBtn) return;
    socialLinks = socialLinks.filter((s) => s.id !== delBtn.dataset.id);
    localStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify(socialLinks));
    renderSocialNavs();
    renderAdminSocialList();
    showToast('Bağlantı kaldırıldı.');
  });

  // Onay Kuyruğu
  function renderPendingQueue() {
    const box = document.getElementById('pendingQueueList');
    if (pendingSubmissions.length === 0) {
      box.innerHTML = '<p>Onay bekleyen gönderim bulunmuyor.</p>';
      return;
    }

    box.innerHTML = pendingSubmissions
      .map(
        (sub) => `
        <div class="pending-item">
          <div class="admin-record-info">
            <strong>${escapeHtml(sub.title)}</strong>
            <span>${escapeHtml(sub.name)} (${escapeHtml(sub.institution)}) • Kaynak: ${escapeHtml(sub.sourceNote)}</span>
          </div>
          <div class="admin-record-btns">
            <button type="button" class="btn-primary js-approve-sub" data-id="${escapeHtml(sub.id)}">Onayla</button>
            <button type="button" class="btn-danger-ghost js-reject-sub" data-id="${escapeHtml(sub.id)}">Reddet</button>
          </div>
        </div>
      `
      )
      .join('');
  }

  document.getElementById('pendingQueueList').addEventListener('click', (e) => {
    const approveBtn = e.target.closest('.js-approve-sub');
    const rejectBtn = e.target.closest('.js-reject-sub');

    if (approveBtn) {
      const sub = pendingSubmissions.find((s) => s.id === approveBtn.dataset.id);
      if (!sub) return;
      const isUrl = /^https?:\/\//i.test(sub.textOrUrl);
      const newRec = {
        id: `ak-${Date.now()}`,
        type: sub.type,
        featured: false,
        title: sub.title,
        summary: isUrl ? `${sub.sourceNote} — Resmî bağlantı kaydı.` : sub.textOrUrl,
        body: [isUrl ? 'Resmî kaynak bağlantısı üzerinden erişilebilir.' : sub.textOrUrl],
        imageUrl: '',
        author: `${sub.name} (${sub.institution})`,
        source: sub.sourceNote,
        date: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        topic: 'Katkı Kayıtları',
        docMeta: '',
        sourceUrl: isUrl ? sub.textOrUrl : '',
        isExternalLink: sub.type === 'baglanti',
        apa: `${sub.name}. (${new Date().getFullYear()}). ${sub.title}. AkademikKapital.`
      };
      records.unshift(newRec);
      pendingSubmissions = pendingSubmissions.filter((s) => s.id !== sub.id);
      saveArchive();
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingSubmissions));
      populateFilterOptions();
      renderPendingQueue();
      renderAdminRecordsList();
      renderArchive();
      showToast('Gönderim onaylandı ve arşive eklendi.');
    }

    if (rejectBtn) {
      pendingSubmissions = pendingSubmissions.filter((s) => s.id !== rejectBtn.dataset.id);
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingSubmissions));
      renderPendingQueue();
      showToast('Gönderim kuyruktan kaldırıldı.');
    }
  });

  // Yayımlanmış Kayıtları Yönet
  function renderAdminRecordsList() {
    const listBox = document.getElementById('adminRecordsList');
    if (!listBox) return;

    if (records.length === 0) {
      listBox.innerHTML = '<p>Henüz yayımlanmış kayıt yok.</p>';
      return;
    }

    listBox.innerHTML = records
      .map(
        (rec) => `
        <div class="admin-record-row">
          <div class="admin-record-info">
            <strong>${escapeHtml(rec.title)}</strong>
            <span>${escapeHtml(TYPE_LABELS[rec.type] || rec.type)} • ${escapeHtml(formatDateTr(rec.date))}</span>
          </div>
          <div class="admin-record-btns">
            <button type="button" class="btn-secondary js-edit-record" data-id="${escapeHtml(rec.id)}">Düzenle</button>
            <button type="button" class="btn-danger-ghost js-delete-record" data-id="${escapeHtml(rec.id)}">Sil</button>
          </div>
        </div>
      `
      )
      .join('');
  }

  document.getElementById('adminRecordsList').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.js-edit-record');
    const delBtn = e.target.closest('.js-delete-record');

    if (editBtn) {
      const rec = records.find((r) => r.id === editBtn.dataset.id);
      if (!rec) return;
      adminEditIdInput.value = rec.id;
      document.getElementById('admTitle').value = rec.title || '';
      document.getElementById('admCategory').value = rec.type || 'makale';
      document.getElementById('admDate').value = rec.date || '';
      document.getElementById('admAuthor').value = rec.author || '';
      document.getElementById('admSource').value = rec.source || '';
      document.getElementById('admTopic').value = rec.topic || '';
      document.getElementById('admDocMeta').value = rec.docMeta || '';
      document.getElementById('admSourceUrl').value = rec.sourceUrl || '';
      document.getElementById('admSummary').value = rec.summary || '';
      document.getElementById('admBody').value = Array.isArray(rec.body) ? rec.body.join('\n\n') : (rec.body || '');
      document.getElementById('admFeatured').checked = Boolean(rec.featured);
      setImagePreviewForEdit(rec.imageUrl || '');

      saveRecordBtn.textContent = 'Değişiklikleri Güncelle';
      cancelAdminEditBtn.classList.remove('hidden');
      document.getElementById('admTitle').focus();
    }

    if (delBtn) {
      records = records.filter((r) => r.id !== delBtn.dataset.id);
      saveArchive();
      populateFilterOptions();
      renderAdminRecordsList();
      renderArchive();
      showToast('Kayıt arşivden silindi.');
    }
  });

  function resetAdminForm() {
    adminRecordForm.reset();
    adminEditIdInput.value = '';
    setImagePreviewForEdit('');
    saveRecordBtn.textContent = 'Arşive Kaydet';
    cancelAdminEditBtn.classList.add('hidden');
  }

  cancelAdminEditBtn.addEventListener('click', resetAdminForm);

  adminRecordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = adminEditIdInput.value;
    const isFeatured = document.getElementById('admFeatured').checked;
    if (isFeatured) {
      records.forEach((r) => {
        r.featured = false;
      });
    }

    const title = document.getElementById('admTitle').value.trim();
    const type = document.getElementById('admCategory').value;
    const author = document.getElementById('admAuthor').value.trim();
    const source = document.getElementById('admSource').value.trim();
    const date = document.getElementById('admDate').value || new Date().toISOString().slice(0, 10);
    const topic = document.getElementById('admTopic').value.trim() || 'Genel';
    const docMeta = document.getElementById('admDocMeta').value.trim();
    const sourceUrl = document.getElementById('admSourceUrl').value.trim();
    const summary = document.getElementById('admSummary').value.trim();
    const bodyText = document.getElementById('admBody').value.trim();
    const finalImageUrl = pendingUploadedImageDataUrl || admExistingImageInput.value || '';
    const todayIso = new Date().toISOString().slice(0, 10);

    if (editId) {
      const idx = records.findIndex((r) => r.id === editId);
      if (idx !== -1) {
        records[idx] = {
          ...records[idx],
          type,
          featured: isFeatured,
          title,
          summary,
          body: bodyText.split(/\n+/).filter(Boolean),
          imageUrl: finalImageUrl,
          author,
          source,
          date,
          updatedAt: todayIso,
          topic,
          docMeta,
          sourceUrl,
          isExternalLink: type === 'baglanti',
          apa: `${author}. (${date.slice(0, 4)}). ${title}. ${source}. AkademikKapital.`
        };
      }
      showToast('Kayıt güncellendi.');
    } else {
      const newItem = {
        id: `ak-${Date.now()}`,
        type,
        featured: isFeatured,
        title,
        summary,
        body: bodyText.split(/\n+/).filter(Boolean),
        imageUrl: finalImageUrl,
        author,
        source,
        date,
        updatedAt: todayIso,
        topic,
        docMeta,
        sourceUrl,
        isExternalLink: type === 'baglanti',
        apa: `${author}. (${date.slice(0, 4)}). ${title}. ${source}. AkademikKapital.`
      };
      records.unshift(newItem);
      showToast('Yeni kayıt arşive eklendi.');
    }

    saveArchive();
    populateFilterOptions();
    renderAdminRecordsList();
    renderArchive();
    resetAdminForm();
  });

  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'akademikkapital-arsiv.json';
    a.click();
  });

  function saveArchive() {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(records));
    fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: records })
    }).catch(() => {});
  }

  // =========================================================================
  // Arama, Sıralama ve Filtre Olayları
  // =========================================================================
  searchInput.addEventListener('input', () => {
    state.q = searchInput.value;
    state.visibleLimit = PAGE_SIZE;
    syncUrlState();
    renderArchive();
  });

  sortSelect.addEventListener('change', () => {
    state.sira = sortSelect.value;
    syncUrlState();
    renderArchive();
  });

  yearFilter.addEventListener('change', () => {
    state.year = yearFilter.value;
    state.visibleLimit = PAGE_SIZE;
    renderArchive();
  });

  topicFilter.addEventListener('change', () => {
    state.topic = topicFilter.value;
    state.visibleLimit = PAGE_SIZE;
    renderArchive();
  });

  resetFiltersBtn.addEventListener('click', () => {
    state.q = '';
    state.tab = 'tumu';
    state.year = 'ALL';
    state.topic = 'ALL';
    state.sira = 'newest';
    state.visibleLimit = PAGE_SIZE;
    searchInput.value = '';
    sortSelect.value = 'newest';
    yearFilter.value = 'ALL';
    topicFilter.value = 'ALL';
    updateTabUi('tumu');
    syncUrlState();
    renderArchive();
  });

  loadMoreBtn.addEventListener('click', () => {
    state.visibleLimit += PAGE_SIZE;
    renderArchive();
  });

  // =========================================================================
  // Yardımcılar
  // =========================================================================
  function openDialog(dlg) {
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
  }

  function closeDialog(dlg) {
    if (dlg && typeof dlg.close === 'function') dlg.close();
  }

  document.querySelectorAll('[data-close-dialog]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeDialog(document.getElementById(btn.dataset.closeDialog));
    });
  });

  function estimateReadTime(item) {
    const words = [item.title, item.summary, ...(item.body || [])]
      .join(' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const mins = Math.max(1, Math.round(words / 200));
    return `${mins} dk okuma`;
  }

  function formatDateTr(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  async function copyToClipboard(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(okMsg);
    } catch (_) {
      showToast(text);
    }
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('liveToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 3000);
  }

  initApp();
});
