// import firebase modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

// INISIASI HARUS BEGINI
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.loginAdmin = async function () {
    const idAdmin = document.getElementById("idAdmin").value.trim();
    const pwAdmin = document.getElementById("pwAdmin").value.trim();

    if (!idAdmin || !pwAdmin) {
        showError("Isi semua field!");
        return;
    }

    const q = query(
        collection(db, "admin"),
        where("id_admin", "==", idAdmin),
        where("pw_admin", "==", pwAdmin)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
        window.location.href = "dashboard.html";
    } else {
        showError("ID / Password salah!");
    }
};

function showError(msg) {
    const err = document.getElementById("errorMsg");
    err.innerText = msg;
    err.style.display = "block";
}

function hideError() {
    document.getElementById("errorMsg").style.display = "none";
}

document.getElementById("idAdmin").addEventListener("input", hideError);
document.getElementById("pwAdmin").addEventListener("input", hideError);


// SHOW / HIDE PASSWORD
window.togglePassword = function () {
    const input = document.getElementById("pwAdmin");
    const iconEye = document.querySelector(".bi-eye");
    const iconSlash = document.querySelector(".bi-eye-slash");

    if (input.type === "password") {
        input.type = "text";
        iconEye.style.display = "none";
        iconSlash.style.display = "inline";
    } else {
        input.type = "password";
        iconEye.style.display = "inline";
        iconSlash.style.display = "none";
    }
};