import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    getDoc,
    query,
    where,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


function formatTanggal() {
    const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const today = new Date();

    const namaHari = hari[today.getDay()];
    const tanggal = today.getDate();
    const namaBulan = bulan[today.getMonth()];
    const tahun = today.getFullYear();

    document.getElementById("tanggalHeader").innerText = `${namaHari}, ${tanggal} ${namaBulan} ${tahun}`;
}
formatTanggal();

const monthYearElement = document.getElementById('monthYear');
const datesElement = document.getElementById('dates');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

let currentDate = new Date();

const updateCalendar = () => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const firstDay = new Date(currentYear, currentMonth, 0);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    const firstDayIndex = firstDay.getDay();
    const lastDayIndex = lastDay.getDay();

    const monthYearString = currentDate.toLocaleString
        ('default', { month: 'long', year: 'numeric' });
    monthYearElement.textContent = monthYearString;

    let datesHTML = '';

    for (let i = firstDayIndex; i > 0; i--) {
        const prevDate = new Date(currentYear, currentMonth, 0 -
            i + 1);
        datesHTML += `<div class="date inactive">${prevDate.getDate()}</div>`;
    }

    for (let i = 1; i <= totalDays; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const activeClass = date.toDateString() === new Date().toDateString() ? 'active' : '';
        datesHTML += `<div class="date ${activeClass}">${i}</div>`;
    }

    for (let i = 1; i <= 7 - lastDayIndex; i++) {
        const nextDate = new Date(currentYear, currentMonth + 1, i);
        datesHTML += `<div class="date inactive">${nextDate.getDate()}</div>`;
    }

    datesElement.innerHTML = datesHTML;
}

prevBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
})

nextBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
})

updateCalendar();

/* =========================
   ELEMENT
========================= */
const scheduleList = document.getElementById("scheduleList");
const emptySchedule = document.getElementById("emptySchedule");

const listHariIni = document.getElementById("listHariIni");
const countTerjadwal = document.getElementById("countTerjadwal");

const btnSemua = document.getElementById("btnSemua");
const btnHari = document.getElementById("btnHari");
const btnBulan = document.getElementById("btnBulan");
const btnTahun = document.getElementById("btnTahun");

/* =========================
   STATE
========================= */
let allKunjungan = [];

/* =========================
   HELPER
========================= */
function parseTanggalDMY(tanggalStr) {
    const [d, m, y] = tanggalStr.split("/");
    return new Date(y, m - 1, d);
}

function isSameDay(d1, d2) {
    return d1.toDateString() === d2.toDateString();
}

function setActive(btn) {
    document.querySelectorAll(".filter-btn")
        .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

/* =========================
   LOAD DATA UTAMA
========================= */
async function loadScheduleList() {
    allKunjungan = [];

    const snap = await getDocs(collection(db, "kunjungan"));
    snap.forEach(d => {
        allKunjungan.push({ id: d.id, ...d.data() });
    });

    renderSchedule(allKunjungan);
    await loadJadwalHariIni(); // 🔥 PENTING
}

/* =========================
   RENDER PANEL KANAN
========================= */
async function renderSchedule(dataList) {
    scheduleList.innerHTML = "";

    // 🔥 FILTER HANYA YANG DIJADWALKAN DAN BELUM SELESAI
    const filtered = dataList.filter(
        k => {
            const status = (k.status || "").toLowerCase();
            return status === "dijadwalkan"; // hanya tampilkan yg dijadwalkan
        }
    );

    if (!filtered.length) {
        emptySchedule.style.display = "block";
        return;
    }

    emptySchedule.style.display = "none";

    for (const k of filtered) { // pakai filtered, bukan dataList
        const jk = k.jadwal_kunjungan || {};
        const waktuText = `${jk.tanggal || "-"} | ${jk.jam_mulai || "-"} - ${jk.jam_selesai || "-"} WIB`;

        let namaPelanggan = "-";
        let alamatText = "-";

        if (k.id_jadwal) {
            const jadwalSnap = await getDoc(doc(db, "jadwal", k.id_jadwal));
            if (jadwalSnap.exists()) {
                const jadwal = jadwalSnap.data();
                if (jadwal.id_order) {
                    const orderSnap = await getDoc(doc(db, "order", jadwal.id_order));
                    if (orderSnap.exists()) {
                        const order = orderSnap.data();
                        if (order.id_pelanggan) {
                            const pSnap = await getDoc(doc(db, "pelanggan", order.id_pelanggan));
                            if (pSnap.exists()) {
                                const p = pSnap.data();
                                namaPelanggan = p.nama_pelanggan || "-";
                                const a = p.alamat || {};
                                alamatText = [a.nama_jalan, a.kelurahan, a.kecamatan, a.provinsi]
                                    .filter(Boolean).join(", ");
                            }
                        }
                    }
                }
            }
        }

        const card = document.createElement("div");
        card.className = "schedule-card";
        card.innerHTML = `
            <div class="schedule-left">
                <div class="time">${waktuText}</div>
                <h4>${namaPelanggan}</h4>
                <p class="desc">${k.keterangan || "-"}</p>
                <div class="address">
                    <span class="material-symbols-rounded">location_on</span>
                    ${alamatText}
                </div>
            </div>
            <div class="schedule-right">
                <span class="badge">${k.aktivitas || "-"}</span>
            </div>
        `;
        scheduleList.appendChild(card);
    }
}

/* =========================
   JADWAL HARI INI (KIRI)
========================= */
async function loadJadwalHariIni() {
    listHariIni.innerHTML = "";
    const today = new Date();

    const kunjunganHariIni = allKunjungan.filter(k =>
        (k.status || "").toLowerCase() === "dijadwalkan" &&
        k.jadwal_kunjungan?.tanggal &&
        isSameDay(parseTanggalDMY(k.jadwal_kunjungan.tanggal.trim()), today)
    );

    if (!kunjunganHariIni.length) {
        countTerjadwal.innerText = 0;
        listHariIni.innerHTML = `<p class="empty-text">Tidak ada jadwal</p>`;
        return;
    }

    countTerjadwal.innerText = kunjunganHariIni.length;

    const items = await Promise.all(kunjunganHariIni.map(async k => {
        let namaPelanggan = "-";
        let namaLayanan = "-";

        if (k.id_jadwal) {
            const jadwalSnap = await getDoc(doc(db, "jadwal", k.id_jadwal));
            if (jadwalSnap.exists()) {
                const jadwal = jadwalSnap.data();

                if (jadwal.id_order) {
                    const orderSnap = await getDoc(doc(db, "order", jadwal.id_order));
                    if (orderSnap.exists()) {
                        const order = orderSnap.data();

                        if (order.id_pelanggan) {
                            const pSnap = await getDoc(doc(db, "pelanggan", order.id_pelanggan));
                            if (pSnap.exists()) namaPelanggan = pSnap.data().nama_pelanggan;
                        }

                        if (order.id_layanan) {
                            const lSnap = await getDoc(doc(db, "layanan", order.id_layanan));
                            if (lSnap.exists()) namaLayanan = lSnap.data().nama_layanan;
                        }
                    }
                }
            }
        }

        const item = document.createElement("div");
        item.className = "jadwal-item";
        item.innerHTML = `
            <div class="jadwal-left">
                <div class="title">
                    ${namaPelanggan} | ${k.aktivitas} | ${namaLayanan}
                </div>
                <div class="time">
                    ${k.jadwal_kunjungan.jam_mulai} – ${k.jadwal_kunjungan.jam_selesai} WIB
                </div>
            </div>
            <div class="jadwal-right">
                <input type="checkbox">
            </div>
        `;
        return item;
    }));

    items.forEach(item => listHariIni.appendChild(item));
}

/* =========================
   FILTER BUTTON
========================= */
btnSemua.onclick = () => renderSchedule(allKunjungan);

btnHari.onclick = () => {
    const today = new Date();
    renderSchedule(allKunjungan.filter(k =>
        k.jadwal_kunjungan?.tanggal &&
        isSameDay(parseTanggalDMY(k.jadwal_kunjungan.tanggal), today)
    ));
};

btnBulan.onclick = () => {
    const now = new Date();
    renderSchedule(allKunjungan.filter(k => {
        if (!k.jadwal_kunjungan?.tanggal) return false;
        const d = parseTanggalDMY(k.jadwal_kunjungan.tanggal);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }));
};

btnTahun.onclick = () => {
    const y = new Date().getFullYear();
    renderSchedule(allKunjungan.filter(k =>
        k.jadwal_kunjungan?.tanggal &&
        parseTanggalDMY(k.jadwal_kunjungan.tanggal).getFullYear() === y
    ));
};

/* =========================
   INIT
========================= */
loadScheduleList();