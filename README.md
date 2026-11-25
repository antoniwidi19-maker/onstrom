# MARS — Halaman Informasi Scroll

Halaman informasi tentang planet Mars dengan planet 3D yang bisa diputar dan di-zoom, latar luar angkasa berlapis, dan animasi halus.

Dibuat dengan HTML, CSS, dan JavaScript. Library Three.js dan GSAP dimuat dari CDN.

## File

```
mars/
├── index.html            # struktur dan isi section
├── style.css             # tampilan, nebula, dan animasi CSS
├── script.js             # scroll, posisi planet, bulan, angka, dan GSAP
├── mars-3d.js            # planet Mars 3D (Three.js): putar, zoom, inersia
├── space-background.js   # latar: bintang 3 lapis, debu, bintang jatuh
└── README.md
```

## Cara pakai lokal

Buka `index.html` di browser. Karena library dimuat dari internet, perlu koneksi.

## Deploy ke GitHub Pages

1. Upload semua file ke root repo, sejajar dan tidak di dalam subfolder.
2. Buka **Settings → Pages → Source: main / (root)**.
3. Tunggu 1–2 menit, lalu buka `https://USERNAME.github.io/NAMA-REPO/`.
4. Nama file harus persis huruf kecil.

## Kontrol planet

- **Desktop:** seret untuk memutar, Ctrl + scroll untuk zoom, atau pakai tombol `+` dan `−`.
- **HP:** seret untuk memutar, cubit untuk zoom.

## Kustomisasi

| Mau ubah | Di mana |
|---|---|
| Teks, angka, judul | `index.html` (angka tujuan di `data-to="..."`) |
| Warna aksen | `--acc` di `style.css` |
| Warna cahaya tepi planet | `data-c` pada section di `index.html` (lalu dibaca `script.js`) |
| Posisi dan ukuran planet tiap section | `data-x` (-1 kiri, 0 tengah, 1 kanan) dan `data-s` |
| Warna permukaan Mars | `main()` di `FS_PLANET` pada `mars-3d.js` |
| Kecepatan putar otomatis | `0.05` di `autoSpeed` pada `mars-3d.js` |
| Jumlah bintang | `build()` di `space-background.js` (angka kecil = lebih banyak) |
| Frekuensi bintang jatuh | `nextShoot` di `space-background.js` |
| Orbit dan ukuran bulan | array `moons` di `script.js` |

## Catatan

- Jika WebGL atau Three.js tidak tersedia, planet otomatis diganti tampilan CSS, dan tombol zoom disembunyikan.
- Di HP, jumlah bintang dan kualitas render dikurangi otomatis agar tetap lancar.
- Jika perangkat mengaktifkan **kurangi gerakan**, animasi dinonaktifkan.
- Fakta di halaman ini ringkas dan untuk keperluan demo. Cek ulang sebelum dipakai serius.
