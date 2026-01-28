import { db } from "./firebase-config.js";
import {
    doc, getDoc, collection, getDocs, query, where, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ---------------------------
// Ambil id_garansi dari URL
// ---------------------------
const urlParams = new URLSearchParams(window.location.search);
const idGaransi = urlParams.get("id");

// Set di halaman
const elIdGaransi = document.getElementById("idGaransi");
if (elIdGaransi) elIdGaransi.textContent = idGaransi;

// ---------------------------
// Variabel global
// ---------------------------
let selectedDocId = null; // id dokumen garansi yg sedang diedit
let hargaPertama = 0;
let hargaSelanjutnya = 0;
let selectedIdOrder = "";

function formatAlamat(alamat) {
    if (!alamat || typeof alamat !== "object") return "-";

    const parts = [
        alamat.nama_jalan,
        alamat.kelurahan,
        alamat.kecamatan,
        alamat.kota,
        alamat.provinsi
    ];

    // filter yg kosong / undefined
    return parts.filter(Boolean).join(", ");
}

// ---------------------------
// Load Detail Garansi
// ---------------------------
async function loadGaransiDetail() {
    if (!idGaransi) return;

    const garansiRef = doc(db, "garansi", idGaransi);
    const snapGaransi = await getDoc(garansiRef);
    if (!snapGaransi.exists()) return;

    const dataGaransi = snapGaransi.data();
    selectedIdOrder = dataGaransi.id_order;

    // Ambil data order untuk nama & telepon
    let nama = "-";
    let telepon = "-";

    // =========================
    // garansi → order
    // =========================
    if (dataGaransi.id_order) {
        const orderRef = doc(db, "order", dataGaransi.id_order);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
            const dataOrder = orderSnap.data();
            const idPelanggan = dataOrder.id_pelanggan;

            // =========================
            // order → pelanggan
            // =========================
            if (idPelanggan) {
                const pelangganRef = doc(db, "pelanggan", idPelanggan);
                const pelangganSnap = await getDoc(pelangganRef);

                if (pelangganSnap.exists()) {
                    const p = pelangganSnap.data();
                    nama = p.nama_pelanggan || "-";
                    telepon = p.no_telp || "-";
                }
            }
        }
    }
    document.getElementById("nama").textContent = nama;
    document.getElementById("telp").textContent = telepon;

    // Ambil nama layanan & harga
    document.getElementById("jenisLayanan").textContent = dataGaransi.nama_garansi;

    // Keterangan 
    let namaPelayanan = "-";
    if (dataGaransi.id_pelayanan) {
        const pelayananRef = doc(db, "pelayanan", dataGaransi.id_pelayanan);
        const pelayananSnap = await getDoc(pelayananRef);
        if (pelayananSnap.exists()) {
            const dataPelayanan = pelayananSnap.data();
            namaPelayanan = dataPelayanan.nama_pelayanan || "-";
        }
    }
    document.getElementById("jenisPelayanan").textContent = namaPelayanan || "-";

    const alamatFormatted = formatAlamat(dataGaransi.alamat_konfirmasi);
    document.getElementById("alamat").textContent = alamatFormatted;
}

loadGaransiDetail();

// ---------------------------
// Load Catatan / Aktivitas Garansi
// ---------------------------
async function loadCatatanGaransi() {
    const container = document.getElementById("garansiContainer");
    if (!container) return;

    const q = query(collection(db, "kunjungan"), where("id_garansi", "==", idGaransi));
    const snap = await getDocs(q);

    if (snap.empty) {
        container.innerHTML = "<p>Belum ada catatan garansi.</p>";
        return;
    }

    container.innerHTML = "";

    snap.forEach(d => {
        const data = d.data();

        const cardDiv = document.createElement("div");
        cardDiv.classList.add("garansi-card");

        const headerDiv = document.createElement("div");
        headerDiv.classList.add("header-card");

        const h3 = document.createElement("h3");
        h3.textContent = data.aktivitas;
        headerDiv.appendChild(h3);

        const btn = document.createElement("button");
        btn.textContent = "Selesai";
        btn.classList.add("btn-selesai");

        btn.addEventListener("click", async () => {
            await selesaiGaransi(d.id);
        });
        headerDiv.appendChild(btn);

        cardDiv.appendChild(headerDiv);

        const pKet = document.createElement("p");
        pKet.textContent = data.keterangan || "-";
        cardDiv.appendChild(pKet);

        const pTanggal = document.createElement("p");
        const tanggal = data.jadwal_kunjungan?.tanggal || "-";

        pTanggal.innerHTML = `
            <strong>Tanggal:</strong> ${tanggal} |
            <strong>Status:</strong> ${data.status || "-"}
        `;
        cardDiv.appendChild(pTanggal);

        container.appendChild(cardDiv);

        if (data.status === "Selesai") {
            btn.disabled = true;
            btn.textContent = "Selesai ✔";
        }
    });
}

loadCatatanGaransi();

let popupTimeout;

function showLoadingPopup() {
    const overlay = document.getElementById("popupOverlay");
    const icon = document.getElementById("popupIcon");

    icon.className = "material-icons popup-icon loading";
    icon.textContent = "autorenew";

    document.getElementById("popupTitle").textContent = "Memproses...";
    document.getElementById("popupMessage").textContent = "Mohon tunggu sebentar";

    overlay.classList.remove("hidden");
}

function showResultPopup(type, title, message) {
    const icon = document.getElementById("popupIcon");

    icon.classList.remove("loading", "success", "error");

    if (type === "success") {
        icon.classList.add("success");
        icon.textContent = "check_circle";
    } else {
        icon.classList.add("error");
        icon.textContent = "error";
    }

    document.getElementById("popupTitle").textContent = title;
    document.getElementById("popupMessage").textContent = message;

    clearTimeout(popupTimeout);
    popupTimeout = setTimeout(() => {
        document.getElementById("popupOverlay").classList.add("hidden");
    }, 2000);
}

async function selesaiGaransi(idKunjungan) {
    try {
        showLoadingPopup(); // 🔄 tampil spinner dulu

        // 1️⃣ update kunjungan
        await updateDoc(doc(db, "kunjungan", idKunjungan), {
            status: "Selesai",
            updated_at: new Date()
        });

        // 2️⃣ update garansi
        await updateDoc(doc(db, "garansi", idGaransi), {
            status: "Selesai",
            updated_at: new Date()
        });

        // 3️⃣ sukses
        showResultPopup(
            "success",
            "Sukses!",
            "Garansi telah selesai!"
        );

        loadCatatanGaransi();

    } catch (err) {
        console.error(err);

        showResultPopup(
            "error",
            "Gagal!",
            "Terjadi kesalahan saat menyelesaikan garansi"
        );
    }
}
