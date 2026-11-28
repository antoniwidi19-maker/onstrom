/* =========================================================
   MARS — space-background.js (versi 2)
   Latar luar angkasa di canvas #sky:
   - 3 lapisan bintang (jauh, tengah, dekat) dengan parallax
   - Bintang berkelip alami dengan warna putih dingin sampai hangat
   - Debu kosmik melayang dengan kecepatan dan arah berbeda
   - Parallax mengikuti mouse, sentuhan, dan scroll
   - Bintang jatuh dan satelit sesekali
   - Berhenti otomatis saat tab tidak aktif
   Nebula dan kabut ada di style.css (#space).
   ========================================================= */
(function () {
  "use strict";

  var cv = document.getElementById("sky");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d");
  var space = document.getElementById("space");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.innerWidth <= 700 || /Mobi|Android/i.test(navigator.userAgent);
  var DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
  var TAU = Math.PI * 2;

  // kedalaman tiap lapisan: makin kecil = makin jauh (bergerak lebih lambat)
  var LAYERS = [
    { dens: 1 / 2200,  rMin: 0.3, rMax: 0.8, depth: 0.12, base: 0.4 },
    { dens: 1 / 5200,  rMin: 0.6, rMax: 1.3, depth: 0.4,  base: 0.7 },
    { dens: 1 / 15000, rMin: 1.0, rMax: 1.9, depth: 0.9,  base: 1.0 }
  ];
  // warna bintang: putih dingin, putih, dan sedikit hangat
  var TEMPS = ["#dfe8ff", "#f4f1ff", "#fff1e0", "#ffd9b8"];

  var W = 0, H = 0, stars = [], dust = [], shoots = [], sats = [];
  var starSprites = [], dustSprite = null;
  var nextShoot = 3, nextSat = 6;
  var quality = mobile ? 0.6 : 1;
  var px = 0, py = 0, tx = 0, ty = 0;   // parallax: posisi sekarang dan target
  var sy = window.scrollY || 0;
  var running = false, rafId = 0;
  var last = performance.now(), t0 = last, ema = 1 / 60;
  var resizeTimer = 0;

  // sprite titik cahaya yang sudah digambar sekali, supaya ringan dijalankan
  function makeSprite(color, size) {
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var g = c.getContext("2d");
    var r = size / 2;
    var grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, color);
    grd.addColorStop(0.2, color);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function mod(v, m) { return ((v % m) + m) % m; }

  function build() {
    stars = [];
    dust = [];
    LAYERS.forEach(function (L, li) {
      var n = Math.round(W * H * L.dens * quality);
      for (var i = 0; i < n; i++) {
        var roll = Math.random();
        var c = roll < 0.6 ? (Math.random() < 0.5 ? 0 : 1) : (Math.random() < 0.6 ? 2 : 3);
        stars.push({
          li: li,
          x: Math.random() * W,
          y: Math.random() * H,
          r: L.rMin + Math.random() * (L.rMax - L.rMin),
          ph: Math.random() * TAU,
          sp: 0.4 + Math.random() * 1.6,
          a: L.base * (0.35 + Math.random() * 0.65),
          c: c
        });
      }
    });
    var nd = Math.round((mobile ? 26 : 60) * quality);
    for (var k = 0; k < nd; k++) {
      dust.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.6,
        vx: 2 + Math.random() * 5,
        vy: -1 + Math.random() * 2,
        a: 0.04 + Math.random() * 0.07,
        depth: 0.2 + Math.random() * 0.6
      });
    }
  }

  function size() {
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
    if (reduce) draw(0, 0);
  }

  function drawStars(t) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], L = LAYERS[s.li];
      var x = mod(s.x - px * 46 * L.depth, W);
      var y = mod(s.y - sy * 0.04 * L.depth - py * 32 * L.depth, H);
      // berkedip tidak beraturan: dua gelombang dengan fase berbeda
      var tw = reduce ? 1 : 0.65 + 0.35 * Math.sin(t * s.sp + s.ph) * (0.6 + 0.4 * Math.sin(t * s.sp * 0.37 + s.ph * 2));
      var a = Math.min(1, s.a * tw);
      var sz = s.r * 6;
      ctx.globalAlpha = a;
      ctx.drawImage(starSprites[s.c], x - sz / 2, y - sz / 2, sz, sz);
    }
  }

  function drawDust(dt) {
    for (var k = 0; k < dust.length; k++) {
      var d = dust[k];
      if (!reduce) {
        d.x = mod(d.x + d.vx * dt, W);
        d.y = mod(d.y + d.vy * dt, H);
      }
      var x = mod(d.x - px * 30 * d.depth, W);
      var y = mod(d.y - py * 20 * d.depth, H);
      var sz = d.r * 10;
      ctx.globalAlpha = d.a;
      ctx.drawImage(dustSprite, x - sz / 2, y - sz / 2, sz, sz);
    }
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    drawStars(t);
    drawDust(dt);
    ctx.globalAlpha = 1;
    if (reduce) return;

    // bintang jatuh
    if (t > nextShoot) {
      nextShoot = t + 6 + Math.random() * 8;
      shoots.push({ x: W * (0.45 + Math.random() * 0.55), y: Math.random() * H * 0.35, life: 0 });
    }
    shoots = shoots.filter(function (m) {
      m.life += dt;
      m.x -= 900 * dt;
      m.y += 450 * dt;
      var k2 = 1 - m.life / 0.9;
      if (k2 <= 0) return false;
      var g = ctx.createLinearGradient(m.x, m.y, m.x + 120, m.y - 60);
      g.addColorStop(0, "rgba(255,255,255," + k2 + ")");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + 120, m.y - 60);
      ctx.stroke();
      return true;
    });

    // satelit
    if (t > nextSat) {
      nextSat = t + 18 + Math.random() * 14;
      sats.push({ x: -20, y: H * (0.12 + Math.random() * 0.45), vy: (Math.random() - 0.5) * 6, ph: Math.random() * 6 });
    }
    sats = sats.filter(function (q) {
      q.x += 45 * dt;
      q.y += q.vy * dt;
      if (q.x > W + 20) return false;
      ctx.fillStyle = "rgba(235,240,255,0.9)";
      ctx.fillRect(q.x - 1.5, q.y - 1, 3, 2);
      ctx.fillRect(q.x - 6, q.y - 0.5, 4, 1);
      ctx.fillRect(q.x + 2, q.y - 0.5, 4, 1);
      if (Math.sin(t * 5 + q.ph) > 0.5) {
        ctx.fillStyle = "rgba(255,70,60,0.95)";
        ctx.beginPath(); ctx.arc(q.x, q.y - 2.2, 1.4, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,70,60,0.18)";
        ctx.beginPath(); ctx.arc(q.x, q.y - 2.2, 6, 0, TAU); ctx.fill();
      }
      return true;
    });
  }

  function loop(now) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var t = (now - t0) / 1000;

    px += (tx - px) * 0.03;
    py += (ty - py) * 0.03;
    sy += ((window.scrollY || 0) - sy) * 0.08;
    if (space) {
      space.style.setProperty("--mx", px.toFixed(4));
      space.style.setProperty("--my", py.toFixed(4));
    }

    draw(t, dt);

    // kualitas turun otomatis kalau frame rate rendah
    ema = ema * 0.95 + dt * 0.05;
    if (ema > 1 / 35 && quality > 0.4) {
      quality = Math.max(0.4, quality - 0.2);
      build();
      ema = 1 / 60;
    }
  }

  function start() {
    if (reduce || running) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // hemat baterai: berhenti saat tab tidak dilihat
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  window.addEventListener("pointermove", function (e) {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(size, 150);
  });

  starSprites = TEMPS.map(function (col) { return makeSprite(col, 24); });
  dustSprite = makeSprite("#e8d6c8", 32);
  size();
  start();
})();
