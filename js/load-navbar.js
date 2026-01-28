fetch("components/navbar.html")
    .then(res => res.text())
    .then(data => {
        document.getElementById("navbar").innerHTML = data;

        // Setelah navbar terload, isi judul halaman
        const title = document.body.getAttribute("data-title");
        if (title) {
            document.getElementById("page-title").textContent = title;
        }
    });
