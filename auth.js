/* =========================================================
   MARS — auth.js
   Login dengan email dan password memakai Firebase Authentication.
   - Tombol "Masuk" di pojok kiri bawah
   - Daftar akun baru, masuk, lupa password, dan keluar
   - WAJIB isi FIREBASE_CONFIG dengan milik proyekmu
   ========================================================= */
(function () {
  "use strict";

  /* ----- 1. KONFIGURASI: ganti dengan milik proyekmu dari Firebase ----- */
  var FIREBASE_CONFIG = {
    apiKey: "ISI_API_KEY",
    authDomain: "ISI_PROJECT_ID.firebaseapp.com",
    projectId: "ISI_PROJECT_ID",
    appId: "ISI_APP_ID"
  };
  var CONFIGURED = FIREBASE_CONFIG.apiKey.indexOf("ISI_") !== 0;

  var SDK_APP = "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js";
  var SDK_AUTH = "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js";

  var CSS = `
.auth-btn {
  position: fixed; left: 18px; bottom: 22px; z-index: 25;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 13px 22px; border: 0; border-radius: 999px;
  background: linear-gradient(135deg, #ff8a52 0%, #ff6a2b 45%, #d1501f 100%);
  color: #140700;
  font-family: "Space Mono", ui-monospace, Menlo, monospace;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase;
  cursor: pointer; overflow: hidden; isolation: isolate;
  box-shadow: 0 10px 30px rgba(255, 106, 43, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  animation: authGlow 3.2s ease-in-out infinite;
}
.auth-btn::before {
  content: "";
  position: absolute; top: 0; left: -90%;
  width: 60%; height: 100%;
  background: linear-gradient(105deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
  transform: skewX(-20deg);
  transition: left 0.9s cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: -1;
}
.auth-btn::after {
  content: "→";
  font-size: 14px; line-height: 1;
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.auth-btn:hover {
  transform: translateY(-3px);
}
.auth-btn:hover::before { left: 130%; }
.auth-btn:hover::after { transform: translateX(4px); }
.auth-btn:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
@keyframes authGlow {
  0%, 100% { box-shadow: 0 10px 30px rgba(255, 106, 43, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
  50% { box-shadow: 0 10px 42px rgba(255, 106, 43, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
}
@media (prefers-reduced-motion: reduce) {
  .auth-btn { animation: none; }
  .auth-btn::before { display: none; }
}
.auth-modal {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  background: rgba(3,3,8,0.7);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  padding: 20px;
}
.auth-modal[hidden] { display: none; }
.auth-box {
  position: relative; width: 100%; max-width: 340px;
  padding: 26px 24px 22px; border-radius: 12px;
  background: rgba(14,12,22,0.94);
  border: 1px solid rgba(255,255,255,0.1);
  color: #eceaf2; font-family: "Manrope", system-ui, sans-serif;
  box-shadow: 0 30px 80px rgba(0,0,0,0.6);
}
.auth-x {
  position: absolute; right: 12px; top: 8px;
  background: none; border: 0; color: #a9a5b8;
  font-size: 22px; cursor: pointer;
}
.auth-tabs { display: flex; gap: 6px; margin-bottom: 16px; }
.auth-tabs button {
  flex: 1; padding: 8px; border-radius: 3px;
  border: 1px solid rgba(255,255,255,0.1); background: transparent;
  color: #a9a5b8; font-family: "Space Mono", monospace; font-size: 11px;
  letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
}
.auth-tabs button.on { border-color: var(--acc, #ff6a2b); color: #eceaf2; }
.auth-box h3 {
  font-family: "Syne", system-ui, sans-serif; font-size: 22px;
  font-weight: 800; margin-bottom: 14px;
}
.auth-box label {
  display: block; font-family: "Space Mono", monospace; font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: #a9a5b8; margin-bottom: 12px;
}
.auth-box input {
  display: block; width: 100%; margin-top: 6px; padding: 10px 12px;
  border-radius: 3px; border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.04); color: #eceaf2;
  font-family: "Manrope", system-ui, sans-serif; font-size: 15px;
}
.auth-box input:focus { outline: none; border-color: var(--acc, #ff6a2b); }
.auth-err {
  min-height: 20px; margin: 4px 0 10px;
  font-size: 13px; line-height: 1.4; color: #ff9b7a;
}
.auth-submit {
  width: 100%; padding: 12px; border: 0; border-radius: 3px;
  background: var(--acc, #ff6a2b); color: #120600;
  font-family: "Space Mono", monospace; font-size: 11px; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; cursor: pointer;
}
.auth-submit:disabled { opacity: 0.6; cursor: default; }
.auth-link {
  display: block; margin: 12px auto 0; background: none; border: 0;
  color: #a9a5b8; font-size: 13px; text-decoration: underline; cursor: pointer;
}
`;

  var MARKUP = `
<button type="button" class="auth-btn" id="authBtn">Masuk</button>
<div class="auth-modal" id="authModal" hidden>
  <div class="auth-box" role="dialog" aria-modal="true" aria-labelledby="authTitle">
    <button type="button" class="auth-x" id="authX" aria-label="Tutup">×</button>
    <div class="auth-tabs">
      <button type="button" data-mode="login" class="on">Masuk</button>
      <button type="button" data-mode="signup">Daftar</button>
    </div>
    <h3 id="authTitle">Masuk</h3>
    <form id="authForm" novalidate>
      <label>Email<input type="email" id="authEmail" autocomplete="email" /></label>
      <label>Password<input type="password" id="authPass" autocomplete="current-password" /></label>
      <p class="auth-err" id="authErr" role="alert"></p>
      <button type="submit" class="auth-submit" id="authSubmit">Masuk</button>
      <button type="button" class="auth-link" id="authReset">Lupa password?</button>
    </form>
  </div>
</div>`;

  var $ = function (id) { return document.getElementById(id); };
  var auth = null;
  var mode = "login";

  function msg(code) {
    var map = {
      "auth/invalid-email": "Format email tidak valid.",
      "auth/missing-email": "Isi email dulu.",
      "auth/missing-password": "Isi password dulu.",
      "auth/weak-password": "Password minimal 6 karakter.",
      "auth/user-not-found": "Email atau password salah.",
      "auth/wrong-password": "Email atau password salah.",
      "auth/invalid-credential": "Email atau password salah.",
      "auth/email-already-in-use": "Email sudah terdaftar. Coba masuk saja.",
      "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
      "auth/network-request-failed": "Koneksi internet bermasalah.",
      "auth/operation-not-allowed": "Login email belum diaktifkan di Firebase.",
      "auth/unauthorized-domain": "Domain website belum ditambahkan di Firebase."
    };
    return map[code] || "Terjadi kesalahan. Coba lagi.";
  }

  function setErr(t) { $("authErr").textContent = t; }

  function setMode(m) {
    mode = m;
    var isLogin = m === "login";
    document.querySelectorAll("#authModal [data-mode]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-mode") === m);
    });
    $("authTitle").textContent = isLogin ? "Masuk" : "Buat akun";
    $("authSubmit").textContent = isLogin ? "Masuk" : "Daftar";
    $("authPass").setAttribute("autocomplete", isLogin ? "current-password" : "new-password");
    $("authReset").style.display = isLogin ? "block" : "none";
    setErr("");
  }

  function openModal() {
    $("authModal").hidden = false;
    setTimeout(function () { $("authEmail").focus(); }, 50);
  }

  function closeModal() {
    $("authModal").hidden = true;
    setErr("");
  }

  function showSignedIn(email) {
    var b = $("authBtn");
    b.textContent = "Keluar";
    b.title = email;
  }

  function showSignedOut() {
    var b = $("authBtn");
    b.textContent = "Masuk";
    b.title = "";
  }

  function onBtn() {
    if (!CONFIGURED) {
      openModal();
      setErr("Konfigurasi Firebase belum diisi di auth.js.");
      return;
    }
    if (!auth) return;
    if (auth.currentUser) {
      if (window.confirm("Keluar dari akun ini?")) auth.signOut();
      return;
    }
    openModal();
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!CONFIGURED) return setErr("Konfigurasi Firebase belum diisi di auth.js.");
    if (!auth) return setErr("Login belum siap. Coba refresh halaman.");

    var email = $("authEmail").value.trim();
    var pass = $("authPass").value;
    if (!email) return setErr(msg("auth/missing-email"));
    if (!pass) return setErr(msg("auth/missing-password"));

    setErr("");
    var btn = $("authSubmit");
    btn.disabled = true;

    var job = mode === "login"
      ? auth.signInWithEmailAndPassword(email, pass)
      : auth.createUserWithEmailAndPassword(email, pass);

    job.then(function () {
      $("authForm").reset();
      closeModal();
    }).catch(function (err) {
      setErr(msg(err.code));
    }).then(function () {
      btn.disabled = false;
    });
  }

  function onReset() {
    if (!CONFIGURED) return setErr("Konfigurasi Firebase belum diisi di auth.js.");
    if (!auth) return setErr("Login belum siap. Coba refresh halaman.");
    var email = $("authEmail").value.trim();
    if (!email) return setErr("Tulis email dulu, lalu klik Lupa password lagi.");
    auth.sendPasswordResetEmail(email)
      .then(function () {
        setErr("Link reset sudah dikirim ke email kamu. Cek juga folder spam.");
      })
      .catch(function (err) {
        setErr(msg(err.code));
      });
  }

  function bindUI() {
    $("authBtn").addEventListener("click", onBtn);
    $("authX").addEventListener("click", closeModal);
    $("authModal").addEventListener("click", function (e) {
      if (e.target === $("authModal")) closeModal();
    });
    document.querySelectorAll("#authModal [data-mode]").forEach(function (b) {
      b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); });
    });
    $("authForm").addEventListener("submit", onSubmit);
    $("authReset").addEventListener("click", onReset);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("authModal").hidden) closeModal();
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("gagal memuat " + src)); };
      document.head.appendChild(s);
    });
  }

  function start() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var box = document.createElement("div");
    box.innerHTML = MARKUP;
    while (box.firstChild) document.body.appendChild(box.firstChild);

    bindUI();
    setMode("login");

    if (!CONFIGURED) {
      $("authBtn").title = "Firebase belum dikonfigurasi";
      return;
    }

    loadScript(SDK_APP)
      .then(function () { return loadScript(SDK_AUTH); })
      .then(function () {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        auth.onAuthStateChanged(function (user) {
          if (user) showSignedIn(user.email);
          else showSignedOut();
        });
      })
      .catch(function () {
        $("authBtn").title = "Login gagal dimuat. Cek koneksi internet.";
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
