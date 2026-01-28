import { db } from "./firebase-config.js";
import { collection, getDocs }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tbody = document.getElementById("dataBody");
const noDataRow = document.getElementById("noDataRow");

async function loadPelanggan() {
    const querySnapshot = await getDocs(collection(db, "pelanggan"));

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
            <td>${data.id_pelanggan || "-"}</td>
            <td>${data.username || "-"}</td>
            <td>${data.nama_pelanggan || "-"}</td>
            <td>${data.no_telp || "-"}</td>
            <td>${data.alamat
                ? `${data.alamat.nama_jalan}, <br> ${data.alamat.kelurahan}, ${data.alamat.kecamatan}, <br> ${data.alamat.kota}, ${data.alamat.provinsi}`
                : "-"
            }</td>

            <td>
                <button class="view-btn" onclick="lihatDetail('${doc.id}')">Lihat Detail</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

loadPelanggan();

window.lihatDetail = function (idPelanggan) {
    window.location.href = `detail-pelanggan.html?id=${idPelanggan}`;
};

