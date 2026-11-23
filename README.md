# MARS — Halaman Informasi Scroll

Halaman satu layar-per-section dengan planet Mars yang dirender real-time (WebGL shader), bulan yang mengorbit, bintang kelap-kelip, bintang jatuh, dan satelit yang lewat. Tanpa library atau gambar eksternal.

## File


mars/
├── index.html   # struktur + isi section
├── style.css    # tampilan + animasi CSS
├── script.js    # planet (shader), langit, scroll, angka berjalan
└── README.md


## Cara pakai

1. Taruh index.html, style.css, script.js dalam satu folder.
2. Buka index.html di browser (bisa langsung klik dua kali, tidak perlu server).
3. Scroll.

## Deploy ke GitHub Pages

1. Upload ketiga file ke root repo (sejajar, bukan di subfolder).
2. Settings → Pages → Source: main / (root).
3. Tunggu 1–2 menit, buka https://USERNAME.github.io/NAMA-REPO/.
4. Nama file harus persis huruf kecil: style.css dan script.js.

## Kustomisasi

| Mau ubah | Di mana |
|---|---|
| Teks, angka, judul | index.html (angka tujuan di data-to="...") |
| Kata raksasa di belakang | <div class="ghost"> di index.html |
| Warna aksen | --acc di style.css |
| Posisi planet tiap section | data-x (-1 kiri, 0 tengah, 1 kanan) dan data-s (ukuran) |
| Warna permukaan planet | angka vec3(...) di bagian alb pada shader (script.js) |
| Kecepatan putar planet | .06 di baris rot+= (script.js) |
| Kemiringan sumbu | .44 di fungsi T() pada shader |
| Jumlah bintang | SW*SH/5000 di sizeSky() (angka kecil = lebih banyak) |
| Orbit dan ukuran bulan | array moons (a, b = jari-jari orbit, sp = kecepatan, size) |
| Frekuensi bintang jatuh / satelit | nextShoot dan nextSat di drawSky() |

## Catatan

- Planet pakai WebGL. Jika browser tidak mendukung, otomatis tampil planet gradient CSS sebagai cadangan.
- Kalau terasa berat di HP lama, turunkan 1.25 / 1.5 pada fungsi layout() (resolusi planet).
- Animasi otomatis dikurangi jika device mengaktifkan reduce motion.
- Fakta di halaman ini ringkas dan untuk keperluan demo, cek ulang sebelum dipakai serius
