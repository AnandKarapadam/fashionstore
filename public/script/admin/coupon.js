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

  const couponForm = document.querySelector('form[action="/admin/coupon/createCoupon"]');
  const nameInput = couponForm.querySelector('input[name="name"]');
  const offerInput = couponForm.querySelector('input[name="offerprice"]');
  const minInput = couponForm.querySelector('input[name="minimumprice"]');

  const nameError = document.getElementById("nameError");
  const dateError = document.getElementById("dateError");
  const priceError = document.getElementById("priceError");
  const minPriceError = document.getElementById("minPriceError");

  couponForm.addEventListener("submit",function(e){
    let hasError = false;

    const name = nameInput.value.trim();
    if(name.length<3){
      nameError.textContent = "Coupon name must be atleast 3 characters long."
      hasError = true;
    }else if(/\s/.test(name)){
      nameError.textContent = "Coupon name cannot contain spaces.";
      hasError = true;
    }
    else {
      nameError.textContent = "";
    }

   const startDateVal = startDateInput ? startDateInput.value : "";
const endDateVal = endDateInput ? endDateInput.value : "";

if (!startDateVal) {
  dateError.textContent = "Start date is required";
  hasError = true;
} else if (!endDateVal) {
  dateError.textContent = "End date is required";
  hasError = true;
} else {
  const startDate = new Date(startDateVal);
  const endDate = new Date(endDateVal);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    dateError.textContent = "Please enter valid dates.";
    hasError = true;
  } else if (endDate < startDate) {
    dateError.textContent = "End date cannot be earlier than start date.";
    hasError = true;
  } else {
    dateError.textContent = "";
  }
}


    // Offer price validation
    const offerPrice = parseFloat(offerInput.value);
    if (isNaN(offerPrice) || offerPrice <= 0) {
      priceError.textContent = "Offer price must be greater than 0.";
      hasError = true;
    } else {
      priceError.textContent = "";
    }

    // Minimum price validation
    const minPrice = parseFloat(minInput.value);
    if (isNaN(minPrice) || minPrice <= 0) {
      minPriceError.textContent = "Minimum price must be greater than 0.";
      hasError = true;
    } else if (minPrice < offerPrice) {
      minPriceError.textContent = "Minimum price must be greater than or equal to offer price.";
      hasError = true;
    } else {
      minPriceError.textContent = "";
    }

    if (hasError) e.preventDefault(); 

  })

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