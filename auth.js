/* =====================================================
   MARS — FIREBASE AUTHENTICATION
   Login, Register, Logout, Reset Password
   ===================================================== */

(function () {
  "use strict";

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyB8WhZUCTxFVtSP1nOVhZRF5D1ONEOXDMQ",
    authDomain: "onstrom-4a90e.firebaseapp.com",
    projectId: "onstrom-4a90e",
    storageBucket: "onstrom-4a90e.firebasestorage.app",
    messagingSenderId: "161145607791",
    appId: "1:161145607791:web:c4554c2e0af9372f225f9a",
    measurementId: "G-KTJEVN6GLN"
  };

  let auth = null;
  let currentUser = null;

  const loadFirebase = () => new Promise((resolve, reject) => {
    if (window.firebase && window.firebase.auth) {
      resolve();
      return;
    }

    const scripts = [
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"
    ];

    let index = 0;

    function next() {
      if (index >= scripts.length) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = scripts[index++];
      script.onload = next;
      script.onerror = () => reject(
        new Error("Gagal memuat Firebase SDK.")
      );
      document.head.appendChild(script);
    }

    next();
  });

  function createUI() {
    if (document.getElementById("marsAuthStyle")) return;

    const style = document.createElement("style");
    style.id = "marsAuthStyle";
    style.textContent = `
      #marsAuthButton {
        position: fixed;
        top: 17px;
        right: 2vw;
        z-index: 1001;
        padding: 10px 17px;
        border: 1px solid #ff6a2b;
        border-radius: 4px;
        background: #ff6a2b;
        color: #120600;
        font: 11px monospace;
        letter-spacing: 1px;
        cursor: pointer;
      }

      #marsAuthOverlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(0,0,0,.82);
        backdrop-filter: blur(12px);
      }

      #marsAuthOverlay.active { display: flex; }

      #marsAuthBox {
        width: 100%;
        max-width: 390px;
        padding: 30px;
        border: 1px solid rgba(255,106,43,.35);
        border-radius: 12px;
        background: #100e17;
        color: #eceaf2;
        font-family: Arial,sans-serif;
        position: relative;
      }

      #marsAuthBox h2 {
        font-size: 25px;
        margin: 0 0 8px;
      }

      #marsAuthBox p {
        font-size: 13px;
        margin-bottom: 20px;
      }

      #marsAuthBox input {
        display: block;
        width: 100%;
        padding: 13px;
        margin: 12px 0;
        border: 1px solid #393342;
        border-radius: 5px;
        outline: none;
        background: #08070c;
        color: white;
        font-size: 14px;
      }

      #marsAuthBox input:focus {
        border-color: #ff6a2b;
      }

      #marsAuthBox button {
        width: 100%;
        padding: 13px;
        margin-top: 10px;
        border: 0;
        border-radius: 5px;
        background: #ff6a2b;
        color: #160800;
        font-weight: bold;
        cursor: pointer;
      }

      #marsAuthBox .secondary {
        background: transparent;
        color: #ff9b70;
        border: 1px solid #514052;
      }

      #marsAuthBox .close {
        position: absolute;
        top: 12px;
        right: 15px;
        width: auto;
        padding: 5px 10px;
        background: transparent;
        color: white;
        font-size: 20px;
      }

      #marsAuthMessage {
        min-height: 20px;
        margin-top: 12px;
        font-size: 12px;
        color: #ff9b70;
        overflow-wrap: anywhere;
      }

      #marsAuthBox .switch {
        margin-top: 18px;
        text-align: center;
        font-size: 12px;
        color: #aaa;
      }

      #marsAuthBox .switch a {
        color: #ff9b70;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "marsAuthButton";
    button.textContent = "LOGIN";
    document.body.appendChild(button);

    const overlay = document.createElement("div");
    overlay.id = "marsAuthOverlay";

    overlay.innerHTML = `
      <div id="marsAuthBox">
        <button class="close" id="marsAuthClose">×</button>
        <h2 id="marsAuthTitle">WELCOME BACK</h2>
        <p id="marsAuthSubtitle">Masuk untuk menjelajahi MARS.</p>

        <input id="marsAuthEmail" type="email"
          placeholder="Email" autocomplete="email">

        <input id="marsAuthPassword" type="password"
          placeholder="Password" autocomplete="current-password">

        <button id="marsAuthSubmit">LOGIN</button>
        <button class="secondary" id="marsAuthReset">
          LUPA PASSWORD?
        </button>

        <div id="marsAuthMessage"></div>

        <div class="switch">
          Belum punya akun?
          <a id="marsAuthSwitch">Daftar sekarang</a>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    button.addEventListener("click", () => {
      if (currentUser) {
        if (confirm("Apakah kamu ingin logout?")) {
          logout();
        }
      } else {
        openModal();
      }
    });

    document.getElementById("marsAuthClose")
      .addEventListener("click", closeModal);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeModal();
    });

    document.getElementById("marsAuthSwitch")
      .addEventListener("click", switchMode);

    document.getElementById("marsAuthSubmit")
      .addEventListener("click", submitAuth);

    document.getElementById("marsAuthReset")
      .addEventListener("click", resetPassword);
  }

  let registerMode = false;

  function openModal() {
    document.getElementById("marsAuthOverlay")
      .classList.add("active");
    showMessage("");
  }

  function closeModal() {
    document.getElementById("marsAuthOverlay")
      .classList.remove("active");
  }

  function showMessage(message) {
    document.getElementById("marsAuthMessage").textContent = message;
  }

  function switchMode() {
    registerMode = !registerMode;

    document.getElementById("marsAuthTitle").textContent =
      registerMode ? "CREATE ACCOUNT" : "WELCOME BACK";

    document.getElementById("marsAuthSubtitle").textContent =
      registerMode ? "Buat akun untuk bergabung." :
      "Masuk untuk menjelajahi MARS.";

    document.getElementById("marsAuthSubmit").textContent =
      registerMode ? "REGISTER" : "LOGIN";

    document.getElementById("marsAuthSwitch").textContent =
      registerMode ? "Login sekarang" : "Daftar sekarang";

    document.getElementById("marsAuthPassword").autocomplete =
      registerMode ? "new-password" : "current-password";

    showMessage("");
  }

  async function submitAuth() {
    const email = document.getElementById("marsAuthEmail")
      .value.trim();

    const password = document.getElementById("marsAuthPassword")
      .value;

    if (!email || !password) {
      showMessage("Email dan password wajib diisi.");
      return;
    }

    if (password.length < 6) {
      showMessage("Password minimal 6 karakter.");
      return;
    }

    const submit = document.getElementById("marsAuthSubmit");
    submit.disabled = true;
    submit.textContent = "PLEASE WAIT...";

    try {
      if (registerMode) {
        await auth.createUserWithEmailAndPassword(email, password);
        showMessage("Registrasi berhasil!");
      } else {
        await auth.signInWithEmailAndPassword(email, password);
        showMessage("Login berhasil!");
      }

      setTimeout(closeModal, 700);
    } catch (error) {
      const messages = {
        "auth/email-already-in-use": "Email sudah terdaftar.",
        "auth/invalid-email": "Format email tidak valid.",
        "auth/weak-password": "Password terlalu lemah.",
        "auth/user-not-found": "Akun tidak ditemukan.",
        "auth/wrong-password": "Password salah.",
        "auth/invalid-credential": "Email atau password salah.",
        "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
        "auth/network-request-failed": "Periksa koneksi internet."
      };

      showMessage(messages[error.code] || error.message);
      console.error("Firebase Auth:", error);
    } finally {
      submit.disabled = false;
      submit.textContent = registerMode ? "REGISTER" : "LOGIN";
    }
  }

  async function resetPassword() {
    const email = document.getElementById("marsAuthEmail")
      .value.trim();

    if (!email) {
      showMessage("Masukkan email terlebih dahulu.");
      return;
    }

    try {
      await auth.sendPasswordResetEmail(email);
      showMessage("Link reset password telah dikirim ke email.");
    } catch (error) {
      showMessage(error.message);
      console.error(error);
    }
  }

  async function logout() {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout gagal:", error);
      alert("Logout gagal: " + error.message);
    }
  }

  async function start() {
    createUI();

    try {
      await loadFirebase();

      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }

      auth = firebase.auth();

      auth.onAuthStateChanged(user => {
        currentUser = user;

        const button = document.getElementById("marsAuthButton");

        if (user) {
          button.textContent = "LOGOUT";
          button.title = user.email || "Akun pengguna";
          console.log("Login berhasil:", user.email);
        } else {
          button.textContent = "LOGIN";
          button.title = "Login ke akun";
          console.log("Pengguna belum login.");
        }
      });

      console.log("Firebase Authentication siap.");
    } catch (error) {
      console.error("Firebase gagal dimuat:", error);
      showMessage("Firebase gagal dimuat. Periksa koneksi dan konfigurasi.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
