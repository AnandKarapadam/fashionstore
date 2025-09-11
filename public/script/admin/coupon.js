window.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const formattedDate = `${yyyy}-${mm}-${dd}`;

  // Set value and min for start date
  const startDateInput = document.querySelector('input[name="startdate"]');
  if (startDateInput) {
    startDateInput.value = formattedDate;
    startDateInput.min = formattedDate; // prevent selecting past dates
  }

  // Optional: restrict end date also from being earlier than today
  const endDateInput = document.querySelector('input[name="enddate"]');
  if (endDateInput) {
    endDateInput.min = formattedDate;
  }
});
function clearSearch() {
  document.querySelector('input[name="search"]').value = "";
  document.getElementById("searchForm").submit();
  window.location.href = "/admin/coupon";
}

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

const urlParams = new URLSearchParams(window.location.search);
const error =  urlParams.get("error");

if(error==="CouponAlreadyExist"){
  Swal.fire({
    icon:"error",
    title:"Duplicate coupon",
    text:"This coupon name already exists. Please try another name!",
    confirmButtonColor:"#d33"
  }).then(()=>{
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState({},document.title,url.toString());
  })
}