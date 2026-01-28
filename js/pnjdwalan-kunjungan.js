import { db } from "./firebase-config.js";
import { collection, getDocs, query, where, doc, getDoc }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tableBody = document.getElementById("dataBody");
const noDataRow = document.getElementById("noDataRow");

async function loadKunjungan() {
    function formatTanggal(timestamp) {
        if (!timestamp) return "-";

        // pastikan ini Firestore Timestamp
        if (typeof timestamp.toDate !== "function") return "-";

        const date = timestamp.toDate();

        return date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    const querySnapshot = await getDocs(collection(db, "order"));

    if (querySnapshot.empty) return;

    noDataRow.style.display = "none";
    tableBody.innerHTML = ""; // bersihkan dulu

    for (const orderDoc of querySnapshot.docs) {
        const data = orderDoc.data();

        // skip order yang sudah selesai
        if (data.status === "selesai" ||
            data.status === "ditolak" ||
            data.status === "dibatalkan"
        ) continue;

        let namaLayanan = "-";
        if (data.id_layanan) {
            const q = query(
                collection(db, "layanan"),
                where("id_layanan", "==", data.id_layanan)
            );
            const layananSnapshot = await getDocs(q);
            if (!layananSnapshot.empty) {
                namaLayanan = layananSnapshot.docs[0].data().nama_layanan || "-";
            }
        }

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

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${orderDoc.id}</td>
            <td>${formatTanggal(data.updated_at)}</td>
            <td>${nama}</td>
            <td>${telepon}</td>
            <td>${namaLayanan}</td>
            <td>
                <button class="btn-detail" data-id="${orderDoc.id}">Lihat Jadwal Kunjungan</button>
            </td>
        `;

        tableBody.appendChild(row);
    }

    addDetailEvent();
}

function addDetailEvent() {
    document.querySelectorAll(".btn-detail").forEach(btn => {
        btn.addEventListener("click", () => {
            const idOrder = btn.getAttribute("data-id");
            window.location.href = `detail-kunjungan.html?id=${idOrder}`;
        });
    });
}

loadKunjungan();
