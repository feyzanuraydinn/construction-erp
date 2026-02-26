# İnşaat ERP Sistemi

İnşaat firmaları için geliştirilmiş kapsamlı masaüstü ERP uygulaması. Cari hesapları, projeleri, stok ve finansal işlemleri tek bir arayüzden yönetin.

![Uygulama Önizlemesi](construction-erp.gif)

**[English README](README.md)**

## Özellikler

### Temel Modüller
- **Cari Hesap Yönetimi** - Firma takibi (müşteri, tedarikçi, taşeron, yatırımcı), çoklu para birimi desteği (TRY, USD, EUR)
- **Proje Yönetimi** - Proje bazlı gelir/gider takibi, taraf atamaları, karlılık analizi
- **Stok & Envanter** - Malzeme yönetimi, stok hareketleri (giriş/çıkış/düzeltme/fire), düşük stok uyarıları
- **Finansal İşlemler** - Faturalar, ödemeler, ödeme-fatura eşleştirmeleri, belge takibi
- **Analiz Paneli** - İnteraktif grafikler (çubuk, pasta, çizgi), finansal özetler, nakit akış analizi

### Ek Özellikler
- **Veri Dışa Aktarım** - Tüm tablolar için Excel (XLSX) ve PDF dışa aktarım
- **Bulut Yedekleme** - Google Drive entegrasyonu, şifreli yedekleme/geri yükleme ve otomatik senkronizasyon
- **Çöp Kutusu** - Tüm varlıklar için yumuşak silme ve tek tıkla geri getirme
- **Çoklu Dil** - Uygulama genelinde tam Türkçe ve İngilizce desteği (ana süreç diyalogları dahil)
- **Karanlık Mod** - Açık, koyu ve sisteme uyumlu tema seçenekleri
- **Komut Paleti** - Ctrl+K ile hızlı gezinme
- **Yazdırma** - İşlemler ve raporlar için baskıya hazır görünümler
- **Otomatik Güncelleme** - Yerleşik güncelleme kontrolü, indirme ve kurulum

## Teknoloji Yığını

| Kategori | Teknoloji |
|----------|-----------|
| Arayüz | React 18, TypeScript (strict), Tailwind CSS 3 |
| Masaüstü | Electron 40 |
| Veritabanı | SQL.js (WebAssembly ile SQLite) |
| Derleme | Vite 7 |
| Grafikler | Recharts 2 |
| Formlar | React Hook Form 7 + Zod 4 |
| Çoklu Dil | i18next + react-i18next |
| Test | Vitest (692 birim test, 45 dosya), Playwright (E2E) |
| Bulut | Google Drive API (@googleapis/drive) |

## Başlangıç

### Gereksinimler

- Node.js 18+
- npm 9+

### Geliştirme

```bash
git clone https://github.com/feyzanuraydinn/construction-erp.git
cd construction-erp
npm install
npm run dev
```

### Üretim Derlemesi

```bash
# Tam derleme: derleme + paketleme + yükleyici
npm run build

# Çıktı: dist/Construction ERP Setup 3.0.0.exe
```

### Kullanılabilir Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme modunu başlat (Vite + Electron) |
| `npm run build` | Tam üretim derlemesi ve yükleyici |
| `npm run build:react` | Sadece React arayüzü derle (Vite) |
| `npm run build:electron` | Sadece Electron ana süreci derle |
| `npm test` | Birim testlerini çalıştır (Vitest) |
| `npm run test:e2e` | E2E testlerini çalıştır (Playwright) |
| `npm run test:coverage` | Kapsam raporlu test çalıştır |
| `npm run test:ui` | Vitest arayüzünü aç |
| `npm run lint` | ESLint çalıştır |
| `npm run format` | Prettier ile kod formatla |

## Mimari

### Proje Yapısı

```
src/
├── main/                    # Electron ana süreci
│   ├── ipc/                 # 12 IPC işleyici modülü
│   │   ├── safeHandle.ts    # Hata sanitize eden IPC sarmalayıcı
│   │   ├── appHandlers.ts
│   │   ├── companyHandlers.ts
│   │   ├── projectHandlers.ts
│   │   ├── transactionHandlers.ts
│   │   ├── materialHandlers.ts
│   │   ├── exportHandlers.ts
│   │   ├── gdriveHandlers.ts
│   │   ├── backupHandlers.ts
│   │   ├── categoryHandlers.ts
│   │   ├── dashboardHandlers.ts
│   │   └── trashHandlers.ts
│   ├── i18n.ts              # Ana süreç çoklu dil (ortak locale dosyaları)
│   ├── googleDrive.ts       # Google Drive OAuth2 & senkronizasyon
│   ├── autoUpdater.ts       # Otomatik güncelleme yöneticisi
│   ├── preload.ts           # Context köprüsü (renderer ↔ main)
│   └── main.ts              # Uygulama giriş noktası
├── pages/                   # 11 sayfa (tümü lazy-loaded)
│   ├── Dashboard.tsx        # Genel bakış paneli
│   ├── Companies.tsx        # Firma listesi
│   ├── CompanyDetail.tsx    # Firma detayı
│   ├── CompanyAccount.tsx   # Cari hesap ekstresi
│   ├── Projects.tsx         # Proje listesi
│   ├── ProjectDetail.tsx    # Proje detayı
│   ├── Transactions.tsx     # İşlem listesi
│   ├── Stock.tsx            # Stok yönetimi
│   ├── Analytics.tsx        # Analiz & grafikler
│   ├── Settings.tsx         # Ayarlar
│   ├── Trash.tsx            # Çöp kutusu
│   ├── analytics-components/
│   ├── transactions-components/
│   └── project-detail/
├── components/
│   ├── ui/                  # 15 UI temel bileşen
│   ├── modals/              # 6 CRUD modal
│   └── shared/              # Sidebar, Layout, PrintView
├── database/
│   ├── DatabaseService.ts   # SQLite başlatma, migrasyonlar
│   └── repositories/        # 8 özelleşmiş repository
│       ├── BaseRepository.ts
│       ├── CompanyRepository.ts
│       ├── ProjectRepository.ts
│       ├── TransactionRepository.ts
│       ├── MaterialRepository.ts
│       ├── CategoryRepository.ts
│       ├── AnalyticsRepository.ts
│       ├── TrashRepository.ts
│       └── PaymentAllocationRepository.ts
├── hooks/                   # 10 özel hook
│   ├── useCRUDPage.ts       # Genel CRUD sayfa mantığı
│   ├── useTransactionList.ts
│   ├── useDataCache.ts      # LRU önbellek (100 giriş, 5dk TTL)
│   ├── usePagination.ts
│   ├── useSelection.ts
│   ├── useBulkDelete.ts
│   ├── useExport.ts
│   ├── usePrint.ts
│   ├── useKeyboardShortcuts.ts
│   └── useDebounce.ts
├── contexts/                # Toast, Theme
├── i18n/
│   └── locales/             # tr.json, en.json (her biri ~1200 anahtar)
├── utils/
│   ├── schemas.ts           # 11 Zod doğrulama şeması
│   ├── formatters.ts
│   ├── security.ts
│   ├── exportUtils.ts
│   ├── financials.ts
│   ├── transactionHelpers.ts
│   └── constants.ts
└── types/                   # Merkezi TypeScript tip tanımları
```

### Tasarım Kalıpları

- **Repository Kalıbı** - `BaseRepository` + 8 özelleşmiş repository ile izole veri erişimi
- **Genel CRUD Hook** - `useCRUDPage<T>` hook'u Firmalar, Projeler, Stok sayfalarında ortak kullanım
- **Hata Sanitizasyonu** - `safeHandle` IPC sarmalayıcı, dahili DB detaylarını hata mesajlarından temizler
- **Tembel Yükleme** - 11 sayfa `React.lazy` ile, her birinde `ErrorBoundary`
- **LRU Önbellek** - `useDataCache` ile maksimum 100 giriş ve 5 dakika TTL
- **Şema Tabanlı Tipler** - Form tipleri Zod şemalarından türetilir (`z.input<>` / `z.infer<>`)

## Güvenlik

- **Context İzolasyonu** - `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- **İçerik Güvenlik Politikası** - Üretimde sıkı CSP, geliştirmede esnek
- **Parametreli Sorgular** - Tüm SQL sorguları `?` yer tutucu kullanır (SQL enjeksiyon önleme)
- **Hata Sanitizasyonu** - `safeHandle` sarmalayıcı, DB şema bilgilerinin renderer'a sızmasını engeller
- **Girdi Doğrulama** - Tüm kullanıcı girişleri işlenmeden önce Zod şemalarıyla doğrulanır
- **Yol Geçiş Önleme** - Google Drive dosya işlemlerinde yol doğrulama
- **Güvenli IPC** - Tüm iletişim `contextBridge.exposeInMainWorld` üzerinden

## Test

```bash
npm test                # Birim testleri (692 test, 45 dosya)
npm run test:e2e        # E2E testleri (Playwright)
npm run test:coverage   # Kapsam raporu
npm run test:ui         # Vitest interaktif arayüz
```

### Kapsam

| Metrik | Değer | Eşik |
|--------|-------|------|
| Statements | %61.7 | %55 |
| Branches | %61.7 | %55 |
| Functions | %52.8 | %45 |
| Lines | %63.2 | %55 |

### Test Kategorileri

| Kategori | Test Sayısı |
|----------|-------------|
| UI Bileşenleri | 174 |
| Sayfalar | 148 |
| Hook'lar | 125 |
| Modal'lar | 93 |
| Yardımcılar & Şemalar | 98 |
| Veritabanı & Ana Süreç | 49 |
| E2E Suitleri | 6 |

## Lisans

Bu proje kişisel kullanım içindir.
