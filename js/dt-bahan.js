import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc, setDoc, doc, getDoc }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tbody = document.getElementById("dataBody");
const noDataRow = document.getElementById("noDataRow");

async function loadBahan() {
    const querySnapshot = await getDocs(collection(db, "bahan"));

    // Bersihkan tbody
    tbody.innerHTML = "";

    // Jika tidak ada data
    if (querySnapshot.empty) {
        tbody.appendChild(noDataRow);
        return;
    }

    // Jika ada data, hapus baris "no data" jika masih ada
    if (noDataRow) noDataRow.remove();

    querySnapshot.forEach((doc) => {
        const data = doc.data();

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${data.id_bahan || "-"}</td>
            <td>${data.jenis_bahan || "-"}</td>
            <td>${data.deskripsi || "-"}</td>
            <td class="aksi">
                <button class="btn-hapus" onclick="hapusBahan('${doc.id}')">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

loadBahan();

async function openPopUp() {
    const container = document.getElementById("popupContainer");

    const popupHTML = await fetch("popup-bahan.html").then(r => r.text());
    container.innerHTML = popupHTML;

    document.getElementById("popupBahan").style.display = "flex";

    window.closePopUp = function () {
        container.innerHTML = "";
    };
}
window.openPopUp = openPopUp;


async function submitApproval() {
    const idBahan = document.getElementById("pop_idBahan").value.trim();
    const jenisBahan = document.getElementById("pop_jenisbhn").value.trim();
    const deskripsi = document.getElementById("pop_deskripsi").value.trim();

    if (!idBahan || !jenisBahan) {
        showAlert("error", "Validasi!", "ID & Jenis Bahan wajib diisi");
        return;
    }

    try {
        showLoadingAlert();

        const bahanRef = doc(db, "bahan", idBahan);
        const bahanSnap = await getDoc(bahanRef);

        if (bahanSnap.exists()) {
            showAlert("error", "Gagal!", "ID Bahan sudah digunakan");
            return;
        }

        await setDoc(bahanRef, {
            id_bahan: idBahan,
            jenis_bahan: jenisBahan,
            deskripsi: deskripsi,
        });


        showAlert("success", "Berhasil!", "Bahan berhasil ditambahkan");

        closePopUp();
        loadBahan(); // ← refresh tabel

    } catch (err) {
        console.error(err);
        showAlert("error", "Gagal!", "Gagal menyimpan data");
    }
}
window.submitApproval = submitApproval;


let alertTimeout;

// 🔄 Loading
function showLoadingAlert() {
    const overlay = document.getElementById("alertOverlay");
    const icon = document.getElementById("alertIcon");

    icon.className = "material-icons alert-icon loading";
    icon.textContent = "autorenew";

    document.getElementById("alertTitle").textContent = "Memproses...";
    document.getElementById("alertMessage").textContent = "Mohon tunggu sebentar";

    overlay.classList.remove("hidden");
}

// ✅ Success / ❌ Error
function showAlert(type, title, message) {
    const overlay = document.getElementById("alertOverlay");
    const icon = document.getElementById("alertIcon");

    icon.className = "material-icons alert-icon";

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

async function hapusBahan(idBahan) {
    const konfirmasi = confirm(
        `Yakin ingin menghapus bahan dengan ID ${idBahan}?`
    );

    if (!konfirmasi) return;

    try {
        showLoadingAlert();

        await deleteDoc(doc(db, "bahan", idBahan));

        showAlert("success", "Berhasil!", "Data bahan berhasil dihapus");
        loadBahan(); // refresh tabel

    } catch (err) {
        console.error(err);
        showAlert("error", "Gagal!", "Gagal menghapus data");
    }
}

window.hapusBahan = hapusBahan;
