# MARS — Halaman Informasi Scroll

Halaman informasi tentang planet Mars dengan latar luar angkasa berlapis, planet 3D yang bisa diputar dan di-zoom, dan animasi halus.

Dibuat dengan HTML, CSS, dan JavaScript. Library Three.js dan GSAP dimuat dari CDN. Login memakai Firebase Authentication.

## File

```
onstrom/
├── index.html            # struktur dan isi section
├── style.css             # tampilan, nebula, navigasi, dan animasi
├── script.js             # scroll, posisi planet, bulan, angka, dan GSAP
├── mars-3d.js            # planet Mars 3D (Three.js): tekstur, putar, zoom, fokus lokasi
├── space-background.js   # latar: bintang berlapis, debu kosmik, bintang jatuh
├── auth.js               # login email dan password (Firebase)
├── mars-texture.jpg      # peta permukaan Mars dari NASA (lihat di bawah)
└── README.md
```

## Peta permukaan Mars

Planet memakai foto `mars-texture.jpg`. Unduh dari `science.nasa.gov/3d-resources/mars/` (file Mars.jpg), ganti namanya menjadi `mars-texture.jpg`, lalu upload ke root repo. Kalau file ini belum ada, planet tetap tampil dengan permukaan prosedural.

## Cara pakai

Buka `index.html` di browser. Karena library dimuat dari internet, perlu koneksi.

## Deploy ke GitHub Pages

1. Upload semua file ke root repo, sejajar dan tidak di dalam subfolder.
2. Buka **Settings → Pages → Source: main / (root)**.
3. Tunggu 1–2 menit, lalu buka `https://USERNAME.github.io/NAMA-REPO/`.
4. Nama file harus persis huruf kecil.

## Kontrol planet

- **Desktop:** seret untuk memutar, Ctrl + scroll untuk zoom, atau pakai tombol `+` dan `−`.
- **HP:** seret untuk memutar, cubit untuk zoom.
- **Lokasi:** klik kartu Olympus Mons atau Valles Marineris di bagian Fakta untuk melihat lokasinya.

## Kustomisasi

| Mau ubah | Di mana |
|---|---|
| Teks, angka, judul | `index.html` (angka tujuan di `data-to="..."`) |
| Warna aksen | `--acc` di `style.css` |
| Warna cahaya tepi planet | `data-c` pada section di `index.html` |
| Posisi dan ukuran planet tiap section | `data-x` (-1 kiri, 0 tengah, 1 kanan) dan `data-s` |
| Kecepatan putar otomatis | `autoSpeed` di `mars-3d.js` |
| Koordinat kamera ke lokasi | `LOC` di `mars-3d.js` |
| Jumlah bintang | `build()` di `space-background.js` |
| Konfigurasi login | `FIREBASE_CONFIG` di `auth.js` |

## Catatan

- Jika WebGL atau Three.js tidak tersedia, planet otomatis diganti tampilan CSS dan tombol zoom disembunyikan.
- Di HP, jumlah bintang dan kualitas render dikurangi otomatis agar tetap lancar.
- Animasi berhenti saat tab tidak dilihat, dan dinonaktifkan jika perangkat mengaktifkan kurangi gerakan.
- Fakta di halaman ini ringkas dan untuk keperluan demo. Cek ulang sebelum dipakai serius.
