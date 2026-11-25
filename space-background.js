/* =========================================================
   MARS — space-background.js
   Latar luar angkasa di canvas #sky:
   - 3 lapisan bintang (jauh, tengah, dekat) dengan parallax
   - Debu kosmik yang bergerak pelan
   - Bintang jatuh dan satelit sesekali
   Nebula, kabut, dan butiran film ada di style.css (#space).
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

  // depth: seberapa jauh lapisan ikut bergerak saat parallax (kecil = lebih jauh)
  var LAYERS = [
    { dens: 1 / 2600,  rMin: 0.3, rMax: 0.75, depth: 0.15, base: 0.45 },
    { dens: 1 / 6000,  rMin: 0.6, rMax: 1.2,  depth: 0.45, base: 0.7 },
    { dens: 1 / 16000, rMin: 1.0, rMax: 1.8,  depth: 0.9,  base: 1.0 }
  ];

  var W = 0, H = 0, stars = [], dust = [], shoots = [], sats = [];
  var nextShoot = 3, nextSat = 6;
  var quality = mobile ? 0.6 : 1;
  var mx = 0, my = 0, tmx = 0, tmy = 0, sy = window.scrollY || 0;
  var last = performance.now(), t0 = last, ema = 1 / 60;

  function build() {
    stars = [];
    dust = [];
    LAYERS.forEach(function (L, li) {
      var n = Math.round(W * H * L.dens * quality);
      for (var i = 0; i < n; i++) {
        stars.push({
          li: li,
          x: Math.random() * W,
          y: Math.random() * H,
          r: L.rMin + Math.random() * (L.rMax - L.rMin),
          ph: Math.random() * TAU,
          sp: 0.4 + Math.random() * 1.6,
          a: L.base * (0.35 + Math.random() * 0.65),
          warm: Math.random() < 0.18
        });
      }
    });
    var nd = Math.round((mobile ? 30 : 70) * quality);
    for (var k = 0; k < nd; k++) {
      dust.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.8,
        vx: 2 + Math.random() * 5,
        vy: -1 + Math.random() * 2,
        a: 0.04 + Math.random() * 0.08,
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
  }

  function mod(v, m) { return ((v % m) + m) % m; }

  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);

    // bintang per lapisan
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], L = LAYERS[s.li];
      var x = mod(s.x - mx * 40 * L.depth, W);
      var y = mod(s.y - sy * 0.04 * L.depth - my * 30 * L.depth, H);
      var tw = reduce ? 1 : 0.7 + 0.3 * Math.sin(t * s.sp + s.ph);
      ctx.globalAlpha = Math.min(1, s.a * tw);
      ctx.fillStyle = s.warm ? "#ffd6b4" : "#d6e0ff";
      if (s.r < 0.9) {
        ctx.fillRect(x, y, s.r * 1.6, s.r * 1.6);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, TAU);
        ctx.fill();
      }
    }

    // debu kosmik
    ctx.fillStyle = "#e8d6c8";
    for (var k = 0; k < dust.length; k++) {
      var d = dust[k];
      if (!reduce) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.x > W + 5) d.x = -5;
        if (d.y > H + 5) d.y = -5;
        if (d.y < -5) d.y = H + 5;
      }
      ctx.globalAlpha = d.a;
      ctx.beginPath();
      ctx.arc(d.x - mx * 30 * d.depth, d.y - my * 20 * d.depth, d.r, 0, TAU);
      ctx.fill();
    }
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
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var t = (now - t0) / 1000;

    mx += (tmx - mx) * 0.03;
    my += (tmy - my) * 0.03;
    sy += ((window.scrollY || 0) - sy) * 0.08;
    if (space) {
      space.style.setProperty("--mx", mx.toFixed(4));
      space.style.setProperty("--my", my.toFixed(4));
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

  window.addEventListener("pointermove", function (e) {
    tmx = e.clientX / window.innerWidth - 0.5;
    tmy = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });
  window.addEventListener("resize", size);
  size();
  requestAnimationFrame(loop);
})();
