import { db } from "./firebase-config.js";
import { doc, updateDoc }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { selectedOrder, selectedDocId } from "./permintaan.js";

// =========================
// OPEN POPUP
// =========================
window.openPopUp = function () {
    if (!selectedOrder) return alert("Pilih order terlebih dahulu!");

    popupOverlay.style.display = "flex";

    document.getElementById("pop_id").value = selectedOrder.id_order;
    document.getElementById("pop_name").value = selectedOrder.nama;
    document.getElementById("pop_phone").value = selectedOrder.telepon;
}

// =========================
// CLOSE POPUP
// =========================
window.closePopUp = function () {
    popupOverlay.style.display = "none";
}


// =========================
// TAMBAH TANGGAL (max 3)
// =========================
window.addDateField = function () {
    const container = document.getElementById("dateContainer");
    const count = container.querySelectorAll(".input-tanggal").length;

    if (count >= 3) {
        alert("Maksimal 3 tanggal!");
        return;
    }

    const div = document.createElement("div");
    div.classList.add("date-item");

    div.innerHTML = `
        <input type="date" class="form-control input-tanggal">
        <button class="remove-date" onclick="this.parentElement.remove()">X</button>
    `;

    container.appendChild(div);
}


// =========================
// SUBMIT APPROVAL
// =========================
window.submitApproval = async function () {

    if (!selectedDocId) {
        alert("ID dokumen tidak ditemukan!");
        return;
    }

    const layanan = document.getElementById("pop_layanan").value;
    const catatanAdmin = document.getElementById("pop_catatan").value;

    const tanggalInputs = document.querySelectorAll(".input-tanggal");
    const tanggalList = [];

    tanggalInputs.forEach(i => {
        if (i.value) tanggalList.push(i.value);
    });

    if (tanggalList.length === 0) {
        alert("Minimal pilih 1 tanggal.");
        return;
    }

    const updateData = {
        status: "disetujui",
        jenis_layanan: layanan,
        tanggal_kunjungan: tanggalList,
        catatan_admin: catatanAdmin,
        disetujui_pada: new Date()
    };

    await updateDoc(doc(db, "order", selectedDocId), updateData);

    closePopUp();
    alert("Permintaan berhasil disetujui!");
};
