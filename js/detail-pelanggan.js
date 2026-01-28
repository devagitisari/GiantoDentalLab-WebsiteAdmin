import { db } from "./firebase-config.js";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ---------------------------
// Ambil ID dari URL
// ---------------------------
const urlParams = new URLSearchParams(window.location.search);
const idPelanggan = urlParams.get("id");

// Element tujuan
const elId = document.getElementById("idPelanggan");
const elUsername = document.getElementById("username");
const elNama = document.getElementById("nama");
const elKontak = document.getElementById("kontak");
const elAlamat = document.getElementById("alamat");
const elEmail = document.getElementById("email");

const tbodyRiwayat = document.getElementById("dataBody");
const noDataRow = document.getElementById("noDataRow");

// ---------------------------------------------------------
// 1. Ambil data detail pelanggan
// ---------------------------------------------------------
async function loadDetailPelanggan() {
    if (!idPelanggan) {
        alert("ID Pelanggan tidak ditemukan");
        return;
    }

    const pelangganRef = doc(db, "pelanggan", idPelanggan);
    const pelangganSnap = await getDoc(pelangganRef);

    if (!pelangganSnap.exists()) {
        alert("Data pelanggan tidak ditemukan!");
        return;
    }

    const data = pelangganSnap.data();

    // Isi data ke HTML
    elId.textContent = data.id_pelanggan || "-";
    elUsername.textContent = data.username || "-";
    elNama.textContent = data.nama_pelanggan || "-";
    elKontak.textContent = data.no_telp || "-";
    elEmail.textContent = data.email || "-";

    // Format alamat
    if (data.alamat) {
        elAlamat.innerHTML = `
            ${data.alamat.nama_jalan}, <br>
            ${data.alamat.kelurahan}, ${data.alamat.kecamatan}, <br>
            ${data.alamat.kota}, ${data.alamat.provinsi}
        `;
    } else {
        elAlamat.textContent = "-";
    }
}

// ---------------------------------------------------------
// 2. Load Riwayat (dari koleksi order/kunjungan/lainnya)
//    → Sesuaikan dengan koleksi riwayatmu
// ---------------------------------------------------------
// Cache biar tidak fetch berkali-kali
const layananCache = {};
const pelayananCache = {};

// Ambil nama layanan dari koleksi "layanan"
async function getNamaLayanan(id) {
    if (!id) return "-";
    if (layananCache[id]) return layananCache[id];

    const q = query(
        collection(db, "layanan"),
        where("id_layanan", "==", id)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
        const nama = snap.docs[0].data().nama_layanan || "-";
        layananCache[id] = nama;
        return nama;
    }

    return "-";
}

// Ambil nama pelayanan dari koleksi "pelayanan"
async function getNamaPelayanan(id) {
    if (!id) return "-";

    if (pelayananCache[id]) return pelayananCache[id];

    const ref = doc(db, "pelayanan", id);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const nama = snap.data().nama_pelayanan || "-";
        pelayananCache[id] = nama;
        return nama;
    }

    return "-";
}

function formatTanggal(timestamp) {
    if (!timestamp) return "-";

    // kalau Firestore Timestamp
    if (timestamp.toDate) {
        const date = timestamp.toDate();

        return date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    }

    // fallback kalau sudah string
    return timestamp;
}

function renderStatus(status) {
    if (!status) {
        return `<span class="badge badge-secondary">-</span>`;
    }

    switch (status) {
        case "menunggu":
            return `<span class="badge badge-warning">Menunggu</span>`;
        case "proses":
            return `<span class="badge badge-info">Proses</span>`;
        case "selesai":
            return `<span class="badge badge-success">Selesai</span>`;
        case "garansi":
            return `<span class="badge badge-primary">Dijadwalkan</span>`;
        case "batal":
            return `<span class="badge badge-danger">Ditolak</span>`;
        default:
            return `<span class="badge badge-secondary">${status}</span>`;
    }
}

// ======AMBIL DATA ORDER===========

async function getOrderPelanggan() {
    const q = query(
        collection(db, "order"),
        where("id_pelanggan", "==", idPelanggan)
    );

    const snap = await getDocs(q);

    const orders = [];

    for (const docItem of snap.docs) {
        orders.push({
            docId: docItem.id,
            ...docItem.data()
        });
    }

    return orders;
}

async function getGaransiByOrders(orderIds) {
    const snap = await getDocs(collection(db, "garansi"));

    const hasil = [];

    for (const docItem of snap.docs) {
        const g = docItem.data();

        if (orderIds.includes(g.id_order)) {
            hasil.push(g);
        }
    }

    return hasil;
}



// ===========================
// LOAD RIWAYAT ORDER
// ===========================
async function loadRiwayat() {

    tbodyRiwayat.innerHTML = "";
    let riwayat = [];

    // =====================
    // 1. ORDER pelanggan
    // =====================
    const orders = await getOrderPelanggan();
    const orderIds = orders.map(o => o.docId);

    for (const o of orders) {
        const namaLayanan = await getNamaLayanan(o.id_layanan);
        const namaPelayanan = await getNamaPelayanan(o.id_pelayanan);

        riwayat.push({
            created_at: o.created_at,
            layanan: namaLayanan,
            pelayanan: namaPelayanan,
            harga: o.total || 0,
            status: o.status
        });
    }

    // =====================
    // 2. GARANSI dari order tersebut
    // =====================
    const garansiList = await getGaransiByOrders(orderIds);

    for (const g of garansiList) {
        const namaPelayanan = await getNamaPelayanan(g.id_pelayanan);

        riwayat.push({
            created_at: g.created_at,
            layanan: g.nama_garansi || "Garansi",
            pelayanan: namaPelayanan,
            harga: 0,
            status: g.status || "garansi"
        });
    }

    // =====================
    // 3. SORT TERBARU
    // =====================
    riwayat.sort((a, b) => {
        const ta = a.created_at?.toDate?.() || 0;
        const tb = b.created_at?.toDate?.() || 0;
        return tb - ta;
    });

    // =====================
    // 4. RENDER
    // =====================
    if (riwayat.length === 0) {
        tbodyRiwayat.appendChild(noDataRow);
        return;
    }

    noDataRow.remove();

    for (const r of riwayat) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${formatTanggal(r.created_at)}</td>
            <td>${r.layanan}</td>
            <td>${r.pelayanan}</td>
            <td>${r.harga ? "Rp " + r.harga.toLocaleString("id-ID") : "-"}</td>
            <td>${renderStatus(r.status)}</td>
        `;
        tbodyRiwayat.appendChild(tr);
    }
}

// ----------------------
loadDetailPelanggan();
loadRiwayat();
