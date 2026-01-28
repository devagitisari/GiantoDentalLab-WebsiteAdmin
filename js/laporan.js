import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==============================
// UTK DROPDOWN
// ==============================

const dropdowns = document.querySelectorAll('.dropdown');

dropdowns.forEach(dropdown => {
    const select = dropdown.querySelector('.select');
    const caret = dropdown.querySelector('.caret');
    const menu = dropdown.querySelector('.menu');
    const options = dropdown.querySelectorAll('.menu li');
    const selected = dropdown.querySelectorAll('.selected');

    select.addEventListener('click', () => {
        select.classList.toggle('select-clicked');
        caret.classList.toggle('caret-rotated');
        menu.classList.toggle('menu-open');
    });

    options.forEach(option => {
        option.addEventListener('click', () => {
            selected.innerText = option.innerText;
            select.classList.remove('select-clicked');
            caret.classList.remove('caret-rotate');
            menu.classList.remove('menu-open');
            options.forEach(option => {
                option.classList.remove('active');
            });
            option.classList.add('active')
        });
    });
});

const dataBody = document.getElementById("dataBody");
const noDataRow = document.getElementById("noDataRow");

let allOrders = [];

const searchInput = document.querySelector(".search-box input");

searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase();
    const filtered = allOrders.filter(item => {
        return (
            item.namaPelanggan.toLowerCase().includes(keyword) ||
            item.idOrder.toLowerCase().includes(keyword) ||
            item.namaPelayanan.toLowerCase().includes(keyword)
        );
    });

    renderTabel(filtered);
});

function renderTabel(dataArray) {
    dataBody.innerHTML = "";
    if (dataArray.length === 0) {
        noDataRow.style.display = "table-row";
        return;
    } else {
        noDataRow.style.display = "none";
    }

    let no = 1;
    for (const item of dataArray) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${no++}</td>
            <td>${item.tanggal}</td>
            <td>${item.idOrder}</td>
            <td>${item.namaPelanggan}</td>
            <td>${item.idLayanan || "-"}</td>
            <td>${item.namaPelayanan}</td>
            <td>${formatRupiah(item.harga)}</td>
        `;
        dataBody.appendChild(tr);
    }
}

// ===========================
// Helper: format tanggal (15 September 2025)
// ===========================
function formatTanggal(timestamp) {
    if (!timestamp) return "-";

    const date = timestamp.toDate();
    const namaBulan = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const hari = date.getDate();
    const bulan = namaBulan[date.getMonth()];
    const tahun = date.getFullYear();

    return `${hari} ${bulan} ${tahun}`;
}

// ===========================
// Helper: format rupiah
// ===========================
function formatRupiah(angka) {
    if (!angka) return "Rp 0";

    return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ===========================
// Ambil harga dari catatan_kunjungan
// ===========================
async function getHargaByOrder(idOrder) {
    // 1. cari jadwal
    const qJadwal = query(
        collection(db, "jadwal"),
        where("id_order", "==", idOrder)
    );
    const jadwalSnap = await getDocs(qJadwal);
    if (jadwalSnap.empty) return 0;

    const idJadwal = jadwalSnap.docs[0].id;

    // 2. cari kunjungan
    const qKunjungan = query(
        collection(db, "kunjungan"),
        where("id_jadwal", "==", idJadwal)
    );
    const kunjunganSnap = await getDocs(qKunjungan);
    if (kunjunganSnap.empty) return 0;

    const idKunjungan = kunjunganSnap.docs[0].id;

    // 3. cari catatan_kunjungan
    const qCatatan = query(
        collection(db, "catatan_kunjungan"),
        where("id_kunjungan", "==", idKunjungan)
    );
    const catatanSnap = await getDocs(qCatatan);
    if (catatanSnap.empty) return 0;

    return catatanSnap.docs[0].data().total_harga || 0;
}

// ===========================
// Ambil nama pelanggan dari koleksi pelanggan
// ===========================
async function getNamaPelanggan(idPelanggan) {
    if (!idPelanggan) return "-";
    const pelangganRef = doc(db, "pelanggan", idPelanggan);
    const pelangganSnap = await getDoc(pelangganRef);
    if (pelangganSnap.exists()) {
        return pelangganSnap.data().nama_pelanggan || "-";
    }
    return "-";
}

// ===========================
// Load laporan (status = selesai)
// ===========================
async function loadLaporan() {
    dataBody.innerHTML = "";
    noDataRow.style.display = "none";

    const qOrder = query(
        collection(db, "order"),
        where("status", "==", "selesai")
    );
    const orderSnap = await getDocs(qOrder);

    if (orderSnap.empty) {
        noDataRow.style.display = "table-row";
        return;
    }

    let no = 1;

    for (const orderDoc of orderSnap.docs) {
        const order = orderDoc.data();

        // ===================
        // Jenis Pelayanan
        // ===================
        let namaPelayanan = "-";
        if (order.id_pelayanan) {
            const pelayananRef = doc(db, "pelayanan", order.id_pelayanan);
            const pelayananSnap = await getDoc(pelayananRef);
            if (pelayananSnap.exists()) {
                namaPelayanan = pelayananSnap.data().nama_pelayanan || "-";
            }
        }

        // ===================
        // Nama Pelanggan
        // ===================
        const namaPelanggan = await getNamaPelanggan(order.id_pelanggan);


        // ===================
        // Harga
        // ===================
        const harga = await getHargaByOrder(orderDoc.id);

        allOrders.push({
            idOrder: orderDoc.id,
            tanggal: formatTanggal(order.created_at),
            namaPelanggan,
            idLayanan: order.id_layanan,
            namaPelayanan,
            harga
        });

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${no++}</td>
            <td>${formatTanggal(order.created_at)}</td>
            <td>${orderDoc.id}</td>
            <td>${namaPelanggan || "-"}</td>
            <td>${order.id_layanan || "-"}</td>
            <td>${namaPelayanan}</td>
            <td>${formatRupiah(harga)}</td>
        `;

        dataBody.appendChild(tr);
    }
}

loadLaporan();
renderTabel(allOrders);

// -------------------------
// Event listener tombol Export
// -------------------------
// -------------------------
// Event listener tombol Export
// -------------------------
document.querySelector(".download-laporan").addEventListener("click", () => {
    exportToExcel();
});


function exportToExcel() {
    if (allOrders.length === 0) {
        alert("Tidak ada data untuk diexport");
        return;
    }

    // 1️⃣ Header kolom Excel
    const worksheetData = [
        ["No", "Tanggal", "ID Order", "Nama Pelanggan", "ID Layanan", "Jenis Pelayanan", "Harga"]
    ];

    // 2️⃣ Isi data
    allOrders.forEach((item, index) => {
        worksheetData.push([
            index + 1,
            item.tanggal,
            item.idOrder,
            item.namaPelanggan,
            item.idLayanan || "-",
            item.namaPelayanan,
            item.harga // simpan angka biar Excel bisa sum
        ]);
    });

    // 3️⃣ Buat worksheet & workbook
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");

    // 4️⃣ Styling kolom (opsional tapi cakep)
    worksheet["!cols"] = [
        { wch: 5 },   // No
        { wch: 18 },  // Tanggal
        { wch: 18 },  // ID Order
        { wch: 25 },  // Nama Pelanggan
        { wch: 15 },  // ID Layanan
        { wch: 25 },  // Jenis Pelayanan
        { wch: 15 }   // Harga
    ];

    // 5️⃣ Download file
    XLSX.writeFile(workbook, "laporan-GDL.xlsx");
}
