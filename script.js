/* =========================================================
   MARS — script.js (versi perbaikan, cocok dengan index.html & style.css baru)
   1. Langit: bintang berkelip, bintang jatuh, satelit
   2. Planet: shader WebGL prosedural (cadangan CSS jika WebGL tidak ada)
   3. Planet ikut bergerak saat di-scroll (halus, tidak loncat per section)
   4. Judul dipecah per kata, angka berjalan, teks masuk & keluar saat digulir
   ========================================================= */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var qa = function (s) { return [].slice.call(document.querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow = function () { return window.innerWidth <= 700; };
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var TAU = Math.PI * 2;

  /* ================= 1. LANGIT ================= */
  var sky = $("#sky");
  var sx = sky.getContext("2d");
  var SW = 0, SH = 0, stars = [], shoots = [], sats = [];
  var nextShoot = 2, nextSat = 4;

  function sizeSky() {
    SW = window.innerWidth;
    SH = window.innerHeight;
    sky.width = SW * DPR;
    sky.height = SH * DPR;
    sx.setTransform(DPR, 0, 0, DPR, 0, 0);
    stars = [];
    var n = Math.round((SW * SH) / 5000);
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * SW,
        y: Math.random() * SH,
        r: Math.random() * 1.2 + 0.25,
        ph: Math.random() * TAU,
        sp: 0.8 + Math.random() * 2.4,
        z: 0.2 + Math.random() * 0.8,
        warm: Math.random() < 0.2
      });
    }
  }

  function drawSky(t, dt, sy) {
    sx.clearRect(0, 0, SW, SH);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = reduce ? 0.6 : 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      var y = (((s.y - sy * 0.05 * s.z) % SH) + SH) % SH;   // bintang ikut bergeser pelan saat scroll
      sx.fillStyle = s.warm ? "rgba(255,214,180," + a + ")" : "rgba(220,230,255," + a + ")";
      sx.beginPath();
      sx.arc(s.x, y, s.r, 0, TAU);
      sx.fill();
    }

    if (reduce) return;

    /* bintang jatuh */
    if (t > nextShoot) {
      nextShoot = t + 4 + Math.random() * 6;
      shoots.push({ x: SW * (0.4 + Math.random() * 0.6), y: Math.random() * SH * 0.4, life: 0 });
    }
    shoots = shoots.filter(function (m) {
      m.life += dt;
      m.x -= 900 * dt;
      m.y += 450 * dt;
      var k = 1 - m.life / 0.9;
      if (k <= 0) return false;
      var g = sx.createLinearGradient(m.x, m.y, m.x + 120, m.y - 60);
      g.addColorStop(0, "rgba(255,255,255," + k + ")");
      g.addColorStop(1, "rgba(255,255,255,0)");
      sx.strokeStyle = g;
      sx.lineWidth = 1.6;
      sx.beginPath();
      sx.moveTo(m.x, m.y);
      sx.lineTo(m.x + 120, m.y - 60);
      sx.stroke();
      return true;
    });

    /* satelit */
    if (t > nextSat) {
      nextSat = t + 14 + Math.random() * 10;
      sats.push({ x: -20, y: SH * (0.15 + Math.random() * 0.5), vy: (Math.random() - 0.5) * 8, ph: Math.random() * 6 });
    }
    sats = sats.filter(function (q) {
      q.x += 45 * dt;
      q.y += q.vy * dt;
      if (q.x > SW + 20) return false;
      sx.fillStyle = "rgba(235,240,255,0.9)";
      sx.fillRect(q.x - 1.5, q.y - 1, 3, 2);
      sx.fillRect(q.x - 6, q.y - 0.5, 4, 1);
      sx.fillRect(q.x + 2, q.y - 0.5, 4, 1);
      if (Math.sin(t * 5 + q.ph) > 0.5) {
        sx.fillStyle = "rgba(255,70,60,0.95)";
        sx.beginPath(); sx.arc(q.x, q.y - 2.2, 1.4, 0, TAU); sx.fill();
        sx.fillStyle = "rgba(255,70,60,0.18)";
        sx.beginPath(); sx.arc(q.x, q.y - 2.2, 6, 0, TAU); sx.fill();
      }
      return true;
    });
  }

  /* ================= 2. PLANET: shader WebGL ================= */
  var VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  var FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uRot, uTime, uTilt;
uniform vec3 uSun, uRim;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1.0,0.0,0.0)), f.x),
        mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x),
        mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x), f.y),
    f.z);
}
float fbm4(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec3(5.2, 1.3, 8.1);
    a *= 0.5;
  }
  return v;
}
float fbm3(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec3(5.2, 1.3, 8.1);
    a *= 0.5;
  }
  return v;
}
float H(vec3 p) {
  float c = fbm4(p * 1.6);
  float d = fbm3(p * 5.0 + c * 2.0);
  float n = noise(p * 14.0);
  float k = (n - 0.78) * 16.0;
  return c * 0.55 + d * 0.45 + exp(-k * k) * 0.028 - smoothstep(0.78, 0.92, n) * 0.03;
}
vec3 rx(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z);
}
vec3 ry(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
}
vec3 T(vec3 v) { return ry(rx(v, uTilt), uRot); }

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  float R = 0.74;
  float r = length(p) / R;
  vec3 sun = normalize(uSun);
  vec3 inCol = vec3(0.0);
  float aIn = 0.0;

  if (r < 1.0) {
    vec3 n = vec3(p / R, sqrt(1.0 - r * r));
    vec3 q = T(n);
    vec3 s = T(sun);
    float c = fbm4(q * 1.6);
    float d = fbm3(q * 5.0 + c * 2.0);
    float n0 = noise(q * 14.0);
    float k0 = (n0 - 0.78) * 16.0;
    float e = 0.012;
    float h = c * 0.55 + d * 0.45 + exp(-k0 * k0) * 0.028 - smoothstep(0.78, 0.92, n0) * 0.03;
    vec3 g = vec3(H(q + vec3(e,0.0,0.0)) - h, H(q + vec3(0.0,e,0.0)) - h, H(q + vec3(0.0,0.0,e)) - h) / e;
    g -= dot(g, q) * q;
    vec3 N = normalize(q - g * 0.2);

    float dif = max(dot(N, s), 0.0) * smoothstep(-0.08, 0.35, dot(q, s));
    vec3 alb = mix(vec3(0.60,0.25,0.12), vec3(0.80,0.47,0.26), smoothstep(0.3, 0.7, d));
    alb = mix(alb, vec3(0.90,0.66,0.45), smoothstep(0.55, 0.8, c) * 0.7);
    alb = mix(alb, vec3(0.17,0.10,0.09), (1.0 - smoothstep(0.38, 0.52, c)) * 0.85);

    float lat = abs(q.y) + (fbm3(q * 6.0) - 0.5) * 0.12;
    alb = mix(alb, vec3(0.93,0.95,0.98), smoothstep(0.86, 0.9, lat));

    float cl = noise(q * vec3(3.0,10.0,3.0) + vec3(uTime * 0.03, 0.0, 0.0))
             * noise(q * vec3(7.0,18.0,7.0) - vec3(uTime * 0.02, 0.0, 0.0));
    alb = mix(alb, vec3(1.0), smoothstep(0.25, 0.5, cl) * 0.22 * (0.4 + lat));

    inCol = alb * (dif * vec3(1.0,0.93,0.85) * 1.3 + vec3(0.014,0.009,0.012));

    float fr = pow(1.0 - n.z, 3.0);
    float lit = clamp(dot(n, sun) * 0.7 + 0.3, 0.0, 1.0);
    inCol += vec3(1.0,0.55,0.30) * fr * lit * 0.55;

    float back = pow(max(dot(normalize(n.xy + 1e-5), -normalize(sun.xy)), 0.0), 2.0);
    inCol += uRim * fr * back * 0.9;

    aIn = 1.0 - smoothstep(0.985, 1.0, r);
  }

  float gA = exp(-max(r - 1.0, 0.0) * 7.0) * clamp(dot(normalize(p + 1e-5), sun.xy) * 0.8 + 0.35, 0.0, 1.0) * 0.5;
  float gB = exp(-max(r - 1.0, 0.0) * 8.0) * clamp(dot(normalize(p + 1e-5), -sun.xy) * 0.8 + 0.3, 0.0, 1.0) * 0.4;

  gl_FragColor = vec4(
    inCol * aIn + (vec3(1.0,0.5,0.28) * gA + uRim * gB) * (1.0 - aIn),
    aIn + (gA + gB) * (1.0 - aIn)
  );
}`;

  var cv = $("#cv"), pw = $("#pw");
  var gl = null, U = {};
  var W = 0, qmul = 1, ema = 0.016, nf = 0, buf = new Uint8Array(4);

  function mk(type, src) {
    var o = gl.createShader(type);
    gl.shaderSource(o, src);
    gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(o));
      return null;
    }
    return o;
  }

  try {
    gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  } catch (e) {
    gl = null;
  }
  if (gl) {
    var pf = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!pf || !pf.precision) gl = null;
  }
  if (gl) {
    var vs = mk(gl.VERTEX_SHADER, VS);
    var fs = mk(gl.FRAGMENT_SHADER, FS);
    var pr = null;
    if (vs && fs) {
      pr = gl.createProgram();
      gl.attachShader(pr, vs);
      gl.attachShader(pr, fs);
      gl.linkProgram(pr);
    }
    if (pr && gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      gl.useProgram(pr);
      var bf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, "a");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ["uRes", "uRot", "uTime", "uTilt", "uSun", "uRim"].forEach(function (n) {
        U[n] = gl.getUniformLocation(pr, n);
      });
    } else {
      gl = null;
    }
  }

  function fallback() {
    gl = null;
    pw.classList.add("nogl");
  }
  if (!gl) fallback();
  else cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); fallback(); });

  /* bulan yang mengorbit */
  var moons = [
    { el: $("#m1"), a: 0.56, b: 0.15, sp: 0.6, size: 0.05,  ph: 0,   tl: -0.32, px: 0 },
    { el: $("#m2"), a: 0.74, b: 0.22, sp: 0.3, size: 0.034, ph: 2.4, tl: -0.18, px: 0 }
  ];

  function layout() {
    W = pw.offsetWidth;
    var k = Math.min(DPR, narrow() ? 1 : 1.4) * qmul;
    cv.width = cv.height = Math.max(2, Math.round(W * k));
    moons.forEach(function (m) {
      m.px = m.size * W;
      m.el.style.width = m.el.style.height = m.px + "px";
    });
  }

  /* ================= 3. POSISI PLANET MENGIKUTI SCROLL ================= */
  var secs = qa("section");
  var mids = [];                 // posisi tengah tiap section (koordinat dokumen)
  var curIdx = -1;
  var rim = [1, 0.42, 0.17], rimT = [1, 0.42, 0.17];
  var tilt = 0.44, tiltT = 0.44;

  function hex(h) {
    return [
      parseInt(h.substr(1, 2), 16) / 255,
      parseInt(h.substr(3, 2), 16) / 255,
      parseInt(h.substr(5, 2), 16) / 255
    ];
  }
  function X(i) { return narrow() ? 0 : (+secs[i].dataset.x || 0) * window.innerWidth * 0.24; }
  function S(i) { return +secs[i].dataset.s || 1; }

  function measure() {
    mids = secs.map(function (s) { return s.offsetTop + s.offsetHeight / 2; });
  }

  // Posisi planet untuk posisi scroll sy: diinterpolasi di antara dua section
  function planetTarget(sy) {
    var n = secs.length;
    var c = sy + window.innerHeight * 0.5;
    if (c <= mids[0]) return { x: X(0), s: S(0), i: 0 };
    if (c >= mids[n - 1]) return { x: X(n - 1), s: S(n - 1), i: n - 1 };
    var i = 0;
    while (c > mids[i + 1]) i++;
    var t = (c - mids[i]) / (mids[i + 1] - mids[i]);
    t = t * t * (3 - 2 * t);
    return {
      x: X(i) + (X(i + 1) - X(i)) * t,
      s: S(i) + (S(i + 1) - S(i)) * t,
      i: t < 0.5 ? i : i + 1
    };
  }

  function setTheme(i) {
    if (i === curIdx) return;
    curIdx = i;
    var sec = secs[i];
    if (sec.dataset.c) {
      rimT = hex(sec.dataset.c);
      document.documentElement.style.setProperty("--acc", sec.dataset.c);
    }
    tiltT = +(sec.dataset.t || 0.44);
  }

  /* ================= 4. TEKS & ANGKA ================= */
  // Pecah judul per kata untuk animasi
  qa("[data-split]").forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w, i) {
      return '<span class="w" style="--i:' + i + '">' + w + "</span>";
    }).join(" ");
  });

  // Angka berjalan dari 0 ke data-to
  function count(sec) {
    qa(".c").forEach(function (el) {
      if (!sec.contains(el)) return;
      var to = +el.dataset.to;
      if (reduce) {
        el.textContent = String(to).replace("-", "−");
        return;
      }
      var t0 = null;
      var f = function (t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / 1700);
        var e = 1 - Math.pow(1 - k, 3);
        var jitter = k < 1 ? (Math.random() - 0.5) * Math.abs(to) * 0.3 * (1 - k) : 0;
        el.textContent = String(Math.round(to * e + jitter)).replace("-", "−");
        if (k < 1) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
  }

  // Section diberi class .in saat cukup terlihat, dan dilepas saat keluar layar
  var thresholds = [];
  for (var th = 0; th <= 20; th++) thresholds.push(th / 20);
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var s = e.target;
      var vh = Math.min(e.boundingClientRect.height, window.innerHeight);
      var visible = vh > 0 ? e.intersectionRect.height / vh : 0;
      var on = visible > 0.45;
      var was = s.classList.contains("in");
      s.classList.toggle("in", on);
      if (on && !was) count(s);
    });
  }, { threshold: thresholds });
  secs.forEach(function (s) { io.observe(s); });

  /* ================= 5. LOOP UTAMA ================= */
  var tmx = 0, tmy = 0, mx = 0, my = 0;
  var sy = window.scrollY, rot = 0, last = 0;
  var px = 0, ps = 1;            // posisi & skala planet yang sudah dihaluskan
  var nav = $("nav.top");
  var ghostEls = secs.map(function (s) { return s.querySelector(".ghost"); });

  function frame(ms) {
    var t = ms / 1000;
    var dt = Math.min(0.05, t - last);
    last = t;

    // scroll yang dihaluskan
    var diff = window.scrollY - sy;
    sy += diff * 0.08;
    mx += (tmx - mx) * 0.04;
    my += (tmy - my) * 0.04;

    // planet berputar, makin cepat saat di-scroll
    rot += reduce ? 0 : dt * (0.06 + Math.min(Math.abs(diff), 240) * 0.0014);

    // posisi & skala planet mengikuti scroll
    var tg = planetTarget(sy);
    px += (tg.x - px) * 0.08;
    ps += (tg.s - ps) * 0.08;
    pw.style.setProperty("--x", px.toFixed(1) + "px");
    pw.style.setProperty("--s", ps.toFixed(3));
    setTheme(tg.i);

    for (var q = 0; q < 3; q++) rim[q] += (rimT[q] - rim[q]) * 0.05;
    tilt += (tiltT - tilt) * 0.04;

    drawSky(t, dt, sy);

    if (gl) {
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(U.uRes, cv.width, cv.height);
      gl.uniform1f(U.uRot, rot);
      gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uTilt, tilt);
      gl.uniform3f(U.uRim, rim[0], rim[1], rim[2]);
      gl.uniform3f(U.uSun, -0.75 + mx * 0.5, 0.35 - my * 0.4, 0.55);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      nf++;
      if (nf === 8) {   // cek sekali: kalau GPU gagal menggambar, pakai cadangan CSS
        gl.readPixels(cv.width >> 1, cv.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        if (buf[3] < 30) fallback();
      }
      ema = ema * 0.95 + Math.min(0.1, dt) * 0.05;
      if (nf % 45 === 0 && ema > 0.034 && qmul > 0.55) {   // turunkan resolusi kalau berat
        qmul *= 0.8;
        layout();
      }
    }

    // bulan mengorbit
    var f = narrow() ? 0.78 : 1;
    moons.forEach(function (m) {
      var ang = (reduce ? 0 : t) * m.sp + m.ph;
      var x = Math.cos(ang) * m.a * W * f;
      var y = Math.sin(ang) * m.b * W * f;
      var c = Math.cos(m.tl), s = Math.sin(m.tl);
      var xr = x * c - y * s, yr = x * s + y * c;
      var sc = 1 + 0.28 * Math.sin(ang);
      m.el.style.zIndex = Math.sin(ang) > 0 ? 3 : 1;
      m.el.style.transform =
        "translate(" + (W / 2 + xr - m.px / 2).toFixed(1) + "px," +
        (W / 2 + yr - m.px / 2).toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
    });

    // teks raksasa di belakang bergeser pelan (parallax)
    for (var g = 0; g < ghostEls.length; g++) {
      if (!ghostEls[g]) continue;
      ghostEls[g].style.transform =
        "translateX(" + ((mids[g] - sy - window.innerHeight * 0.5) * -0.12).toFixed(1) + "px)";
    }

    if (nav) nav.classList.toggle("scrolled", window.scrollY > 40);

    requestAnimationFrame(frame);
  }

  /* ================= 6. START ================= */
  sizeSky();
  layout();
  measure();
  pw.style.transition = "none";           // gerakan planet diatur JS, tidak perlu transisi CSS
  var start = planetTarget(sy);
  px = start.x;
  ps = start.s;
  setTheme(start.i);

  window.addEventListener("resize", function () { sizeSky(); layout(); measure(); });
  window.addEventListener("load", measure);
  window.addEventListener("pointermove", function (e) {
    tmx = e.clientX / window.innerWidth - 0.5;
    tmy = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  requestAnimationFrame(frame);
})();
