import { db } from "./firebase-config.js";
import { collection, setDoc, getDoc, getDocs, doc, updateDoc, addDoc, query, where, onSnapshot }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tableBody = document.getElementById("dataBody");

// Elemen detail
const emptyState = document.getElementById("emptyState");
const detailContent = document.getElementById("detailContent");

const detailId = document.getElementById("detailId");
const detailName = document.getElementById("detailName");
const detailPhone = document.getElementById("detailPhone");
const detailLayanan = document.getElementById("detailLayanan");
const detailPelayanan = document.getElementById("detailPelayanan");
const detailNotes = document.getElementById("detailNotes");
const detailDate = document.getElementById("detailDate");

let selectedId = null;

// ==========================
// LOAD DATA TABEL GARANSI
// ==========================
async function loadGaransi() {
    const q = query(
        collection(db, "garansi"),
        where("status", "==", "menunggu")
    );
    onSnapshot(q, snapshot => {
        tableBody.innerHTML = ""; // kosongkan tabel

        if (snapshot.empty) {
            emptyState.style.display = "block";
            detailContent.style.display = "none";
            return;
        }

        emptyState.style.display = "none";

        snapshot.forEach(async docSnap => {
            const data = docSnap.data();

            let createdAt = formatTimestamp(data.created_at);

            // =========================
            // id_order → nama pelanggan
            // =========================
            let namaPelanggan = "-";

            if (data.id_order) {
                // Ambil data order
                const orderRef = doc(db, "order", data.id_order);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    const orderData = orderSnap.data();
                    const idPelanggan = orderData.id_pelanggan; // ambil id_pelanggan

                    if (idPelanggan) {
                        // Ambil data pelanggan
                        const pelangganRef = doc(db, "pelanggan", idPelanggan);
                        const pelangganSnap = await getDoc(pelangganRef);

                        if (pelangganSnap.exists()) {
                            namaPelanggan = pelangganSnap.data().nama_pelanggan || "-";
                        }
                    }
                }
            }

            const tr = document.createElement("tr");
            tr.classList.add("dataRow");

            tr.innerHTML = `
                <td>${data.id_garansi || "-"}</td>
                <td>${namaPelanggan}</td> <!-- GANTI id_order -->
                <td>${data.nama_garansi || "-"}</td>
                <td>${createdAt}</td>
            `;

            tr.addEventListener("click", () =>
                showDetail(data, docSnap.id)
            );

            tableBody.appendChild(tr);
        });
    });
}
loadGaransi();

function formatTimestamp(ts) {
    try {
        if (!ts) return "-";                   // kalau tidak ada timestamp
        if (ts.toDate) ts = ts.toDate();       // Firestore timestamp
        if (ts instanceof Date && !isNaN(ts)) {
            return ts.toLocaleString("id-ID", {
                dateStyle: "long",
                timeStyle: "short"
            });
        }
        return "-";
    } catch (e) {
        return "-"; // fallback aman
    }
}

// ==========================
// TAMPILKAN DETAIL KETIKA DIKLIK
// ==========================
async function showDetail(data, docId) {
    selectedId = docId;

    emptyState.style.display = "none";
    detailContent.style.display = "block";

    let nama = "-";
    let telepon = "-";

    // =========================
    // garansi → order
    // =========================
    if (data.id_order) {
        const orderRef = doc(db, "order", data.id_order);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            const idPelanggan = orderData.id_pelanggan;

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

    let tanggalPengajuan = "-";
    if (data.created_at) {
        let ts = data.created_at;
        if (ts.toDate) ts = ts.toDate(); // Firestore Timestamp → Date
        if (ts instanceof Date && !isNaN(ts)) {
            tanggalPengajuan = ts.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        }
    }

    detailId.textContent = data.id_order;
    detailName.textContent = nama;
    detailPhone.textContent = telepon;
    detailLayanan.textContent = data.nama_garansi || "-";
    detailPelayanan.textContent = data.id_pelayanan || "-";
    detailNotes.textContent = data.keluhan || "-";
    const detailDate = document.getElementById("detailDate");
    if (detailDate) {
        detailDate.textContent = tanggalPengajuan;
    }
}

// ==========================
// KLIK SETUJU → JADWALKAN KUNJUNGAN H+1
// ==========================
document.querySelector(".approve").addEventListener("click", async () => {
    if (!selectedId) return showAlertError("Pilih order terlebih dahulu!");

    const ref = doc(db, "garansi", selectedId);
    const snap = await getDoc(ref);
    const d = snap.data();

    // =========================
    // AMBIL JADWAL DARI id_order
    // =========================
    let idJadwal = "-";

    const jadwalQ = query(
        collection(db, "jadwal"),
        where("id_order", "==", d.id_order)
    );

    const jadwalSnap = await getDocs(jadwalQ);

    if (!jadwalSnap.empty) {
        idJadwal = jadwalSnap.docs[0].data().id_jadwal;
    }

    // ========= HITUNG H+1 =========
    const baseDate = d.created_at.toDate();

    const hPlus1 = new Date(baseDate);
    hPlus1.setDate(hPlus1.getDate() + 1);

    const formattedDMY = hPlus1.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    const jamMulai = "08:00";
    const jamSelesai = "10:00";


    // ========= SIMPAN KE KOLEKSI KUNJUNGAN =========
    const kunjId = `kunjGaransi-${selectedId}`;

    await setDoc(doc(db, "kunjungan", kunjId), {
        aktivitas: "Kunjungan Garansi",
        id_kunjungan: kunjId,
        id_garansi: selectedId,
        id_jadwal: idJadwal,
        jadwal_kunjungan: {
            tanggal: formattedDMY,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai
        },
        keterangan: "Pemeriksaan",
        status: "Dijadwalkan"
    });

    // update status garansi
    await updateDoc(ref, { status: "Dijadwalkan" });

    showAlertSuccess("Kunjungan berhasil dijadwalkan pada: " + formattedDMY);
});

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
