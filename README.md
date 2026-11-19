# BELANJAKU — Frontend Marketplace (HTML, CSS, JavaScript)

Paket ini berisi antarmuka web **BELANJAKU** berbasis **HTML5**, **CSS3**, dan **Vanilla JavaScript** yang siap dijalankan langsung di browser tanpa proses build.

## Struktur File

```text
belanjaku-html-js-css/
├── index.html      # Struktur halaman utama, header, search, carousel, katalog, drawer & modal
├── css/
│   └── style.css     # Desain responsif tema orange, putih, dan abu-abu
├── js/
│   └── app.js        # Interaktivitas pencarian, filter, wishlist, keranjang, voucher & checkout
└── README.md       # Dokumentasi penggunaan
```

## Cara Menjalankan

1. Ekstrak file ZIP ke folder pilihan Anda.
2. Buka `index.html` langsung di browser modern (Chrome, Edge, Firefox, Safari), atau jalankan server lokal:
   ```bash
   npx serve .
   ```
   atau
   ```bash
   python3 -m http.server 8080
   ```

## Fitur yang Tersedia

- **Header & Pencarian:** Logo **BELANJAKU**, pencarian langsung dengan *autocomplete*, badge keranjang, wishlist, notifikasi, chat, dan simulasi masuk/daftar akun.
- **Banner & Flash Sale:** *Carousel* promo multi-slide, daftar kode voucher (`BELANJAKU50`, `ONGKIRHEMAT`, `NEWUSER20`), dan *countdown timer* Flash Sale.
- **Katalog & Filter:** Filter berdasarkan kategori, rentang harga minimum/maksimum, serta pengurutan produk (rekomendasi, terlaris, terbaru, harga).
- **Detail Produk, Wishlist & Keranjang:** Pilih variasi produk, atur jumlah barang, pilih sebagian/semua item keranjang, hitung subtotal/diskon/ongkir otomatis, dan simpan status ke `localStorage`.
- **Checkout & Informasi:** Form checkout dengan pilihan jasa pengiriman dan metode pembayaran, riwayat pesanan tersimpan lokal, serta modal bantuan, pelacakan, pengembalian, privasi, dan syarat & ketentuan.
