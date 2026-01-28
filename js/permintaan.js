import { db } from "./firebase-config.js";
import { collection, getDocs, getDoc, doc, updateDoc, addDoc, setDoc, query, where, onSnapshot }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentDocId = "";

const tableBody = document.getElementById("dataBody");
const emptyState = document.getElementById("emptyState");
const detailContent = document.getElementById("detailContent");

const detailPhoto = document.getElementById("detailPhoto");
const detailId = document.getElementById("detailId");
const detailName = document.getElementById("detailName");
const detailPhone = document.getElementById("detailPhone");
const detailUsage = document.getElementById("detailUsage");
const detailNotes = document.getElementById("detailNotes");
const detailAlamat = document.getElementById("detailAlamat");


async function loadLayanan() {
    const layananSelect = document.getElementById("pop_layanan");

    const snapshot = await getDocs(collection(db, "layanan"));

    layananSelect.innerHTML = `<option value="">-- Pilih layanan --</option>`;

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        layananSelect.innerHTML += `
            <option value="${data.id_layanan}">
                ${data.nama_layanan}
            </option>
        `;
    });

    layananSelect.addEventListener("change", function () {
        autoSetTimeByService();
    });
}

// Resolve id_layanan -> nama_layanan with cache (tries doc id, query by field, then full scan)
const layananNameCache = new Map();
async function resolveLayananName(id){
    if(!id) return null;
    if(layananNameCache.has(id)) return layananNameCache.get(id);
    try{
        // try as document id
        const ref = doc(db, 'layanan', String(id));
        const snap = await getDoc(ref);
        if(snap.exists()){
            const d = snap.data();
            const name = d.nama_layanan || d.nama || null;
            layananNameCache.set(id, name);
            return name;
        }
    }catch(e){ console.debug('resolveLayananName doc lookup failed', e); }
    try{
        // try query by field id_layanan
        const q = query(collection(db, 'layanan'), where('id_layanan','==', id));
        const s = await getDocs(q);
        if(s && !s.empty){
            const d = s.docs[0].data();
            const name = d.nama_layanan || d.nama || null;
            layananNameCache.set(id, name);
            return name;
        }
    }catch(e){ console.debug('resolveLayananName query failed', e); }
    try{
        // fallback: scan all
        const all = await getDocs(collection(db, 'layanan'));
        for(const docu of all.docs){
            const data = docu.data() || {};
            for(const k of Object.keys(data)){
                const v = data[k];
                if(typeof v === 'string' && v === String(id)){
                    const name = data.nama_layanan || data.nama || null;
                    layananNameCache.set(id, name);
                    return name;
                }
            }
        }
    }catch(e){ console.debug('resolveLayananName full-scan failed', e); }
    layananNameCache.set(id, null);
    return null;
}
window.resolveLayananName = resolveLayananName;

async function loadData() {
    const q = query(
        collection(db, "order"),
        where("status", "==", "menunggu")
    );

    onSnapshot(q, async (snapshot) => {
        tableBody.innerHTML = "";

        if (snapshot.empty) {
            emptyState.style.display = "block";
            detailContent.style.display = "none";
            return;
        }

        emptyState.style.display = "none";

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const createdAt = formatTimestamp(data.created_at);

            // default jika pelanggan tidak ditemukan
            let nama = "-";
            let telepon = "-";

            // 🔗 ambil data pelanggan dari id_pelanggan
            if (data.id_pelanggan) {
                const pelangganRef = doc(db, "pelanggan", data.id_pelanggan);
                const pelangganSnap = await getDoc(pelangganRef);

                if (pelangganSnap.exists()) {
                    const p = pelangganSnap.data();
                    nama = p.nama_pelanggan || "-";
                    telepon = p.no_telp || "-";
                }
            }

            const tr = document.createElement("tr");
            tr.classList.add("dataRow");

            tr.innerHTML = `
                <td>${data.id_order || "-"}</td>
                <td>${nama}</td>
                <td>${telepon}</td>
                <td>${createdAt}</td>
            `;

            tr.addEventListener("click", () => showDetail(data, docSnap.id));

            tableBody.appendChild(tr);
        }
    });
}

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

async function loadAlamat(docId) {
    try {
        const docRef = doc(db, "order", docId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return "-";

        const data = docSnap.data();

        // ambil objek alamat
        const alamat = data.alamat;
        if (!alamat) return "-";

        // gabungkan menjadi string
        const alamatString = `${alamat.nama_jalan || ""}, ${alamat.kelurahan || ""}, ${alamat.kecamatan || ""}, ${alamat.kota || ""}, ${alamat.provinsi || ""}`;

        return alamatString;
    } catch (err) {
        console.error("Error loadAlamat:", err);
        return "-";
    }
}

async function showDetail(data, docId) {
    currentDocId = docId;

    emptyState.style.display = "none";
    detailContent.style.display = "flex";

    if (data.foto) {
        detailPhoto.src = data.foto;
    } else {
        detailPhoto.src = "https://via.placeholder.com/200?text=No+Image";
    }
    
    detailId.textContent = data.id_order;
    detailName.textContent = "Memuat";
    detailPhone.textContent = "Memuat";

    // 🔗 ambil pelanggan
    if (data.id_pelanggan) {
        const pelangganRef = doc(db, "pelanggan", data.id_pelanggan);
        const pelangganSnap = await getDoc(pelangganRef);

        if (pelangganSnap.exists()) {
            const p = pelangganSnap.data();
            detailName.textContent = p.nama_pelanggan || "-";
            detailPhone.textContent = p.no_telp || "-";
        } else {
            detailName.textContent = "-";
            detailPhone.textContent = "-";
        }
    } else {
        detailName.textContent = "-";
        detailPhone.textContent = "-";
    }

    detailUsage.textContent = data.pemakaian_jasa || "-";
    detailNotes.textContent = data.keluhan || "-";

    detailAlamat.textContent = "Memuat...";
    const alamatString = await loadAlamat(docId);
    detailAlamat.textContent = alamatString;

}

loadData();

async function openPopUp() {
    const container = document.getElementById("popupContainer");

    const popupHTML = await fetch("popup-permintaan.html").then(r => r.text());
    container.innerHTML = popupHTML;

    document.getElementById("popupOverlay").style.display = "flex";

    // Isi otomatis
    document.getElementById("pop_id").value = detailId.textContent;
    document.getElementById("pop_name").value = detailName.textContent;
    document.getElementById("pop_phone").value = detailPhone.textContent;

    window.closePopUp = function () {
        container.innerHTML = "";
        currentDates = 0; // reset
    };

    loadLayanan();

    // Buat fungsi dapat dipanggil dari popup file
    window.addDateField = addDateField;
    window.removeDate = removeDate;
    window.submitApproval = submitApproval;
}
window.openPopUp = openPopUp;


// --- Tambah tanggal (maks 3)
let currentDates = 0;
const maxDates = 3;

function addDateField() {
    if (currentDates >= maxDates) {
        showAlert("error", "Gagal!", "Maksimal 3 tanggal!");
        return;
    }

    currentDates++;

    const container = document.getElementById("dateContainer");

    const div = document.createElement("div");
    div.classList.add("date-input");

    div.innerHTML = `
        <input type="date" class="form-control visit-date">
        <input type="time" class="form-control start-time" placeholder="Mulai">
        <input type="time" class="form-control end-time" placeholder="Selesai">
        <span class="remove-date" onclick="removeDate(this)">✕</span>
    `;

    container.appendChild(div);

    autoSetTimeByService(); //
}

function removeDate(el) {
    el.parentElement.remove();
    currentDates--;
}


// --- Submit approval ke Firestore
async function submitApproval() {
    try {
        const idOrder = document.getElementById("pop_id").value;
        const id_layanan = document.getElementById("pop_layanan").value;
        const catatan = document.getElementById("pop_catatan").value;

        const dateInputs = document.querySelectorAll(".visit-date");
        const startInputs = document.querySelectorAll(".start-time");
        const endInputs = document.querySelectorAll(".end-time");

        let tanggalGabungan = [];

        dateInputs.forEach((d, i) => {
            if (d.value && startInputs[i].value && endInputs[i].value) {
                tanggalGabungan.push({
                    tanggal: d.value,
                    jam_mulai: startInputs[i].value,
                    jam_selesai: endInputs[i].value
                });
            }
        });

        // ❗ FIX 1: validasi yg benar
        if (!id_layanan || tanggalGabungan.length === 0) {
            showAlert("error", "Validasi!", "Jenis layanan & tanggal wajib diisi!");
            return;
        }

        showLoadingAlert();

        // 🔹 Update ke koleksi "order"
        const orderRef = doc(db, "order", currentDocId);

        // resolve nama_layanan and store both id and name in order doc
        let nama_layanan_resolved = null;
        try{
            nama_layanan_resolved = await resolveLayananName(id_layanan);
        }catch(e){ console.debug('resolveLayananName failed during submitApproval', e); }

        await updateDoc(orderRef, {
            status: "disetujui",
            id_layanan: id_layanan,
            nama_layanan: nama_layanan_resolved || null,
            catatan_admin: catatan,
            updated_at: new Date()
        });

        // 🔹 Tambah ke koleksi "jadwal"
        const jadwalRef = doc(collection(db, "jadwal"));

        await setDoc(jadwalRef, {
            id_jadwal: jadwalRef.id,   // 🔥 ini docID
            id_order: idOrder,
            tanggal_usulan: tanggalGabungan,
            updated_at: new Date()
        });

        showAlert("success", "Sukses!", "Data berhasil disimpan");
        closePopUp();

    } catch (err) {
        console.error("Error submitApproval:", err);
        showAlert("error", "Gagal!", "Gagal menyimpan data");
    }
}
window.submitApproval = submitApproval;

function autoSetTimeByService() {
    const layanan = document.getElementById("pop_layanan").value;

    // Mapping layanan ke durasi (dalam jam)
    const layananDurasi = {
        "L01PB": 2,
        "L03RB": 2,
        "L02RP": 4,
        "L04RT": 2
    };

    const durasi = layananDurasi[layanan]; // undefined kalau layanan lain

    const allStart = document.querySelectorAll(".start-time");
    const allEnd = document.querySelectorAll(".end-time");

    allStart.forEach((start, i) => {
        const end = allEnd[i];

        if (durasi) { // kalau layanan ada di mapping
            start.disabled = false; // admin bisa isi start waktu

            // hapus listener lama dulu supaya tidak menumpuk
            start.oninput = null;

            // listener untuk update end time otomatis
            start.addEventListener("input", function () {
                if (!start.value) {
                    end.value = "";
                    return;
                }

                const [h, m] = start.value.split(":").map(Number);
                let endHour = h + durasi;
                let endMinute = m;

                if (endHour >= 24) endHour -= 24; // jaga kalau lebih dari 24
                const hh = String(endHour).padStart(2, "0");
                const mm = String(endMinute).padStart(2, "0");

                end.value = `${hh}:${mm}`;
            });

            end.disabled = true; // end tidak bisa diubah manual

            // set default end berdasarkan start sekarang
            if (start.value) {
                const [h, m] = start.value.split(":").map(Number);
                let endHour = h + durasi;
                if (endHour >= 24) endHour -= 24;
                end.value = `${String(endHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            } else {
                end.value = "";
            }

        } else {
            // layanan biasa, bisa set bebas
            start.disabled = false;
            end.disabled = false;
            start.value = "";
            end.value = "";
        }
    });
}


// =========================
// OPEN POPUP Tolak
// =========================

async function openPopUpTolak() {
    const container = document.getElementById("popupContainer");

    const popupHTML = await fetch("popuptolak-permintaan.html").then(r => r.text());
    container.innerHTML = popupHTML;

    document.getElementById("popupTolakOverlay").style.display = "flex";

    // Isi otomatis
    document.getElementById("pop_tolak_id").value = detailId.textContent;
    document.getElementById("pop_tolak_name").value = detailName.textContent;
    document.getElementById("pop_tolak_phone").value = detailPhone.textContent;

    window.closePopUp = function () {
        container.innerHTML = "";
        currentDates = 0; // reset
    };

    // Buat fungsi dapat dipanggil dari popup file

    window.submitPenolakan = submitPenolakan;
}
window.openPopUpTolak = openPopUpTolak;

// =========================
// SUBMIT PENOLAKAN
// =========================

async function submitPenolakan() {
    const alasan = document.getElementById("pop_tolak_alasan").value.trim();

    if (!alasan) return showAlert("error", "Validasi!", "Alasan penolakan wajib diisi");

    try {
        const orderRef = doc(db, "order", currentDocId);

        showLoadingAlert();

        await updateDoc(orderRef, {
            status: "ditolak",
            catatan_admin: alasan,
            updated_at: new Date()
        });

        showAlert("success", "Berhasil!", "Order berhasil ditolak");
        closePopUpTolak();
    } catch (err) {
        console.error(err);
        alert("Gagal menolak order!");
    }
}
window.submitPenolakan = submitPenolakan;


window.closePopUpTolak = function () {
    const container = document.getElementById("popupContainer");
    container.innerHTML = "";
};

let alertTimeout;

function showLoadingAlert() {
    const overlay = document.getElementById("alertOverlay");
    const icon = document.getElementById("alertIcon");

    icon.className = "material-icons popup-icon loading";
    icon.textContent = "autorenew";

    document.getElementById("alertTitle").textContent = "Memproses...";
    document.getElementById("alertMessage").textContent = "Mohon tunggu sebentar";

    overlay.classList.remove("hidden");
}

function showAlert(type, title, message) {
    const overlay = document.getElementById("alertOverlay");
    const icon = document.getElementById("alertIcon");

    icon.classList.remove("loading", "success", "error");

    if (type === "success") {
        icon.classList.add("success");
        icon.textContent = "check_circle";
    } else {
        icon.classList.add("error");
        icon.textContent = "error";
    }

    document.getElementById("alertTitle").textContent = title;
    document.getElementById("alertMessage").textContent = message;

    clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => {
        overlay.classList.add("hidden");
    }, 2000);
}
