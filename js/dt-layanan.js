import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tbody = document.getElementById("dataBody");
const noDataRow = document.getElementById("noDataRow");

async function loadLayanan() {
    const querySnapshot = await getDocs(collection(db, "layanan"));

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
            <td>${data.id_layanan || "-"}</td>
            <td>${data.id_bahan || "-"}</td>
            <td>${data.nama_layanan || "-"}</td>
            <td>${data.deskripsi || "-"}</td>
            <td>${data.harga_gigi_pertama || "-"}</td>
            <td>${data.harga_gigi_selanjutnya || "-"}</td>
        `;
        tbody.appendChild(tr);
    });
}

loadLayanan();

async function openPopUp() {
    const container = document.getElementById("popupContainer");

    const popupHTML = await fetch("popup-layanan.html").then(r => r.text());
    container.innerHTML = popupHTML;

    document.getElementById("popupLayanan").style.display = "flex";

    window.closePopUp = function () {
        container.innerHTML = "";
    };

    window.formatRupiah = formatRupiah;
    window.setupRupiahInput = setupRupiahInput;
    window.submitApproval = submitApproval;

    setupRupiahInput("pop_hrgaPrtama");
    setupRupiahInput("pop_hrgaLanjutan");
}
window.openPopUp = openPopUp;

function formatRupiah(angka) {
    return angka.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function setupRupiahInput(id) {
    const input = document.getElementById(id);

    input.addEventListener("input", function () {
        let angka = this.value.replace(/\D/g, "");
        this.value = formatRupiah(angka);
    });
}

function getNumber(id) {
    return document.getElementById(id).value.replace(/\./g, "");
}

async function submitApproval() {
    const idLayanan = document.getElementById("pop_idLayanan").value.trim();
    const idBahan = document.getElementById("pop_idBahan").value;
    const namaLayanan = document.getElementById("pop_nmLayanan").value.trim();
    const deskripsi = document.getElementById("pop_deskripsi").value.trim();

    const hargaPertama = getNumber("pop_hrgaPrtama");
    const hargaLanjut = getNumber("pop_hrgaLanjutan");

    if (!idLayanan || !namaLayanan) {
        alert("ID Layanan dan Nama Layanan wajib diisi!");
        return;
    }

    try {
        await addDoc(collection(db, "layanan"), {
            id_layanan: idLayanan,
            id_bahan: idBahan,
            nama_layanan: namaLayanan,
            deskripsi: deskripsi,
            harga_gigi_pertama: Number(hargaPertama),
            harga_gigi_selanjutnya: Number(hargaLanjut)
        });

        alert("Layanan berhasil ditambahkan!");

        closePopUp();
        loadLayanan(); // ← refresh tabel

    } catch (err) {
        console.error(err);
        alert("Gagal menyimpan layanan!");
    }
}
window.submitApproval = submitApproval;


