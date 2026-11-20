# AkademikKapital — Yükseköğretim Arşivi

Türkiye ve dünyadaki yükseköğretim politikalarını, mevzuat ve kurum duyurularını, dokümanları ve doğrulanmış dış bağlantıları tarih sırasıyla bir araya getiren reklamsız dijital yayın arşivi[cite: 1].

![AkademikKapital Ana Sayfa Görünümü](docs/ekran-goruntusu.png)

## Öne Çıkan Özellikler

- **Kategorize Arşiv:** *Tümü*, *Makale*, *Haberler*, *Duyurular*, *Doküman Arşivi*, *Dış Bağlantılar* ve *Hakkımızda* bölümleri[cite: 1].
- **Arama ve Filtreleme:** Başlık, özet, metin ve kaynak üzerinden anlık arama; yıl bazlı süzme ve kronolojik sıralama (`Yeniden eskiye` / `Eskiden yeniye`)[cite: 1, 2].
- **Yerel Depolama (IndexedDB):** İçerikler, yüklenen dosyalar/görseller ve site ayarları tarayıcı üzerinde `items`, `files` ve `settings` depolarında saklanır[cite: 2].
- **Editör Paneli:** İçerik ekleme/düzenleme/silme, kapak ve metin içi (`[[GÖRSEL:n]]`) görsel yerleştirme, ham metin temizleme/aktarma, logo yönetimi ve **Bizi Takip Edin** sosyal medya bağlantıları ayarı[cite: 1, 2].
- **Yedekleme ve Geri Yükleme:** Mevcut kayıtları koruyarak çalışan `.json` dışa/içe aktarma desteği[cite: 1, 2].

## Proje Yapısı

- `index.html` — Sayfa iskeleti, kategoriler, okuyucu diyaloğu ve editör paneli[cite: 1]
- `style.css` — Saman kağıdı (`#F6F2E6`), lacivert (`#142642`) ve kurşun kalem kırmızısı (`#B5493E`) tasarım stilleri[cite: 3]
- `script.js` — IndexedDB katmanı, arama/filtreleme, okuyucu penceresi, editör işlemleri ve yedekleme mantığı[cite: 2]

## Çalıştırma

Herhangi bir derleme veya sunucu bağımlılığı yoktur; dosyaları doğrudan bir tarayıcıda açabilir veya yerel bir statik sunucu üzerinden çalıştırabilirsiniz[cite: 1, 2].

## İletişim

Katkı, öneri ve yayın başvuruları için: [akademikkapital@gmail.com](mailto:akademikkapital@gmail.com)[cite: 1]
