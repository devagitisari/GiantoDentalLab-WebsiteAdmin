import { db } from "./firebase-config.js";
import {
    doc, getDoc, collection, getDocs, query, where, updateDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ---------------------------
// Ambil id_order dari URL
// ---------------------------
const urlParams = new URLSearchParams(window.location.search);
const idOrder = urlParams.get("id");

// Set di halaman
const elIdOrder = document.getElementById("idOrder");
if (elIdOrder) elIdOrder.textContent = idOrder;

// ---------------------------
// Variabel global
// ---------------------------
let selectedDocId = null; // id dokumen kunjungan yg sedang diedit
let hargaPertama = 0;
let hargaSelanjutnya = 0;
let selectedIdOrder = "";
let selectedAktivitas = "";

// ---------------------------
// Load Detail Order
// ---------------------------

async function loadOrderDetail() {
    const params = new URLSearchParams(window.location.search);
    const idOrder = params.get("id");

    if (!idOrder) return;

    selectedIdOrder = idOrder;

    const orderRef = doc(db, "order", idOrder);
    const snap = await getDoc(orderRef);

    if (!snap.exists()) return;

    const data = snap.data();

    document.getElementById("nama").textContent = "-";
    document.getElementById("telp").textContent = "-";

    // 🔗 ambil pelanggan dari id_pelanggan
    if (data.id_pelanggan) {
        const pelangganRef = doc(db, "pelanggan", data.id_pelanggan);
        const pelangganSnap = await getDoc(pelangganRef);

        if (pelangganSnap.exists()) {
            const p = pelangganSnap.data();
            document.getElementById("nama").textContent = p.nama_pelanggan || "-";
            document.getElementById("telp").textContent = p.no_telp || "-";
        }
    }

    let namaPelayanan = "-";
    if (data.id_pelayanan) {
        const q = query(
            collection(db, "pelayanan"),
            where("id_pelayanan", "==", data.id_pelayanan)
        );
        const pelayananSnap = await getDocs(q);

        if (!pelayananSnap.empty) {
            const pel = pelayananSnap.docs[0].data();
            namaPelayanan = pel.nama_pelayanan || "-";
        }
    }
    document.getElementById("jenisPelayanan").textContent = namaPelayanan;

    // Ambil alamat lengkap dari gmaps
    let alamatTampil = "-";

    if (data.alamat_konfirmasi) {
        const g = data.alamat_konfirmasi;

        alamatTampil = [
            g.nama_jalan,
            g.kelurahan,
            g.kecamatan,
            g.kota,
            g.provinsi,
            g.negara
        ]
            .filter(Boolean)     // hilangkan yg null/undefined
            .join(", ");         // gabungkan jadi 1 string
    } else if (data.alamat_konfirmasi) {
        alamatTampil = data.alamat_konfirmasi;
    }

    document.getElementById("alamat").textContent = alamatTampil;

    // Ambil nama layanan
    let layananNama = "-";
    if (data.id_layanan) {
        const q = query(collection(db, "layanan"), where("id_layanan", "==", data.id_layanan));
        const layananSnap = await getDocs(q);
        if (!layananSnap.empty) {
            layananNama = layananSnap.docs[0].data().nama_layanan || "-";
            hargaPertama = parseInt(layananSnap.docs[0].data().harga_gigi_pertama || 0);
            hargaSelanjutnya = parseInt(layananSnap.docs[0].data().harga_gigi_selanjutnya || 0);
        }
    }
    document.getElementById("jenisLayanan").textContent = layananNama;
}

loadOrderDetail();

// ---------------------------
// Load Kunjungan
// ---------------------------
async function loadKunjungan() {
    const container = document.getElementById("kunjunganContainer");
    if (!container) return;

    container.innerHTML = "Memuat...";

    // 1️⃣ Ambil jadwal berdasarkan id_order
    const jadwalQ = query(
        collection(db, "jadwal"),
        where("id_order", "==", idOrder)
    );
    const jadwalSnap = await getDocs(jadwalQ);

    if (jadwalSnap.empty) {
        container.innerHTML = "<p>Belum ada jadwal.</p>";
        return;
    }

    container.innerHTML = "";

    // 2️⃣ Loop tiap jadwal → ambil kunjungannya
    for (const jadwalDoc of jadwalSnap.docs) {
        const jadwalId = jadwalDoc.id; // ← ini id_jadwal

        const kunjunganQ = query(
            collection(db, "kunjungan"),
            where("id_jadwal", "==", jadwalId)
        );
        const kunjunganSnap = await getDocs(kunjunganQ);

        kunjunganSnap.forEach(d => renderKunjunganCard(d, container));
    }
}
loadKunjungan();

function renderKunjunganCard(docSnap, container) {
    const data = docSnap.data();

    const cardDiv = document.createElement("div");
    cardDiv.classList.add("kunjungan-card");

    // Header
    const headerDiv = document.createElement("div");
    headerDiv.classList.add("header-card");

    const h3 = document.createElement("h3");
    h3.textContent = data.aktivitas || "Kunjungan";
    headerDiv.appendChild(h3);

    const btn = document.createElement("button");
    btn.textContent = "Tambah Catatan";
    btn.classList.add("view-btn");
    btn.addEventListener("click", () => {
        if ((data.aktivitas || "").toLowerCase() === "kunjungan 2") {
            openPopUp2(docSnap.id);
        } else {
            openPopUp(docSnap.id);
        }
    });
    headerDiv.appendChild(btn);

    cardDiv.appendChild(headerDiv);

    // Isi
    const pKet = document.createElement("p");
    pKet.textContent = data.keterangan || "-";
    cardDiv.appendChild(pKet);

    const pTanggal = document.createElement("p");
    pTanggal.innerHTML = `
        <strong>Tanggal:</strong> ${data.jadwal_kunjungan?.tanggal || "-"}
        | <strong>Jam:</strong> ${data.jadwal_kunjungan?.jam_mulai || "-"}
        - ${data.jadwal_kunjungan?.jam_selesai || "-"}
    `;
    cardDiv.appendChild(pTanggal);

    const pStatus = document.createElement("p");
    pStatus.innerHTML = `<strong>Status:</strong> ${data.status || "-"}`;
    cardDiv.appendChild(pStatus);

    container.appendChild(cardDiv);
}

// ---------------------------
// Open Popup
// ---------------------------
async function openPopUp(docId) {
    selectedDocId = docId;

    const container = document.getElementById("popupContainer");
    if (!container) return;

    // Load HTML popup
    const popupHTML = await fetch("popup-detailkunjung.html").then(r => r.text());
    container.innerHTML = popupHTML;

    const popup = document.getElementById("popupKunjungan1");
    popup.style.display = "flex";

    // Ambil data kunjungan
    const kunjRef = doc(db, "kunjungan", docId);
    const snap = await getDoc(kunjRef);

    if (snap.exists()) {
        const data = snap.data();

        const tanggalEl = document.getElementById("pop_tanggalKunjungan");
        tanggalEl.textContent = data.jadwal_kunjungan?.tanggal || "-";

        document.getElementById("pop_idOrder").value = idOrder;
        document.getElementById("pop_nmPelanggan").value = document.getElementById("nama").textContent || "";
        document.getElementById("pop_jenisLayanan").value = document.getElementById("jenisLayanan").textContent || "";
        document.getElementById("pop_idBahan").value = data.id_bahan || "";

        document.getElementById("pop_jmlhGigi").value = data.jumlah_gigi || 0;
        document.getElementById("pop_warna").value = data.warna || "";
        document.getElementById("pop_total").value = data.total?.toLocaleString("id-ID") || "0";
        document.getElementById("pop_terbayar").value = data.terbayar?.toLocaleString("id-ID") || "0";
        document.getElementById("pop_sisaBayar").value = data.sisa_bayar?.toLocaleString("id-ID") || "0";
    }

    // Event realtime hitung total & sisa
    document.getElementById("pop_jmlhGigi").addEventListener("input", hitungTotal);
    document.getElementById("pop_terbayar").addEventListener("input", hitungSisaPembayaran);
    document.getElementById("pop_idBahan").addEventListener("change", hitungTotal);

    // Close popup
    document.querySelector(".popup-close").onclick = closePopUp;
}

window.openPopUp = openPopUp;

// ---------------------------
// Close popup
// ---------------------------
function closePopUp() {
    const container = document.getElementById("popupContainer");
    if (container) container.innerHTML = "";
}

// ---------------------------
// Hitung Total & Sisa
// ---------------------------
function hitungTotal() {
    const jumlah = parseInt(document.getElementById("pop_jmlhGigi").value) || 0;

    let total = 0;
    if (jumlah > 0) {
        total = hargaPertama + (hargaSelanjutnya * (jumlah - 1));
    }

    document.getElementById("pop_total").value = total.toLocaleString("id-ID");
    hitungSisaPembayaran();
}

function hitungSisaPembayaran() {
    const total = parseInt((document.getElementById("pop_total").value || "0").replace(/\./g, "")) || 0;
    const terbayar = parseInt((document.getElementById("pop_terbayar").value || "0").replace(/\./g, "")) || 0;
    const sisa = total - terbayar;
    document.getElementById("pop_sisaBayar").value = sisa.toLocaleString("id-ID");

    // ⬇️ STATUS OTOMATIS
    const status = getStatusPembayaran(sisa);
    const info = document.getElementById("infoStatusBayar");

    if (info) {
        info.textContent =
            status === "Lunas"
                ? "Pembayaran lunas ✅"
                : "Pembayaran belum lunas. Harap lakukan penagihan pada kunjungan berikutnya.";

        info.className = "status-info " + (status === "Lunas" ? "lunas" : "");
    }
}

function getStatusPembayaran(sisa) {
    return sisa === 0 ? "Lunas" : "Belum Lunas";
}

// ---------------------------
// Open Popup 2 (Kunjungan 2)
// ---------------------------

async function openPopUp2(docId) {
    selectedDocId = docId;

    const container = document.getElementById("popupContainer");
    if (!container) return;

    // Load HTML popup 2
    const popupHTML = await fetch("popup-detailkunjung2.html").then(r => r.text());
    container.innerHTML = popupHTML;

    const popup = document.getElementById("popupKunjungan2");
    popup.style.display = "flex";

    // Ambil data kunjungan
    const kunjRef = doc(db, "kunjungan", docId);
    const snap = await getDoc(kunjRef);

    if (snap.exists()) {
        const data = snap.data();

        document.getElementById("pop2_tanggalKunjungan").textContent = data.jadwal_kunjungan?.tanggal || "-";

        document.getElementById("pop2_idOrder").value = idOrder;
        document.getElementById("pop2_nmPelanggan").value = document.getElementById("nama").textContent || "";
        document.getElementById("pop2_jenisLayanan").value = document.getElementById("jenisLayanan").textContent || "";
    }

    const docIdKunjungan1 = `kunjungan_1_${idOrder}`;
    const kunj1Ref = doc(db, "catatan_kunjungan", docIdKunjungan1);
    const snap1 = await getDoc(kunj1Ref);

    if (snap1.exists()) {
        const data1 = snap1.data();

        // Field dari kunjungan 1
        document.getElementById("pop2_jmlhGigi").value = data1.jumlah_gigi || 0;
        document.getElementById("pop2_warna").value = data1.warna_gigi || "";
        document.getElementById("pop2_total").value = data1.total_harga?.toLocaleString("id-ID") || "0";
        document.getElementById("pop2_terbayar").value = data1.terbayar?.toLocaleString("id-ID") || "0";

        const sisaLama = data1.sisa_pembayaran || 0;
        document.getElementById("pop2_sisaLama").value = sisaLama.toLocaleString("id-ID");

        // ======================
        // HITUNG SISA BARU OTOMATIS
        // ======================
        const inputTerbayarBaru = document.getElementById("pop2_bayarKedua");
        const inputSisaBaru = document.getElementById("pop2_sisaBaru");

        inputTerbayarBaru.addEventListener("input", () => {
            const bayarBaru = parseInt(inputTerbayarBaru.value.replace(/\./g, "")) || 0;
            const sisaBaru = sisaLama - bayarBaru;

            inputSisaBaru.value = sisaBaru.toLocaleString("id-ID");
        });
    }

    // Close popup
    document.querySelector(".popup-close").onclick = closePopUp;
}
window.openPopUp2 = openPopUp2;

// ---------------------------
// Submit Approval
// ---------------------------
async function submitApproval() {
    if (!selectedDocId) return alert("Dokumen kunjungan tidak ditemukan!");

    const jumlahGigi = document.getElementById("pop_jmlhGigi").value;
    const warna = document.getElementById("pop_warna").value;
    const idBahan = document.getElementById("pop_idBahan").value;
    const total = parseInt((document.getElementById("pop_total").value || "0").replace(/\./g, ""));
    const terbayar = parseInt((document.getElementById("pop_terbayar").value || "0").replace(/\./g, ""));
    const sisa = parseInt((document.getElementById("pop_sisaBayar").value || "0").replace(/\./g, ""));
    const status = getStatusPembayaran(sisa);

    try {
        // ======================
        // UPDATE CATATAN KUNJUNGAN
        // ======================

        let id_kunjungan = null;

        // 1. ambil jadwal dari order
        const jadwalQ = query(
            collection(db, "jadwal"),
            where("id_order", "==", idOrder)
        );
        const jadwalSnap = await getDocs(jadwalQ);

        if (jadwalSnap.empty) {
            return showAlertError("Jadwal tidak ditemukan!");
        }

        const id_jadwal = jadwalSnap.docs[0].id;

        // 2. ambil kunjungan dari jadwal
        const kunjunganQ = query(
            collection(db, "kunjungan"),
            where("id_jadwal", "==", id_jadwal)
        );
        const kunjunganSnap = await getDocs(kunjunganQ);

        if (kunjunganSnap.empty) {
            return showAlertError("Kunjungan tidak ditemukan!");
        }
        id_kunjungan = kunjunganSnap.docs[0].id;

        // 3. ambil id_jadwal 
        const kunjungRef = doc(db, "kunjungan", selectedDocId);
        const kSnap = await getDoc(kunjungRef);

        if (!kSnap.exists()) {
            return showAlertError("Data kunjungan tidak ditemukan!");
        }

        const idJadwal = kSnap.data().id_jadwal;

        const docIdKunjungan1 = `kunjungan_1_${idOrder}`;
        const kunjRef = doc(db, "catatan_kunjungan", docIdKunjungan1);

        await setDoc(kunjRef, {
            id_catatan: docIdKunjungan1,
            id_kunjungan: id_kunjungan,
            id_jadwal: idJadwal,
            aktivitas: "Kunjungan 1",
            jumlah_gigi: jumlahGigi,
            warna_gigi: warna,
            total_harga: total,
            terbayar: terbayar,
            sisa_pembayaran: sisa,
            status_pembayaran: status,
            updated_at: new Date()
        }, { merge: true });

        // ======================
        // UPDATE KUNJUNGAN
        // ======================
        const kunjunganRef = doc(db, "kunjungan", selectedDocId);
        await setDoc(kunjunganRef, {
            status: "selesai",
            updated_at: new Date()
        }, { merge: true });

        // ======================
        // UPDATE ORDER
        // ======================
        const orderRef = doc(db, "order", idOrder);
        const orderSnap = await getDoc(orderRef);

        let statusOrder = "proses"; // default

        if (orderSnap.exists()) {
            const dataOrder = orderSnap.data();

            const layananMap = {
                L04RT: 2,
                L02RP: 1,
                L01PB: 2,
                L03RB: 2
            };

            const jumlahKunjungan = layananMap[dataOrder.id_layanan];

            if (jumlahKunjungan === 1) {
                statusOrder = "selesai";
            } else if (jumlahKunjungan === 2) {
                statusOrder = dataOrder.selesai_kunjungan_2 ? "selesai" : "proses";
            }
        }

        await setDoc(orderRef, {
            status: statusOrder,
            updated_at: new Date()
        }, { merge: true });

        showAlertSuccess("Data kunjungan berhasil disimpan!");
        closePopUp();
        loadKunjungan();

    } catch (err) {
        console.error("Error submitApproval:", err);
        showAlertError("Gagal menyimpan data.");
    }
}

window.submitApproval = submitApproval;

// ---------------------------
// Submit Approval 2
// ---------------------------

async function submitApproval2() {
    if (!selectedDocId) return alert("Dokumen kunjungan tidak ditemukan!");

    // Ambil value dari popup 2
    const jumlahGigi = document.getElementById("pop2_jmlhGigi").value;
    const warna = document.getElementById("pop2_warna").value;

    const total = parseInt((document.getElementById("pop2_total").value || "0").replace(/\./g, "")) || 0;
    const terbayarLama = parseInt((document.getElementById("pop2_terbayar").value || "0").replace(/\./g, "")) || 0;
    const bayarKedua = parseInt((document.getElementById("pop2_bayarKedua").value || "0").replace(/\./g, "")) || 0;

    // Hitung total terbayar & sisa baru
    const totalTerbayar = terbayarLama + bayarKedua;
    const sisaBaru = total - totalTerbayar;

    const status = sisaBaru === 0 ? "Lunas" : "Belum Lunas";

    try {

        const kunjungRef = doc(db, "kunjungan", selectedDocId);
        const kunjunganSnap = await getDoc(kunjungRef);

        if (!kunjunganSnap.exists()) {
            return showAlertError("Data kunjungan tidak ditemukan!");
        }
        const id_jadwal = kunjunganSnap.data().id_jadwal;

        // ============================
        // SIMPAN KE catatan_kunjungan / kunjungan_2
        // ============================
        showLoading("Menyimpan...", "Mohon tunggu sebentar");

        const docIdKunjungan2 = `kunjungan_2_${idOrder}`;
        const kunjRef = doc(db, "catatan_kunjungan", docIdKunjungan2);

        await setDoc(kunjRef, {
            id_catatan: docIdKunjungan2,
            id_kunjungan: selectedDocId,
            id_jadwal: id_jadwal,
            aktivitas: "Kunjungan 2",

            // ⬅ Tambahan field yang kamu minta
            jumlah_gigi: jumlahGigi,
            warna_gigi: warna,
            total_harga: total,
            pembayaran_kedua: bayarKedua,

            // terbayar lama + baru
            terbayar: totalTerbayar,
            sisa_pembayaran: sisaBaru,

            status_pembayaran: status,
            updated_at: new Date()
        }, { merge: true });

        // ============================
        // UPDATE KUNJUNGAN
        // ============================
        const kunjunganRef = doc(db, "kunjungan", selectedDocId);
        await updateDoc(kunjunganRef, {
            status: "selesai",
            updated_at: new Date()
        });

        // ============================
        // UPDATE ORDER → Selesai Total
        // ============================
        const orderRef = doc(db, "order", idOrder);
        await setDoc(orderRef, {
            status: "selesai",
            status_pembayaran: status,
            total: total,
            terbayar: totalTerbayar,
            sisa_bayar: sisaBaru,
            updated_at: new Date()
        }, { merge: true });

        showAlertSuccess("Data kunjungan 2 berhasil disimpan!");
        closePopUp();
        loadKunjungan();

    } catch (err) {
        console.error("Error submitApproval2:", err);
        showAlertError("Gagal menyimpan data kunjungan 2.");
    }
}
window.submitApproval2 = submitApproval2;

// =============
// UTK ALERT
// =============

let alertTimer;

function showLoading(title = "Memproses...", message = "Mohon tunggu sebentar") {
    const overlay = document.getElementById("alertOverlay");
    const icon = document.getElementById("alertIcon");

    icon.className = "material-icons alert-icon loading";
    icon.textContent = "autorenew";

    document.getElementById("alertTitle").textContent = title;
    document.getElementById("alertMessage").textContent = message;

    overlay.classList.remove("hidden");
}

function showAlertSuccess(title, message) {
    showResultAlert("success", "check_circle", title, message);
}

function showAlertError(title, message) {
    showResultAlert("error", "error", title, message);
}

function showResultAlert(type, iconName, title, message) {
    const overlay = document.getElementById("alertOverlay");
    const icon = document.getElementById("alertIcon");

    icon.className = `material-icons alert-icon ${type}`;
    icon.textContent = iconName;

    document.getElementById("alertTitle").textContent = title;
    document.getElementById("alertMessage").textContent = message;

    clearTimeout(alertTimer);
    alertTimer = setTimeout(() => {
        overlay.classList.add("hidden");
    }, 2000);
}