function clearSearch() {
  document.querySelector('input[name="search"]').value = "";
  document.getElementById("searchForm").submit();
  window.location.href = "/admin/brands";
}
// const toggleButton = document.getElementById("menu-toggle");
// const sidebar = document.getElementById("sidebar");
// const content = document.getElementById("content");

// toggleButton.addEventListener("click", () => {
//   sidebar.classList.toggle("collapsed");
//   content.classList.toggle("expanded");
// });

function confirmDelete(event) {
  event.preventDefault();

  Swal.fire({
    title: "Are you sure?",
    text: "This brand will be permently deleted!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, delete it",
  }).then((result) => {
    if (result.isConfirmed) {
      event.target.submit();
    }
  });
}

document.querySelector("form").addEventListener("submit", async function(e) {
    e.preventDefault(); // stop default submission

    // Clear previous errors
    document.getElementById("newNameError").innerText = "";
    document.getElementById("logoError").innerText = "";

    let isValid = true;

    const nameInput = document.getElementById("newBrandName");
    const logoInput = document.getElementById("newBrandLogo");

    const name = nameInput.value.trim();
    const logo = logoInput.files[0];

    // ---- Brand Name Validation ----
    if (!name) {
        document.getElementById("newNameError").innerText = "Brand name is required!";
        isValid = false;
    } else if (name.length < 2) {
        document.getElementById("newNameError").innerText = "Brand name must be at least 2 characters.";
        isValid = false;
    }

    
    if (!logo) {
        document.getElementById("logoError").innerText = "Logo is required!";
        isValid = false;
    } else if (!["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(logo.type)) {
        document.getElementById("logoError").innerText = "Only JPG, PNG, or WEBP images allowed!";
        isValid = false;
    } else if (logo.size > 2 * 1024 * 1024) { 
        document.getElementById("logoError").innerText = "Logo must be less than 2MB.";
        isValid = false;
    }

    if (isValid) {
        this.submit();
    }
});