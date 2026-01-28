// selesai.js
import { db } from "./firebase-config.js";
import { collection, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const dataBody = document.getElementById("dataBody");
const noDataRow = document.getElementById("noDataRow");

async function loadOrderSelesai() {
    try {
        // 1. Ambil semua layanan untuk mapping
        const layananSnap = await getDocs(collection(db, "layanan"));
        const layananMap = {};
        layananSnap.forEach(doc => {
            const data = doc.data();
            layananMap[data.id_layanan] = data.nama_layanan;
        });

        // 2. Ambil semua order
        const orderSnap = await getDocs(collection(db, "order"));
        let adaData = false;

        for (const docSnap of orderSnap.docs) {
            const order = docSnap.data();

            // Ambil jenis layanan
            const jenisLayanan = layananMap[order.id_layanan] || order.id_layanan;

            // Cek kriteria selesai lama atau status_order = "selesai"
            let isSelesai = false;

            if (order.status === "selesai") {
                isSelesai = true;
            } else if ((jenisLayanan === "L01PB" || jenisLayanan === "L03RB") &&
                order.selesai_kunjungan_1 && order.selesai_kunjungan_2) {
                isSelesai = true;
            } else if ((jenisLayanan === "LO4RT" || jenisLayanan === "L02RP") &&
                order.selesai_kunjungan_1) {
                isSelesai = true;
            }

            if (isSelesai) {
                adaData = true;

                // Hapus row "Data tidak tersedia" jika ada
                if (noDataRow) noDataRow.style.display = "none";

                let namaPelanggan = "-";
                let teleponPelanggan = "-";

                // 🔗 ambil data pelanggan dari id_pelanggan
                if (order.id_pelanggan) {
                    const pelangganRef = doc(db, "pelanggan", order.id_pelanggan);
                    const pelangganSnap = await getDoc(pelangganRef);

                    if (pelangganSnap.exists()) {
                        const p = pelangganSnap.data();
                        namaPelanggan = p.nama_pelanggan || "-";
                        teleponPelanggan = p.no_telp || "-";
                    }
                }

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${order.id_order}</td>
                    <td>${namaPelanggan}</td>
                    <td>${teleponPelanggan}</td>
                    <td>${jenisLayanan}</td>
                    <td><div class="status-selesai">Selesai</div></td>
                `;

                dataBody.appendChild(tr);
            }
        };

        // Jika tidak ada data sama sekali
        if (!adaData && noDataRow) {
            noDataRow.style.display = "";
        }

    } catch (error) {
        console.error("Error load order selesai:", error);
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

loadOrderSelesai();
