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
