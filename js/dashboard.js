import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function toLocalDateString(date) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`; // format dd/mm/yyyy
}

async function loadJadwalHariIni() {
    console.log("🔥 loadJadwalHariIni dipanggil");

    const jadwalBox = document.getElementById("jadwalBox");
    const noSchedule = document.getElementById("no-schedule");

    jadwalBox.style.display = "none";
    noSchedule.style.display = "block";

    // tanggal hari ini (YYYY-MM-DD)
    const today = toLocalDateString(new Date());

    try {
        const q = query(collection(db, "kunjungan"));

        const snap = await getDocs(q);

        let kunjunganHariIni = null;

        snap.forEach(docSnap => {
            const data = docSnap.data();

            let tanggal;

            // kalau Timestamp
            if (data.jadwal_kunjungan?.tanggal?.toDate) {
                tanggal = data.jadwal_kunjungan.tanggal
                    .toDate()
                    .toISOString()
                    .split("T")[0];
            }
            // kalau string
            else {
                tanggal = data.jadwal_kunjungan?.tanggal;
            }

            if (tanggal === today && !kunjunganHariIni) {
                kunjunganHariIni = data;
            }
        });

        if (!kunjunganHariIni) return;

        const kunjungan = kunjunganHariIni;

        /* ===============================
           HEADER (AKTIVITAS | KETERANGAN)
        =============================== */
        document.querySelector(".kunjungan").textContent =
            kunjungan.aktivitas || "-";

        document.querySelector(".layanan").textContent =
            kunjungan.keterangan || "-";

        /* ===============================
           WAKTU (jam_mulai - jam_selesai)
        =============================== */
        const jamMulai = kunjungan.jadwal_kunjungan?.jam_mulai || "";
        const jamSelesai = kunjungan.jadwal_kunjungan?.jam_selesai || "";

        document.querySelector(".waktu-pelanggan").textContent =
            `${jamMulai} - ${jamSelesai}`;

        /* ===============================
           AMBIL JADWAL → ORDER
        =============================== */
        const jadwalSnap = await getDoc(
            doc(db, "jadwal", kunjungan.id_jadwal)
        );
        if (!jadwalSnap.exists()) return;

        const jadwal = jadwalSnap.data();

        const orderSnap = await getDoc(
            doc(db, "order", jadwal.id_order)
        );
        if (!orderSnap.exists()) return;

        const order = orderSnap.data();

        /* ===============================
           ALAMAT (DIGABUNG 1 KALIMAT)
        =============================== */
        const alamat = order.alamat_konfirmasi;
        document.querySelector(".alamat-pelanggan").textContent =
            `${alamat.nama_jalan}, ${alamat.kelurahan}, ${alamat.kecamatan}, ${alamat.provinsi}`;

        /* ===============================
           NAMA PELANGGAN
        =============================== */
        const pelangganSnap = await getDoc(
            doc(db, "pelanggan", order.id_pelanggan)
        );
        if (!pelangganSnap.exists()) return;

        document.querySelector(".nama-pelanggan").textContent =
            pelangganSnap.data().nama_pelanggan;

        /* ===============================
           TAMPILKAN CARD
        =============================== */
        jadwalBox.style.display = "block";
        noSchedule.style.display = "none";

    } catch (err) {
        console.error("Gagal load jadwal hari ini:", err);
    }
}
loadJadwalHariIni();

async function loadTotalPelanggan7Hari() {
    const tujuhHariLalu = Timestamp.fromDate(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const q = query(
        collection(db, "pelanggan"),
        where("createdAt", ">=", tujuhHariLalu)
    );

    const snapshot = await getDocs(q);
    document.getElementById("totalPelanggan").textContent = snapshot.size;
}

loadTotalPelanggan7Hari();

async function loadTotalPelanggan() {
    try {
        const pelangganRef = collection(db, "pelanggan");
        const snapshot = await getDocs(pelangganRef);

        // jumlah dokumen
        const total = snapshot.size;

        document.getElementById("totalPelanggan").textContent = total;
    } catch (err) {
        console.error("Gagal ambil total pelanggan:", err);
    }
}

// panggil
loadTotalPelanggan();

async function loadTotalPendapatan() {
    try {
        const snap = await getDocs(collection(db, "catatan_kunjungan"));

        let totalPendapatan = 0;

        // simpan id_jadwal yang sudah dihitung
        const jadwalSet = new Set();

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const idJadwal = data.id_jadwal;
            const totalHarga = Number(data.total_harga) || 0;

            // kalau id_jadwal belum pernah dihitung
            if (idJadwal && !jadwalSet.has(idJadwal)) {
                jadwalSet.add(idJadwal);
                totalPendapatan += totalHarga;
            }
        });

        document.getElementById("totalPendapatan").textContent =
            new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0
            }).format(totalPendapatan);

    } catch (err) {
        console.error("Gagal hitung total pendapatan:", err);
    }
}

// panggil
loadTotalPendapatan();


async function loadTotalKunjungan() {
    try {
        const snap = await getDocs(collection(db, "kunjungan"));

        // Set utk nyimpen id_jadwal unik
        const jadwalSet = new Set();

        snap.forEach(doc => {
            const data = doc.data();
            const idJadwal = data.id_jadwal;

            if (idJadwal) {
                jadwalSet.add(idJadwal);
            }
        });

        document.getElementById("totalKunjungan").textContent = jadwalSet.size;

    } catch (err) {
        console.error("Gagal ambil total kunjungan:", err);
    }
}

// panggil
loadTotalKunjungan();

async function loadPelangganTerbaru() {
    const container = document.getElementById("pelangganTerbaruList");
    container.innerHTML = "";

    const tujuhHariLalu = Timestamp.fromDate(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    try {
        // 1️⃣ ambil order terbaru
        const orderQuery = query(
            collection(db, "order"),
            where("created_at", ">=", tujuhHariLalu),
            orderBy("created_at", "desc"),
            limit(5)
        );

        const orderSnap = await getDocs(orderQuery);

        // untuk cegah pelanggan dobel
        const pelangganSet = new Set();

        for (const orderDoc of orderSnap.docs) {
            const orderData = orderDoc.data();
            const idPelanggan = orderData.id_pelanggan;

            if (!idPelanggan || pelangganSet.has(idPelanggan)) continue;

            // 2️⃣ ambil data pelanggan
            const pelangganRef = doc(db, "pelanggan", idPelanggan);
            const pelangganSnap = await getDoc(pelangganRef);

            if (!pelangganSnap.exists()) continue;

            const pelanggan = pelangganSnap.data();

            // 3️⃣ render card
            const card = document.createElement("div");
            card.className = "pelanggan-card";

            const img = document.createElement("img");
            img.className = "pelanggan-avatar";
            img.src = pelanggan.foto_profile && pelanggan.foto_profile.trim() !== ""
                ? pelanggan.foto_profile
                : "https://via.placeholder.com/40?text=👤";

            img.alt = pelanggan.nama_pelanggan;

            const name = document.createElement("span");
            name.textContent = pelanggan.nama_pelanggan;

            card.appendChild(img);
            card.appendChild(name);
            container.appendChild(card);

            pelangganSet.add(idPelanggan);
        }

        if (container.children.length === 0) {
            container.innerHTML = `<small class="text-muted">Belum ada order</small>`;
        }

    } catch (err) {
        console.error("Gagal load pelanggan terbaru:", err);
    }
}

// panggil
loadPelangganTerbaru();

