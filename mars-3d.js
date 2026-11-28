/* =========================================================
   MARS — mars-3d.js (versi 5)
   Sistem Mars 3D dengan Three.js:
   - Planet Mars: tekstur foto (mars-texture.jpg), cahaya dari Matahari,
     tepi planet lebih gelap, atmosfer tipis di tepi
   - Phobos dan Deimos: bentuk tidak beraturan, kawah Stickney di Phobos,
     mengorbit di bidang ekuator Mars dengan rasio periode sesuai data
   - Tombol "Lihat sistem": menampilkan Mars beserta kedua bulannya
   - Diputar dengan seret, cubit, atau tombol zoom; berputar pelan lagi
   - Klik kartu Olympus Mons atau Valles Marineris: kamera menuju lokasi itu
   - Kontrol simulasi: Jeda/Main, kecepatan 0.5×–4×, garis orbit, dan Reset
   - Berhenti saat tab tidak aktif, kualitas turun otomatis jika berat
   - Jika WebGL atau Three.js tidak tersedia: pakai cadangan CSS (.nogl)
   Catatan: skala jarak dan ukuran bulan sengaja diperbesar agar terlihat.
   ========================================================= */
(function () {
  "use strict";

  var TEXTURE_URL = "mars-texture.jpg";
  var BUMP_URL = "mars-bump.jpg";   // peta relief (opsional)

  var pw = document.getElementById("pw");
  var cv = document.getElementById("cv");
  var api = { ok: false, setTheme: function () {}, nudge: function () {}, focusOn: function () {} };
  window.MarsPlanet = api;

  function fail() {
    if (pw) pw.classList.add("nogl");
    var z = document.querySelector(".zoom");
    if (z) z.style.display = "none";
  }
  if (!pw || !cv || typeof THREE === "undefined") { fail(); return; }

  /* ----- Bersihkan elemen dekoratif yang membuat kotak dan efek berdenyut ----- */
  var cleanStyle = document.createElement("style");
  cleanStyle.textContent =
    ".ghost,.rays{display:none!important}" +
    ".pw::before{display:none!important}" +
    ".pf{animation:none!important}" +
    "@media (min-width:701px){.pw{top:42%!important}}";
  document.head.appendChild(cleanStyle);

  /* ----- Shader ----- */
  var VS = [
    "varying vec3 vPos;",
    "varying vec3 vN;",
    "varying vec3 vView;",
    "void main() {",
    "  vPos = position;",
    "  vN = normalize(normalMatrix * normal);",
    "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
    "  vView = -mv.xyz;",
    "  gl_Position = projectionMatrix * mv;",
    "}"
  ].join("\n");

  var FS_PLANET = `
uniform float uTime;
uniform float uLow;
uniform float uHasMap;
uniform sampler2D uMap;
uniform sampler2D uBump;
uniform float uHasBump;
uniform vec3 uSunObj;
uniform vec3 uSunView;
uniform vec3 uRim;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vView;

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
vec2 craters(vec3 p) {
  vec3 g = floor(p);
  vec3 f = fract(p);
  float dark = 0.0;
  float rim = 0.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      for (int k = -1; k <= 1; k++) {
        vec3 o = vec3(float(i), float(j), float(k));
        vec3 c = g + o;
        float h = hash(c);
        if (h > 0.6) {
          vec3 cp = o + vec3(hash(c + 1.7), hash(c + 3.1), hash(c + 5.3));
          float rad = 0.12 + 0.2 * hash(c + 7.9);
          float dd = length(f - cp) / rad;
          dark += 1.0 - smoothstep(0.0, 1.0, dd);
          rim += smoothstep(0.8, 1.0, dd) * (1.0 - smoothstep(1.0, 1.25, dd));
        }
      }
    }
  }
  return vec2(clamp(dark, 0.0, 1.0), clamp(rim, 0.0, 1.0));
}

void main() {
  vec3 q = normalize(vPos);
  vec3 sunO = normalize(uSunObj);

  // bayangan dari relief kecil (hanya di desktop, dan hanya tanpa foto)
  vec3 N = q;
  if (uLow < 0.5 && uHasMap < 0.5) {
    float e = 0.012;
    float h0 = H(q);
    vec3 g = vec3(H(q + vec3(e,0.0,0.0)) - h0, H(q + vec3(0.0,e,0.0)) - h0, H(q + vec3(0.0,0.0,e)) - h0) / e;
    g -= dot(g, q) * q;
    N = normalize(q - g * 0.12);
  }

  // relief dari peta ketinggian (mars-bump.jpg), jika tersedia
  if (uHasMap > 0.5 && uHasBump > 0.5) {
    float uu = atan(q.z, q.x) / 6.2831853 + 0.5;
    float vv = asin(clamp(q.y, -1.0, 1.0)) / 3.1415927 + 0.5;
    float eb = 0.0015;
    float hL = texture2D(uBump, vec2(uu - eb, vv)).r;
    float hR = texture2D(uBump, vec2(uu + eb, vv)).r;
    float hD = texture2D(uBump, vec2(uu, vv - eb)).r;
    float hU = texture2D(uBump, vec2(uu, vv + eb)).r;
    vec2 gr = vec2(hR - hL, hU - hD);
    vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), q) + vec3(1e-4));
    vec3 B = cross(q, T);
    N = normalize(q - (gr.x * T + gr.y * B) * 4.0);
  }

  vec3 alb;
  if (uHasMap > 0.5) {
    // peta Mars (proyeksi equirectangular)
    float u = atan(q.z, q.x) / 6.2831853 + 0.5;
    float v = asin(clamp(q.y, -1.0, 1.0)) / 3.1415927 + 0.5;
    alb = texture2D(uMap, vec2(u, v)).rgb;
  } else {
    // cadangan: permukaan prosedural
    float c = fbm4(q * 1.6);
    float d = fbm3(q * 5.0 + c * 2.0);
    vec3 rust = vec3(0.60, 0.28, 0.14);
    vec3 bright = vec3(0.84, 0.53, 0.32);
    vec3 dark = vec3(0.22, 0.13, 0.11);
    vec3 ice = vec3(0.93, 0.94, 0.96);
    alb = mix(rust, bright, smoothstep(0.35, 0.75, d));
    alb = mix(alb, dark, (1.0 - smoothstep(0.38, 0.50, c)) * 0.85);
    if (uLow < 0.5) {
      vec2 cr = craters(q * 6.0);
      alb *= 1.0 - 0.45 * cr.x;
      alb += 0.10 * cr.y;
    }
    float lat = abs(q.y) + (fbm3(q * 6.0) - 0.5) * 0.12;
    alb = mix(alb, ice, smoothstep(0.84, 0.92, lat));
    if (uLow < 0.5) {
      float dust = smoothstep(0.55, 0.85, fbm3(q * 2.0 + vec3(uTime * 0.01, 0.0, 0.0))) * 0.25;
      alb = mix(alb, bright, dust);
    }
  }

  // detail halus agar tetap tajam saat di-zoom (hanya tanpa foto)
  if (uHasMap < 0.5) alb *= 0.94 + 0.12 * noise(q * 40.0);

  // pencahayaan dengan batas siang-malam yang lembut
  float term = smoothstep(-0.05, 0.22, dot(q, sunO));
  float dif = max(dot(N, sunO), 0.0) * term;
  vec3 col = alb * (dif * vec3(1.0, 0.95, 0.88) * 1.35 + vec3(0.012, 0.007, 0.01));
  // redup di tepi planet, supaya terlihat seperti bola
  float mu = max(dot(normalize(vN), normalize(vView)), 0.0);
  col *= 0.55 + 0.45 * pow(mu, 0.5);

  // atmosfer sangat tipis: hanya samar di tepi yang terkena cahaya
  vec3 nV = normalize(vN);
  vec3 vV = normalize(vView);
  float fr = pow(max(1.0 - dot(nV, vV), 0.0), 5.0);
  float litEdge = max(dot(nV, uSunView), 0.0);
  col += uRim * fr * 0.12 * litEdge;

  gl_FragColor = vec4(col, 1.0);
}`;

  // bulan: permukaan berbatu dan berkawah, pencahayaan sama dengan planet
  var FS_MOON = `
uniform vec3 uSunView;
uniform vec3 uTint;
uniform vec3 uCrater;
uniform float uCraterCos;
uniform float uCraterOn;
uniform float uSeed;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vView;

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

void main() {
  vec3 d = normalize(vPos);
  float g = noise(d * 7.0 + uSeed) * 0.6 + noise(d * 18.0 + uSeed * 1.7) * 0.4;
  vec3 alb = uTint * (0.72 + 0.56 * g);
  // kawah besar (Stickney di Phobos): bagian dalam lebih gelap
  float cd = dot(d, normalize(uCrater));
  float bowl = uCraterOn * smoothstep(uCraterCos, 1.0, cd);
  alb *= 1.0 - 0.35 * bowl;
  float dif = max(dot(normalize(vN), normalize(uSunView)), 0.0);
  vec3 col = alb * (dif * 1.25 + 0.035);
  gl_FragColor = vec4(col, 1.0);
}`;

  /* ----- Three.js: renderer, scene, kamera ----- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.innerWidth <= 700 || /Mobi|Android/i.test(navigator.userAgent);
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: cv,
      alpha: true,
      antialias: !mobile,
      powerPreference: "high-performance"
    });
  } catch (err) {
    fail();
    return;
  }

  var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  var DIST = 5.0, DIST_MIN = 4.2, DIST_MAX = 10.0, DIST_FOCUS = 4.5, DIST_SYS = 10.0;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  var camDist = DIST, camDistT = DIST;
  camera.position.set(0, 0, camDist);

  // tekstur sementara (1 piksel) sebelum foto Mars selesai dimuat
  var placeholder = new THREE.DataTexture(new Uint8Array([150, 80, 45, 255]), 1, 1, THREE.RGBAFormat);
  placeholder.needsUpdate = true;

  var placeholderBump = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  placeholderBump.needsUpdate = true;

  var sunWorld = new THREE.Vector3(-0.75, 0.35, 0.55).normalize();
  var uniforms = {
    uTime: { value: 0 },
    uLow: { value: mobile ? 1 : 0 },
    uHasMap: { value: 0 },
    uMap: { value: placeholder },
    uBump: { value: placeholderBump },
    uHasBump: { value: 0 },
    uSunObj: { value: new THREE.Vector3() },
    uSunView: { value: new THREE.Vector3(0, 0, 1) },
    uRim: { value: new THREE.Vector3(1, 0.42, 0.17) }
  };

  /* ----- Memuat foto Mars dan peta relief ----- */
  function loadTex(url, done) {
    var img = new Image();
    img.onload = function () {
      var maxW = mobile ? 2048 : 4096;
      var w = Math.min(img.width, maxW);
      var h = Math.max(1, Math.round(w * img.height / img.width));
      var c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      var tex = new THREE.Texture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      done(tex);
    };
    img.onerror = function () { /* tetap pakai permukaan prosedural */ };
    img.src = url;
  }
  loadTex(TEXTURE_URL, function (tex) { uniforms.uMap.value = tex; uniforms.uHasMap.value = 1; });
  loadTex(BUMP_URL, function (tex) { uniforms.uBump.value = tex; uniforms.uHasBump.value = 1; });

  var segW = mobile ? 64 : 128, segH = mobile ? 48 : 96;
  var planetMat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: VS, fragmentShader: FS_PLANET });
  var planet = new THREE.Mesh(new THREE.SphereGeometry(1, segW, segH), planetMat);
  var tiltGroup = new THREE.Group();
  tiltGroup.add(planet);
  scene.add(tiltGroup);


  /* ----- Derau sederhana untuk bentuk bulan (dihitung di CPU) ----- */
  function h3(x, y, z) {
    var s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function vnoise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    var c000 = h3(xi, yi, zi), c100 = h3(xi + 1, yi, zi);
    var c010 = h3(xi, yi + 1, zi), c110 = h3(xi + 1, yi + 1, zi);
    var c001 = h3(xi, yi, zi + 1), c101 = h3(xi + 1, yi, zi + 1);
    var c011 = h3(xi, yi + 1, zi + 1), c111 = h3(xi + 1, yi + 1, zi + 1);
    var x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
    var x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
    var y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }
  function fbmCpu(x, y, z) {
    return vnoise(x, y, z) * 0.6 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.1;
  }

  /* ----- Bulan: Phobos dan Deimos (skala visual, periode sesuai data) ----- */
  // Periode asli (detik) dari data NASA: Phobos 7 jam 39 menit, Deimos 30 jam 18 menit
  var PHOBOS_T = 27540, DEIMOS_T = 109080;
  var MOONS = [
    { name: "Phobos", orbit: 1.55, radius: 0.085, stretch: [1.2, 0.95, 0.85], incl: 0.018,
      period: 40, phase: 0.6, tint: [0.46, 0.41, 0.37], ampl: 0.18, seed: 3.1,
      crater: [1, 0.3, 0.2], craterR: 0.42, craterDepth: 0.12 },
    // periode Deimos sekitar 4 kali Phobos, sama seperti data asli
    { name: "Deimos", orbit: 2.45, radius: 0.048, stretch: [1.1, 1.0, 0.95], incl: 0.031,
      period: 40 * DEIMOS_T / PHOBOS_T, phase: 2.4, tint: [0.52, 0.48, 0.44], ampl: 0.12, seed: 7.7,
      crater: null, craterR: 0, craterDepth: 0 }
  ];

  // bentuk bulan: bola yang ditarik dan diberi derau, dengan kawah bila ada
  function makeMoonMesh(m) {
    var geo = new THREE.SphereGeometry(1, 40, 28);
    var pos = geo.attributes.position;
    var v = new THREE.Vector3();
    var cdir = m.crater ? new THREE.Vector3(m.crater[0], m.crater[1], m.crater[2]).normalize() : null;
    for (var i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      var n = fbmCpu(v.x * 2.2 + m.seed, v.y * 2.2, v.z * 2.2) - 0.5;
      var r = 1 + m.ampl * n;
      if (cdir) {
        var ang = v.angleTo(cdir);
        if (ang < m.craterR) {
          var t = ang / m.craterR;
          r -= m.craterDepth * (1 - t * t);
        }
      }
      v.multiplyScalar(r);
      v.x *= m.stretch[0] * m.radius;
      v.y *= m.stretch[1] * m.radius;
      v.z *= m.stretch[2] * m.radius;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        uSunView: uniforms.uSunView,
        uTint: { value: new THREE.Vector3(m.tint[0], m.tint[1], m.tint[2]) },
        uCrater: { value: cdir ? cdir : new THREE.Vector3(0, 1, 0) },
        uCraterCos: { value: Math.cos(m.craterR) },
        uCraterOn: { value: cdir ? 1 : 0 },
        uSeed: { value: m.seed }
      },
      vertexShader: VS,
      fragmentShader: FS_MOON
    });
    return new THREE.Mesh(geo, mat);
  }

  var orbitMats = [];
  MOONS.forEach(function (m) {
    m.mesh = makeMoonMesh(m);
    // holder berputar di bidang ekuator Mars; bulan ada di ujung lengannya
    m.holder = new THREE.Group();
    m.holder.add(m.mesh);
    m.mesh.position.set(m.orbit, 0, 0);
    tiltGroup.add(m.holder);

    // garis orbit tipis dan transparan
    var pts = [];
    for (var k = 0; k <= 128; k++) {
      var a = k / 128 * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * m.orbit, 0, -Math.sin(a) * m.orbit));
    }
    var lineMat = new THREE.LineBasicMaterial({ color: 0xffe0c8, transparent: true, opacity: 0, depthWrite: false });
    var line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
    line.rotation.x = m.incl;
    tiltGroup.add(line);
    orbitMats.push(lineMat);
  });

  // lingkaran lama dari versi sebelumnya disembunyikan, digantikan bulan 3D
  ["m1", "m2"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  function resize() {
    var s = Math.max(120, pw.clientWidth);
    renderer.setSize(s, s, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(pw);
  else window.addEventListener("resize", resize);

  /* ----- Interaksi: seret, cubit, zoom ----- */
  var rot = 0, vel = 0;
  var tilt = 0.44, tiltX = 0, tiltBase = 0.44, tiltOff = 0;
  var dragging = false, lastX = 0, lastY = 0, pinch = 0;
  var pts = {};

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function zoomBy(k) { camDistT = clamp(camDistT * k, DIST_MIN, DIST_MAX); }
  function count() { return Object.keys(pts).length; }
  function pinchDist() {
    var ids = Object.keys(pts);
    var a = pts[ids[0]], b = pts[ids[1]];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  /* ----- Fokus ke lokasi (dari kartu di bagian Fakta) ----- */
  var focusing = false, focusRot = 0, focusLat = 0, focusTimer = 0;

  // ubah sudut target agar yang terdekat dengan posisi sekarang (supaya putaran tidak berbalik jauh)
  function nearAngle(target, ref) {
    var TAU = Math.PI * 2;
    var d = ((target - ref) % TAU + TAU * 1.5) % TAU - Math.PI;
    return ref + d;
  }

  function releaseFocus() {
    if (!focusing) return;
    focusing = false;
    camDistT = systemView ? DIST_SYS : DIST;
    clearTimeout(focusTimer);
  }

  function focusOn(latDeg, lonDeg) {
    var lat = latDeg * Math.PI / 180;
    var lon = lonDeg * Math.PI / 180;
    // posisi titik di permukaan, lalu sudut putar agar titik itu menghadap kamera
    var a = Math.cos(lat) * Math.cos(lon);
    var c = Math.cos(lat) * Math.sin(lon);
    focusRot = nearAngle(Math.atan2(c, a) - Math.PI / 2, rot);
    focusLat = lat;
    focusing = true;
    vel = 0;
    camDistT = DIST_FOCUS;
    clearTimeout(focusTimer);
    focusTimer = setTimeout(releaseFocus, 9000);
  }

  // koordinat dari teks kartu (sumber: NASA, sesuai bagian Fakta)
  var LOC = {
    "Olympus Mons": [18.65, -133.8],
    "Valles Marineris": [-8.5, -68]
  };
  var st = document.createElement("style");
  st.textContent =
    ".loc-card{cursor:pointer;transition:border-color .4s ease,transform .4s ease}" +
    ".loc-card:hover,.loc-card:focus-visible{border-color:rgba(255,106,43,.6);transform:translateY(-2px);outline:none}";
  document.head.appendChild(st);

  document.querySelectorAll("#menarik .card").forEach(function (card) {
    var b = card.querySelector("b");
    var name = b && b.textContent.trim();
    if (!name || !LOC[name]) return;
    card.classList.add("loc-card");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Lihat " + name + " di planet");
    var go = function () { focusOn(LOC[name][0], LOC[name][1]); };
    card.addEventListener("click", go);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
  });

  /* ----- Tampilan sistem (Mars + Phobos + Deimos) ----- */
  var systemView = false;
  var sysStyle = document.createElement("style");
  sysStyle.textContent =
    ".sys-btn{position:fixed;right:70px;bottom:22px;z-index:26;padding:9px 14px;border-radius:3px;" +
    "border:1px solid rgba(255,255,255,.16);background:rgba(12,10,20,.55);color:#eceaf2;" +
    "font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.18em;" +
    "text-transform:uppercase;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
    "transition:border-color .3s,background .3s}" +
    ".sys-btn:hover,.sys-btn:focus-visible{border-color:#ff6a2b;outline:none}" +
    ".sys-note{position:fixed;right:70px;bottom:62px;z-index:26;max-width:260px;" +
    "font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:9px;letter-spacing:.12em;line-height:1.5;" +
    "text-transform:uppercase;color:#a9a5b8;text-align:right;opacity:0;transition:opacity .4s ease;pointer-events:none}" +
    ".sys-note.on{opacity:1}" +
    "@media (max-width:700px){.sys-btn,.sys-note{right:18px}}";
  document.head.appendChild(sysStyle);

  var sysBtn = document.createElement("button");
  sysBtn.type = "button";
  sysBtn.className = "sys-btn";
  sysBtn.textContent = "Lihat sistem";
  sysBtn.setAttribute("aria-pressed", "false");
  document.body.appendChild(sysBtn);

  var sysNote = document.createElement("div");
  sysNote.className = "sys-note";
  sysNote.textContent = "Skala visual, bukan ukuran dan jarak sebenarnya";
  document.body.appendChild(sysNote);

  function toggleSystem() {
    systemView = !systemView;
    releaseFocus();
    camDistT = systemView ? DIST_SYS : DIST;
    sysBtn.textContent = systemView ? "Kembali" : "Lihat sistem";
    sysBtn.setAttribute("aria-pressed", systemView ? "true" : "false");
    sysNote.classList.toggle("on", systemView);
  }
  sysBtn.addEventListener("click", toggleSystem);

  /* ----- Kontrol simulasi: jeda, kecepatan, garis orbit, reset kamera ----- */
  var paused = false, orbitOn = true, speedIdx = 1;
  var SPEEDS = [0.5, 1, 2, 4];
  var ctrlStyle = document.createElement("style");
  ctrlStyle.textContent =
    ".sim-ctrl{position:fixed;left:18px;bottom:22px;z-index:26;display:flex;gap:8px}" +
    ".sim-ctrl button{min-width:44px;height:34px;padding:0 12px;border-radius:3px;border:1px solid rgba(255,255,255,.16);" +
    "background:rgba(12,10,20,.55);color:#eceaf2;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:10px;" +
    "letter-spacing:.14em;text-transform:uppercase;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
    "transition:border-color .3s,background .3s}" +
    ".sim-ctrl button:hover,.sim-ctrl button:focus-visible{border-color:#ff6a2b;outline:none}" +
    ".sim-ctrl button[aria-pressed=\"false\"]{color:#8b8798}";
  document.head.appendChild(ctrlStyle);

  var ctrlBox = document.createElement("div");
  ctrlBox.className = "sim-ctrl";
  ctrlBox.innerHTML =
    '<button type="button" id="simPlay">Jeda</button>' +
    '<button type="button" id="simSpeed">1×</button>' +
    '<button type="button" id="simOrbit" aria-pressed="true">Orbit</button>' +
    '<button type="button" id="simReset">Reset</button>';
  document.body.appendChild(ctrlBox);

  var simPlay = document.getElementById("simPlay");
  var simSpeed = document.getElementById("simSpeed");
  var simOrbit = document.getElementById("simOrbit");
  var simReset = document.getElementById("simReset");

  function resetView() {
    releaseFocus();
    camDistT = systemView ? DIST_SYS : DIST;
    rot = 0;
    vel = 0;
    tiltOff = 0;
  }

  simPlay.addEventListener("click", function () {
    paused = !paused;
    simPlay.textContent = paused ? "Main" : "Jeda";
  });
  simSpeed.addEventListener("click", function () {
    speedIdx = (speedIdx + 1) % SPEEDS.length;
    simSpeed.textContent = SPEEDS[speedIdx] + "×";
  });
  simOrbit.addEventListener("click", function () {
    orbitOn = !orbitOn;
    simOrbit.setAttribute("aria-pressed", orbitOn ? "true" : "false");
  });
  simReset.addEventListener("click", resetView);

  /* ----- Seret dan cubit ----- */
  cv.addEventListener("pointerdown", function (e) {
    releaseFocus();
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    if (count() === 1) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
    if (count() === 2) { dragging = false; pinch = pinchDist(); }
  });

  cv.addEventListener("pointermove", function (e) {
    if (!pts[e.pointerId]) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (count() === 2) {
      var d = pinchDist();
      if (pinch > 0) zoomBy(pinch / d);
      pinch = d;
      return;
    }
    if (dragging) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      vel = dx * 0.005;
      rot += vel;
      tiltOff = clamp(tiltOff + dy * 0.002, -0.4, 0.4);
    }
  });

  function endPointer(e) {
    delete pts[e.pointerId];
    var left = count();
    if (left === 0) dragging = false;
    if (left === 1) {
      var k = Object.keys(pts)[0];
      dragging = true;
      lastX = pts[k].x;
      lastY = pts[k].y;
    }
    if (left < 2) pinch = 0;
  }
  cv.addEventListener("pointerup", endPointer);
  cv.addEventListener("pointercancel", endPointer);

  cv.addEventListener("wheel", function (e) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? 1.08 : 0.92);
  }, { passive: false });

  function bind(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }
  bind("zin", function () { releaseFocus(); zoomBy(0.85); });
  bind("zout", function () { releaseFocus(); zoomBy(1.18); });
  bind("zreset", function () {
    releaseFocus();
    camDistT = systemView ? DIST_SYS : DIST;
    rot = 0;
    vel = 0;
    tiltOff = 0;
  });

  // arah cahaya ikut gerakan mouse
  window.addEventListener("pointermove", function (e) {
    if (reduce) return;
    var x = e.clientX / window.innerWidth - 0.5;
    var y = e.clientY / window.innerHeight - 0.5;
    sunWorld.set(-0.75 + x * 0.5, 0.35 - y * 0.4, 0.55).normalize();
  }, { passive: true });

  /* ----- Antarmuka untuk script.js ----- */
  api.setTheme = function (rgb, t) {
    uniforms.uRim.value.set(rgb[0], rgb[1], rgb[2]);
    tiltBase = t;
  };
  api.nudge = function (amount) {
    vel = clamp(vel + amount, -0.05, 0.05);
  };
  api.focusOn = focusOn;

  /* ----- Loop render ----- */
  var q = new THREE.Quaternion();
  var running = true, rafId = 0;
  var last = performance.now(), t0 = last, ema = 1 / 60, frames = 0;
  var autoSpeed = reduce ? 0 : 0.05;
  var simT = 0;   // waktu simulasi bulan (detik), tidak ikut berhenti saat fokus

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var t = (now - t0) / 1000;

    if (focusing) {
      rot += (focusRot - rot) * 0.06;
      vel = 0;
    } else {
      if (!dragging) { rot += vel; vel *= 0.93; }
      rot += autoSpeed * dt * (paused ? 0 : SPEEDS[speedIdx]);
    }

    // saat fokus, kemiringan dan lintang diatur agar lokasi tepat di tengah
    var tiltZGoal = focusing ? 0 : tiltBase + tiltOff;
    var tiltXGoal = focusing ? focusLat : 0;
    tilt += (tiltZGoal - tilt) * 0.05;
    tiltX += (tiltXGoal - tiltX) * 0.05;
    camDist += (camDistT - camDist) * 0.08;
    camera.position.set(0, 0, camDist);

    planet.rotation.y = rot;
    tiltGroup.rotation.set(tiltX, 0, tilt);
    uniforms.uTime.value = t;

    // orbit bulan: periode sesuai data (dengan rasio Phobos : Deimos yang benar)
    simT += dt * (reduce || paused ? 0 : SPEEDS[speedIdx]);
    MOONS.forEach(function (m) {
      m.holder.rotation.set(m.incl, m.phase + Math.PI * 2 * simT / m.period, 0);
    });
    var orbitTarget = orbitOn ? (systemView ? 0.22 : 0.08) : 0;
    orbitMats.forEach(function (mat) {
      mat.opacity += (orbitTarget - mat.opacity) * 0.08;
    });

    // arah matahari di ruang objek (ikut putaran planet) dan di ruang kamera
    planet.getWorldQuaternion(q).invert();
    uniforms.uSunObj.value.copy(sunWorld).applyQuaternion(q);
    camera.updateMatrixWorld();
    uniforms.uSunView.value.copy(sunWorld).transformDirection(camera.matrixWorldInverse);

    renderer.render(scene, camera);

    // turunkan resolusi otomatis kalau frame rate rendah
    ema = ema * 0.95 + dt * 0.05;
    if (++frames % 90 === 0 && ema > 1 / 36 && dpr > 0.8) {
      dpr = Math.max(0.8, dpr - 0.1);
      renderer.setPixelRatio(dpr);
      resize();
    }
  }

  // hemat baterai: berhenti saat tab tidak dilihat
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(rafId);
    } else if (!running) {
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    }
  });

  cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); fail(); });

  api.ok = true;
  rafId = requestAnimationFrame(frame);
})();
