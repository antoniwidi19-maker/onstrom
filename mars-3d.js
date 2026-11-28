/* =========================================================
   MARS — mars-3d.js (versi 2)
   Planet Mars 3D dengan Three.js:
   - Tekstur foto Mars dari mars-texture.jpg (cadangan: permukaan prosedural)
   - Cahaya dari satu arah, sisi malam lebih gelap, cahaya atmosfer tipis di tepi
   - Diputar dengan seret (mouse atau sentuhan), inersia, lalu berputar pelan lagi
   - Zoom: Ctrl+scroll (desktop), cubit (HP), atau tombol + dan −
   - Klik kartu Olympus Mons atau Valles Marineris di bagian Fakta:
     kamera berputar dan zoom ke lokasi itu
   - Berhenti saat tab tidak aktif, kualitas turun otomatis jika berat
   - Jika WebGL atau Three.js tidak tersedia: pakai cadangan CSS (.nogl)
   ========================================================= */
(function () {
  "use strict";

  var TEXTURE_URL = "mars-texture.jpg";

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

  // bayangan dari relief kecil (hanya di desktop)
  vec3 N = q;
  if (uLow < 0.5) {
    float e = 0.012;
    float h0 = H(q);
    vec3 g = vec3(H(q + vec3(e,0.0,0.0)) - h0, H(q + vec3(0.0,e,0.0)) - h0, H(q + vec3(0.0,0.0,e)) - h0) / e;
    g -= dot(g, q) * q;
    N = normalize(q - g * 0.12);
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

  // detail halus agar tetap tajam saat di-zoom
  alb *= 0.94 + 0.12 * noise(q * 40.0);

  // pencahayaan dengan batas siang-malam yang lembut
  float term = smoothstep(-0.12, 0.25, dot(q, sunO));
  float dif = max(dot(N, sunO), 0.0) * term;
  vec3 col = alb * (dif * vec3(1.0, 0.95, 0.88) * 1.3 + vec3(0.025, 0.014, 0.018));

  // cahaya tipis atmosfer di tepi
  vec3 nV = normalize(vN);
  vec3 vV = normalize(vView);
  float fr = pow(max(1.0 - dot(nV, vV), 0.0), 3.0);
  col += uRim * fr * 0.5 * (0.3 + 0.7 * max(dot(nV, uSunView), 0.0));

  gl_FragColor = vec4(col, 1.0);
}`;

  var FS_ATMO = [
    "uniform vec3 uRim;",
    "uniform vec3 uSunView;",
    "varying vec3 vN;",
    "varying vec3 vView;",
    "void main() {",
    "  vec3 nV = normalize(vN);",
    "  vec3 vV = normalize(vView);",
    "  float fr = pow(max(1.0 - abs(dot(nV, vV)), 0.0), 2.5);",
    "  float lit = 0.25 + 0.75 * max(dot(nV, uSunView), 0.0);",
    "  gl_FragColor = vec4(uRim * fr * lit * 0.9, 1.0);",
    "}"
  ].join("\n");

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

  var DIST = 4.6, DIST_MIN = 3.2, DIST_MAX = 7.0, DIST_FOCUS = 3.5;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  var camDist = DIST, camDistT = DIST;
  camera.position.set(0, 0, camDist);

  // tekstur sementara (1 piksel) sebelum foto Mars selesai dimuat
  var placeholder = new THREE.DataTexture(new Uint8Array([150, 80, 45, 255]), 1, 1, THREE.RGBAFormat);
  placeholder.needsUpdate = true;

  var sunWorld = new THREE.Vector3(-0.75, 0.35, 0.55).normalize();
  var uniforms = {
    uTime: { value: 0 },
    uLow: { value: mobile ? 1 : 0 },
    uHasMap: { value: 0 },
    uMap: { value: placeholder },
    uSunObj: { value: new THREE.Vector3() },
    uSunView: { value: new THREE.Vector3(0, 0, 1) },
    uRim: { value: new THREE.Vector3(1, 0.42, 0.17) }
  };

  /* ----- Memuat foto Mars ----- */
  function loadMap(url) {
    var img = new Image();
    img.onload = function () {
      var maxW = mobile ? 2048 : 4096;
      var w = 1;
      while (w * 2 <= Math.min(img.width, maxW)) w *= 2;
      var h = Math.max(1, Math.round(w / 2));
      var c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      var tex = new THREE.Texture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      uniforms.uMap.value = tex;
      uniforms.uHasMap.value = 1;
    };
    img.onerror = function () { /* tetap pakai permukaan prosedural */ };
    img.src = url;
  }
  loadMap(TEXTURE_URL);

  var segW = mobile ? 64 : 128, segH = mobile ? 48 : 96;
  var planetMat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: VS, fragmentShader: FS_PLANET });
  var planet = new THREE.Mesh(new THREE.SphereGeometry(1, segW, segH), planetMat);
  var tiltGroup = new THREE.Group();
  tiltGroup.add(planet);
  scene.add(tiltGroup);

  var atmoMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: VS,
    fragmentShader: FS_ATMO,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.07, segW, segH), atmoMat));

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
    camDistT = DIST;
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

  // koordinat perkiraan untuk mengarahkan kamera (bukan data baru di halaman)
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
    camDistT = DIST;
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
      rot += autoSpeed * dt;
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
