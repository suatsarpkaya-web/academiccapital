/**
 * AkademikKapital — Yükseköğretim Arşivi İstemci Uygulaması
 * İçerir:
 * 1. Öncelik 1: Backspace tuşuna uzun basınca sayfadan geri gitme koruması + beforeunload uyarısı
 * 2. Öncelik 2: Dosya yükleme yerine Doküman Adı + İndirme Bağlantısı (URL) yapısı
 * 3. Öncelik 3: Profil logosu ve site ismi tıklanınca ana sayfaya yönlendirme
 * 4. Öncelik 4: iOS Safari modal scroll kilidi ve güvenli görüntüleme
 * 5. Öncelik 5: Haftalık özet e-posta bülteni abonelik akışı (/api/newsletter)
 * 6. Öncelik 6: Görselli sosyal medya paylaşımı (Web Share API, WhatsApp, Telegram, X, LinkedIn, Facebook, Instagram kart indirme + OG etiketleri)
 */

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'akademikkapital_archive_v2';
  const ADMIN_PASS = 'akademik2026';

  const CATEGORY_LABELS = {
    makale: 'Makale',
    haberler: 'Haberler',
    duyurular: 'Duyurular',
    dokuman: 'Doküman Arşivi',
    baglanti: 'Dış Bağlantılar'
  };

  let items = [];
  let activeSection = 'tumu';
  let activeYear = 'ALL';
  let isAdminAuthenticated = false;
  let isFormDirty = false;
  let currentShareItem = null;

  // DOM Referansları
  const contentList = document.getElementById('contentList');
  const emptyState = document.getElementById('emptyState');
  const listTitle = document.getElementById('listTitle');
  const listCount = document.getElementById('listCount');
  const yearChips = document.getElementById('yearChips');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const viewArchive = document.getElementById('viewArchive');
  const viewAbout = document.getElementById('viewAbout');
  const mainNav = document.getElementById('mainNav');
  const menuToggle = document.getElementById('menuToggle');
  const toastEl = document.getElementById('toast');

  // Diyaloglar
  const readerDialog = document.getElementById('readerDialog');
  const shareDialog = document.getElementById('shareDialog');
  const loginDialog = document.getElementById('loginDialog');
  const adminDialog = document.getElementById('adminDialog');

  // Formlar
  const loginForm = document.getElementById('loginForm');
  const contentForm = document.getElementById('contentForm');
  const newsletterForm = document.getElementById('newsletterForm');

  // Alt bilgi yılı
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // =========================================================================
  // ÖNCELİK 1: BACKSPACE UZUN BASMA & SAYFA TERK KORUMASI
  // =========================================================================
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Backspace' && event.keyCode !== 8) return;

    const active = document.activeElement;
    if (!active) {
      event.preventDefault();
      return;
    }

    const tag = active.tagName;
    const isTextField = tag === 'INPUT' || tag === 'TEXTAREA';
    const isEditable = active.isContentEditable || active.getAttribute('contenteditable') === 'true';

    // Odak bir metin alanında değilse veya salt okunursa tarayıcı geri gitmesini engelle
    if (!isTextField && !isEditable) {
      event.preventDefault();
      return;
    }

    if (isTextField && (active.readOnly || active.disabled)) {
      event.preventDefault();
    }
  });

  // Düzenleme formu kirli durum takibi
  if (contentForm) {
    contentForm.addEventListener('input', () => {
      isFormDirty = true;
    });
  }

  window.addEventListener('beforeunload', (event) => {
    if (isFormDirty) {
      event.preventDefault();
      event.returnValue = 'Kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmak istediğinize emin misiniz?';
      return event.returnValue;
    }
  });

  // =========================================================================
  // ÖNCELİK 3: PROFİL FOTOĞRAFI VE SİTE İSMİ ANA SAYFA YÖNLENDİRMESİ
  // =========================================================================
  const siteLogoLink = document.getElementById('siteLogoLink');
  if (siteLogoLink) {
    siteLogoLink.addEventListener('click', (e) => {
      // Zaten ana sayfadaysa filtreleri sıfırlayıp başa al
      if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        e.preventDefault();
        activeSection = 'tumu';
        activeYear = 'ALL';
        searchInput.value = '';
        sortSelect.value = 'newest';
        updateNavActive('tumu');
        viewAbout.classList.add('hidden');
        viewArchive.classList.remove('hidden');
        window.history.replaceState({}, '', '/');
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // =========================================================================
  // ÖNCELİK 4: iOS SAFARİ DİYALOG / MODAL KİLİDİ VE MOBİL MENÜ
  // =========================================================================
  let scrollPosition = 0;

  function openDialog(dialog) {
    if (!dialog) return;
    scrollPosition = window.scrollY || window.pageYOffset;
    document.body.style.top = `-${scrollPosition}px`;
    document.body.classList.add('modal-open');
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPosition);

    if (dialog === adminDialog) {
      isFormDirty = false;
    }
  }

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-close');
      closeDialog(document.getElementById(id));
    });
  });

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // =========================================================================
  // VERİ YÜKLEME VE SENKRONİZASYON (/api/archive + localStorage Yedeği)
  // =========================================================================
  const DEFAULT_ITEMS = [
    {
      id: 'ak-101',
      title: 'Yükseköğretim Kurulu (YÖK) 2026 Kontenjan ve Program Planlama Raporu',
      category: 'dokuman',
      date: '2026-11-15',
      author: 'YÖK Veri ve Analiz Birimi',
      summary: 'Devlet ve vakıf yükseköğretim kurumlarındaki kontenjan değişimleri, doluluk oranları ve yeni açılan yapay zekâ temelli lisans programlarının değerlendirmesi.',
      content: 'Yükseköğretim Kurulu tarafından yayımlanan 2026 planlama verilerine göre araştırma üniversitelerinde lisansüstü ve disiplinlerarası programların payı artırılmıştır. Raporun tam metnine ve istatistik tablolarına aşağıdaki doküman bağlantısından ulaşabilirsiniz.',
      docName: 'YOK_2026_Kontenjan_ve_Program_Raporu.pdf',
      docUrl: 'https://www.yok.gov.tr',
      image: 'https://akademikkapital.vercel.app/og-cover.png',
      featured: true,
      pinned: true
    },
    {
      id: 'ak-102',
      title: 'Akademik Kapitalizm ve Üniversite Yönetişiminde Yeni Eğilimler',
      category: 'makale',
      date: '2026-11-10',
      author: 'AkademikKapital Araştırma Masası',
      summary: 'Küresel yükseköğretim sistemlerinde dijitalleşme, performans göstergeleri ve kurumsal özerklik dengesi üzerine karşılaştırmalı bir değerlendirme.',
      content: 'Çağdaş yükseköğretim kurumları bir yandan kamu yararı ve akademik özerklik ilkelerini korurken diğer yandan uluslararası rekabet ve kaynak çeşitliliği baskısı altında yeniden yapılanmaktadır.',
      docName: '',
      docUrl: '',
      image: 'https://akademikkapital.vercel.app/og-cover.png',
      featured: false,
      pinned: false
    }
  ];

  async function loadArchiveData() {
    try {
      const response = await fetch('/api/archive');
      if (response.ok) {
        const remoteData = await response.json();
        if (Array.isArray(remoteData) && remoteData.length > 0) {
          items = remoteData;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
          renderAll();
          checkUrlDeepLink();
          return;
        }
      }
    } catch (_) {
      // Sunucu erişilemezse yerel yedeğe geç
    }

    const cached = localStorage.getItem(STORAGE_KEY);
    items = cached ? JSON.parse(cached) : DEFAULT_ITEMS;
    renderAll();
    checkUrlDeepLink();
  }

  async function persistItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    try {
      await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
    } catch (_) {
      // Çevrimdışı durumda yerel kayıt korunur
    }
  }

  // =========================================================================
  // LİSTELEME, FİLTRELEME VE OKUYUCU
  // =========================================================================
  function getFilteredItems() {
    const q = searchInput.value.trim().toLowerCase();
    const sortBy = sortSelect.value;

    return items
      .filter((item) => {
        const matchSec = activeSection === 'tumu' || item.category === activeSection;
        const itemYear = (item.date || '').slice(0, 4);
        const matchYear = activeYear === 'ALL' || itemYear === activeYear;
        const matchQuery =
          !q ||
          (item.title || '').toLowerCase().includes(q) ||
          (item.author || '').toLowerCase().includes(q) ||
          (item.summary || '').toLowerCase().includes(q) ||
          (item.docName || '').toLowerCase().includes(q);
        return matchSec && matchYear && matchQuery;
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (sortBy === 'oldest') return (a.date || '').localeCompare(b.date || '');
        if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '', 'tr');
        return (b.date || '').localeCompare(a.date || '');
      });
  }

  function renderYearChips() {
    const years = Array.from(
      new Set(items.map((i) => (i.date || '').slice(0, 4)).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a));

    yearChips.innerHTML = [
      `<button type="button" class="year-chip ${activeYear === 'ALL' ? 'active' : ''}" data-year="ALL">Tüm Yıllar</button>`,
      ...years.map(
        (yr) =>
          `<button type="button" class="year-chip ${activeYear === yr ? 'active' : ''}" data-year="${yr}">${yr}</button>`
      )
    ].join('');
  }

  function renderAll() {
    renderYearChips();
    const filtered = getFilteredItems();

    listTitle.textContent =
      activeSection === 'tumu'
        ? 'Tüm Arşiv Kayıtları'
        : CATEGORY_LABELS[activeSection] || 'Arşiv';
    listCount.textContent = `${filtered.length} içerik`;

    if (filtered.length === 0) {
      contentList.innerHTML = '';
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      contentList.innerHTML = filtered
        .map((item) => {
          const catLabel = CATEGORY_LABELS[item.category] || item.category;
          // Öncelik 2: Doküman Adı + İndirme Bağlantısı (URL) gösterimi
          const docBlock = item.docUrl
            ? `<div class="card-doc-pill">
                <span title="${escapeHtml(item.docName || 'Doküman')}">📄 ${escapeHtml(item.docName || 'Doküman Bağlantısı')}</span>
                <a href="${escapeHtml(item.docUrl)}" target="_blank" rel="noopener noreferrer">İndir / Aç ↗</a>
              </div>`
            : '';

          return `
            <article class="content-card" data-id="${escapeHtml(item.id)}">
              <div>
                <div class="card-top">
                  <span class="badge">${escapeHtml(catLabel)}</span>
                  <span class="card-date">${formatDate(item.date)}</span>
                </div>
                <h2 class="card-title">${escapeHtml(item.title)}</h2>
                ${item.author ? `<div class="card-author">${escapeHtml(item.author)}</div>` : ''}
                <p class="card-summary">${escapeHtml(item.summary || '')}</p>
                ${docBlock}
              </div>
              <div class="card-actions">
                <button type="button" class="btn btn-primary btn-sm js-read-btn">İncele</button>
                <button type="button" class="btn btn-secondary btn-sm js-share-btn">Paylaş</button>
              </div>
            </article>
          `;
        })
        .join('');
    }

    renderAdminTable();
  }

  contentList.addEventListener('click', (e) => {
    const card = e.target.closest('.content-card');
    if (!card) return;
    const item = items.find((x) => x.id === card.dataset.id);
    if (!item) return;

    if (e.target.closest('.js-read-btn')) {
      openReader(item);
    } else if (e.target.closest('.js-share-btn')) {
      openShare(item);
    }
  });

  yearChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.year-chip');
    if (!chip) return;
    activeYear = chip.dataset.year;
    renderAll();
  });

  function openReader(item) {
    document.getElementById('readerCategoryBadge').textContent =
      CATEGORY_LABELS[item.category] || item.category;

    const docHtml = item.docUrl
      ? `<div class="card-doc-pill">
          <span>📄 ${escapeHtml(item.docName || 'İlgili Doküman')}</span>
          <a href="${escapeHtml(item.docUrl)}" target="_blank" rel="noopener noreferrer">Dokümanı İndir / Görüntüle ↗</a>
        </div>`
      : '';

    document.getElementById('readerContent').innerHTML = `
      <h1>${escapeHtml(item.title)}</h1>
      <div class="reader-meta">${escapeHtml(item.author || 'AkademikKapital')} • ${formatDate(item.date)}</div>
      ${docHtml}
      <div class="reader-text">${escapeHtml(item.content || item.summary || '')}</div>
    `;

    updateOpenGraphMeta(item);
    document.getElementById('readerShareBtn').onclick = () => openShare(item);
    openDialog(readerDialog);
  }

  function checkUrlDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    const found = items.find((i) => i.id === id);
    if (found) openReader(found);
  }

  // =========================================================================
  // ÖNCELİK 6: GÖRSELLİ SOSYAL MEDYA PAYLAŞIM MODÜLÜ & DİNAMİK OG ETİKETLERİ
  // =========================================================================
  function updateOpenGraphMeta(item) {
    const shareUrl = `${window.location.origin}/?id=${encodeURIComponent(item.id)}`;
    const imageUrl = item.image || `${window.location.origin}/og-cover.png`;

    const ogTitle = document.getElementById('ogTitle');
    const ogDesc = document.getElementById('ogDesc');
    const ogImage = document.getElementById('ogImage');
    const ogUrl = document.getElementById('ogUrl');

    if (ogTitle) ogTitle.setAttribute('content', `${item.title} — AkademikKapital`);
    if (ogDesc) ogDesc.setAttribute('content', item.summary || item.title);
    if (ogImage) ogImage.setAttribute('content', imageUrl);
    if (ogUrl) ogUrl.setAttribute('content', shareUrl);
  }

  function openShare(item) {
    currentShareItem = item;
    updateOpenGraphMeta(item);

    const previewImg = document.getElementById('sharePreviewImg');
    if (item.image) {
      previewImg.src = item.image;
      previewImg.classList.remove('hidden');
    } else {
      previewImg.classList.add('hidden');
    }

    document.getElementById('sharePreviewTitle').textContent = item.title;
    document.getElementById('sharePreviewDesc').textContent = item.summary || '';

    openDialog(shareDialog);
  }

  function getSharePayload(item) {
    const url = `${window.location.origin}/?id=${encodeURIComponent(item.id)}`;
    const text = `${item.title}${item.summary ? ' — ' + item.summary : ''}`;
    return { url, text, title: item.title };
  }

  document.getElementById('shareNativeBtn').addEventListener('click', async () => {
    if (!currentShareItem) return;
    const { url, text, title } = getSharePayload(currentShareItem);
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (_) {}
    } else {
      showToast('Tarayıcınız yerel paylaşımı desteklemiyor; aşağıdaki platformları kullanabilirsiniz.');
    }
  });

  document.getElementById('shareWhatsappBtn').addEventListener('click', () => {
    if (!currentShareItem) return;
    const { url, text } = getSharePayload(currentShareItem);
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank', 'noopener');
  });

  document.getElementById('shareTelegramBtn').addEventListener('click', () => {
    if (!currentShareItem) return;
    const { url, text } = getSharePayload(currentShareItem);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  document.getElementById('shareXBtn').addEventListener('click', () => {
    if (!currentShareItem) return;
    const { url, text } = getSharePayload(currentShareItem);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener');
  });

  document.getElementById('shareLinkedinBtn').addEventListener('click', () => {
    if (!currentShareItem) return;
    const { url } = getSharePayload(currentShareItem);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'noopener');
  });

  document.getElementById('shareFacebookBtn').addEventListener('click', () => {
    if (!currentShareItem) return;
    const { url } = getSharePayload(currentShareItem);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
  });

  // Instagram yedek 1: Bağlantıyı Kopyala
  document.getElementById('shareCopyLinkBtn').addEventListener('click', async () => {
    if (!currentShareItem) return;
    const { url } = getSharePayload(currentShareItem);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Paylaşım bağlantısı panoya kopyalandı.');
    } catch (_) {
      showToast(url);
    }
  });

  // Instagram yedek 2: Görseli İndir (Varsa görseli indirir, yoksa marka kartı oluşturur)
  document.getElementById('shareDownloadImgBtn').addEventListener('click', () => {
    if (!currentShareItem) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Saman kağıdı arka plan
    ctx.fillStyle = '#F6F2E6';
    ctx.fillRect(0, 0, 1080, 1080);

    // Lacivert çerçeve
    ctx.strokeStyle = '#142642';
    ctx.lineWidth = 16;
    ctx.strokeRect(40, 40, 1000, 1000);

    // Üst marka başlığı
    ctx.fillStyle = '#142642';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText('AKADEMİKKAPİTAL', 90, 140);

    ctx.fillStyle = '#B5493E';
    ctx.font = 'italic 26px sans-serif';
    ctx.fillText('Akademinin hafızası, yükseköğretimin pusulası', 90, 185);

    // Kategori etiketi
    ctx.fillStyle = '#142642';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText((CATEGORY_LABELS[currentShareItem.category] || 'ARŞİV').toUpperCase(), 90, 270);

    // Başlık metni
    ctx.fillStyle = '#142642';
    ctx.font = 'bold 46px Georgia, serif';
    wrapCanvasText(ctx, currentShareItem.title, 90, 350, 900, 62);

    // Alt bilgi
    ctx.fillStyle = '#4E5B6E';
    ctx.font = '26px sans-serif';
    ctx.fillText(`${currentShareItem.author || 'AkademikKapital'} • ${formatDate(currentShareItem.date)}`, 90, 940);
    ctx.fillText('akademikkapital.vercel.app', 90, 985);

    const link = document.createElement('a');
    link.download = `akademikkapital-${currentShareItem.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Paylaşım görseli indirildi.');
  });

  // =========================================================================
  // ÖNCELİK 5: HAFTALIK ÖZET E-POSTA BÜLTENİ ABONELİĞİ
  // =========================================================================
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('newsletterEmail');
      const consentInput = document.getElementById('newsletterConsent');
      const feedback = document.getElementById('newsletterFeedback');
      const submitBtn = document.getElementById('newsletterSubmitBtn');

      const email = emailInput.value.trim();
      feedback.className = 'newsletter-feedback';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        feedback.classList.add('error');
        feedback.textContent = 'Lütfen geçerli bir e-posta adresi giriniz.';
        return;
      }

      if (!consentInput.checked) {
        feedback.classList.add('error');
        feedback.textContent = 'Devam etmek için gizlilik ve gönderim onayını işaretlemelisiniz.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Kaydediliyor...';

      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Abonelik kaydı tamamlanamadı.');
        }

        feedback.classList.add('success');
        feedback.textContent = data.message || 'Haftalık özet bültenine kaydınız alındı.';
        newsletterForm.reset();
      } catch (err) {
        feedback.classList.add('error');
        feedback.textContent = err.message;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Abone Ol';
      }
    });
  }

  // =========================================================================
  // NAVİGASYON VE YÖNETİM PANELİ (ÖNCELİK 2: DOKÜMAN ADI + URL)
  // =========================================================================
  function updateNavActive(section) {
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.section === section);
    });
  }

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sec = link.dataset.section;
      updateNavActive(sec);
      mainNav.classList.remove('open');

      if (sec === 'hakkimizda') {
        viewArchive.classList.add('hidden');
        viewAbout.classList.remove('hidden');
      } else {
        activeSection = sec;
        viewAbout.classList.add('hidden');
        viewArchive.classList.remove('hidden');
        renderAll();
      }
    });
  });

  document.getElementById('adminBtn').addEventListener('click', () => {
    if (isAdminAuthenticated) {
      openDialog(adminDialog);
    } else {
      openDialog(loginDialog);
    }
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('adminPassword').value;
    if (pass === ADMIN_PASS) {
      isAdminAuthenticated = true;
      loginForm.reset();
      closeDialog(loginDialog);
      openDialog(adminDialog);
      showToast('Yönetici oturumu açıldı.');
    } else {
      showToast('Hatalı yönetici şifresi.');
    }
  });

  document.getElementById('logoutAdminBtn').addEventListener('click', () => {
    isAdminAuthenticated = false;
    closeDialog(adminDialog);
    showToast('Yönetici oturumu kapatıldı.');
  });

  // Panel sekmeleri
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // İçerik ekleme / güncelleme (Dosya yükleme yok, yalnızca Doküman Adı + URL)
  contentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editItemId').value;
    const docUrl = document.getElementById('docUrl').value.trim();
    const docName = document.getElementById('docName').value.trim();

    if (docUrl && !/^https?:\/\/.+/i.test(docUrl)) {
      showToast('Doküman bağlantısı http:// veya https:// ile başlamalıdır.');
      return;
    }

    const record = {
      id: editId || `ak-${Date.now()}`,
      title: document.getElementById('itemTitle').value.trim(),
      category: document.getElementById('itemCategory').value,
      date: document.getElementById('itemDate').value,
      author: document.getElementById('itemAuthor').value.trim(),
      summary: document.getElementById('itemSummary').value.trim(),
      content: document.getElementById('itemContent').value.trim(),
      docName,
      docUrl,
      image: document.getElementById('itemImage').value.trim(),
      featured: document.getElementById('itemFeatured').checked,
      pinned: document.getElementById('itemPinned').checked
    };

    if (editId) {
      const idx = items.findIndex((x) => x.id === editId);
      if (idx !== -1) items[idx] = record;
    } else {
      items.unshift(record);
    }

    isFormDirty = false;
    resetContentForm();
    await persistItems();
    renderAll();
    showToast(editId ? 'İçerik güncellendi.' : 'Yeni içerik yayınlandı.');
  });

  function resetContentForm() {
    contentForm.reset();
    document.getElementById('editItemId').value = '';
    document.getElementById('formTitle').textContent = 'Yeni İçerik Ekle';
    document.getElementById('cancelEditBtn').classList.add('hidden');
    isFormDirty = false;
  }

  document.getElementById('cancelEditBtn').addEventListener('click', resetContentForm);

  function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;
    const q = (document.getElementById('adminSearchInput')?.value || '').toLowerCase().trim();

    tbody.innerHTML = items
      .filter((i) => !q || i.title.toLowerCase().includes(q))
      .map(
        (item) => `
        <tr>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(CATEGORY_LABELS[item.category] || item.category)}</td>
          <td>${escapeHtml(item.date || '')}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm js-admin-edit" data-id="${escapeHtml(item.id)}">Düzenle</button>
            <button type="button" class="btn btn-danger btn-sm js-admin-del" data-id="${escapeHtml(item.id)}">Sil</button>
          </td>
        </tr>
      `
      )
      .join('');
  }

  document.getElementById('adminTableBody').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.js-admin-edit');
    const delBtn = e.target.closest('.js-admin-del');

    if (editBtn) {
      const item = items.find((x) => x.id === editBtn.dataset.id);
      if (!item) return;

      document.getElementById('editItemId').value = item.id;
      document.getElementById('itemTitle').value = item.title || '';
      document.getElementById('itemCategory').value = item.category || 'makale';
      document.getElementById('itemDate').value = item.date || '';
      document.getElementById('itemAuthor').value = item.author || '';
      document.getElementById('itemSummary').value = item.summary || '';
      document.getElementById('itemContent').value = item.content || '';
      document.getElementById('docName').value = item.docName || '';
      document.getElementById('docUrl').value = item.docUrl || '';
      document.getElementById('itemImage').value = item.image || '';
      document.getElementById('itemFeatured').checked = Boolean(item.featured);
      document.getElementById('itemPinned').checked = Boolean(item.pinned);

      document.getElementById('formTitle').textContent = 'İçeriği Düzenle';
      document.getElementById('cancelEditBtn').classList.remove('hidden');
      document.querySelector('[data-tab="adminTabNew"]').click();
      isFormDirty = false;
    }

    if (delBtn) {
      items = items.filter((x) => x.id !== delBtn.dataset.id);
      await persistItems();
      renderAll();
      showToast('Kayıt silindi.');
    }
  });

  // JSON Dışa / İçe Aktar
  document.getElementById('exportDataBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `akademikkapital-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });

  document.getElementById('importJsonInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error('Geçersiz JSON formatı.');
        items = parsed;
        await persistItems();
        renderAll();
        showToast('Yedek başarıyla yüklendi.');
      } catch (err) {
        showToast(err.message);
      }
    };
    reader.readAsText(file);
  });

  // Arama ve sıralama dinleyicileri
  searchInput.addEventListener('input', renderAll);
  sortSelect.addEventListener('change', renderAll);
  document.getElementById('adminSearchInput')?.addEventListener('input', renderAdminTable);

  // Yardımcılar
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text || '').split(' ');
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), x, y);
        line = words[i] + ' ';
        y += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), x, y);
  }

  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  loadArchiveData();
});
