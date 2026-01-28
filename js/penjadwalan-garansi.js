import { db } from "./firebase-config.js";
import { collection, getDocs, query, where, doc, getDoc }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tableBody = document.getElementById("dataBody");
const noDataRow = document.getElementById("noDataRow");

async function loadGaransi() {
    const querySnapshot = await getDocs(collection(db, "garansi"));

    if (querySnapshot.empty) return;

    noDataRow.style.display = "none";
    tableBody.innerHTML = ""; // bersihkan dulu

    for (const garansiDoc of querySnapshot.docs) {
        const data = garansiDoc.data();

        // skip garansi yang sudah selesai
        if (data.status === "selesai") continue;

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

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${garansiDoc.id}</td>
            <td>${nama}</td>
            <td>${telepon}</td>
            <td>${data.nama_garansi}</td>
            <td>
                <button class="btn-detail" data-id="${garansiDoc.id}">Lihat Jadwal Kunjungan</button>
            </td>
        `;

        tableBody.appendChild(row);
    }

    addDetailEvent();
}

function addDetailEvent() {
    document.querySelectorAll(".btn-detail").forEach(btn => {
        btn.addEventListener("click", () => {
            const idGaransi = btn.getAttribute("data-id");
            window.location.href = `detail-garansi.html?id=${idGaransi}`;
        });
    });
}

loadGaransi();
