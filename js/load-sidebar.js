// Helper script untuk load sidebar, profile modal, dan scripts
async function loadSidebarWithProfile() {
    try {
        // Load sidebar
        const sidebarResponse = await fetch("sidebar.html");
        const sidebarHtml = await sidebarResponse.text();
        document.getElementById("sidebar").innerHTML = sidebarHtml;

        // Load profile modal
        const profileResponse = await fetch("popup-profile.html");
        const profileHtml = await profileResponse.text();
        const profileDiv = document.createElement("div");
        profileDiv.innerHTML = profileHtml;
        document.body.appendChild(profileDiv);

        // Load sidebar script (module)
        const sidebarScript = document.createElement("script");
        sidebarScript.type = "module";
        sidebarScript.src = "js/sidebar.js";
        document.body.appendChild(sidebarScript);

        // Load profile script (module)
        const profileScript = document.createElement("script");
        profileScript.type = "module";
        profileScript.src = "js/profile.js";
        document.body.appendChild(profileScript);
    } catch (error) {
        console.error("Error loading sidebar and profile:", error);
    }
}

// Auto-load when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSidebarWithProfile);
} else {
    loadSidebarWithProfile();
}
