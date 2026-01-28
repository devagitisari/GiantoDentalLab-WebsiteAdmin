

document.querySelectorAll(".dropdown-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const submenu = btn.nextElementSibling;
        submenu.classList.toggle("active");
    });
});

const currentPage = location.pathname.split("/").pop();  
    const menuItems = document.querySelectorAll(".nav-link");

    menuItems.forEach(item => {
        if (item.getAttribute("href") === currentPage) {
            item.classList.add("active");
        }
    });

function updateBadge(idBadge, count) {
    const badge = document.getElementById(idBadge);
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none"; // sembunyikan kalau nol
    }
}
