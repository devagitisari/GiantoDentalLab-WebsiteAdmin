import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc, setDoc, doc, getDoc }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tbody = document.getElementById("dataBody");
const noDataRow = document.getElementById("noDataRow");

async function loadAdmin() {
    const querySnapshot = await getDocs(collection(db, "admin"));

    // Bersihkan tbody
    tbody.innerHTML = "";

    // Jika tidak ada data
    if (querySnapshot.empty) {
        tbody.appendChild(noDataRow);
        return;
    }

    // Jika ada data, hapus baris "no data" jika masih ada
    if (noDataRow) noDataRow.remove();

    querySnapshot.forEach((d) => {
        const data = d.data();

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${data.id_admin || "-"}</td>
            <td>${data.email_admin || "-"}</td>
            <td>${data.nama_admin || "-"}</td>
            <td>${data.no_telp_admin || "-"}</td>
            <td>${data.role_admin || "-"}</td>
            <td class="action-cell">
                <button class="btn-edit" onclick="editAdmin('${d.id}')">
                    <span class="material-symbols-rounded">edit</span>
                </button>
                <button class="btn-hapus" onclick="hapusAdmin('${d.id}')">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

loadAdmin();

async function openPopUp() {
    const container = document.getElementById("popupContainer");

    const popupHTML = await fetch("popup-admin.html").then(r => r.text());
    container.innerHTML = popupHTML;

    document.getElementById("popupAdmin").style.display = "flex";

    window.closePopUp = function () {
        container.innerHTML = "";
    };
}
window.openPopUp = openPopUp;


async function submitApproval() {
    const idAdmin = document.getElementById("pop_idAdmin").value.trim();
    const email = document.getElementById("pop_emailAdmin").value.trim();
    const nama = document.getElementById("pop_namaAdmin").value.trim();
    const telp = document.getElementById("pop_telpAdmin").value.trim();
    const role = document.getElementById("pop_roleAdmin").value.trim();

    if (!idAdmin || !nama) {
        showAlert("error", "Validasi!", "ID & Nama Admin wajib diisi");
        return;
    }

    try {
        showLoadingAlert();

        const adminRef = doc(db, "admin", idAdmin);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
            showAlert("error", "Gagal!", "ID Admin sudah digunakan");
            return;
        }

        await setDoc(adminRef, {
            id_admin: idAdmin,
            email_admin: email,
            nama_admin: nama,
            no_telp_admin: telp,
            role_admin: role,
        });


        showAlert("success", "Berhasil!", "Bahan berhasil ditambahkan");

        closePopUp();
        loadAdmin(); // ← refresh tabel

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

async function hapusAdmin(idAdmin) {
    const konfirmasi = confirm(
        `Yakin ingin menghapus admin dengan ID ${idAdmin}?`
    );

    if (!konfirmasi) return;

    try {
        showLoadingAlert();

        await deleteDoc(doc(db, "admin", idAdmin));

        showAlert("success", "Berhasil!", "Data admin berhasil dihapus");
        loadAdmin(); // refresh tabel

    } catch (err) {
        console.error(err);
        showAlert("error", "Gagal!", "Gagal menghapus data");
    }
}

window.hapusAdmin = hapusAdmin;
