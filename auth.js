/* =========================================================
   MARS / ONSTROM — AUTH.JS
   Firebase Authentication
   Fitur:
   - Login
   - Registrasi
   - Logout
   - Lupa password
   - Status login otomatis
   - Tampilan responsif
   ========================================================= */

(function () {
  "use strict";

  /* =========================================
     1. FIREBASE CONFIGURATION
     ========================================= */

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyB8WhZUCTxFVtSP1nOVhZRF5D1ONEOXDMQ",
    authDomain: "onstrom-4a90e.firebaseapp.com",
    projectId: "onstrom-4a90e",
    storageBucket: "onstrom-4a90e.firebasestorage.app",
    messagingSenderId: "161145607791",
    appId: "1:161145607791:web:c4554c2e0af9372f225f9a",
    measurementId: "G-KTJEVN6GLN"
  };

  var SDK_APP =
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js";

  var SDK_AUTH =
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js";

  var auth = null;
  var mode = "login";
  var initialized = false;

  /* =========================================
     2. STYLE LOGIN
     ========================================= */

  var CSS = `
.auth-btn {
  position: fixed;
  left: 18px;
  bottom: 22px;
  z-index: 55;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 22px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg,#ff8a52,#ff6a2b,#d1501f);
  color: #140700;
  font-family: "Space Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .2em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(255,106,43,.4);
  transition: .3s ease;
}

.auth-btn::after {
  content: "→";
  font-size: 14px;
}

.auth-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(255,106,43,.6);
}

.auth-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(3,3,8,.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.auth-modal[hidden] {
  display: none;
}

.auth-box {
  position: relative;
  width: 100%;
  max-width: 455px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 30px 32px 26px;
  border-radius: 14px;
  background: rgba(12,10,20,.97);
  border: 1px solid rgba(255,255,255,.12);
  color: #eceaf2;
  font-family: "Manrope",sans-serif;
  box-shadow: 0 30px 100px rgba(0,0,0,.7);
}

.auth-x {
  position: absolute;
  right: 15px;
  top: 10px;
  background: none;
  border: 0;
  color: #a9a5b8;
  font-size: 25px;
  cursor: pointer;
}

.auth-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.auth-tabs button {
  flex: 1;
  padding: 12px 8px;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 4px;
  background: transparent;
  color: #a9a5b8;
  font-family: "Space Mono",monospace;
  font-size: 11px;
  letter-spacing: .12em;
  cursor: pointer;
}

.auth-tabs button.on {
  border-color: #ff6a2b;
  color: white;
  background: rgba(255,106,43,.06);
}

.auth-box h3 {
  font-family: "Syne",sans-serif;
  font-size: 27px;
  font-weight: 800;
  margin-bottom: 22px;
}

.auth-box label {
  display: block;
  margin-bottom: 16px;
  color: #a9a5b8;
  font-family: "Space Mono",monospace;
  font-size: 11px;
  letter-spacing: .13em;
  text-transform: uppercase;
}

.auth-box input {
  display: block;
  width: 100%;
  margin-top: 9px;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.045);
  color: white;
  font-family: "Manrope",sans-serif;
  font-size: 15px;
  outline: none;
}

.auth-box input:focus {
  border-color: #ff6a2b;
  box-shadow: 0 0 0 2px rgba(255,106,43,.12);
}

.auth-err {
  min-height: 20px;
  margin: 5px 0 13px;
  color: #ff9b7a;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.auth-submit {
  width: 100%;
  padding: 16px;
  border: 0;
  border-radius: 4px;
  background: #ff6a2b;
  color: #120600;
  font-family: "Space Mono",monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .17em;
  cursor: pointer;
  transition: .3s ease;
}

.auth-submit:hover {
  filter: brightness(1.12);
}

.auth-submit:disabled {
  opacity: .55;
  cursor: wait;
}

.auth-link {
  display: block;
  margin: 15px auto 0;
  padding: 5px;
  border: 0;
  background: none;
  color: #a9a5b8;
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
}

@media(max-width:500px) {
  .auth-box {
    padding: 28px 22px 22px;
  }

  .auth-btn {
    left: 14px;
    bottom: 18px;
    padding: 12px 17px;
  }
}

@media(prefers-reduced-motion:reduce) {
  .auth-btn {
    transition: none;
  }
}
`;

  /* =========================================
     3. HTML LOGIN
     ========================================= */

  var MARKUP = `
<button type="button" class="auth-btn" id="authBtn">
  Masuk
</button>

<div class="auth-modal" id="authModal" hidden>
  <div class="auth-box"
       role="dialog"
       aria-modal="true"
       aria-labelledby="authTitle">

    <button type="button"
            class="auth-x"
            id="authX"
            aria-label="Tutup">×</button>

    <div class="auth-tabs">
      <button type="button" data-mode="login" class="on">
        Masuk
      </button>

      <button type="button" data-mode="signup">
        Daftar
      </button>
    </div>

    <h3 id="authTitle">Masuk</h3>

    <form id="authForm" novalidate>

      <label>
        Email
        <input
          type="email"
          id="authEmail"
          placeholder="nama@email.com"
          autocomplete="email"
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          id="authPass"
          placeholder="Masukkan password"
          autocomplete="current-password"
          minlength="6"
          required
        />
      </label>

      <p class="auth-err" id="authErr" role="alert"></p>

      <button type="submit"
              class="auth-submit"
              id="authSubmit">
        Masuk
      </button>

      <button type="button"
              class="auth-link"
              id="authReset">
        Lupa password?
      </button>

    </form>
  </div>
</div>
`;

  /* =========================================
     4. ELEMENT HELPER
     ========================================= */

  function $(id) {
    return document.getElementById(id);
  }

  function setErr(message) {
    $("authErr").textContent = message;
  }

  function setLoading(value) {
    $("authSubmit").disabled = value;
    $("authSubmit").textContent = value
      ? "MEMPROSES..."
      : mode === "login" ? "MASUK" : "DAFTAR";
  }

  /* =========================================
     5. ERROR HANDLER
     ========================================= */

  function msg(code) {
    var messages = {
      "auth/invalid-email": "Format email tidak valid.",
      "auth/missing-email": "Masukkan email terlebih dahulu.",
      "auth/missing-password": "Masukkan password terlebih dahulu.",
      "auth/weak-password": "Password minimal 6 karakter.",
      "auth/user-not-found": "Email atau password salah.",
      "auth/wrong-password": "Email atau password salah.",
      "auth/invalid-credential": "Email atau password salah.",
      "auth/email-already-in-use": "Email sudah terdaftar. Silakan masuk.",
      "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
      "auth/network-request-failed": "Koneksi internet bermasalah.",
      "auth/operation-not-allowed": "Aktifkan Email/Password di Firebase.",
      "auth/unauthorized-domain": "Domain website belum diizinkan Firebase.",
      "auth/invalid-api-key": "API Key Firebase tidak valid.",
      "auth/app-not-authorized": "Aplikasi belum diizinkan oleh Firebase."
    };

    return messages[code] || "Terjadi kesalahan: " + code;
  }

  /* =========================================
     6. MODAL CONTROL
     ========================================= */

  function openModal() {
    $("authModal").hidden = false;

    setTimeout(function () {
      $("authEmail").focus();
    }, 100);
  }

  function closeModal() {
    $("authModal").hidden = true;
    setErr("");
    $("authForm").reset();
    setLoading(false);
  }

  function setMode(newMode) {
    mode = newMode;

    var login = mode === "login";

    document.querySelectorAll("#authModal [data-mode]")
      .forEach(function (button) {
        button.classList.toggle(
          "on",
          button.dataset.mode === mode
        );
      });

    $("authTitle").textContent =
      login ? "Masuk" : "Buat akun";

    $("authSubmit").textContent =
      login ? "MASUK" : "DAFTAR";

    $("authPass").autocomplete =
      login ? "current-password" : "new-password";

    $("authReset").style.display =
      login ? "block" : "none";

    setErr("");
  }

  /* =========================================
     7. LOGIN STATUS
     ========================================= */

  function showSignedIn(user) {
    var button = $("authBtn");

    button.textContent = "Keluar";
    button.title = user.email || "Akun aktif";
    button.setAttribute("aria-label", "Keluar dari akun");
  }

  function showSignedOut() {
    var button = $("authBtn");

    button.textContent = "Masuk";
    button.title = "";
    button.setAttribute("aria-label", "Masuk ke akun");
  }

  /* =========================================
     8. LOGIN / REGISTER BUTTON
     ========================================= */

  function onBtn() {
    if (!auth) {
      openModal();
      setErr("Firebase belum siap. Periksa koneksi dan konfigurasi.");
      return;
    }

    if (auth.currentUser) {
      if (window.confirm("Yakin ingin keluar dari akun?")) {
        auth.signOut().catch(function (error) {
          window.alert(msg(error.code));
        });
      }
      return;
    }

    setMode("login");
    openModal();
  }

  /* =========================================
     9. LOGIN / REGISTER PROCESS
     ========================================= */

  function onSubmit(event) {
    event.preventDefault();

    if (!auth) {
      setErr("Firebase belum berhasil dimuat. Refresh halaman.");
      return;
    }

    var email = $("authEmail").value.trim();
    var password = $("authPass").value;

    if (!email) {
      setErr("Masukkan email terlebih dahulu.");
      return;
    }

    if (!password) {
      setErr("Masukkan password terlebih dahulu.");
      return;
    }

    if (password.length < 6) {
      setErr("Password minimal 6 karakter.");
      return;
    }

    setErr("");
    setLoading(true);

    var request = mode === "login"
      ? auth.signInWithEmailAndPassword(email, password)
      : auth.createUserWithEmailAndPassword(email, password);

    request
      .then(function (result) {
        console.log(
          "Firebase authentication berhasil:",
          result.user.email
        );

        closeModal();
      })
      .catch(function (error) {
        console.error("Firebase Auth Error:", error);
        setErr(msg(error.code));
      })
      .finally(function () {
        setLoading(false);
      });
  }

  /* =========================================
     10. RESET PASSWORD
     ========================================= */

  function onReset() {
    if (!auth) {
      setErr("Firebase belum siap.");
      return;
    }

    var email = $("authEmail").value.trim();

    if (!email) {
      setErr("Masukkan email terlebih dahulu.");
      $("authEmail").focus();
      return;
    }

    setErr("Mengirim link reset password...");

    auth.sendPasswordResetEmail(email)
      .then(function () {
        setErr("Link reset telah dikirim. Periksa email dan folder spam.");
      })
      .catch(function (error) {
        setErr(msg(error.code));
      });
  }

  /* =========================================
     11. LOAD FIREBASE SDK
     ========================================= */

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");

      script.src = url;
      script.onload = resolve;

      script.onerror = function () {
        reject(new Error("Tidak dapat memuat Firebase SDK."));
      };

      document.head.appendChild(script);
    });
  }

  /* =========================================
     12. INITIALIZE FIREBASE
     ========================================= */

  function initializeFirebase() {
    if (initialized) return Promise.resolve();

    return loadScript(SDK_APP)
      .then(function () {
        return loadScript(SDK_AUTH);
      })
      .then(function () {
        if (!window.firebase) {
          throw new Error("Firebase SDK tidak ditemukan.");
        }

        if (!firebase.apps.length) {
          firebase.initializeApp(FIREBASE_CONFIG);
        }

        auth = firebase.auth();

        auth.onAuthStateChanged(function (user) {
          if (user) {
            showSignedIn(user);
            console.log("Pengguna login:", user.email);
          } else {
            showSignedOut();
            console.log("Tidak ada pengguna login.");
          }
        });

        initialized = true;
        console.log("Firebase ONSTROM berhasil terhubung.");
      });
  }

  /* =========================================
     13. EVENT LISTENERS
     ========================================= */

  function bindUI() {
    $("authBtn").addEventListener("click", onBtn);

    $("authX").addEventListener("click", closeModal);

    $("authModal").addEventListener("click", function (event) {
      if (event.target === $("authModal")) {
        closeModal();
      }
    });

    document.querySelectorAll("#authModal [data-mode]")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          setMode(button.dataset.mode);
        });
      });

    $("authForm").addEventListener("submit", onSubmit);

    $("authReset").addEventListener("click", onReset);

    document.addEventListener("keydown", function (event) {
      if (
        event.key === "Escape" &&
        !$("authModal").hidden
      ) {
        closeModal();
      }
    });
  }

  /* =========================================
     14. START APPLICATION
     ========================================= */

  function start() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var container = document.createElement("div");
    container.innerHTML = MARKUP;

    while (container.firstChild) {
      document.body.appendChild(container.firstChild);
    }

    bindUI();
    setMode("login");

    initializeFirebase().catch(function (error) {
      console.error("Firebase initialization failed:", error);

      $("authBtn").title = "Firebase gagal dimuat";

      if (!$("authModal").hidden) {
        setErr("Firebase gagal dimuat. Periksa koneksi internet.");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

})();
