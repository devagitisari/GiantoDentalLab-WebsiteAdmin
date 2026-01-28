// selesai.js
import { db } from "./firebase-config.js";
import { collection, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const dataBody = document.getElementById("dataBody");
const noDataRow = document.getElementById("noDataRow");

async function loadGaransiSelesai() {
    try {
        const garansiSnap = await getDocs(collection(db, "garansi"));
        let adaData = false;

        for (const docSnap of garansiSnap.docs) {
            const garansi = docSnap.data();

            // ✅ hanya tampilkan garansi selesai
            if (garansi.status !== "Selesai") continue;

            adaData = true;
            if (noDataRow) noDataRow.style.display = "none";

            let namaPelanggan = "-";
            let teleponPelanggan = "-";

            // =========================
            // garansi → order → pelanggan
            // =========================
            if (garansi.id_order) {
                const orderRef = doc(db, "order", garansi.id_order);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    const order = orderSnap.data();

                    if (order.id_pelanggan) {
                        const pelangganRef = doc(
                            db,
                            "pelanggan",
                            order.id_pelanggan
                        );
                        const pelangganSnap = await getDoc(pelangganRef);

                        if (pelangganSnap.exists()) {
                            const p = pelangganSnap.data();
                            namaPelanggan = p.nama_pelanggan || "-";
                            teleponPelanggan = p.no_telp || "-";
                        }
                    }
                }
            }

            // 🟢 JENIS LAYANAN LANGSUNG DARI GARANSI
            const jenisLayanan = garansi.nama_garansi || "-";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${garansi.id_order || "-"}</td>
                <td>${namaPelanggan}</td>
                <td>${teleponPelanggan}</td>
                <td>${jenisLayanan}</td>
                <td><div class="status-selesai">Selesai</div></td>
            `;

            dataBody.appendChild(tr);
        }

        // ❌ kalau ga ada data
        if (!adaData && noDataRow) {
            noDataRow.style.display = "";
        }

    } catch (error) {
        console.error("Error load garansi selesai:", error);
    }
}


// Tambahkan style untuk status
const style = document.createElement("style");
style.textContent = `
    .status-selesai {
        display: inline-block;       /* buat badge hanya sebesar kontennya */
        background-color: #9dedb0;   /* hijau cerah */
        color: black;
        font-weight: 500;
        font-size: 18px;
        text-align: center;
        border-radius: 12px;         /* bulat/rounded */
        padding: 3px 20px;           /* ruang di kiri/kanan */
        min-width: 60px;             /* opsional, supaya badge tidak terlalu kecil */
    }
    td {
        text-align: center;           /* center badge di tengah kolom */
    }
`;
document.head.appendChild(style);

loadGaransiSelesai();
