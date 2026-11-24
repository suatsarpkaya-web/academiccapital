/**
 * AkademikKapital — Yükseköğretim Yayın ve Veri Arşivi (Vanilla JS)
 * Özellikler:
 * - Tek veri kaynağı (JSON verisi + /api/archive + localStorage)
 * - Sıralama: Yalnızca Yeniden Eskiye (newest) ve Eskiden Yeniye (oldest)
 * - Geniş Yönetim Paneli: Yazı ekleme, düzenleme, silme ve editör onay kuyruğu ("Yayın Niteliği" kaldırıldı)
 * - Bülten aboneliği kaldırıldı; sade açık erişim arşiv kurgusu
 */

document.addEventListener('DOMContentLoaded', () => {
  const ARCHIVE_STORAGE_KEY = 'ak_archive_records_v5';
  const PENDING_STORAGE_KEY = 'ak_pending_submissions_v5';
  const ADMIN_PASSCODE = 'akademik2026';
  const PAGE_SIZE = 6;

  const TYPE_LABELS = {
    makale: 'Makale',
    haberler: 'Haberler',
    duyurular: 'Duyurular',
    dokuman: 'Doküman Arşivi',
    baglanti: 'Dış Bağlantılar'
  };

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
  // Geniş Yönetim Paneli: Yazı Ekleme, Düzenleme, Silme ve Onay Kuyruğu
  // =========================================================================
  const adminDialog = document.getElementById('adminDialog');
  const adminRecordForm = document.getElementById('adminRecordForm');
  const adminEditIdInput = document.getElementById('adminEditId');
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
      renderPendingQueue();
      renderAdminRecordsList();
    } else {
      showToast('Yönetici parolası hatalı.');
    }
  });

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
